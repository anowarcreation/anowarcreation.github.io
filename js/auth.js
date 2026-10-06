const sb = window.supabaseClient;

function $(id){return document.getElementById(id)}
function message(text,type='error'){const el=$('message');if(!el)return;el.textContent=text;el.className='msg '+type;el.classList.remove('hidden')}
function showPassword(inputId,button){const input=$(inputId);input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'SHOW':'HIDE'}

async function register(){
  const name=$('name')?.value.trim();
  const email=$('email')?.value.trim().toLowerCase();
  const phone=$('phone')?.value.trim();
  const password=$('password')?.value;
  const confirm=$('confirm')?.value;
  if(!name||!email||!phone||!password||!confirm)return message('Please fill in all fields.');
  if(password.length<6)return message('Password must be at least 6 characters.');
  if(password!==confirm)return message('Passwords do not match.');

  const {data,error}=await sb.auth.signUp({
    email,
    password,
    options:{data:{name,mobile_number:phone}}
  });
  if(error)return message(error.message);
  if(!data.user)return message('Account could not be created.');

  // Save profile details temporarily until the email OTP is verified.
  sessionStorage.setItem('pendingProfile',JSON.stringify({
    auth_id:data.user.id, user_id:email, name, email, mobile_number:phone
  }));
  sessionStorage.setItem('pendingEmail',email);

  location.href=`verify-email.html?email=${encodeURIComponent(email)}`;
}

async function verifyEmail(){
  const email=(sessionStorage.getItem('pendingEmail')||$('email')?.value.trim().toLowerCase());
  const token=$('otp')?.value.trim();
  if(!email||!token)return message('Enter the 6-digit OTP sent to your email.');
  if(!/^\d{6}$/.test(token))return message('OTP must be 6 digits.');

  const {data,error}=await sb.auth.verifyOtp({email,token,type:'email'});
  if(error)return message(error.message);
  if(!data.user)return message('Email verification failed. Please try again.');

  let pending={};
  try{pending=JSON.parse(sessionStorage.getItem('pendingProfile')||'{}')}catch(e){}
  const profile={
    auth_id:data.user.id,
    user_id:pending.user_id||email,
    name:pending.name||data.user.user_metadata?.name||'',
    email:data.user.email||email,
    mobile_number:pending.mobile_number||data.user.user_metadata?.mobile_number||'',
    phone_verified:false,
    account_created:new Date().toISOString()
  };

  const {error:profileError}=await sb.from('profiles').upsert(profile,{onConflict:'auth_id'});
  if(profileError)return message('Email verified, but profile could not be saved: '+profileError.message);

  sessionStorage.removeItem('pendingProfile');
  sessionStorage.removeItem('pendingEmail');
  message('Email verified successfully. Redirecting...','success');
  setTimeout(()=>location.href='../pages/dashboard.html',700);
}

async function resendEmailOtp(){
  const email=(sessionStorage.getItem('pendingEmail')||$('email')?.value.trim().toLowerCase());
  if(!email)return message('Enter your email address.');
  const {error}=await sb.auth.resend({type:'signup',email});
  if(error)return message(error.message);
  message('A new OTP has been sent to your email.','success');
}

async function login(){
  const email=$('email')?.value.trim().toLowerCase();
  const password=$('password')?.value;
  if(!email||!password)return message('Enter your email and password.');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)return message(error.message);
  if(data.user){message('Login successful. Redirecting...','success');setTimeout(()=>location.href='../pages/dashboard.html',500)}
}

async function logout(){await sb.auth.signOut();location.href='../index.html'}

async function resetPassword(){
  const email=$('email')?.value.trim().toLowerCase();
  if(!email)return message('Enter your email address.');
  const redirect=location.origin+location.pathname.replace(/\/auth\/[^/]+$/,'/auth/reset-password.html');
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirect});
  if(error)return message(error.message);
  message('Password reset email sent. Check your inbox.','success');
}

async function updatePassword(){
  const password=$('password')?.value;
  const confirm=$('confirm')?.value;
  if(!password||password.length<6)return message('Password must be at least 6 characters.');
  if(password!==confirm)return message('Passwords do not match.');
  const {error}=await sb.auth.updateUser({password});
  if(error)return message(error.message);
  message('Password updated successfully. You can now login.','success');
}

async function adminLogin(){
  const email=$('email')?.value.trim().toLowerCase();
  const password=$('password')?.value;
  if(!email||!password)return message('Enter admin email and password.');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)return message(error.message);
  const {data:profile,error:profileError}=await sb.from('profiles').select('user_id,email').eq('auth_id',data.user.id).maybeSingle();
  if(profileError||!profile)return message('Admin profile not found.');
  const admins=['admin@anowarcreation.com'];
  if(!admins.includes(profile.email.toLowerCase())){await sb.auth.signOut();return message('This account is not authorized for Admin Panel.');}
  location.href='../pages/admin.html';
}

window.register=register;window.verifyEmail=verifyEmail;window.resendEmailOtp=resendEmailOtp;window.login=login;window.logout=logout;window.resetPassword=resetPassword;window.updatePassword=updatePassword;window.adminLogin=adminLogin;window.showPassword=showPassword;
