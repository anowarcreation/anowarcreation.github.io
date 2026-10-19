(function(){
  const EXAM_URL='https://anowarcreation.github.io/anowarcreation-online-exam/exam/';
  window.openAuthScreen=function(mode='login'){
    const auth=document.getElementById('authScreen');if(!auth)return;
    if(document.getElementById('publicSite'))document.getElementById('publicSite').style.display='none';
    const app=document.querySelector('.app');if(app&&!window.currentUser)app.style.display='none';
    auth.style.display='flex';auth.setAttribute('aria-hidden','false');
    if(typeof window.authMode==='function')window.authMode(mode==='register'?'register':'login');
    document.body.style.overflow='hidden';
  };
  window.closeAuthScreen=function(){
    const auth=document.getElementById('authScreen');if(auth){auth.style.display='none';auth.setAttribute('aria-hidden','true')}
    const app=document.querySelector('.app');const pub=document.getElementById('publicSite');if(pub&&(!app||app.style.display!=='flex'))pub.style.display='block';
    const clean=new URL(window.location.href);['auth','service','tool'].forEach(key=>clean.searchParams.delete(key));if(window.history?.replaceState)history.replaceState({},'',clean.pathname+(clean.search||'')+(clean.hash||''));
    document.body.style.overflow='';
  };
  window.handlePublicAuthLink=function(event,mode){
    // The links on the home page use the embedded, existing Supabase auth form.
    if(document.getElementById('authScreen')){event.preventDefault();window.openAuthScreen(mode);return false;}
    return true;
  };
  window.togglePublicNav=function(){const nav=document.getElementById('pubNav');if(nav)nav.classList.toggle('open')};
  window.toggleExamMenu=function(event){if(event){event.preventDefault();event.stopPropagation()}const parent=event?.currentTarget?.closest('.pub-exam-nav');if(!parent)return;const open=parent.classList.toggle('open');const b=parent.querySelector('.pub-exam-toggle');if(b)b.setAttribute('aria-expanded',open?'true':'false')};
  window.togglePublicTheme=function(){document.body.classList.toggle('pub-light');const active=document.body.classList.contains('pub-light');try{localStorage.setItem('ac-public-light',active?'1':'0')}catch(e){}document.querySelectorAll('.pub-theme-toggle').forEach(b=>b.textContent=active?'☀':'☾')};
  window.runRequestedPublicAction=function(){
    const url=new URL(window.location.href);const service=url.searchParams.get('service');const tool=url.searchParams.get('tool');
    if(!service&&!tool){url.searchParams.delete('auth');if(window.history?.replaceState)history.replaceState({},'',url.pathname+(url.search||'')+(url.hash||''));document.body.style.overflow='';return}
    url.searchParams.delete('auth');url.searchParams.delete('service');url.searchParams.delete('tool');if(window.history?.replaceState)history.replaceState({},'',url.pathname+(url.search||'')+(url.hash||''));
    document.body.style.overflow='';
    const jobs={
      'pan':()=>window.openPan(),'voter':()=>window.openVoter(),'scholarship':()=>window.openScholarship(),'print':()=>window.openPrint(),
      'dl':()=>window.openServiceDetails('DL PDF'),'rc':()=>window.openServiceDetails('RC PDF'),'front-page':()=>window.openFrontPageMaker(),
      'rates':()=>window.showRates(),'support':()=>window.openSupport(),'tools':()=>window.openPdfTools()
    };
    if(service&&jobs[service]){jobs[service]();return}
    if(service&&service.startsWith('generic:')){const name=service.slice(8);window.openAppointment(name,'Submit your requirements and our team will follow up with you.');return}
    if(tool){if(typeof window.openPdfTool==='function')window.openPdfTool(tool);else window.openInfo('Tool unavailable','Please use the Tools page again later.');}
  };
  window.submitPublicContact=async function(event){
    event.preventDefault();
    if(typeof window.submitPublicContactSecure==='function') return window.submitPublicContactSecure(event);
    const form=event.currentTarget, fd=new FormData(form);
    const name=String(fd.get('name')||'').trim(),email=String(fd.get('email')||'').trim(),subject=String(fd.get('subject')||'').trim(),message=String(fd.get('message')||'').trim();
    const status=form.querySelector('[data-contact-msg]');
    if(!name||!email||!subject||!message){if(status)status.textContent='Please complete name, email, subject and message.';return;}
    const href='mailto:anowarali0499@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent('Name: '+name+'\nEmail: '+email+'\n\n'+message);
    if(status)status.innerHTML='Automatic email is not configured on this page. <a href="'+href+'">Open email draft</a>.';
  };

  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-pub-year]').forEach(el=>el.textContent=new Date().getFullYear());
    try{if(localStorage.getItem('ac-public-light')==='1'){document.body.classList.add('pub-light');document.querySelectorAll('.pub-theme-toggle').forEach(b=>b.textContent='☀')}}catch(e){}
    document.addEventListener('click',function(e){if(!e.target.closest('.pub-exam-nav'))document.querySelectorAll('.pub-exam-nav.open').forEach(x=>{x.classList.remove('open');x.querySelector('.pub-exam-toggle')?.setAttribute('aria-expanded','false')})});
  });
})();
