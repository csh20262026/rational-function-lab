const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {checkLab}=require('./lab-checks.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));
  const url=process.env.LAB_URL||'http://127.0.0.1:8000';
  await page.goto(url);await checkLab(page,'HTTP browser');
  await page.locator('#activities button').nth(3).click();
  await page.screenshot({path:'/tmp/lab-mission-desktop.png',fullPage:true});
  for(const width of [768,390]){
   await page.setViewportSize({width,height:1024});
   await page.waitForFunction(()=>Math.abs(document.querySelector('canvas').width-document.querySelector('canvas').getBoundingClientRect().width*devicePixelRatio)<2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   for(const el of await page.locator('.answer-option').all())assert.ok((await el.boundingBox()).height>=44);
  }
  await page.screenshot({path:'/tmp/lab-mission-mobile.png',fullPage:true});
  const tablet=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
  const touch=await tablet.newPage();touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url);
  await touch.locator('#plot').tap();assert.ok((await touch.locator('#coordinate').textContent()).includes('x ='));
  await touch.locator('.quiz-card').first().getByText('제1·제3사분면',{exact:true}).tap();await touch.locator('.quiz-check').first().tap();assert.ok((await touch.locator('.quiz-feedback').first().textContent()).startsWith('정답입니다!'));
  await touch.locator('#activities button').nth(3).tap();await touch.locator('#checkMission').tap();assert.ok(await touch.locator('#missionFeedback').isVisible());
  await touch.screenshot({path:'/tmp/lab-mission-tablet.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: HTTP startup; PC/tablet/mobile layouts; 44px choices; tablet touch graph/quiz/mission; no console or loading errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
