const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const MESSAGE='수고했습니다. 모든 활동이 완벽해요. 수학 선생님께 완료메세지를 보내기 위해 학번과 이름을 입력해주세요.';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let blocked=false;
  const MOCK_URL='https://script.google.com/macros/s/TEST_ONLY/exec';
  await context.route('**/*',async route=>{
   const request=route.request();requests.push({url:request.url(),method:request.method(),referrer:request.headers()['referer']||''});
   if(request.url().startsWith('https://lab.invalid/'))return route.fulfill({contentType:'text/html',body:html});
   if(request.url()===MOCK_URL)return route.fulfill({status:200,contentType:'text/html',headers:blocked?{'x-frame-options':'DENY','content-security-policy':"frame-ancestors 'none'"}:{},body:`<!doctype html><html lang="ko"><meta charset="utf-8"><title>모의 Apps Script 제출 화면</title><link rel="icon" href="data:,"><h1>모의 제출 화면</h1><form id="mockForm"><label>학번 <input id="mockNumber" type="text" inputmode="numeric"></label><label>이름 <input id="mockName" type="text"></label><button>선생님께 전송</button></form><p id="mockResult"></p><script>document.getElementById('mockForm').onsubmit=e=>{e.preventDefault();document.getElementById('mockResult').textContent='모의 저장 확인';parent.postMessage({success:true,submitted:true},'*');};</script></html>`});
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
  assert.equal(await page.locator('#completionDialog input').count(),0);
  assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);
  assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('href'),null);
  assert.equal(requests.filter(r=>r.url===MOCK_URL).length,0);
  const earned=JSON.parse(await page.evaluate(()=>localStorage.getItem(LabProgress.KEY)));
  await page.reload();assert.ok(await page.locator('#completionDialog').isVisible());
  for(const invalid of ['javascript:alert(1)','http://script.google.com/macros/s/TEST_ONLY/exec','https://example.com/exec',MOCK_URL+'?studentNumber=00123']){
   await page.evaluate(url=>{LabSubmission.config.url=url;showSubmissionScreen();},invalid);
   assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('href'),null);
  }
  await page.evaluate(url=>{LabSubmission.config.url=url;showSubmissionScreen();},MOCK_URL);
  const child=page.frameLocator('#submissionFrameHost iframe');await child.getByRole('heading',{name:'모의 제출 화면'}).waitFor();
  assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('href'),MOCK_URL);
  assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('rel'),'noopener noreferrer');
  assert.equal(await page.locator('#submissionFrameHost iframe').getAttribute('referrerpolicy'),'no-referrer');
  await child.locator('#mockNumber').fill('00123');await child.locator('#mockName').fill('가나다');await child.getByRole('button',{name:'선생님께 전송'}).click();
  assert.equal(await child.locator('#mockNumber').inputValue(),'00123');assert.equal(await child.locator('#mockResult').textContent(),'모의 저장 확인');
  assert.ok(!(await page.locator('#submissionStatus').textContent()).includes('성공'));assert.equal(await page.evaluate(()=>progress.submission()),null);
  const stored=await page.evaluate(()=>localStorage.getItem(LabProgress.KEY));assert.ok(!stored.includes('00123')&&!stored.includes('가나다'));assert.ok(requests.every(r=>!r.url.includes('00123')&&!r.url.includes('%EA')));
  // A genuine browser frame refusal must keep the safe top-level link usable.
  await page.locator('#closeCompletion').click();assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);blocked=true;const blockedRequest=page.waitForRequest(MOCK_URL),policyFailure=page.waitForEvent('console',{predicate:m=>/frame-ancestors|X-Frame-Options|Refused to frame/.test(m.text())});await page.locator('#reopenCompletion').click();await blockedRequest;await policyFailure;
  assert.ok(await page.locator('#openSubmissionNewTab').isVisible());assert.ok(!(await page.locator('#submissionStatus').textContent()).includes('성공'));
  await page.locator('#hideSubmissionFrame').click();assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);
  const newTabPromise=context.waitForEvent('page');await page.locator('#openSubmissionNewTab').click();const newTab=await newTabPromise;
  await newTab.getByRole('heading',{name:'모의 제출 화면'}).waitFor();assert.equal(await newTab.evaluate(()=>window.opener),null);assert.equal(newTab.url(),MOCK_URL);await newTab.close();
  blocked=false;await page.evaluate(()=>{LabSubmission.config.embed=false;showSubmissionScreen();});assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('href'),MOCK_URL);
  await page.locator('#closeCompletion').click();await page.locator('#resetLearning').click();assert.ok((await page.locator('#learningProgress').textContent()).includes('0/18'));await page.reload();assert.equal(await page.locator('#completionDialog').isVisible(),false);
  await page.evaluate(url=>{LabSubmission.config.url=url;openCompletion();},MOCK_URL);assert.equal(await page.locator('#completionDialog').isVisible(),false);assert.equal(await page.locator('#submissionFrameHost iframe').count(),0);
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
  await page.evaluate(url=>{LabSubmission.config.url=url;showSubmissionScreen();},MOCK_URL);await page.frameLocator('#submissionFrameHost iframe').getByRole('heading',{name:'모의 제출 화면'}).waitFor();
  assert.ok(requests.filter(r=>r.url===MOCK_URL).every(r=>r.referrer===''));
  await page.setViewportSize({width:390,height:844});await page.locator('#completionDialog').screenshot({path:'/tmp/lab-completion-mobile.png'});assert.ok(await page.evaluate(()=>{const r=document.querySelector('#completionDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
  await page.setViewportSize({width:1280,height:1000});await page.locator('#completionDialog').screenshot({path:'/tmp/lab-completion-desktop.png'});
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: exact completion conditions and persistence; no URL/no network; validated iframe URL; blocked framing and noopener new-tab fallback; embed=false; cross-origin form isolated; no false success or PII storage; mobile popup and reset');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
