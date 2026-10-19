/* Supabase-backed customer ↔ admin messaging, embedded Admin inbox, and support entry point. */
(function () {
  'use strict';
  const ADMIN_EMAIL = 'anowarali2707@outlook.com';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let activeCustomerConversationId = null;
  let activeAdminConversationId = null;
  let customerRefreshTimer = null;
  let adminRefreshTimer = null;
  let lastCustomerThreadCount = 0;

  function client() {
    if (window.supabaseClient) return window.supabaseClient;
    try { if (typeof supabaseClient !== 'undefined') return supabaseClient; } catch (_) {}
    return null;
  }
  function signedInUser() {
    try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (_) {}
    return window.currentUser || null;
  }
  function profileName(user) {
    try { if (typeof currentProfile !== 'undefined' && currentProfile?.name) return String(currentProfile.name); } catch (_) {}
    return String(user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Customer');
  }
  function createModal() {
    if ($('supportChatModal') || !$('authScreen')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="supportChatModal" class="modal support-chat-modal" aria-hidden="true">
        <div class="box support-chat-box" role="dialog" aria-modal="true" aria-labelledby="supportChatHeading">
          <button class="close" type="button" onclick="closeSupportChat()" aria-label="Close support chat">×</button>
          <div class="support-chat-heading"><span class="support-chat-heading-icon">💬</span><div><h2 id="supportChatHeading">Message Anowar Creation</h2><p>Chat with Admin. Your conversation history is saved to your account.</p></div></div>
          <div class="support-chat-layout">
            <aside class="support-thread-list"><div class="support-list-heading"><b>Your conversations</b><button type="button" class="support-new-chat" onclick="startNewSupportConversation()">＋ New</button></div><div id="customerSupportThreads" class="support-thread-items"><p class="support-empty">Loading messages…</p></div></aside>
            <section class="support-chat-main"><div id="customerSupportThreadTitle" class="support-thread-title"><b>Start a new message</b><span>Ask a question about a service or order.</span></div><div id="customerSupportThreadMessages" class="support-chat-messages"><p class="support-empty">Choose a conversation or start a new one.</p></div><form id="customerSupportComposer" class="support-chat-composer" onsubmit="sendCustomerSupportMessage(event)"><label id="customerSupportSubjectWrap">Subject<input id="customerSupportSubject" maxlength="150" required placeholder="e.g. PAN application update"></label><label>Message<textarea id="customerSupportDraft" maxlength="4000" rows="3" required placeholder="Write your message to Admin…"></textarea></label><div id="customerSupportMessageStatus" class="support-chat-status" role="status"></div><button class="support-send-button" type="submit">Send Message →</button></form></section>
          </div>
        </div>
      </div>`);
  }
  function buildAdminInbox() {
    // Embedded Admin Portal on index.html.
    const embeddedNav = document.querySelector('#adminPage .admin-nav');
    if (embeddedNav && !$('embeddedSupportMessages')) {
      const button = document.createElement('button');
      button.type = 'button'; button.innerHTML = '💬 Messages';
      button.onclick = function () { if (typeof window.switchAdminSection === 'function') window.switchAdminSection('embeddedSupportMessages', this); window.loadAdminSupportConversations?.(); };
      const noticeBtn = [...embeddedNav.querySelectorAll('button')].find(b => /Notice Board/i.test(b.textContent));
      if (noticeBtn) noticeBtn.insertAdjacentElement('afterend', button); else embeddedNav.appendChild(button);
      const content = document.querySelector('#adminPage .admin-content');
      if (content) content.insertAdjacentHTML('beforeend', adminSectionMarkup('embeddedSupportMessages', true));
    }
    // Standalone Admin Portal at pages/admin.html.
    const standaloneNav = document.querySelector('.shell .nav');
    const standaloneContent = document.querySelector('.shell .content');
    if (standaloneNav && standaloneContent && !$('messages')) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = '💬 Messages';
      button.onclick = function () { if (typeof window.nav === 'function') window.nav('messages', this); window.loadAdminSupportConversations?.(); };
      const noticeBtn = [...standaloneNav.querySelectorAll('button')].find(b => /Notice Board/i.test(b.textContent));
      if (noticeBtn) noticeBtn.insertAdjacentElement('afterend', button); else standaloneNav.appendChild(button);
      standaloneContent.insertAdjacentHTML('beforeend', adminSectionMarkup('messages', false));
    }
  }
  function adminSectionMarkup(id, embedded) {
    const cls = embedded ? 'admin-section support-admin-section' : 'section support-admin-section';
    return `<section id="${id}" class="${cls}" ${embedded ? 'style="display:none"' : ''}>
      <div class="${embedded ? 'admin-card' : 'panel'} support-admin-panel">
        <div class="support-admin-heading"><div><h2>💬 Customer Messages</h2><p>Reply to customer questions here. All messages are saved and can be reopened later.</p></div><button type="button" class="${embedded ? 'admin-btn' : 'btn'}" onclick="loadAdminSupportConversations()">↻ Refresh</button></div>
        <div class="support-admin-layout"><aside id="supportAdminConversationList" class="support-admin-conversations"><p class="support-empty">Loading conversations…</p></aside><section class="support-admin-thread"><div id="supportAdminThreadTitle" class="support-thread-title"><b>Select a conversation</b><span>Customer messages will appear here.</span></div><div id="supportAdminThreadMessages" class="support-chat-messages"><p class="support-empty">Choose a customer conversation to read and reply.</p></div><form id="supportAdminReplyForm" class="support-chat-composer" onsubmit="sendAdminSupportReply(event)"><label>Reply to customer<textarea id="supportAdminReplyDraft" maxlength="4000" rows="3" required placeholder="Write your reply…" disabled></textarea></label><div id="supportAdminMessageStatus" class="support-chat-status" role="status"></div><button id="supportAdminSendButton" class="support-send-button" type="submit" disabled>Send Reply →</button></form></section></div>
      </div></section>`;
  }
  function renderConversations(list, rows, selectedId, selectFunctionName) {
    if (!list) return;
    if (!rows?.length) { list.innerHTML = '<p class="support-empty">No conversations yet.</p>'; return; }
    list.innerHTML = rows.map(row => `<button type="button" class="support-thread-option ${String(row.id) === String(selectedId) ? 'active' : ''}" data-thread-id="${esc(row.id)}"><b>${esc(row.subject || 'Support request')}</b><span>${esc(row.customer_name || row.customer_email || 'Customer')}</span><small>${esc(new Date(row.updated_at || row.created_at || Date.now()).toLocaleString('en-IN'))}</small><em>${esc(row.status || 'open')}</em></button>`).join('');
    list.querySelectorAll('[data-thread-id]').forEach(button => button.addEventListener('click', () => window[selectFunctionName]?.(button.dataset.threadId)));
  }
  function renderMessages(container, rows, currentUserId) {
    if (!container) return;
    if (!rows?.length) { container.innerHTML = '<p class="support-empty">No message is saved in this conversation yet. Earlier messages that failed with a permission error were not stored; send the message again below or reply here to start the saved chat history.</p>'; return; }
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 70;
    container.innerHTML = rows.map(m => {
      const mine = String(m.sender_id) === String(currentUserId);
      return `<article class="support-bubble ${mine ? 'mine' : 'theirs'}"><div class="support-bubble-meta"><b>${esc(m.sender_role === 'admin' ? 'Anowar Creation · Admin' : (mine ? 'You' : (m.sender_name || 'Customer')))}</b><time>${esc(new Date(m.created_at || Date.now()).toLocaleString('en-IN'))}</time></div><p>${esc(m.body || '').replace(/\n/g, '<br>')}</p></article>`;
    }).join('');
    if (nearBottom) container.scrollTop = container.scrollHeight;
  }
  async function fetchMessages(conversationId) {
    const c = client(); if (!c || !conversationId) return { data: [], error: null };
    return await c.from('support_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500);
  }
  async function loadCustomerSupportConversations(showStatus = false) {
    const user = signedInUser(), c = client(), list = $('customerSupportThreads');
    if (!list) return;
    if (!user || !c) { list.innerHTML = '<p class="support-empty">Please sign in to use Support Chat.</p>'; return; }
    const { data, error } = await c.from('support_conversations').select('*').eq('customer_id', user.id).order('updated_at', { ascending: false }).limit(100);
    if (error) { list.innerHTML = `<p class="support-empty">Could not load conversation history: ${esc(error.message)}. The Support SQL setup may be required.</p>`; return; }
    const rows = data || [];
    if (!rows.length) activeCustomerConversationId = null;
    else if (!activeCustomerConversationId || !rows.some(r => String(r.id) === String(activeCustomerConversationId))) activeCustomerConversationId = rows[0].id;
    renderConversations(list, rows, activeCustomerConversationId, 'selectCustomerSupportConversation');
    if (activeCustomerConversationId) await loadCustomerSupportThread(activeCustomerConversationId, false);
    else { $('customerSupportThreadTitle').innerHTML = '<b>Start a new message</b><span>Ask a question about a service or order.</span>'; $('customerSupportThreadMessages').innerHTML = '<p class="support-empty">Write a subject and message to begin.</p>'; $('customerSupportSubjectWrap').hidden = false; }
    if (showStatus && $('customerSupportMessageStatus')) $('customerSupportMessageStatus').textContent = '';
  }
  async function loadCustomerSupportThread(id, forceScroll = false) {
    const user = signedInUser(), c = client(); if (!user || !c || !id) return;
    const { data: conversations, error: convError } = await c.from('support_conversations').select('*').eq('id', id).eq('customer_id', user.id).limit(1);
    if (convError || !conversations?.length) { if ($('customerSupportMessageStatus')) $('customerSupportMessageStatus').textContent = convError?.message || 'This conversation is not available.'; return; }
    const thread = conversations[0]; activeCustomerConversationId = thread.id;
    if ($('customerSupportThreadTitle')) $('customerSupportThreadTitle').innerHTML = `<b>${esc(thread.subject || 'Support request')}</b><span>Status: ${esc(thread.status || 'open')}</span>`;
    if ($('customerSupportSubjectWrap')) $('customerSupportSubjectWrap').hidden = true;
    const { data, error } = await fetchMessages(id); if (error) { $('customerSupportThreadMessages').innerHTML = `<p class="support-empty">Could not load messages: ${esc(error.message)}</p>`; return; }
    renderMessages($('customerSupportThreadMessages'), data || [], user.id); if (forceScroll) $('customerSupportThreadMessages').scrollTop = $('customerSupportThreadMessages').scrollHeight;
  }
  async function selectCustomerSupportConversation(id) {
    activeCustomerConversationId = id; await loadCustomerSupportConversations();
  }
  function startNewSupportConversation() {
    activeCustomerConversationId = null;
    document.querySelectorAll('#customerSupportThreads .support-thread-option').forEach(x => x.classList.remove('active'));
    if ($('customerSupportThreadTitle')) $('customerSupportThreadTitle').innerHTML = '<b>New support message</b><span>Tell us which service or order you need help with.</span>';
    if ($('customerSupportThreadMessages')) $('customerSupportThreadMessages').innerHTML = '<p class="support-empty">Write your first message below. Admin replies will stay in this history.</p>';
    if ($('customerSupportSubjectWrap')) $('customerSupportSubjectWrap').hidden = false;
    if ($('customerSupportSubject')) { $('customerSupportSubject').value = ''; $('customerSupportSubject').focus(); }
    if ($('customerSupportDraft')) $('customerSupportDraft').value = '';
    if ($('customerSupportMessageStatus')) $('customerSupportMessageStatus').textContent = '';
  }
  async function sendCustomerSupportMessage(event) {
    event?.preventDefault?.(); const user = signedInUser(), c = client(), draft = $('customerSupportDraft'), status = $('customerSupportMessageStatus');
    const body = String(draft?.value || '').trim(), subject = String($('customerSupportSubject')?.value || '').trim();
    if (!user) { if (status) status.textContent = 'Please sign in again to send a support message.'; return; }
    if (!body) { if (status) status.textContent = 'Write your message first.'; return; }
    if (!activeCustomerConversationId && !subject) { if (status) status.textContent = 'Enter a subject for this new conversation.'; return; }
    if (!c) { if (status) status.textContent = 'Supabase connection is unavailable.'; return; }
    const sendButton = $('customerSupportComposer')?.querySelector('button[type="submit"]'); if (sendButton) { sendButton.disabled = true; sendButton.textContent = 'Sending…'; }
    try {
      let conversationId = activeCustomerConversationId;
      if (!conversationId) {
        const { data: conversation, error } = await c.from('support_conversations').insert({ customer_id: user.id, customer_name: profileName(user), customer_email: user.email || '', subject, status: 'open' }).select('*').single();
        if (error) throw error; conversationId = conversation.id; activeCustomerConversationId = conversationId;
      }
      // Use the database RPC so sender role and permissions are checked against auth.users on the server.
      const { error: sendError } = await c.rpc('send_support_message', { p_conversation_id: conversationId, p_body: body });
      if (sendError) throw sendError;
      if (draft) draft.value = ''; if ($('customerSupportMessageStatus')) $('customerSupportMessageStatus').textContent = 'Message sent. Your conversation history is saved.';
      if ($('customerSupportSubject')) $('customerSupportSubject').value = '';
      await loadCustomerSupportConversations(true); await loadCustomerSupportThread(conversationId, true);
    } catch (error) { console.error('Support message send failed', error); if (status) status.textContent = 'Could not send the message: ' + (error?.message || 'Check Support SQL/RLS setup.'); }
    finally { if (sendButton) { sendButton.disabled = false; sendButton.textContent = 'Send Message →'; } }
  }
  function openCustomerSupportChat() {
    const user = signedInUser();
    if (!user) { if (typeof window.openAuthScreen === 'function') window.openAuthScreen('login'); else alert('Please log in to use Support Chat.'); return; }
    createModal(); const modal = $('supportChatModal'); if (!modal) return;
    modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    loadCustomerSupportConversations(); if (customerRefreshTimer) clearInterval(customerRefreshTimer);
    customerRefreshTimer = setInterval(() => { if ($('supportChatModal')?.classList.contains('show')) loadCustomerSupportConversations(); }, 9000);
  }
  function closeSupportChat() {
    const modal = $('supportChatModal'); if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = ''; if (customerRefreshTimer) { clearInterval(customerRefreshTimer); customerRefreshTimer = null; }
  }

  async function loadAdminSupportConversations() {
    const user = signedInUser(), c = client(), list = $('supportAdminConversationList');
    if (!list) return;
    if (!user || String(user.email || '').toLowerCase() !== ADMIN_EMAIL || !c) { list.innerHTML = '<p class="support-empty">Admin sign-in is required to read customer messages.</p>'; return; }
    const { data, error } = await c.from('support_conversations').select('*').order('updated_at', { ascending: false }).limit(150);
    if (error) { list.innerHTML = `<p class="support-empty">Could not load messages: ${esc(error.message)}. Run the Support SQL setup.</p>`; return; }
    const rows = data || [];
    if (!rows.length) activeAdminConversationId = null;
    else if (!activeAdminConversationId || !rows.some(r => String(r.id) === String(activeAdminConversationId))) activeAdminConversationId = rows[0].id;
    renderConversations(list, rows, activeAdminConversationId, 'selectAdminSupportConversation');
    if (activeAdminConversationId) await loadAdminSupportThread(activeAdminConversationId);
    else { if ($('supportAdminThreadTitle')) $('supportAdminThreadTitle').innerHTML = '<b>No customer messages yet</b><span>New customer conversations will appear here.</span>'; if ($('supportAdminThreadMessages')) $('supportAdminThreadMessages').innerHTML = '<p class="support-empty">There are no conversations yet.</p>'; if ($('supportAdminReplyDraft')) $('supportAdminReplyDraft').disabled = true; if ($('supportAdminSendButton')) $('supportAdminSendButton').disabled = true; }
    if (!adminRefreshTimer) adminRefreshTimer = setInterval(() => { const visible = $('messages')?.classList.contains('active') || $('embeddedSupportMessages')?.classList.contains('active'); if (visible) loadAdminSupportConversations(); }, 12000);
  }
  async function selectAdminSupportConversation(id) { activeAdminConversationId = id; await loadAdminSupportConversations(); }
  async function loadAdminSupportThread(id) {
    const user = signedInUser(), c = client(); if (!user || !c || !id || String(user.email || '').toLowerCase() !== ADMIN_EMAIL) return;
    const { data: rows, error: convError } = await c.from('support_conversations').select('*').eq('id', id).limit(1);
    if (convError || !rows?.length) { if ($('supportAdminMessageStatus')) $('supportAdminMessageStatus').textContent = convError?.message || 'Conversation not found.'; return; }
    const thread = rows[0]; activeAdminConversationId = thread.id;
    if ($('supportAdminThreadTitle')) $('supportAdminThreadTitle').innerHTML = `<b>${esc(thread.subject || 'Support request')}</b><span>${esc(thread.customer_name || 'Customer')} · ${esc(thread.customer_email || '')} · Status: ${esc(thread.status || 'open')}</span>`;
    const { data, error } = await fetchMessages(id); if (error) { $('supportAdminThreadMessages').innerHTML = `<p class="support-empty">Could not load chat history: ${esc(error.message)}</p>`; return; }
    renderMessages($('supportAdminThreadMessages'), data || [], user.id);
    if ($('supportAdminReplyDraft')) $('supportAdminReplyDraft').disabled = false; if ($('supportAdminSendButton')) $('supportAdminSendButton').disabled = false;
  }
  async function sendAdminSupportReply(event) {
    event?.preventDefault?.(); const user = signedInUser(), c = client(), body = String($('supportAdminReplyDraft')?.value || '').trim(), status = $('supportAdminMessageStatus');
    if (!user || String(user.email || '').toLowerCase() !== ADMIN_EMAIL) { if (status) status.textContent = 'Please sign in with the Admin account.'; return; }
    if (!activeAdminConversationId || !body) { if (status) status.textContent = 'Select a conversation and write a reply.'; return; }
    const btn = $('supportAdminSendButton'); if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      // Admin replies go through the same hardened RPC; this fixes RLS denials from the direct client insert.
      const { error } = await c.rpc('send_support_message', { p_conversation_id: activeAdminConversationId, p_body: body });
      if (error) throw error;
      if ($('supportAdminReplyDraft')) $('supportAdminReplyDraft').value = ''; if (status) status.textContent = 'Reply sent and saved in the chat history.';
      await loadAdminSupportConversations(); await loadAdminSupportThread(activeAdminConversationId);
    } catch (error) { console.error('Admin reply failed', error); if (status) status.textContent = 'Could not send reply: ' + (error?.message || 'Check Support SQL/RLS setup.'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Send Reply →'; } }
  }

  window.openCustomerSupportChat = openCustomerSupportChat;
  window.openSupport = openCustomerSupportChat;
  window.closeSupportChat = closeSupportChat;
  window.startNewSupportConversation = startNewSupportConversation;
  window.selectCustomerSupportConversation = selectCustomerSupportConversation;
  window.sendCustomerSupportMessage = sendCustomerSupportMessage;
  window.loadAdminSupportConversations = loadAdminSupportConversations;
  window.selectAdminSupportConversation = selectAdminSupportConversation;
  window.sendAdminSupportReply = sendAdminSupportReply;

  document.addEventListener('DOMContentLoaded', function () {
    createModal(); buildAdminInbox();
    const oldSupport = document.querySelector('.support[href*="wa.me"]');
    if (oldSupport) { oldSupport.href = '#support'; oldSupport.removeAttribute('target'); oldSupport.removeAttribute('rel'); oldSupport.textContent = '💬 Message Admin'; oldSupport.onclick = event => { event.preventDefault(); openCustomerSupportChat(); }; }
    if ($('customerSupportThreadMessages')) $('customerSupportThreadMessages').addEventListener('keydown', e => { if (e.key === 'Escape') closeSupportChat(); });
    $('supportChatModal')?.addEventListener('click', event => { if (event.target.id === 'supportChatModal') closeSupportChat(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('supportChatModal')?.classList.contains('show')) closeSupportChat(); });
  });
})();
