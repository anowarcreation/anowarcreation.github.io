(() => {
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const KEY='ac_exam_demo_v1';
const PASS=40;
const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const setState=v=>localStorage.setItem(KEY,JSON.stringify(v));
const questions=()=>window.EXAM_QUESTIONS||[];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>`AC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
function entry(){
 const form=$('#entryForm'); if(!form)return;
 form.addEventListener('submit',e=>{
  e.preventDefault(); const name=$('#studentName').value.trim(),roll=$('#rollNumber').value.trim(),code=$('#examCode').value.trim();
  $('#entryError').textContent='';
  if(!name||!roll||!code){$('#entryError').textContent='Please complete all fields.';return}
  if(code.toUpperCase()!=='BIO11-2026'){$('#entryError').textContent='Invalid demo exam code. Use BIO11-2026 for the sample exam.';return}
  const s=getState();s.student={name,roll,code:code.toUpperCase()};s.started=false;s.answers={};s.flagged=[];s.startedAt=null;s.result=null;setState(s);
  location.href='instructions.html';
 });
}
function instructions(){
 const btn=$('#startExam');if(!btn)return;
 const s=getState();if(!s.student){location.href='index.html';return}
 $('#studentGreeting').textContent=`Student: ${s.student.name} • Roll: ${s.student.roll}`;
 btn.addEventListener('click',()=>{const st=getState();st.started=true;st.startedAt=Date.now();st.answers={};st.flagged=[];st.result=null;setState(st);location.href='test.html'});
}
function calcResult(s){
 const qs=questions(),answers=s.answers||{};let correct=0,wrong=0,unanswered=0;const chapter={};
 qs.forEach((q,i)=>{const a=answers[i];let status='unanswered';if(a===undefined||a===null||a===''){unanswered++}else if(Number(a)===q.a){correct++;status='correct'}else{wrong++;status='wrong'}if(!chapter[q.chapter])chapter[q.chapter]={correct:0,wrong:0,unanswered:0,total:0};chapter[q.chapter][status]++;chapter[q.chapter].total++});
 const score=correct*4-wrong;return {correct,wrong,unanswered,score,max:qs.length*4,percentage:Math.max(0,score)/(qs.length*4)*100,passed:Math.max(0,score)/(qs.length*4)*100>=PASS,chapter,certificateNo:s.result?.certificateNo||makeId(),completedAt:new Date().toISOString()};
}
function test(){
 const root=$('#examApp');if(!root)return;
 let s=getState();if(!s.student||!s.started){location.href='index.html';return}
 const qs=questions();if(!qs.length){root.innerHTML='<p>Question bank unavailable.</p>';return}
 let index=0,remaining=Math.max(0,1800-Math.floor((Date.now()-(s.startedAt||Date.now()))/1000)),submitted=false;
 const save=()=>{s=getState();setState(s)};
 function render(){
  s=getState();const q=qs[index],ans=s.answers||{},selected=ans[index];
  $('#questionCount').textContent=`Question ${index+1} of ${qs.length}`;
  $('#chapterName').textContent=q.chapter;
  $('#questionText').textContent=q.q;
  $('#options').innerHTML=q.o.map((op,i)=>`<label class="option ${String(selected)===String(i)?'selected':''}"><input type="radio" name="answer" value="${i}" ${String(selected)===String(i)?'checked':''}><span><b>${String.fromCharCode(65+i)}.</b> ${escapeHtml(op)}</span></label>`).join('');
  $$('#options input').forEach(inp=>inp.addEventListener('change',()=>{const st=getState();st.answers=st.answers||{};st.answers[index]=Number(inp.value);setState(st);render()}));
  $('#qnav').innerHTML=qs.map((_,i)=>`<button class="qnum ${i===index?'current':''} ${ans[i]!==undefined?'answered':''} ${(s.flagged||[]).includes(i)?'flagged':''}" data-q="${i}">${i+1}</button>`).join('');
  $$('#qnav button').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.q);render()}));
  $('#prevQ').disabled=index===0;$('#nextQ').textContent=index===qs.length-1?'Review & Submit':'Save & Next';
  $('#answeredCount').textContent=Object.keys(ans).length;$('#flagBtn').textContent=(s.flagged||[]).includes(index)?'Unflag question':'Mark for review';
 }
 function clock(){const m=String(Math.floor(remaining/60)).padStart(2,'0'),sec=String(remaining%60).padStart(2,'0');$('#timer').textContent=`${m}:${sec}`;if(remaining<=300)$('#timer').classList.add('urgent');if(remaining<=0)submit(true);else remaining--}
 function submit(auto=false){
  if(submitted)return;submitted=true;const st=getState();st.result=calcResult(st);st.result.autoSubmitted=auto;st.started=false;setState(st);location.href='result.html';
 }
 $('#prevQ').addEventListener('click',()=>{if(index>0){index--;render()}});
 $('#nextQ').addEventListener('click',()=>{if(index<qs.length-1){index++;render()}else{const unanswered=qs.length-Object.keys(getState().answers||{}).length; if(confirm(`Submit examination now? Unanswered: ${unanswered}`))submit(false)}});
 $('#flagBtn').addEventListener('click',()=>{const st=getState();st.flagged=st.flagged||[];st.flagged.includes(index)?st.flagged=st.flagged.filter(x=>x!==index):st.flagged.push(index);setState(st);render()});
 $('#submitExam').addEventListener('click',()=>{const st=getState(),unanswered=qs.length-Object.keys(st.answers||{}).length;if(confirm(`Are you sure you want to submit? ${unanswered} unanswered question(s).`))submit(false)});
 render();clock();setInterval(()=>{if(!submitted)clock()},1000);
}
function result(){
 const root=$('#resultApp');if(!root)return;const s=getState();if(!s.student||!s.result){root.innerHTML='<div class="card"><h2>No result found</h2><a class="btn" href="index.html">Start a demo exam</a></div>';return}
 const r=s.result;$('#resultStudent').textContent=s.student.name;$('#resultRoll').textContent=s.student.roll;$('#scoreValue').textContent=`${r.score}`;$('#scoreMax').textContent=`/ ${r.max}`;
 $('#passStatus').textContent=r.passed?'PASS':'NOT PASSED';$('#passStatus').className=r.passed?'pass':'fail';$('#resultDate').textContent=new Date(r.completedAt||Date.now()).toLocaleString();
 $('#stats').innerHTML=[['Correct',r.correct],['Incorrect',r.wrong],['Unanswered',r.unanswered],['Accuracy',`${Math.round((r.correct/(r.correct+r.wrong||1))*100)}%`]].map(x=>`<div class="stat"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');
 const chapters=Object.entries(r.chapter||{});$('#chapterResults').innerHTML=chapters.map(([name,v])=>`<div style="margin:16px 0"><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px"><b>${escapeHtml(name)}</b><span class="muted small">${v.correct}/${v.total} correct</span></div><div class="bar"><span style="width:${v.correct/(v.total||1)*100}%"></span></div></div>`).join('');
 $('#answerReview').innerHTML=questions().map((q,i)=>{const a=(s.answers||{})[i],status=a===undefined?'unanswered':Number(a)===q.a?'correct':'wrong';return `<div class="review-item"><div class="qmeta">Q${i+1} · ${escapeHtml(q.chapter)} <span class="tag ${status}">${status.toUpperCase()}</span></div><div style="font-weight:800;margin:7px 0">${escapeHtml(q.q)}</div><div class="small">Your answer: ${a===undefined?'Not answered':escapeHtml(q.o[a])}</div><div class="small">Correct answer: <b>${escapeHtml(q.o[q.a])}</b></div><div class="small muted" style="margin-top:6px">${escapeHtml(q.ex)}</div></div>`}).join('');
 $('#certificateLink').href=`certificate.html`;
}
function certificate(){
 const root=$('#certificateApp');if(!root)return;const s=getState();if(!s.student||!s.result||!s.result.passed){root.innerHTML='<div class="card"><h2>Certificate unavailable</h2><p class="muted">In this demo, the certificate is available only after passing the test.</p><a class="btn" href="result.html">Back to result</a></div>';return}
 const r=s.result;$('#certName').textContent=s.student.name;$('#certExam').textContent='WBCHSE Class 11 Biology — NEET-Based Mock Test';$('#certScore').textContent=`${r.score} / ${r.max} (${Math.round(r.percentage)}%)`;$('#certDate').textContent=new Date(r.completedAt||Date.now()).toLocaleDateString('en-IN');$('#certNo').textContent=r.certificateNo;$('#certRoll').textContent=s.student.roll;
 $('#printCert').addEventListener('click',()=>window.print());
}
function adminLogin(){const f=$('#adminLogin');if(!f)return;f.addEventListener('submit',e=>{e.preventDefault();$('#adminMsg').textContent='Admin authentication is not connected yet. Configure Supabase Auth and secure server-side policies before enabling this panel.';$('#adminMsg').className='error'})}
function adminDash(){
 const root=$('#adminDashboard');if(!root)return;
 const s=getState(),r=s.result?1:0;$('#adminStats').innerHTML=[['Demo attempts',r],['Question bank',questions().length],['Pass threshold',`${PASS}%`]].map(x=>`<div class="stat"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');
 $('#adminStudentRows').innerHTML=s.student&&s.result?`<tr><td>${escapeHtml(s.student.name)}</td><td>${escapeHtml(s.student.roll)}</td><td>${s.result.score}/${s.result.max}</td><td>${s.result.passed?'Pass':'Not passed'}</td><td>${new Date(s.result.completedAt).toLocaleString()}</td></tr>`:'<tr><td colspan="5">No demo result in this browser yet. Real records require Supabase backend.</td></tr>';
 const exp=$('#exportDemo');if(exp)exp.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='anowar-creation-demo-record.json';a.click();URL.revokeObjectURL(a.href)});
}
document.addEventListener('DOMContentLoaded',()=>{entry();instructions();test();result();certificate();adminLogin();adminDash()});
})();
