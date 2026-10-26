// Run with Playwright + Chromium; no server or external network is required.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// Keep the unconfigured/offline test fixture separate from production settings.
const configuredUrl=fs.readFileSync(path.join(__dirname,'../submission.js'),'utf8').match(/url:'([^']*)'/)[1];
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace(`url:'${configuredUrl}'`,"url:''");
const screenshotDir=process.env.SCREENSHOT_DIR||'/tmp';

const {checkLab}=require('./lab-checks.cjs');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    for(const mode of ['html-only','sandbox-srcdoc']){
      const page=await browser.newPage({viewport:{width:1280,height:1000}});
      if(mode==='html-only'){await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));}
      const errors=[],failed=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('requestfailed',r=>failed.push(r.url()));
      page.on('request',r=>requests.push(r.url()));
      await page.route('**/*',r=>{
        if(mode==='html-only'&&r.request().isNavigationRequest())return r.fulfill({contentType:'text/html',body:html});
        return r.abort(); // External CSS/JS and all network access are unavailable.
      });
      let frame=page;
      if(mode==='html-only')await page.goto('https://preview.invalid/isolated/index.html');
      if(mode==='sandbox-srcdoc'){
        await page.setContent('<iframe title="HTML 단독 미리보기" sandbox="allow-scripts" style="width:100%;height:1100px;border:0"></iframe>');
        await page.locator('iframe').evaluate((el,source)=>{el.srcdoc=source;},html);
        await page.frameLocator('iframe').locator('#plot').waitFor({state:'attached'});
        frame=page.frames().find(f=>f.parentFrame());
      }
      await checkLab(frame,mode);
      assert.deepEqual(errors,[],`${mode}: console errors`);
      assert.deepEqual(failed,[],`${mode}: failed loads`);
      assert.ok(requests.every(url=>url==='https://preview.invalid/isolated/index.html'),`${mode}: unexpected resource requests ${requests}`);
      await page.screenshot({path:path.join(screenshotDir,`lab-preview-${mode}.png`),fullPage:true});
      console.log(`PASS: ${mode}: console errors 0; failed resource loads 0`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
