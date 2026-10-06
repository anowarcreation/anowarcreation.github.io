import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase.js';

const configured = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const message = document.getElementById('message');

function showMessage(text){ if(!message) return; message.textContent=text; message.classList.add('show'); }
function setBusy(form,busy){ const btn=form?.querySelector('button[type="submit"]'); if(btn){btn.disabled=busy;btn.style.opacity=busy?.6:1;} }

for(const btn of document.querySelectorAll('[data-toggle="password"]')){
  btn.addEventListener('click',()=>{ const input=btn.previousElementSibling; if(!input) return; input.type=input.type==='password'?'text':'password'; btn.textContent=input.type==='password'?'SHOW':'HIDE'; });
}

const loginForm=document.getElementById('loginForm');
if(loginForm) loginForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!supabase){showMessage('Supabase is not configured yet. Add your Supabase URL and anon public key in config/supabase.js first.');return;}
  setBusy(loginForm,true);
  const {error}=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});
  setBusy(loginForm,false);
  if(error){showMessage(error.message);return;}
  window.location.href='../pages/dashboard.html';
});

const registerForm=document.getElementById('registerForm');
if(registerForm) registerForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!supabase){showMessage('Supabase is not configured yet. Add your Supabase URL and anon public key in config/supabase.js first.');return;}
  if(password.value!==confirmPassword.value){showMessage('Passwords do not match.');return;}
  setBusy(registerForm,true);
  const {data,error}=await supabase.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{full_name:name.value.trim()}}});
  setBusy(registerForm,false);
  if(error){showMessage(error.message);return;}
  if(data.session) window.location.href='../pages/dashboard.html';
  else showMessage('Account created. Check your email if email confirmation is enabled, then login.');
});

const adminForm=document.getElementById('adminLoginForm');
if(adminForm) adminForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!supabase){showMessage('Supabase is not configured yet. Add your Supabase URL and anon public key in config/supabase.js first.');return;}
  setBusy(adminForm,true);
  const {data,error}=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});
  setBusy(adminForm,false);
  if(error){showMessage(error.message);return;}
  const role=data.user?.user_metadata?.role;
  if(role!=='admin'){await supabase.auth.signOut();showMessage('This account does not have admin access.');return;}
  window.location.href='../pages/admin.html';
});

const forgot=document.getElementById('forgotLink');
if(forgot) forgot.addEventListener('click',async e=>{
  e.preventDefault();
  if(!supabase){showMessage('Supabase is not configured yet.');return;}
  const address=document.getElementById('email')?.value.trim();
  if(!address){showMessage('Enter your email first, then click Forgot Password.');return;}
  const {error}=await supabase.auth.resetPasswordForEmail(address,{redirectTo:location.origin+location.pathname});
  showMessage(error?error.message:'Password reset instructions have been sent if this email is registered.');
});
