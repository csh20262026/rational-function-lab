const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const MESSAGE='수고했습니다. 모든 활동이 완벽해요. 수학 선생님께 완료메세지를 보내기 위해 학번과 이름을 입력해주세요.';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[],sent=[];
  page.on('pageerror',e=>errors.push(e.message));let backend='fail',pending;
  await page.route('**/*',async route=>{
   if(route.request().url().startsWith('https://lab.invalid/'))return route.fulfill({contentType:'text/html',body:html});
   if(route.request().url()==='https://script.google.com/macros/s/TEST_ONLY/exec'){
    const payload=JSON.parse(new URLSearchParams(route.request().postData()).get('payload'));sent.push(payload);
    if(backend==='pending'){await new Promise(resolve=>{pending=resolve;});}
    const body=backend==='malformed'?{ok:true}:backend==='mismatch'?{ok:true,submissionId:payload.submissionId,payloadHash:'wrong',receiptId:'mock'}:{ok:true,submissionId:payload.submissionId,payloadHash:payload.payloadHash,receiptId:'mock-only'};
    return route.fulfill({status:backend==='fail'?500:200,contentType:'application/json',headers:{'access-control-allow-origin':'https://lab.invalid'},body:JSON.stringify(body)});
   }
   throw new Error('Unexpected network destination in test');
  });
  await page.goto('https://lab.invalid/rational-function-lab/');
  assert.equal(await page.title(),'유리함수 그래프 탐구 초당LAB');assert.equal(await page.locator('h1').textContent(),'유리함수 그래프 탐구 초당LAB');assert.equal(await page.locator('#completionDialog').isVisible(),false);
  const activity=async i=>page.locator('#activities button').nth(i).click();
  const answer=async(i,text,verify=true)=>{const card=page.locator('.quiz-card').nth(i);await card.getByText(text,{exact:true}).click();if(verify)await card.locator('.quiz-check').click();};
  const set=async(key,value)=>{const el=page.locator(`#slider-${key}`),min=key==='a'&&await el.getAttribute('max')==='39'?10:5;await el.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},key==='a'?(value<0?(value+min)*2:(value+min)*2-1):value);};
  await answer(0,'제1·제3사분면',false);assert.ok((await page.locator('#learningProgress').textContent()).includes('0/18'));
  await answer(0,'제2·제4사분면');assert.ok((await page.locator('#learningProgress').textContent()).includes('0/18'));await answer(0,'제1·제3사분면');await answer(1,'2');await answer(2,'2배가 된다');
  await activity(1);await answer(0,'오른쪽으로 1');await answer(1,'아래로 1');await answer(2,'(1, -1)');
  await activity(2);await answer(0,'x = 1, y = 2');await answer(1,'x ≠ 1');await answer(2,'y ≠ 2',false);
  await page.reload();assert.ok((await page.locator('#learningProgress').textContent()).includes('8/18'));assert.equal(await page.locator('#completionDialog').isVisible(),false);assert.equal(await page.locator('.question-complete:visible').count(),3);
  await activity(3);
  const missions=[[2,-2,3,'-2','3','5 = a/(1) + (3)'],[-2,1,-2,'1','-2','-3 = a/(2) + (-2)'],[-6,-1,2,'-1','2','-1 = a/(2) + (2)']];
  for(let i=0;i<3;i++){
   if(i>0)await page.locator('#missionChoices button').nth(i).click();const [a,p,q,pAnswer,qAnswer,pointAnswer]=missions[i];
   await answer(0,pAnswer);await answer(1,qAnswer);await answer(2,pointAnswer);
   // All questions are done except one, so even three successful missions cannot open the popup.
   await set('a',a);await set('p',p);await set('q',q);assert.equal(await page.locator('#completionDialog').isVisible(),false);
  }
  assert.ok((await page.locator('#learningProgress').textContent()).includes('17/18'));await page.reload();await activity(3);assert.equal(await page.locator('#missionChoices .mission-done').count(),3);
  await activity(2);await answer(2,'y ≠ 2');assert.ok(await page.locator('#completionDialog').isVisible());assert.equal(await page.locator('#completionMessage').textContent(),MESSAGE);
  assert.ok((await page.locator('#completionScope').textContent()).includes('서버에서 검증된 학습 결과가 아닙니다'));
  await page.fill('#studentNumber','00123');await page.fill('#studentName','가나다');assert.equal(await page.locator('#studentNumber').inputValue(),'00123');assert.ok(await page.locator('#sendCompletion').isDisabled());assert.equal(sent.length,0);
  const earned=JSON.parse(await page.evaluate(()=>localStorage.getItem(LabProgress.KEY)));
  let stored=await page.evaluate(()=>localStorage.getItem(LabProgress.KEY));assert.ok(!stored.includes('00123')&&!stored.includes('가나다'));assert.ok(!page.url().includes('00123'));
  await page.reload();assert.ok(await page.locator('#completionDialog').isVisible());assert.equal(await page.locator('#studentNumber').inputValue(),'');assert.equal(await page.locator('#studentName').inputValue(),'');
  // Only tests set this mocked URL. The production config stays empty.
  await page.evaluate(()=>{LabSubmission.config.url='https://script.google.com/macros/s/TEST_ONLY/exec';refreshSubmission();});
  assert.ok(await page.locator('#sendCompletion').isDisabled());await page.fill('#studentNumber','00123');await page.fill('#studentName','abc');assert.ok(await page.locator('#sendCompletion').isDisabled());await page.fill('#studentName','가나다');assert.ok(await page.locator('#sendCompletion').isEnabled());
  await page.locator('#sendCompletion').click();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('확인할 수 없습니다'));assert.ok(await page.locator('#sendCompletion').isEnabled());assert.equal(sent[0].studentNumber,'00123');
  backend='malformed';await page.locator('#sendCompletion').click();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('저장 확인을 받지 못했습니다'));
  backend='mismatch';await page.locator('#sendCompletion').click();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('저장 확인을 받지 못했습니다'));
  backend='pending';await page.locator('#sendCompletion').click();await page.waitForFunction(()=>submitting);assert.ok(await page.locator('#sendCompletion').isDisabled());assert.ok(await page.locator('#studentNumber').isDisabled());await page.evaluate(()=>document.querySelector('#completionForm').dispatchEvent(new Event('submit',{cancelable:true})));assert.equal(sent.length,4);
  backend='success';pending();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('서버의 저장 확인'));assert.ok(await page.locator('#sendCompletion').isDisabled());assert.equal(new Set(sent.map(p=>p.submissionId)).size,1);assert.equal(new Set(sent.map(p=>p.payloadHash)).size,1);
  stored=await page.evaluate(()=>localStorage.getItem(LabProgress.KEY));assert.ok(!stored.includes('00123')&&!stored.includes('가나다'));await page.reload();assert.equal(await page.locator('#completionDialog').isVisible(),false);await page.locator('#reopenCompletion').click();assert.ok(await page.locator('#sendCompletion').isDisabled());
  await page.locator('#closeCompletion').click();await page.locator('#resetLearning').click();assert.ok((await page.locator('#learningProgress').textContent()).includes('0/18'));await page.reload();assert.equal(await page.locator('#completionDialog').isVisible(),false);
  // Restore the legitimately earned fixture but remove each required part.
  for(const missing of ['activity1','activity2','activity3','missionQuiz','mission']){
   const incomplete=JSON.parse(JSON.stringify(earned));incomplete.submission=null;
   if(missing.startsWith('activity'))incomplete.quiz[Number(missing.at(-1))-1][0]=false;
   if(missing==='missionQuiz')incomplete.missionQuiz[2][2]=false;
   if(missing==='mission')incomplete.missions[2]=false;
   await page.evaluate(state=>localStorage.setItem(LabProgress.KEY,JSON.stringify(state)),incomplete);await page.reload();assert.equal(await page.locator('#completionDialog').isVisible(),false,missing);
  }
  // Final mission success must open the popup in the same input event.
  await activity(3);await page.locator('#missionChoices button').nth(2).click();await set('a',-6);await set('p',-1);assert.equal(await page.locator('#completionDialog').isVisible(),false);await set('q',2);assert.ok(await page.locator('#completionDialog').isVisible());
  await page.setViewportSize({width:390,height:844});await page.locator('#completionDialog').screenshot({path:'/tmp/lab-completion-mobile.png'});assert.ok(await page.evaluate(()=>{const r=document.querySelector('#completionDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
  await page.setViewportSize({width:1280,height:1000});await page.locator('#completionDialog').screenshot({path:'/tmp/lab-completion-desktop.png'});
  // Simulated CORS failures and opaque responses never become success.
  await page.evaluate(()=>{LabSubmission.config.url='https://script.google.com/macros/s/TEST_ONLY/exec';window.originalFetch=fetch;window.fetch=async()=>{throw new TypeError('Mock CORS failure');};refreshSubmission();});
  await page.fill('#studentNumber','00123');await page.fill('#studentName','가나다');await page.locator('#sendCompletion').click();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('CORS'));
  await page.evaluate(()=>{window.fetch=async()=>({ok:true,type:'opaque'});});await page.locator('#sendCompletion').click();await page.waitForFunction(()=>!submitting);assert.ok((await page.locator('#submissionStatus').textContent()).includes('확인할 수 없습니다'));assert.ok(await page.locator('#sendCompletion').isEnabled());
  await page.evaluate(()=>{window.fetch=window.originalFetch;});
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: exact title/message, confirmed answers only, missing question blocks popup, 18+3 completion, persistence, leading zeros, no-URL disabled/no requests, retry and matching acknowledgment, in-flight/double-submit guards, no PII persisted, reset');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
