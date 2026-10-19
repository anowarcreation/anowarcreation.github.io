(function(){
  const EXAM_URL='https://anowarcreation.github.io/anowarcreation-online-exam/exam/';
  window.openAuthScreen=function(mode='login'){
    const auth=document.getElementById('authScreen');if(!auth)return;
    if(typeof window.setPortalView==='function')window.setPortalView('auth');
    else{if(document.getElementById('publicSite'))document.getElementById('publicSite').style.display='none';const app=document.querySelector('.app');if(app)app.style.display='none';auth.style.display='flex';auth.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
    if(typeof window.authMode==='function')window.authMode(mode==='register'?'register':'login');
  };
  window.closeAuthScreen=function(){
    const customerMode=document.body.classList.contains('ac-view-customer');
    if(typeof window.setPortalView==='function')window.setPortalView(customerMode?'customer':'public');
    else{const auth=document.getElementById('authScreen');if(auth){auth.style.display='none';auth.setAttribute('aria-hidden','true')}const app=document.querySelector('.app');const pub=document.getElementById('publicSite');if(pub&&(!app||app.style.display!=='flex'))pub.style.display='block';document.body.style.overflow=''}
    const clean=new URL(window.location.href);['auth','service','tool'].forEach(key=>clean.searchParams.delete(key));if(window.history?.replaceState)history.replaceState({},'',clean.pathname+(clean.search||'')+(clean.hash||''));
  };
  window.handlePublicAuthLink=function(event,mode){
    // The links on the home page use the embedded, existing Supabase auth form.
    if(document.getElementById('authScreen')){event.preventDefault();window.openAuthScreen(mode);return false;}
    return true;
  };
  window.togglePublicNav=function(){const nav=document.getElementById('pubNav');const btn=document.querySelector('.pub-mobile-toggle');if(!nav)return;const open=!nav.classList.contains('open');nav.classList.toggle('open',open);if(btn){btn.setAttribute('aria-expanded',open?'true':'false');btn.setAttribute('aria-controls','pubNav');btn.textContent=open?'✕':'☰'};};
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
  window.submitPublicContact=function(event){
    event.preventDefault();const form=event.currentTarget;const fd=new FormData(form);const name=String(fd.get('name')||'').trim();const email=String(fd.get('email')||'').trim();const subject=String(fd.get('subject')||'Contact request').trim();const message=String(fd.get('message')||'').trim();
    if(!name||!email||!message){const msg=form.querySelector('[data-contact-msg]');if(msg)msg.textContent='Please complete your name, email and message.';return}
    const text=`Hello Anowar Creation,\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`;
    const msg=form.querySelector('[data-contact-msg]');if(msg)msg.textContent='Opening WhatsApp with your message. Please review it and press Send.';
    window.open('https://wa.me/918670992707?text='+encodeURIComponent(text),'_blank','noopener');
  };
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-pub-year]').forEach(el=>el.textContent=new Date().getFullYear());
    try{if(localStorage.getItem('ac-public-light')==='1'){document.body.classList.add('pub-light');document.querySelectorAll('.pub-theme-toggle').forEach(b=>b.textContent='☀')}}catch(e){}
    const pubNav=document.getElementById('pubNav');
    const pubMenuButton=document.querySelector('.pub-mobile-toggle');
    if(pubNav&&pubMenuButton){
      pubMenuButton.setAttribute('aria-controls','pubNav');
      pubMenuButton.setAttribute('aria-expanded',pubNav.classList.contains('open')?'true':'false');
      pubNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{pubNav.classList.remove('open');pubMenuButton.setAttribute('aria-expanded','false');pubMenuButton.textContent='☰'}));
      document.addEventListener('keydown',e=>{if(e.key==='Escape'){pubNav.classList.remove('open');pubMenuButton.setAttribute('aria-expanded','false');pubMenuButton.textContent='☰'}});
      document.addEventListener('click',e=>{if(!e.target.closest('.pub-header')){pubNav.classList.remove('open');pubMenuButton.setAttribute('aria-expanded','false');pubMenuButton.textContent='☰'}});
      window.addEventListener('resize',()=>{if(window.innerWidth>920){pubNav.classList.remove('open');pubNav.style.removeProperty('display');pubMenuButton.setAttribute('aria-expanded','false');pubMenuButton.textContent='☰'}});
    }
    document.addEventListener('click',function(e){if(!e.target.closest('.pub-exam-nav'))document.querySelectorAll('.pub-exam-nav.open').forEach(x=>{x.classList.remove('open');x.querySelector('.pub-exam-toggle')?.setAttribute('aria-expanded','false')})});
  });
})();
