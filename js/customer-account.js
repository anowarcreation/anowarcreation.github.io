(function(){
  'use strict';
  const c=window.supabaseClient;
  const $=id=>document.getElementById(id);
  const say=(text,ok=false)=>{const el=$('customerPasswordMessage');if(el){el.textContent=text;el.className=ok?'success':'error'}};
  async function init(){
    if(!c)return;
    const {data,error}=await c.auth.getUser();
    if(error||!data?.user){location.href='../auth/login.html';return}
    const mustChange=!!data.user.user_metadata?.must_change_password;
    if(mustChange){$('accountSecurity')?.classList.add('password-required');$('passwordHelp').textContent='Your admin-issued temporary password must be replaced before you continue.';$('customerServicesGrid').hidden=true;}
  }
  async function changeCustomerPassword(event){
    event.preventDefault();const a=$('newCustomerPassword').value,b=$('confirmCustomerPassword').value;
    if(a.length<8){say('Use at least 8 characters.');return}
    if(a!==b){say('The passwords do not match.');return}
    say('Updating password…');
    const {data,error}=await c.auth.updateUser({password:a,data:{must_change_password:false,temporary_password_issued_at:null}});
    if(error){say('Password could not be updated: '+error.message);return}
    $('customerPasswordForm').reset();$('customerServicesGrid').hidden=false;$('accountSecurity').classList.remove('password-required');$('passwordHelp').textContent='Your password has been updated successfully.';say('Password changed successfully.',true);
  }
  async function customerLogout(){await c?.auth.signOut();location.href='../auth/login.html'}
  window.changeCustomerPassword=changeCustomerPassword;window.customerLogout=customerLogout;
  document.addEventListener('DOMContentLoaded',init);
})();
