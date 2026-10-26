const M=LabMath,$=id=>document.getElementById(id);
let learningStorage=null;try{learningStorage=window.localStorage;}catch{}
const progress=LabProgress.createStore(learningStorage);
let completionNotified=false,submitting=false;
const missions=[
 {name:'기본',target:M.makeMission(-2,3,-1,5)},
 {name:'응용',target:M.makeMission(1,-2,3,-3)},
 {name:'도전',target:M.makeMission(-1,2,1,-1)}
];
let missionIndex=0,target=missions[0].target;
const completed=progress.missions;
let successTimer=null;
function aValues(){return activity===3?M.MISSION_A_VALUES:M.A_VALUES;}
const activities=[
 {label:'a의 변화',title:'a의 부호와 절댓값 탐구',prompt:'p = 0, q = 0으로 고정합니다. a를 양수·음수로 바꾸고 절댓값이 다른 그래프를 충분히 비교한 뒤 답하세요.',defaults:[2,0,0]},
 {label:'평행이동',title:'p, q에 따른 평행이동',prompt:'비교 그래프 y = a/x와 겹쳐 보세요. p와 q를 하나씩 바꾸며 좌우·상하 이동을 관찰한 뒤 답하세요.',defaults:[2,1,-1]},
 {label:'점근선과 범위',title:'점근선·정의역·치역 예측',prompt:'먼저 그래프를 관찰해 점근선과 가질 수 없는 값을 예상하세요. 답을 확인하면 현재 점근선을 표시하거나 숨길 수 있습니다.',defaults:[-2,1,2]},
 {label:'함수 만들기',title:'조건에 맞는 유리함수 만들기',prompt:'빨간 목표점과 목표 점근선을 관찰하고 계수를 조절하세요. 조건을 모두 만족하면 자동으로 성공하며 다음 미션이 열립니다.',defaults:[1,0,0]}
];
let a=2,p=0,q=0,activity=0,questions=[],answers=[],solutionOpen=false;
const v={cx:0,cy:0,scale:42,width:0,height:0};
const canvas=$('plot'),ctx=canvas.getContext('2d');
activities.forEach((item,i)=>{const b=document.createElement('button');b.innerHTML=`<span>ACTIVITY 0${i+1}</span>${item.label}`;b.onclick=()=>selectActivity(i);$('activities').append(b);});
for(const key of ['a','p','q']){
 const row=document.createElement('div');row.className='slider-row';
 row.innerHTML=`<label class="slider-label" for="slider-${key}"><span><b>${key}</b> &nbsp;${{a:'모양과 방향',p:'가로 이동',q:'세로 이동'}[key]}</span><output id="value-${key}"></output></label><input id="slider-${key}" type="range" min="${key==='a'?0:-5}" max="${key==='a'?19:5}" step="${key==='a'?1:.5}"><div class="range-label"><span>−5</span><span>${key==='a'?'0 제외 · ':''}0.5 간격</span><span>5</span></div>`;
 $('sliders').append(row);
 $(`slider-${key}`).oninput=e=>{
   if(e.target.disabled)return;
   const n=Number(e.target.value);if(key==='a')a=aValues()[n];if(key==='p')p=n;if(key==='q')q=n;
   resetQuiz();solutionOpen=false;$('missionSolution').hidden=true;
   if(activity===3)renderMission();sync();
 };
}
// A single renderer for every activity; HTML/CSS fractions need no CDN or font download.
function renderFormula(element,a,p,q){
 element.replaceChildren();element.setAttribute('role','math');element.setAttribute('aria-label',M.formula(a,p,q));
 const equation=document.createElement('span');equation.className='math-equation';equation.setAttribute('aria-hidden','true');
 const part=(text,className)=>{const span=document.createElement('span');span.className=className;span.textContent=text;return span;};
 equation.append(part('y =','math-prefix'));
 if(a<0)equation.append(part('−','math-negative'));
 const fraction=document.createElement('span');fraction.className='math-fraction';
 fraction.append(part(String(Math.abs(a)),'math-numerator'),part(p===0?'x':`x ${p<0?'+':'−'} ${Math.abs(p)}`,'math-denominator'));
 equation.append(fraction);if(q!==0)equation.append(part(`${q<0?'−':'+'} ${Math.abs(q)}`,'math-offset'));
 element.append(equation);
}
function sync(){
 for(const [key,num] of Object.entries({a,p,q})){
   $(`slider-${key}`).value=key==='a'?aValues().indexOf(num):num;
   $(`slider-${key}`).setAttribute('aria-valuetext',String(num));$(`value-${key}`).textContent=num;
   $(`slider-${key}`).disabled=activity===0&&key!=='a';
 }
 renderFormula($('formula'),a,p,q);draw();
}
function resetView(){v.cx=0;v.cy=activity===3?target.y/2:0;v.scale=42;}
function selectActivity(i){
 cancelSuccess();activity=i;[a,p,q]=activities[i].defaults;
 const aSlider=$('slider-a');aSlider.max=aValues().length-1;
 const limits=aSlider.parentElement.querySelectorAll('.range-label span');limits[0].textContent=i===3?'−10':'−5';limits[2].textContent=i===3?'10':'5';
 [...$('activities').children].forEach((b,n)=>{b.classList.toggle('active',n===i);b.setAttribute('aria-pressed',n===i);});
 $('step').textContent=`0${i+1}`;$('activityTitle').textContent=activities[i].title;$('question').textContent=activities[i].prompt;
 $('quizTitle').textContent=`활동 ${i+1} · ${activities[i].title} — 객관식 탐구`;
 $('quizGuide').textContent='그래프를 충분히 관찰한 뒤 답을 선택하고 정답 확인하기를 누르세요. 계수를 바꾸면 선택은 초기화되지만 이미 확인한 정답의 완료 기록은 유지됩니다.';
 $('compare').checked=i===1;$('missionPanel').hidden=i!==3;solutionOpen=false;
 $('missionFeedback').hidden=true;$('missionSolution').hidden=true;
 $('controlHint').textContent=`이 활동의 기본값 a = ${a}, p = ${p}, q = ${q}${i===0?' · p, q는 고정':''}`;
 $('coordinate').textContent='그래프 위를 가리켜 좌표를 확인하세요';
 resetView();resetQuiz();if(i===3){renderMissionControls();renderMission();}sync();updateLearningStatus();
}
function question(title,correct,distractors,explain,index){
 const options=[...new Set(distractors)].filter(x=>x!==correct).slice(0,3);
 options.splice(index%4,0,correct);
 return {title,options,correct:options.indexOf(correct),explain};
}
function makeQuestions(){
 const horizontal=p===0?'가로 이동 없음':`${p>0?'오른쪽':'왼쪽'}으로 ${Math.abs(p)}`;
 const vertical=q===0?'세로 이동 없음':`${q>0?'위':'아래'}로 ${Math.abs(q)}`;
 const banks=[
  [
   ['현재 그래프 y = a/x는 어느 사분면에 있나요?',a>0?'제1·제3사분면':'제2·제4사분면',['제1·제3사분면','제2·제4사분면','제1·제2사분면','제3·제4사분면'],`a = ${a}일 때 x와 y의 부호가 ${a>0?'같으므로 제1·제3':'반대이므로 제2·제4'}사분면에 있습니다.`],
   ['현재 그래프에서 x = 1일 때 y의 값은?',`${a}`,[`${-a}`,'0',`${a+1}`,`${a-1}`],`y = a/1 = ${a}입니다. 그래프의 x = 1인 점과 비교해 보세요.`],
   ['a의 부호를 유지하고 |a|를 2배로 하면, 같은 x ≠ 0에서 |y|는?', '2배가 된다',['절반이 된다','변하지 않는다','항상 0이 된다'],'|y| = |a|/|x|이므로 같은 x에서 |a|가 2배이면 |y|도 2배입니다.']
  ],
  [
   ['현재 그래프는 y = a/x에서 가로로 어떻게 이동했나요?',horizontal,['가로 이동 없음',`오른쪽으로 ${Math.abs(p)||1}`,`왼쪽으로 ${Math.abs(p)||1}`,'위로 1','아래로 1'],`x − p의 p = ${p}이므로 ${horizontal}입니다.`],
   ['현재 그래프는 y = a/x에서 세로로 어떻게 이동했나요?',vertical,['세로 이동 없음',`위로 ${Math.abs(q)||1}`,`아래로 ${Math.abs(q)||1}`,'오른쪽으로 1','왼쪽으로 1'],`함수 전체에 q = ${q}를 더하므로 ${vertical}입니다.`],
   ['현재 그래프의 대칭 중심은 어디인가요?',`(${p}, ${q})`,[`(${p+1}, ${q})`,`(${p}, ${q+1})`,`(${p+1}, ${q+1})`],`원래 그래프의 대칭 중심 (0, 0)이 (p, q) = (${p}, ${q})로 이동합니다.`]
  ],
  [
   ['현재 그래프의 두 점근선의 방정식은?',`x = ${p}, y = ${q}`,[`x = ${p+1}, y = ${q}`,`x = ${p}, y = ${q+1}`,`x = ${p+1}, y = ${q+1}`],`분모가 0인 x = ${p}와 그래프가 가까워지는 수평선 y = ${q}가 점근선입니다.`],
   ['현재 함수의 정의역은? (x는 실수)',`x ≠ ${p}`,[`x = ${p}`,`x > ${p}`,'모든 실수'],`x = ${p}에서는 분모가 0이므로 제외합니다. 다른 모든 실수 x에서는 함수값이 존재합니다.`],
   ['현재 함수의 치역은? (y는 실수)',`y ≠ ${q}`,[`y = ${q}`,`y > ${q}`,'모든 실수'],`a ≠ 0이므로 a/(x − p)는 0이 될 수 없습니다. 따라서 y = ${q}만 제외됩니다.`]
  ],
  [
   [`목표 수직점근선 x = ${target.p}를 만들려면 p는?`,`${target.p}`,[`${target.p+1}`,`${target.p-1}`,`${target.p+2}`],`수직점근선은 x = p이므로 p = ${target.p}입니다.`],
   [`목표 수평점근선 y = ${target.q}를 만들려면 q는?`,`${target.q}`,[`${target.q+1}`,`${target.q-1}`,`${target.q+2}`],`수평점근선은 y = q이므로 q = ${target.q}입니다.`],
   [`p = ${target.p}, q = ${target.q}일 때 목표점 (${target.x}, ${target.y})를 대입한 식은?`,`${target.y} = a/(${target.x-target.p}) + (${target.q})`,[`${target.y} = a/(${target.x-target.p+1}) + (${target.q})`,`${target.y} = a/(${target.x-target.p}) + (${target.q+1})`,`${target.x} = a/(${target.x-target.p}) + (${target.q})`],`x = ${target.x}, y = ${target.y}를 대입합니다. 이 관계를 이용해 a를 구하고 슬라이더로 도전하세요.`]
  ]
 ];
 return banks[activity].map((item,i)=>question(...item,i+activity));
}
function resetQuiz(){
 questions=makeQuestions();answers=questions.map(()=>null);
 $('asymptotes').checked=false;$('asymptotes').disabled=activity!==3;$('locked').hidden=activity===3;
 $('quizCards').replaceChildren();
 questions.forEach((item,i)=>{
   const card=document.createElement('article');card.className='quiz-card';
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`0${i+1}  ${item.title}`;field.append(legend);
   const mark=document.createElement('span');mark.className='question-complete';mark.textContent='완료 ✓';mark.hidden=!progress.isQuestionDone(activity,missionIndex,i);legend.append(mark);
   item.options.forEach((text,j)=>{
     const label=document.createElement('label');label.className='answer-option';
     const input=document.createElement('input');input.type='radio';input.name=`quiz-${i}`;input.value=j;
     const span=document.createElement('span');span.textContent=text;label.append(input,span);field.append(label);
     input.onchange=()=>{answers[i]=j;button.disabled=false;feedback.hidden=true;card.classList.remove('correct','incorrect');};
   });
   const button=document.createElement('button');button.className='primary quiz-check';button.textContent='정답 확인하기';button.disabled=true;
   const feedback=document.createElement('p');feedback.className='quiz-feedback';feedback.hidden=true;feedback.setAttribute('role','status');
   button.onclick=()=>{
     if(answers[i]===null)return;
     const ok=answers[i]===item.correct;
     feedback.textContent=`${ok?'정답입니다!':'다시 살펴보세요.'} 정답: ${item.options[item.correct]}. ${item.explain}`;
     feedback.hidden=false;card.classList.toggle('correct',ok);card.classList.toggle('incorrect',!ok);
     $('asymptotes').disabled=false;$('asymptotes').checked=true;$('locked').hidden=true;draw();
     if(ok){progress.markQuestion(activity,missionIndex,i);mark.hidden=false;}updateLearningStatus();
   };
   card.append(field,button,feedback);$('quizCards').append(card);
 });
}
function cancelSuccess(){
 if(successTimer!==null)clearTimeout(successTimer);
 successTimer=null;$('successOverlay').hidden=true;
}
function renderMissionControls(){
 $('missionProgress').textContent=`3개 중 ${completed.filter(Boolean).length}개 완료`;
 $('missionChoices').replaceChildren();
 missions.forEach((mission,i)=>{
   const unlocked=i===0||completed[i-1],button=document.createElement('button');
   button.textContent=`${completed[i]?'✓ ':unlocked?'':'🔒 '}미션 ${i+1} · ${mission.name}`;
   button.disabled=!unlocked;button.className=completed[i]?'mission-done':'';
   button.setAttribute('aria-pressed',String(i===missionIndex));
   button.onclick=()=>selectMission(i);$('missionChoices').append(button);
 });
 $('missionDescription').textContent=`미션 ${missionIndex+1} (${missions[missionIndex].name}): 점근선 x = ${target.p}, y = ${target.q}이고 점 (${target.x}, ${target.y})를 지나는 함수를 만드세요.`;
 $('nextMission').disabled=!completed[missionIndex]||missionIndex===missions.length-1||successTimer!==null;
 $('showSolution').disabled=!completed[missionIndex];
 $('challengeComplete').hidden=!completed.every(Boolean);
}
function selectMission(i){
 if(i<0||i>=missions.length||(i>0&&!completed[i-1]))return;
 cancelSuccess();missionIndex=i;target=missions[i].target;
 [a,p,q]=activities[3].defaults;solutionOpen=false;$('missionSolution').hidden=true;
 $('coordinate').textContent='그래프 위를 가리켜 좌표를 확인하세요';
 resetView();resetQuiz();renderMissionControls();renderMission();sync();
}
function showSolution(){
 if(!completed[missionIndex])return;
 solutionOpen=true;$('missionSolution').textContent=`정답 함수: ${M.formula(target.a,target.p,target.q)}. p = ${target.p}, q = ${target.q}이고 목표점을 대입하면 ${target.y} = a/(${target.x-target.p}) + (${target.q})이므로 a = ${target.a}입니다.`;
 $('missionSolution').hidden=false;
}
function celebrate(){
 progress.markMission(missionIndex);
 $('successOverlay').hidden=false;
 const shownMission=missionIndex;
 successTimer=setTimeout(()=>{
   successTimer=null;$('successOverlay').hidden=true;
   if(activity===3&&missionIndex===shownMission)renderMissionControls();
 },1000);
 renderMissionControls();updateLearningStatus();
}
function renderMission(){
 const result=M.checkMission(a,p,q,target),messages=[];
 if(!result.vertical)messages.push(`수직점근선 불일치: 현재 x = ${p}, 목표 x = ${target.p}`);
 if(!result.horizontal)messages.push(`수평점근선 불일치: 현재 y = ${q}, 목표 y = ${target.q}`);
 if(!result.point)messages.push(Number.isFinite(result.actual)?`목표점 불일치: f(${target.x}) = ${Number(result.actual.toFixed(6))}, 목표값 ${target.y}`:`x = ${target.x}에서 분모가 0이므로 목표점을 지날 수 없습니다.`);
 $('missionFeedback').textContent=result.success?'미션 성공! 두 점근선과 목표점을 모두 만족했습니다.':messages.join(' · ');
 $('missionFeedback').className=result.success?'mission-success':'mission-retry';$('missionFeedback').hidden=false;
 if(result.success){if(!completed[missionIndex])celebrate();showSolution();}
 else if(!solutionOpen)$('missionSolution').hidden=true;
}
$('checkMission').onclick=renderMission;
$('showSolution').onclick=showSolution;
$('nextMission').onclick=()=>{if(!$('nextMission').disabled)selectMission(missionIndex+1);};
$('restartChallenge').onclick=()=>{if(submitting)return;cancelSuccess();progress.restartMissions();selectMission(0);updateLearningStatus();};
// Labels live in an overlay so their bounds can be measured and kept inside
// the plot. Only annotations move; every mathematical coordinate stays fixed.
let graphLabels=[],labelObstacles=[],curvePixels=[];
function addLabel(text,x,y,kind,candidates){graphLabels.push({text,x,y,kind,candidates});}
function drawTarget(){
 const {width:w,height:h}=v,pt=M.toScreen(target.x,target.y,v),pole=M.toScreen(target.p,target.q,v);
 if(pole.x>=0&&pole.x<=w)line(pole.x,0,pole.x,h,'#cc4b4b',1.5,[7,5]);
 if(pole.y>=0&&pole.y<=h)line(0,pole.y,w,pole.y,'#cc4b4b',1.5,[7,5]);
 if(pt.x>=0&&pt.x<=w&&pt.y>=0&&pt.y<=h){
   ctx.beginPath();ctx.arc(pt.x,pt.y,6,0,Math.PI*2);ctx.fillStyle='#cf3737';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();
   labelObstacles.push({x:pt.x-9,y:pt.y-9,w:18,h:18});
   addLabel(`(${target.x}, ${target.y})`,pt.x,pt.y,'target-point',[[12,-32],[12,12],[-90,-32],[-90,12],[20,-10],[-100,-10]]);
 }
 const sameX=$('asymptotes').checked&&p===target.p,sameY=$('asymptotes').checked&&q===target.q;
 if(pole.x>=0&&pole.x<=w)addLabel(`${sameX?'목표·현재':'목표'} x = ${target.p}`,pole.x,0,'target-asymptote',[[10,12],[-120,12],[10,48],[-120,48],[10,h-66]]);
 if(pole.y>=0&&pole.y<=h)addLabel(`${sameY?'목표·현재':'목표'} y = ${target.q}`,0,pole.y,'target-asymptote',[[12,-32],[12,12],[w-138,-32],[w-138,12]]);
}
function line(x1,y1,x2,y2,color,width=1,dash=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function layoutLabels(){
 const layer=$('graphLabels'),occupied=[...labelObstacles],padding=5;
 const overlaps=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
 const bounds=canvas.getBoundingClientRect(),readout=$('coordinate').getBoundingClientRect();
 occupied.push({x:readout.left-bounds.left,y:readout.top-bounds.top,w:readout.width,h:readout.height});
 const order={'target-point':0,'target-asymptote':1,'asymptote':2,'axis':3,'tick':4};
 layer.replaceChildren();
 graphLabels.sort((a,b)=>order[a.kind]-order[b.kind]).forEach(label=>{
   const el=document.createElement('span');el.className=`graph-label ${label.kind}`;el.textContent=label.text;el.dataset.kind=label.kind;layer.append(el);
   const w=el.offsetWidth,h=el.offsetHeight;
   if(w>v.width-2*padding||h>v.height-2*padding){el.remove();return;}
   const makeBox=(x,y)=>({x:Math.max(padding,Math.min(v.width-w-padding,x)),y:Math.max(padding,Math.min(v.height-h-padding,y)),w,h});
   let candidates=label.candidates.map(([dx,dy])=>makeBox(label.x+dx,label.y+dy));
   // Essential labels can move further when a zoom or pan crowds an edge.
   if(label.kind!=='tick')for(let y=padding;y+h<=v.height-padding;y+=28)for(let x=padding;x+w<=v.width-padding;x+=40)candidates.push(makeBox(x,y));
   let best=null,score=Infinity;
   for(const box of candidates){
     if(occupied.some(other=>overlaps(box,other)))continue;
     let cost=Math.hypot(box.x-label.x,box.y-label.y)*.35;
     for(const pt of curvePixels)if(pt.x>=box.x-3&&pt.x<=box.x+w+3&&pt.y>=box.y-3&&pt.y<=box.y+h+3)cost+=4;
     // Avoid running text along either axis or either set of asymptotes.
     for(const x of [M.toScreen(0,0,v).x,...($('asymptotes').checked?[M.toScreen(p,0,v).x]:[]),...(activity===3?[M.toScreen(target.p,0,v).x]:[])])if(x>box.x&&x<box.x+w)cost+=12;
     for(const y of [M.toScreen(0,0,v).y,...($('asymptotes').checked?[M.toScreen(0,q,v).y]:[]),...(activity===3?[M.toScreen(0,target.q,v).y]:[])])if(y>box.y&&y<box.y+h)cost+=12;
     if(cost<score){score=cost;best=box;}
   }
   if(!best){el.remove();return;}
   el.style.left=`${best.x}px`;el.style.top=`${best.y}px`;occupied.push(best);
   if(label.kind==='target-point'){
     const end={x:Math.max(best.x,Math.min(best.x+best.w,label.x)),y:Math.max(best.y,Math.min(best.y+best.h,label.y))};
     const distance=Math.hypot(end.x-label.x,end.y-label.y);
     if(distance>10){
       const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),leader=document.createElementNS(ns,'line');
       svg.classList.add('label-leader');svg.setAttribute('width',v.width);svg.setAttribute('height',v.height);svg.setAttribute('aria-hidden','true');
       leader.setAttribute('x1',label.x+(end.x-label.x)*9/distance);leader.setAttribute('y1',label.y+(end.y-label.y)*9/distance);leader.setAttribute('x2',end.x);leader.setAttribute('y2',end.y);svg.append(leader);layer.prepend(svg);
     }
   }
 });
}
function draw(){if(!v.width)return;const {width:w,height:h,scale:s}=v;ctx.clearRect(0,0,w,h);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
 graphLabels=[];labelObstacles=[];curvePixels=[];
 const min=M.toWorld(0,h,v),max=M.toWorld(w,0,v);let unit=1;while(unit*s<36)unit*=2;while(unit*s>100)unit/=2;
 const origin=M.toScreen(0,0,v);
 for(let x=Math.ceil(min.x/unit)*unit;x<=max.x;x+=unit){const px=M.toScreen(x,0,v).x;line(px,0,px,h,'#edf1ee');if(Math.abs(x)>1e-9)addLabel(String(+x.toFixed(3)),px,Math.max(6,Math.min(h-46,origin.y)),'tick',[[4,5],[4,-23],[-24,5],[-24,-23]]);}
 for(let y=Math.ceil(min.y/unit)*unit;y<=max.y;y+=unit){const py=M.toScreen(0,y,v).y;line(0,py,w,py,'#edf1ee');if(Math.abs(y)>1e-9)addLabel(String(+y.toFixed(3)),Math.max(6,Math.min(w-48,origin.x)),py,'tick',[[6,-20],[-32,-20],[6,3],[-32,3]]);}
 if(origin.y>=0&&origin.y<=h)line(0,origin.y,w,origin.y,'#a4b3aa',1.2);
 if(origin.x>=0&&origin.x<=w)line(origin.x,0,origin.x,h,'#a4b3aa',1.2);
 addLabel('x',w-18,Math.max(6,Math.min(h-30,origin.y)),'axis',[[0,-25],[0,5]]);
 addLabel('y',Math.max(6,Math.min(w-24,origin.x)),6,'axis',[[6,0],[-22,0]]);
 if($('asymptotes').checked){
   const pole=M.toScreen(p,q,v);
   if(pole.x>=0&&pole.x<=w){line(pole.x,0,pole.x,h,'#bb852e',1.5,[6,5]);if(activity!==3||p!==target.p)addLabel(`x = ${p}`,pole.x,0,'asymptote',[[10,12],[-85,12],[10,48],[-85,48]]);}
   if(pole.y>=0&&pole.y<=h){line(0,pole.y,w,pole.y,'#bb852e',1.5,[6,5]);if(activity!==3||q!==target.q)addLabel(`y = ${q}`,0,pole.y,'asymptote',[[12,-32],[12,12],[w-100,-32],[w-100,12]]);}
 }
 function curve(pp,qq,color,dash){ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.setLineDash(dash);for(const points of M.branches(a,pp,qq,v)){ctx.beginPath();points.forEach((pt,i)=>{const xy=M.toScreen(pt.x,pt.y,v);if(i%4===0)curvePixels.push(xy);if(i===0)ctx.moveTo(xy.x,xy.y);else ctx.lineTo(xy.x,xy.y);});ctx.stroke();}ctx.restore();}
 if($('compare').checked)curve(0,0,'#a48abb',[5,5]);curve(p,q,'#167968',[]);
 if(activity===3)drawTarget();layoutLabels();
}
function resize(){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;v.width=r.width;v.height=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();if(v.width>0&&v.height>0)$('runtime-status').hidden=true;}
new ResizeObserver(resize).observe($('plotWrap'));
function zoom(f,x=v.width/2,y=v.height/2){const before=M.toWorld(x,y,v);v.scale=Math.max(10,Math.min(300,v.scale*f));const after=M.toWorld(x,y,v);v.cx+=before.x-after.x;v.cy+=before.y-after.y;draw();}
$('zoomIn').onclick=()=>zoom(1.25);$('zoomOut').onclick=()=>zoom(.8);
$('resetView').onclick=()=>{resetView();draw();};
$('resetAll').onclick=()=>selectActivity(activity);
$('compare').onchange=draw;$('asymptotes').onchange=draw;
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top);},{passive:false});
let drag=null;
function inspect(e){const r=canvas.getBoundingClientRect(),pt=M.toWorld(e.clientX-r.left,e.clientY-r.top,v),y=M.value(pt.x,a,p,q);$('coordinate').textContent=`x = ${pt.x.toFixed(2)} · ${Math.abs(pt.x-p)<.5/v.scale?'x = p 근처: 함수값 없음 또는 매우 큼':`y = ${y.toFixed(2)}`}`;layoutLabels();}
canvas.onpointerdown=e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);inspect(e);};
canvas.onpointermove=e=>{if(drag&&drag.id===e.pointerId){v.cx-=(e.clientX-drag.x)/v.scale;v.cy+=(e.clientY-drag.y)/v.scale;v.cx=Math.max(-10000,Math.min(10000,v.cx));v.cy=Math.max(-10000,Math.min(10000,v.cy));drag={id:e.pointerId,x:e.clientX,y:e.clientY};draw();}inspect(e);};
canvas.onpointerup=canvas.onpointercancel=e=>{if(drag?.id===e.pointerId)drag=null;};
function updateLearningStatus(){
 const counts=progress.counts(),done=progress.allComplete();
 $('learningProgress').textContent=`이 브라우저의 학습 기록 · 객관식 ${counts.questions}/18문항 완료 · 그래프 미션 ${counts.missions}/3개 완료`;
 $('storageNotice').hidden=progress.storageAvailable;
 [...$('activities').children].forEach((button,i)=>{button.classList.toggle('activity-complete',progress.activityDone(i));});
 $('reopenCompletion').hidden=!done;
 if(!done)completionNotified=false;
 if(done&&!completionNotified&&!progress.submission()?.confirmed){completionNotified=true;openCompletion();}
}
function refreshSubmission(){
 const sent=progress.submission()?.confirmed===true,configured=LabSubmission.isConfigured();
 const valid=LabSubmission.validIdentity($('studentNumber').value.trim(),$('studentName').value.trim());
 $('sendCompletion').disabled=!progress.allComplete()||!valid||!configured||submitting||sent;
 $('studentNumber').disabled=$('studentName').disabled=submitting||sent;
 $('closeCompletion').disabled=submitting;$('resetLearning').disabled=submitting;$('restartChallenge').disabled=submitting;
 if(sent)$('submissionStatus').textContent='서버의 저장 확인을 받은 제출입니다. 중복 전송하지 않습니다.';
 else if(!configured)$('submissionStatus').textContent='전송 연결 준비 중입니다. 선생님 전송 주소가 없어 전송할 수 없습니다. 학번과 이름은 저장되지 않습니다.';
}
function openCompletion(){
 if(!progress.allComplete())return;
 $('completionForm').reset();refreshSubmission();
 if(!$('completionDialog').open)$('completionDialog').showModal();
}
$('reopenCompletion').onclick=openCompletion;
$('closeCompletion').onclick=()=>{if(!submitting)$('completionDialog').close();};
$('completionDialog').addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
$('completionDialog').addEventListener('close',()=>{$('completionForm').reset();});
for(const key of ['studentNumber','studentName'])$(key).addEventListener('input',refreshSubmission);
$('resetLearning').onclick=()=>{
 if(submitting)return;cancelSuccess();progress.reset();missionIndex=0;target=missions[0].target;
 $('completionDialog').close();completionNotified=false;selectActivity(0);updateLearningStatus();
};
$('completionForm').addEventListener('submit',async event=>{
 event.preventDefault();refreshSubmission();if($('sendCompletion').disabled)return;
 const studentNumber=$('studentNumber').value.trim(),name=$('studentName').value.trim();
 const attempt=progress.beginSubmission();submitting=true;refreshSubmission();$('submissionStatus').textContent='전송 중입니다. 서버의 저장 확인을 기다리고 있습니다.';
 try{
   await LabSubmission.sendCompletion({submissionId:attempt.id,submittedAt:attempt.submittedAt,studentNumber,name,result:{source:'browser-local-progress',complete:true,questions:18,missions:3}});
   progress.confirmSubmission(attempt.id);$('completionForm').reset();
 }catch(error){$('submissionStatus').textContent=error.message;}
 finally{submitting=false;refreshSubmission();}
});
selectActivity(0);sync();resize();updateLearningStatus();
