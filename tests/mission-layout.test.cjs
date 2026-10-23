const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[],baseline=process.env.BASELINE_FILE?JSON.parse(fs.readFileSync(process.env.BASELINE_FILE,'utf8')):null;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')}):r.abort());
  await page.goto('https://preview.invalid/layout/');await page.waitForFunction(()=>document.querySelector('#runtime-status').hidden);
  for(const width of [1280,820,768,390,320]){
   await page.setViewportSize({width,height:width===1280?900:1100});
   for(let i=0;i<3;i++){
    await page.locator('#activities button').nth(i).click();await page.waitForFunction(()=>Math.abs(document.querySelector('canvas').width-document.querySelector('canvas').getBoundingClientRect().width*devicePixelRatio)<2);await page.evaluate(()=>scrollTo(0,0));
    assert.equal(await page.locator('#missionPanel').isVisible(),false);assert.ok(await page.locator('.prompt').isVisible());
    if(baseline?.[`${width}-${i}`]){const actual=await page.evaluate(()=>Object.fromEntries(['#activities','.prompt','.workspace','#plot','aside','#formula','.notes[aria-labelledby=quizTitle]'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return[selector,{x:r.x,y:r.y,w:r.width,h:r.height}]})));assert.deepEqual(actual,baseline[`${width}-${i}`],`activity ${i+1} at ${width}px unchanged`);}
   }
   await page.locator('#activities button').nth(3).click();await page.evaluate(()=>scrollTo(0,0));
   const layout=await page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const panel=box('#missionPanel'),nodes=[...document.querySelectorAll('#missionPanel button')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};});
    return {nav:box('#activities'),panel,workspace:box('.workspace'),canvas:box('#plot'),title:box('#missionTitle'),progress:box('#missionProgress'),description:box('#missionDescription'),descriptionLine:parseFloat(getComputedStyle(document.querySelector('#missionDescription')).lineHeight),choices:nodes.slice(0,3),actions:nodes.slice(3),overflow:document.documentElement.scrollWidth>innerWidth,notes:box('.notes[aria-labelledby=quizTitle]')};
   });
   assert.equal(await page.locator('.prompt').isVisible(),false);assert.ok(layout.nav.bottom<=layout.panel.y);assert.ok(layout.panel.bottom<=layout.workspace.y);assert.ok(layout.workspace.y-layout.panel.bottom<=16);assert.ok(layout.workspace.bottom<=layout.notes.y);
   assert.ok(Math.abs(layout.title.y-layout.progress.y)<6);assert.ok(layout.title.right<layout.progress.x);
   assert.equal(layout.overflow,false);assert.ok(layout.canvas.h>=400);
   for(const b of [...layout.choices,...layout.actions]){assert.ok(b.x>=layout.panel.x&&b.right<=layout.panel.right+.1);assert.ok(b.h>=44);}
   for(const group of [layout.choices,layout.actions])for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i],b=group[j];assert.ok(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),'buttons do not overlap');}
   if(width>=768){assert.ok(layout.description.h<=layout.descriptionLine*2+1);assert.ok(layout.panel.h<=240,`compact panel: ${layout.panel.h}px`);assert.ok(layout.canvas.y+120<(width===1280?900:1100));assert.ok(layout.actions.every(b=>b.y===layout.actions[0].y));assert.ok(layout.choices.every(b=>b.y===layout.choices[0].y));}
   if([1280,768,390].includes(width))await page.screenshot({path:`/tmp/lab-mission-layout-${width}.png`,fullPage:true});
   console.log(`PASS: ${width}px mission above graph; panel ${layout.panel.h.toFixed(0)}px; description ${Math.round(layout.description.h/layout.descriptionLine)} line(s); no button overlap/clipping`);
  }
  assert.deepEqual(errors,[]);console.log(`PASS: activity 1–3 layouts${baseline?' match pre-change geometry':''}; no console or loading errors`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
