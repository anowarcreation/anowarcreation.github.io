/* Shared customer/Admin service catalogue, prices, appointments and notices. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let serviceRows = [];
  let serviceLoadError = null;
  let currentNotice = null;
  let noticeRealtimeStarted = false;
  const baseServiceNames = [
    'PAN Card Services','Voter Card Services','Scholarship','DL PDF','RC PDF',
    'PDF Tools','Front Page Maker','PDF Print','Government Schemes','Service Rates','Support'
  ];
  const byName = name => serviceRows.find(row => String(row.name||'').toLowerCase() === String(name||'').toLowerCase());
  function client() {
    if (window.supabaseClient) return window.supabaseClient;
    try { if (typeof supabaseClient !== 'undefined') return supabaseClient; } catch (_) {}
    return null;
  }
  function slug(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,72) || 'service';
  }
  function keyForName(name) { const hit = byName(name); return hit?.service_key || slug(name); }
  function amountText(value) { return '₹' + (Number(value)||0).toLocaleString('en-IN',{maximumFractionDigits:2}); }
  function servicePriceLabel(row) {
    const d = row.price_details && typeof row.price_details === 'object' ? row.price_details : {};
    if (slug(row.name) === 'pdf-print' || row.service_key === 'pdf-print') {
      const bw = Number(d.bw_price ?? 5), color = Number(d.color_price ?? 10);
      return `B&W ${amountText(bw)}/page · Colour ${amountText(color)}/page`;
    }
    return Number(row.price) > 0 ? `${amountText(row.price)} / ${row.price_unit || 'service'}` : 'Price confirmed after appointment';
  }
  function priceForOrderName(name) {
    const n = String(name||'').toLowerCase();
    const rules = [
      [/pan/, 'pan-card-services'], [/voter|epic/, 'voter-card-services'],
      [/scholarship|svmcm|nsp|aikyashree/, 'scholarship'], [/\bdl\b|driving licence|driving license/, 'dl-pdf'],
      [/\brc\b|registration certificate/, 'rc-pdf'], [/front page|assignment cover/, 'front-page-maker'],
      [/pdf print/, 'pdf-print'], [/government scheme/, 'government-schemes'], [/support/, 'support']
    ];
    for (const [re,key] of rules) if (re.test(n)) { const row = serviceRows.find(s=>s.service_key===key); if(row) return row; }
    return serviceRows.find(row => n === String(row.name||'').toLowerCase()) || null;
  }
  function showMessage(id, message, isError=false) {
    const el = $(id); if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', !!isError);
  }
  function serviceAdminGridHtml() {
    if (serviceLoadError) return `<div class="portal-empty-state">Service database is not ready. Run <b>supabase-portal-management.sql</b> in Supabase SQL Editor. <small>${esc(serviceLoadError.message||'')}</small></div>`;
    if (!serviceRows.length) return '<div class="portal-empty-state">No services found yet. Click Add Service to create one.</div>';
    return serviceRows.map(row => {
      const key=esc(row.service_key), active=!!row.is_active;
      return `<article class="portal-management-card"><div class="portal-management-card-top"><span class="portal-service-icon">${esc(row.icon||'🛠️')}</span><span class="portal-state ${active?'is-on':'is-off'}">${active?'ON · AVAILABLE':'OFF · MAINTENANCE'}</span></div><h3>${esc(row.name)}</h3><p>${esc(row.description||'No description provided.')}</p><div class="portal-card-price">${esc(servicePriceLabel(row))}</div><div class="portal-card-actions"><button type="button" class="portal-toggle ${active?'is-on':'is-off'}" onclick="togglePortalService('${key}')">Turn ${active?'OFF':'ON'}</button><button type="button" class="portal-secondary-btn" onclick="viewPortalServiceAppointments('${key}')">View Appointments</button></div></article>`;
    }).join('');
  }
  function priceAdminGridHtml() {
    if (serviceLoadError) return `<div class="portal-empty-state">Price Management needs the database table. Run <b>supabase-portal-management.sql</b>. <small>${esc(serviceLoadError.message||'')}</small></div>`;
    if (!serviceRows.length) return '<div class="portal-empty-state">No services found.</div>';
    return serviceRows.map(row => {
      const key=esc(row.service_key), details=(row.price_details&&typeof row.price_details==='object')?row.price_details:{};
      const isPrint=row.service_key==='pdf-print'||slug(row.name)==='pdf-print';
      return `<article class="portal-management-card portal-price-card"><div class="portal-management-card-top"><span class="portal-service-icon">${esc(row.icon||'🛠️')}</span><span class="portal-state ${row.is_active?'is-on':'is-off'}">${row.is_active?'ACTIVE':'MAINTENANCE'}</span></div><h3>${esc(row.name)}</h3><p>${esc(row.description||'Set the rate customers should see.')}</p><label>Service Price (₹)<input type="number" min="0" step="0.01" id="portal-price-${key}" value="${Number(row.price)||0}"></label><label>Price Unit<select id="portal-unit-${key}">${['per service','per application','per page','fixed'].map(unit=>`<option value="${unit}" ${String(row.price_unit||'per service')===unit?'selected':''}>${unit}</option>`).join('')}</select></label>${isPrint?`<div class="portal-print-rates"><label>Black &amp; White (₹ / page)<input type="number" min="0" step="0.01" id="portal-bw-${key}" value="${Number(details.bw_price??5)}"></label><label>Colour (₹ / page)<input type="number" min="0" step="0.01" id="portal-color-${key}" value="${Number(details.color_price??10)}"></label></div>`:''}<button type="button" class="portal-toggle is-on" onclick="savePortalServicePrice('${key}')">Save Price</button><div class="portal-small-hint">Current customer display: ${esc(servicePriceLabel(row))}</div></article>`;
    }).join('');
  }
  function renderManagement() {
    ['portalServiceAdminGrid'].forEach(id=>{const el=$(id);if(el)el.innerHTML=serviceAdminGridHtml()});
    ['portalPriceAdminGrid'].forEach(id=>{const el=$(id);if(el)el.innerHTML=priceAdminGridHtml()});
    const serviceNotice = serviceLoadError ? 'Could not load services. Run the included Supabase SQL file, then refresh.' : `Loaded ${serviceRows.length} services from the shared catalogue.`;
    showMessage('portalServiceAdminMessage', serviceNotice, !!serviceLoadError);
    showMessage('portalPriceAdminMessage', serviceNotice, !!serviceLoadError);
    populateAppointmentFilters();
  }
  function customerCards() {
    const grid=$('services')?.querySelector('.grid'); if(!grid || serviceLoadError) return;
    const cards=[...grid.querySelectorAll(':scope > .card')];
    const matched=new Set();
    cards.forEach(card=>{
      const name=card.querySelector('h3')?.textContent?.trim(); if(!name)return;
      const row=byName(name); if(!row)return;
      matched.add(row.service_key); card.dataset.portalServiceKey=row.service_key;
      let price=card.querySelector('.portal-price-line');
      if(!price){price=document.createElement('div');price.className='portal-price-line';const button=card.querySelector('button');if(button)card.insertBefore(price,button);else card.appendChild(price)}
      price.textContent=servicePriceLabel(row);
      let badge=card.querySelector('.portal-maintenance-badge');
      if(!row.is_active){card.classList.add('portal-maintenance-card','disabled');if(!badge){badge=document.createElement('div');badge.className='portal-maintenance-badge';badge.textContent='🛠️ Under Maintenance';card.appendChild(badge)}const button=card.querySelector('button');if(button){if(!button.dataset.portalOriginalText)button.dataset.portalOriginalText=button.textContent||'';button.disabled=true;button.dataset.portalDisabled='true';button.textContent='Under Maintenance'}}
      else {
        card.classList.remove('portal-maintenance-card','disabled');badge?.remove();const button=card.querySelector('button');
        if(button?.dataset.portalDisabled==='true'){button.disabled=false;button.textContent=button.dataset.portalOriginalText||'Start';delete button.dataset.portalDisabled;delete button.dataset.portalOriginalText}
        if(button && row.service_key==='pdf-tools'){button.textContent='Open PDF Tools';button.onclick=()=>{const modal=$('pdfToolsModal');if(modal)modal.classList.add('show');else if(typeof window.openPdfTools==='function')window.openPdfTools()}}
        if(button && row.service_key==='government-schemes'){button.textContent='Start';button.onclick=()=>{if(typeof window.openAppointment==='function')window.openAppointment(row.name,row.description||'Describe the government scheme assistance you need.')}}
      }
    });
    // Only services created from Add Service become new customer cards; existing cards/flows remain intact.
    serviceRows.filter(row=>row.is_custom&&!matched.has(row.service_key)).forEach(row=>{
      const card=document.createElement('article');card.className='card portal-custom-service-card';card.dataset.portalServiceKey=row.service_key;
      card.innerHTML=`<div class="icon">${esc(row.icon||'🛠️')}</div><h3>${esc(row.name)}</h3><p>${esc(row.description||'Service appointment and assistance.')}</p><div class="portal-price-line">${esc(servicePriceLabel(row))}</div><button type="button" onclick="openPortalCustomService('${esc(row.service_key)}')">${row.is_active?'Book Appointment':'Under Maintenance'}</button>`;
      if(!row.is_active){card.classList.add('portal-maintenance-card');card.querySelector('button').disabled=true;card.insertAdjacentHTML('beforeend','<div class="portal-maintenance-badge">🛠️ Under Maintenance</div>')}
      grid.appendChild(card);
    });
    // Hide the permanent dashboard notice tile; published notices are displayed as a dismissible popup.
    const noticeTile=$('dashboardNotice')?.closest('.ac-dashboard-panel'); if(noticeTile) noticeTile.style.display='none';
    const bottom=document.querySelector('.ac-dashboard-bottom'); if(bottom)bottom.style.gridTemplateColumns='1fr';
  }
  function applyPrintRates() {
    const row=serviceRows.find(s=>s.service_key==='pdf-print'||slug(s.name)==='pdf-print'); if(!row)return;
    const d=row.price_details&&typeof row.price_details==='object'?row.price_details:{};
    const bw=Number(d.bw_price??5), color=Number(d.color_price??10);
    const select=$('printType'); if(select&&select.options.length>=2){select.options[0].text=`Black & White - ${amountText(bw)} / page`;select.options[1].text=`Colour - ${amountText(color)} / page`}
    const desc=$('printModal')?.querySelector('.desc span'); if(desc)desc.textContent=`Upload your PDF. Pages are counted automatically. B&W ${amountText(bw)}/page, Colour ${amountText(color)}/page.`;
    if(typeof window.calculatePrint==='function')window.calculatePrint();
  }
  async function refreshPortalServices() {
    const c=client(); if(!c)return;
    const {data,error}=await c.from('portal_services').select('*').order('sort_order',{ascending:true}).order('name',{ascending:true});
    serviceLoadError=error||null;
    serviceRows=error?[]:(data||[]);
    window.PortalServices=serviceRows;
    renderManagement(); customerCards(); applyPrintRates();
    if(!error) loadPortalNoticeAdmin(false);
    return {data:serviceRows,error};
  }
  async function togglePortalService(key) {
    const row=serviceRows.find(s=>s.service_key===key); if(!row)return;
    const c=client(); if(!c)return;
    showMessage('portalServiceAdminMessage','Saving service availability…');
    const {data:updated,error}=await c.from('portal_services').update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq('service_key',key).select('service_key,is_active').maybeSingle();
    if(error||!updated){showMessage('portalServiceAdminMessage','Could not update service. '+(error?.message||'No row was updated; check admin permission / SQL setup.'),true);return}
    await refreshPortalServices();
    showMessage('portalServiceAdminMessage',`${row.name} is now ${!row.is_active?'ON and available':'OFF and marked Under Maintenance'}.`);
  }
  async function savePortalServicePrice(key) {
    const row=serviceRows.find(s=>s.service_key===key); if(!row)return;
    const priceEl=$('portal-price-'+key),unitEl=$('portal-unit-'+key);
    const price=Number(priceEl?.value);
    if(!Number.isFinite(price)||price<0){showMessage('portalPriceAdminMessage','Enter a valid non-negative price.',true);return}
    const payload={price,price_unit:unitEl?.value||'per service',updated_at:new Date().toISOString()};
    if(key==='pdf-print'){
      const bw=Number($('portal-bw-'+key)?.value),color=Number($('portal-color-'+key)?.value);
      if(!Number.isFinite(bw)||bw<0||!Number.isFinite(color)||color<0){showMessage('portalPriceAdminMessage','Enter valid B&W and Colour rates.',true);return}
      payload.price_details={...(row.price_details||{}),bw_price:bw,color_price:color};
    }
    const c=client(); const {data:updated,error}=await c.from('portal_services').update(payload).eq('service_key',key).select('service_key,price').maybeSingle();
    if(error||!updated){showMessage('portalPriceAdminMessage','Could not save price: '+(error?.message||'No row was updated. Check admin permission / SQL setup.'),true);return}
    await refreshPortalServices();showMessage('portalPriceAdminMessage',`Price saved for ${row.name}. Customer panel will show the updated rate after refresh.`);
  }
  function openPortalServiceModal() {
    const modal=$('portalServiceModal'); if(!modal)return;
    $('portalServiceForm')?.reset(); if($('newPortalServiceIcon'))$('newPortalServiceIcon').value='🛠️'; if($('newPortalServicePrice'))$('newPortalServicePrice').value='0';
    showMessage('portalServiceFormMessage',''); modal.hidden=false;modal.classList.add('open');
    $('newPortalServiceName')?.focus();
  }
  function closePortalServiceModal(){const modal=$('portalServiceModal');if(modal){modal.classList.remove('open');modal.hidden=true}}
  async function createPortalService(event) {
    event?.preventDefault?.();
    const name=$('newPortalServiceName')?.value?.trim(),description=$('newPortalServiceDescription')?.value?.trim(),icon=$('newPortalServiceIcon')?.value?.trim()||'🛠️',price=Number($('newPortalServicePrice')?.value||0),unit=$('newPortalServiceUnit')?.value||'per service';
    if(!name||!description||!Number.isFinite(price)||price<0){showMessage('portalServiceFormMessage','Please enter a valid name, description and price.',true);return}
    const c=client(); if(!c){showMessage('portalServiceFormMessage','Supabase connection is unavailable.',true);return}
    let key=slug(name); if(serviceRows.some(s=>s.service_key===key)) key=`${key}-${Math.random().toString(36).slice(2,6)}`;
    showMessage('portalServiceFormMessage','Saving new service…');
    const {error}=await c.from('portal_services').insert({service_key:key,name,description,icon,price,price_unit:unit,price_details:{},is_active:true,is_custom:true,sort_order:Math.max(100,...serviceRows.map(s=>Number(s.sort_order)||0))+1});
    if(error){showMessage('portalServiceFormMessage','Could not add service: '+error.message+'. Ensure the SQL setup has been run.',true);return}
    closePortalServiceModal();await refreshPortalServices();showMessage('portalServiceAdminMessage',`“${name}” has been added. It will appear in the customer panel when refreshed.`);
  }
  function appointmentFilterElement(){return $('serviceAppointmentFilter')||$('adminAppointmentServiceFilter')}
  function populateAppointmentFilters() {
    const select=appointmentFilterElement(); if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">All services</option>'+serviceRows.map(s=>`<option value="${esc(s.service_key)}">${esc(s.name)}</option>`).join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
  }
  async function renderPortalAppointments() {
    const body=$('serviceAppointmentsBody')||$('adminAppointmentsBody');if(!body)return;
    const orders=window.AdminOrders||(Array.isArray(window.adminOrdersCache)?window.adminOrdersCache:[]);
    const select=appointmentFilterElement(),filter=select?.value||'';
    const rows=orders.filter(o=>{const isPrint=String(o.service||'').toLowerCase().includes('pdf print');if(!filter)return !isPrint;return (priceForOrderName(o.service)?.service_key===filter||String(o.service||'').toLowerCase()===String(serviceRows.find(s=>s.service_key===filter)?.name||'').toLowerCase());});
    if(!rows.length){body.innerHTML=`<tr><td colspan="8" class="${body.id==='serviceAppointmentsBody'?'':'admin-empty'}">No appointments found for this service.</td></tr>`;return}
    body.innerHTML='<tr><td colspan="8">Loading appointment updates…</td></tr>';
    const rendered=await Promise.all(rows.map(async o=>{
      const id=String(o.order_id||o.id||'').replace(/[^a-zA-Z0-9_-]/g,'');
      const detail=typeof window.formatRequirement==='function'?window.formatRequirement(o.requirement||'',true):esc(o.requirement||'No details');
      const status=String(o.status||'Application Submitted');
      const statusOptions=['Application Submitted','Under Process','Successfully Completed','Rejected','Declined'];
      const changeHandler=body.id==='serviceAppointmentsBody'?'updateStatus':'updateApplicationStatus';
      const selectHTML=`<select class="admin-status-select" onchange="${changeHandler}('${id}',this.value${changeHandler==='updateApplicationStatus'?',true':''})">${statusOptions.map(v=>`<option ${v.toLowerCase()===status.toLowerCase()?'selected':''}>${v}</option>`).join('')}</select>`;
      const tools=typeof window.adminCustomerUpdateControls==='function'?await window.adminCustomerUpdateControls(o,body.id==='serviceAppointmentsBody'?'page-appointment':'appointment'):'';
      const date=o.created_at?new Date(o.created_at).toLocaleString('en-IN'):'';
      if(body.id==='serviceAppointmentsBody')return `<tr><td><b>${esc(o.order_id||o.id||'')}</b></td><td>${esc(o.customer_name||o.name||'—')}</td><td>${esc(o.phone||'—')}</td><td>${esc(o.service||'—')}</td><td>${detail}</td><td>${selectHTML}</td><td>${esc(date)}</td><td><button type="button" onclick="viewOrder('${id}')">View</button>${tools}</td></tr>`;
      return `<tr><td><b>${esc(o.order_id||o.id||'')}</b></td><td>${esc(o.customer_name||o.name||'—')}</td><td>${esc(o.phone||'—')}</td><td>${esc(o.service||'—')}</td><td>${detail}</td><td>${selectHTML}</td><td>${tools}</td><td>${esc(date)}</td></tr>`;
    }));
    body.innerHTML=rendered.join('');
  }
  function viewPortalServiceAppointments(key) {
    const select=appointmentFilterElement();if(select)select.value=key;
    if(typeof window.nav==='function')window.nav('appointments',document.querySelector('.nav button[onclick*="nav(\'appointments\'"]'));
    if(typeof window.switchAdminSection==='function')window.switchAdminSection('adminAppointments',document.querySelector('.admin-nav button[onclick*="adminAppointments"]'));
    renderPortalAppointments();
  }
  function openPortalCustomService(key) {
    const row=serviceRows.find(s=>s.service_key===key);if(!row)return;
    if(!row.is_active){if(typeof window.openInfo==='function')window.openInfo('Under Maintenance',`${row.name} is temporarily unavailable. Please try again later.`);return}
    if(typeof window.openAppointment==='function')window.openAppointment(row.name,`${row.description||'Submit an appointment request.'}`);
  }
  // Shared price lookup powers new/custom services as well as existing service variants.
  window.getPortalServiceForOrder=priceForOrderName;
  if(typeof window.createAppointment==='function'){
    window.createAppointment=async function(service,name,phone,requirement,explicitAmount){
      const row=priceForOrderName(service);const amount=Number.isFinite(Number(explicitAmount))?Number(explicitAmount):(Number(row?.price)||0);
      if(!window.createOrder){if(typeof window.openInfo==='function')window.openInfo('Could not submit','Please refresh the page and try again.');return null}
      const order=await window.createOrder(service,amount,'N/A',name,phone,requirement,'Appointment Created');
      if(order&&window.showResult)window.showResult('🎉','Appointment Created','Thank You, Our Team Will Connect You Soon.','Your Appointment No.',order.id,order.service);
      return order;
    };
  }
  // Customer-specific price notice. The appointment price remains a quote and the service's own flow is retained.
  if(typeof window.openAppointment==='function'){
    const priorOpenAppointment=window.openAppointment;
    window.openAppointment=function(service,description){const row=priceForOrderName(service);const priced=Number(row?.price)>0?`${description||''}\nCurrent rate: ${servicePriceLabel(row)}.`:description;return priorOpenAppointment(service,priced)};
  }
  window.calculatePrint=function(){
    const row=serviceRows.find(s=>s.service_key==='pdf-print'||slug(s.name)==='pdf-print');const d=row?.price_details||{};const bw=Number(d.bw_price??5),color=Number(d.color_price??10);
    const kind=$('printType')?.value||'bw',rate=kind==='color'?color:bw;const pages=Number($('pageCount')?.textContent||0);
    try { if (typeof currentAmount !== 'undefined') currentAmount = pages * rate; } catch (_) {}
    if($('rate'))$('rate').textContent=`${amountText(rate)} / page`;if($('printTotal'))$('printTotal').textContent=amountText(pages*rate);return pages*rate;
  };
  window.showRates=function(){
    const lines=serviceRows.filter(s=>Number(s.price)>0||s.service_key==='pdf-print').map(s=>`• ${s.name}: ${servicePriceLabel(s)}`);
    const msg=lines.length?lines.join('\n'):'No custom rates have been set yet. Please contact Anowar Creation for pricing.';
    if(typeof window.openInfo==='function')window.openInfo('💰 Service Rates',msg);else alert(msg);
  };

  function safeNoticeHtml(html){
    if(typeof window.sanitizeNoticeHtml==='function')return window.sanitizeNoticeHtml(html);
    const box=document.createElement('div');box.innerHTML=String(html||'');
    box.querySelectorAll('script,style,iframe,object,embed,form,video,audio').forEach(el=>el.remove());
    box.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{const n=a.name.toLowerCase(),v=String(a.value||'').trim().toLowerCase();if(n.startsWith('on')||n==='srcdoc'||((n==='href'||n==='src')&&(v.startsWith('javascript:')||v.startsWith('data:text'))))el.removeAttribute(a.name)})});return box.innerHTML;
  }
  function noticeEls(){return {title:$('portalNoticeTitle')||$('noticeTitle'),content:$('portalNoticeContent')||$('noticeEditor'),message:$('portalNoticeMessage')||$('noticeAdminMessage'),current:$('portalNoticeCurrent')||$('noticeCurrentPreview')};}
  function noticeContent(el){if(!el)return '';if(el.id==='noticeEditor')return safeNoticeHtml(el.innerHTML);return String(el.value||'').trim().split(/\r?\n/).map(line=>line.trim()?`<p>${esc(line)}</p>`:'').join('')}
  async function loadPortalNoticeAdmin(showMessage=true){
    const el=noticeEls();if(!el.title||!el.content||!el.message)return;
    const c=client();if(!c)return;
    if(showMessage)el.message.textContent='Loading current notice…';
    const {data,error}=await c.from('site_notices').select('*').order('updated_at',{ascending:false}).limit(10);
    if(error){el.message.textContent='Notice Board database/policy error: '+error.message+'. Run supabase-portal-management.sql in Supabase SQL Editor.';el.current&&(el.current.textContent='Notice setup required.');return}
    currentNotice=(data||[]).find(n=>n.is_active)||null;
    if(currentNotice){el.title.value=currentNotice.title||'';if(el.content.id==='noticeEditor')el.content.innerHTML=safeNoticeHtml(currentNotice.content||'');else el.content.value=String(currentNotice.content||'').replace(/<\/(p|div|li)>/gi,'\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').trim();if(el.current)el.current.innerHTML=`<b>${esc(currentNotice.title||'Notice')}</b><p>${esc(String(currentNotice.content||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim())}</p><small>Updated ${currentNotice.updated_at?new Date(currentNotice.updated_at).toLocaleString('en-IN'):''}</small>`;if(showMessage)el.message.textContent='Active notice loaded. Publishing updates the customer panel.'}
    else {if(el.current)el.current.innerHTML='<p>No active notice.</p>';if(showMessage)el.message.textContent='No active notice. Write one above and publish it.'}
  }
  async function publishPortalNotice(event){
    event?.preventDefault?.();const el=noticeEls(),title=el.title?.value?.trim(),content=noticeContent(el);
    if(!title||!String(el.content?.innerText||el.content?.value||'').trim()){if(el.message)el.message.textContent='Enter a title and notice message.';return}
    const c=client();if(!c){if(el.message)el.message.textContent='Supabase connection is unavailable.';return}
    if(el.message)el.message.textContent='Publishing notice…';
    const {data:userResult}=await c.auth.getUser();if(!userResult?.user||String(userResult.user.email||'').toLowerCase()!== 'anowarali2707@outlook.com'){if(el.message)el.message.textContent='Please sign in with the admin account to publish notices.';return}
    const {error:deactivateError}=await c.from('site_notices').update({is_active:false,updated_at:new Date().toISOString()}).eq('is_active',true);
    if(deactivateError){if(el.message)el.message.textContent='Could not update active notice: '+deactivateError.message;return}
    const payload={title,content,is_active:true,updated_at:new Date().toISOString(),created_by:userResult.user.id};
    const result=currentNotice?.id?await c.from('site_notices').update(payload).eq('id',currentNotice.id).select().single():await c.from('site_notices').insert(payload).select().single();
    if(result.error){if(el.message)el.message.textContent='Could not publish notice: '+result.error.message;return}
    currentNotice=result.data; if(el.current)el.current.innerHTML=`<b>${esc(title)}</b><p>${esc(String(el.content?.innerText||el.content?.value||'').trim())}</p><small>Published just now. It will appear as a popup in the customer panel.</small>`;
    if(el.message)el.message.textContent='Notice published. Customer panels show it in the notice popup; already-open panels refresh automatically.';
    await loadCustomerNotice(true);
  }
  async function deactivatePortalNotice(){const el=noticeEls();const c=client();if(!c)return;if(!currentNotice?.id){await loadPortalNoticeAdmin();if(el.message)el.message.textContent='No active notice to remove.';return}const {error}=await c.from('site_notices').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',currentNotice.id);if(error){if(el.message)el.message.textContent='Could not remove notice: '+error.message;return}currentNotice=null;if(el.title)el.title.value='';if(el.content){if(el.content.id==='noticeEditor')el.content.innerHTML='';else el.content.value=''}if(el.current)el.current.innerHTML='<p>No active notice.</p>';if(el.message)el.message.textContent='Active notice removed.';const pop=$('customerNoticePopup');if(pop)pop.hidden=true}
  async function loadCustomerNotice(forceShow=false){
    const popup=$('customerNoticePopup');if(!popup)return;
    let loggedIn=false;try{loggedIn=!!(typeof currentUser!=='undefined'&&currentUser)}catch(_){}
    if(!loggedIn){popup.hidden=true;return}
    const c=client();if(!c)return;
    const {data,error}=await c.from('site_notices').select('id,title,content,updated_at').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data){popup.hidden=true;return}
    const token=String(data.id)+':'+String(data.updated_at||'');let dismissed='';try{dismissed=localStorage.getItem('ac-dismissed-notice')||''}catch(_){}
    if(!forceShow&&dismissed===token){popup.hidden=true;return}
    $('customerNoticeTitle').textContent=data.title||'Notice';$('customerNoticeContent').innerHTML=safeNoticeHtml(data.content||'');popup.dataset.noticeToken=token;popup.hidden=false;
  }
  function startNoticeRefresh(){
    if(noticeRealtimeStarted)return;noticeRealtimeStarted=true;const c=client();if(!c)return;
    try{c.channel('portal-notice-live').on('postgres_changes',{event:'*',schema:'public',table:'site_notices'},()=>loadCustomerNotice(true)).subscribe();c.channel('portal-services-live').on('postgres_changes',{event:'*',schema:'public',table:'portal_services'},()=>refreshPortalServices()).subscribe()}catch(_){/* periodic refresh below is the fallback */}
    window.setInterval(()=>loadCustomerNotice(false),45000);
  }
  function dismissPortalNotice(){const popup=$('customerNoticePopup');if(!popup)return;try{localStorage.setItem('ac-dismissed-notice',popup.dataset.noticeToken||'')}catch(_){}popup.hidden=true}

  // Public globals used by buttons in both admin panels.
  window.loadPortalManagement=refreshPortalServices;window.refreshPortalManagementUI=renderManagement;window.refreshPortalServices=refreshPortalServices;
  window.togglePortalService=togglePortalService;window.savePortalServicePrice=savePortalServicePrice;
  window.openPortalServiceModal=openPortalServiceModal;window.closePortalServiceModal=closePortalServiceModal;window.createPortalService=createPortalService;
  window.renderPortalAppointments=renderPortalAppointments;window.viewPortalServiceAppointments=viewPortalServiceAppointments;window.openPortalCustomService=openPortalCustomService;
  // The separate Admin panel uses this handler for status changes in the service-filtered appointments table.
  window.updateAppointmentStatus=(orderId,status)=>typeof window.updateStatus==='function'?window.updateStatus(orderId,status):Promise.resolve();
  window.loadPortalNoticeAdmin=loadPortalNoticeAdmin;window.publishPortalNotice=publishPortalNotice;window.deactivatePortalNotice=deactivatePortalNotice;
  // Make the established embedded Admin Notice Board buttons use the same shared table and behavior.
  window.loadAdminNotices=loadPortalNoticeAdmin;window.publishNotice=publishPortalNotice;window.deactivateNotice=deactivatePortalNotice;
  window.loadPublicNotice=loadCustomerNotice;window.dismissCustomerNotice=dismissPortalNotice;

  document.addEventListener('DOMContentLoaded',()=>{
    refreshPortalServices();
    loadPortalNoticeAdmin(false);
    if($('dashboardNotice')?.closest('.ac-dashboard-panel'))$('dashboardNotice').closest('.ac-dashboard-panel').style.display='none';
    startNoticeRefresh();
    const c=client();if(c)c.auth.getSession().then(({data})=>{if(data?.session){loadCustomerNotice(true);refreshPortalServices()} });
  });
})();
