// Production URL + project-subpath integration. External responses are mocked;
// this test never posts data or contacts an actual Google Sheet.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const expected='https://script.google.com/macros/s/AKfycby6pO3ZDO-pX4WTD7lJWeyYwmjN9QnIIEphnRzo0tBPrBjJa8LXpN_X-qfd50RRL1WDzQ/exec';
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.ok(expected.endsWith('/exec'));assert.ok(html.includes(`url:'${expected}'`));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];let blocked=false;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{
   const request=route.request();requests.push({url:request.url(),method:request.method()});
   if(request.url()==='https://pages.invalid/rational-function-lab/')return route.fulfill({contentType:'text/html',body:html});
   if(request.url()===expected)return route.fulfill({contentType:'text/html',headers:blocked?{'content-security-policy':"frame-ancestors 'none'",'x-frame-options':'DENY'}:{},body:'<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="icon" href="data:,"><h1>연결 확인용 모의 제출 화면</h1></html>'});
   throw new Error('Unexpected asset/dependency request');
  });
  await page.goto('https://pages.invalid/rational-function-lab/');
  assert.equal(await page.evaluate(()=>LabSubmission.webAppUrl()),expected);assert.equal(await page.evaluate(()=>LabSubmission.config.embed),true);
  assert.equal(await page.locator('#completionDialog').isVisible(),false);assert.equal(requests.filter(r=>r.url===expected).length,0);
  await page.evaluate(()=>{for(let a=0;a<3;a++)for(let q=0;q<3;q++)progress.markQuestion(a,0,q);for(let m=0;m<3;m++){for(let q=0;q<3;q++)progress.markQuestion(3,m,q);progress.markMission(m);}updateLearningStatus();});
  assert.ok(await page.locator('#completionDialog').isVisible());assert.equal(await page.locator('#submissionFrameHost iframe').getAttribute('src'),expected);
  await page.frameLocator('#submissionFrameHost iframe').getByRole('heading',{name:'연결 확인용 모의 제출 화면'}).waitFor();
  assert.equal(await page.locator('#openSubmissionNewTab').getAttribute('href'),expected);assert.equal(await page.locator('#openSubmissionNewTab').textContent(),'새 탭에서 제출하기');
  await page.locator('#closeCompletion').click();blocked=true;
  const policy=page.waitForEvent('console',{predicate:m=>/frame-ancestors|X-Frame-Options|Refused to frame/.test(m.text())});await page.locator('#reopenCompletion').click();await policy;
  await page.locator('#hideSubmissionFrame').click();const opened=context.waitForEvent('page');await page.locator('#openSubmissionNewTab').click();const tab=await opened;
  await tab.getByRole('heading',{name:'연결 확인용 모의 제출 화면'}).waitFor();assert.equal(tab.url(),expected);assert.equal(await tab.evaluate(()=>window.opener),null);
  assert.ok(requests.every(r=>r.method==='GET'));assert.equal(await page.locator('script[src],link[rel=stylesheet]').count(),0);
  assert.ok(!(await page.locator('#submissionStatus').textContent()).includes('성공'));assert.deepEqual(errors,[]);
  console.log('PASS: exact production /exec URL; embed=true; completion gate; iframe source; browser-enforced frame refusal and safe new-tab fallback; GitHub Pages subpath; no missing assets or POSTs');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
