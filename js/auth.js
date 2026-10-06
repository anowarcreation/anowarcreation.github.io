import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase.js';

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE'));
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const message = document.getElementById('message');

function showMessage(text, type='info') {
  if (!message) return;
  message.textContent = text;
  message.dataset.type = type;
  message.classList.add('show');
}
function setBusy(form, busy) {
  const btn = form?.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = busy; btn.style.opacity = busy ? '.6' : '1'; }
}
function goDashboard() { window.location.href = '../pages/dashboard.html'; }

for (const btn of document.querySelectorAll('[data-toggle="password"]')) {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? 'SHOW' : 'HIDE';
  });
}

// Customer login
const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase) return showMessage('Supabase is not configured.', 'error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  setBusy(loginForm, true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(loginForm, false);
  if (error) return showMessage(error.message, 'error');
  goDashboard();
});

// Customer registration
const registerForm = document.getElementById('registerForm');
if (registerForm) registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase) return showMessage('Supabase is not configured.', 'error');
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (password !== confirmPassword) return showMessage('Passwords do not match.', 'error');
  setBusy(registerForm, true);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  setBusy(registerForm, false);
  if (error) return showMessage(error.message, 'error');
  if (data.session) return goDashboard();
  showMessage('Account created. If email confirmation is enabled, check your email before logging in.', 'success');
});

// Admin login: admin users must have user_metadata.role === 'admin'.
const adminForm = document.getElementById('adminLoginForm');
if (adminForm) adminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase) return showMessage('Supabase is not configured.', 'error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  setBusy(adminForm, true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(adminForm, false);
  if (error) return showMessage(error.message, 'error');
  if (data.user?.user_metadata?.role !== 'admin') {
    await supabase.auth.signOut();
    return showMessage('This account does not have admin access.', 'error');
  }
  window.location.href = '../pages/admin.html';
});

// Forgot password
const forgot = document.getElementById('forgotLink');
if (forgot) forgot.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!supabase) return showMessage('Supabase is not configured.', 'error');
  const email = document.getElementById('email')?.value.trim();
  if (!email) return showMessage('Enter your email first, then click Forgot Password.', 'error');
  const redirectTo = `${window.location.origin}/auth/reset-password.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  showMessage(error ? error.message : 'Password reset instructions have been sent if this email is registered.', error ? 'error' : 'success');
});

// Password recovery page
const resetForm = document.getElementById('resetForm');
if (resetForm) {
  if (supabase) {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) showMessage('Open this page using the password reset link sent to your email.', 'error');
    });
  }
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return showMessage('Supabase is not configured.', 'error');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) return showMessage('Passwords do not match.', 'error');
    setBusy(resetForm, true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(resetForm, false);
    if (error) return showMessage(error.message, 'error');
    showMessage('Password updated successfully. Redirecting to login...', 'success');
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
  });
}
