const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')}):r.abort());
  await page.goto('https://preview.invalid/visual/index.html');await page.waitForFunction(()=>document.querySelector('#runtime-status').hidden);
  const set=async(key,value)=>{const el=page.locator(`#slider-${key}`);const min=key==='a'&&await el.getAttribute('max')==='39'?10:5;const sliderValue=key==='a'?(value<0?(value+min)*2:(value+min)*2-1):value;await el.evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},sliderValue);};
  const fraction=async(a,p,q)=>{
   const formula=page.locator('#formula');assert.equal(await formula.locator('.math-fraction').count(),1);assert.equal(await formula.locator('.math-numerator').textContent(),String(Math.abs(a)));assert.equal(await formula.locator('.math-denominator').textContent(),p===0?'x':`x ${p<0?'+':'−'} ${Math.abs(p)}`);assert.equal(await formula.locator('.math-negative').count(),a<0?1:0);assert.equal(await formula.locator('.math-offset').count(),q===0?0:1);if(q!==0)assert.equal(await formula.locator('.math-offset').textContent(),`${q<0?'−':'+'} ${Math.abs(q)}`);
   const geometry=await formula.evaluate(el=>{const num=el.querySelector('.math-numerator').getBoundingClientRect(),den=el.querySelector('.math-denominator').getBoundingClientRect(),box=el.getBoundingClientRect(),eq=el.querySelector('.math-equation').getBoundingClientRect();return {stacked:num.bottom<=den.top+.1,border:parseFloat(getComputedStyle(el.querySelector('.math-numerator')).borderBottomWidth),fits:eq.left>=box.left&&eq.right<=box.right&&eq.top>=box.top&&eq.bottom<=box.bottom};});assert.ok(geometry.stacked);assert.ok(geometry.border>=1);assert.ok(geometry.fits,'fraction fits card');
  };
  const labels=async()=>{
   const issues=await page.evaluate(()=>{
    const canvas=document.querySelector('canvas').getBoundingClientRect(),nodes=[...document.querySelectorAll('.graph-label')],problems=[];
    nodes.forEach((el,i)=>{const a=el.getBoundingClientRect();if(a.left<canvas.left||a.right>canvas.right+.1||a.top<canvas.top||a.bottom>canvas.bottom+.1)problems.push(`clipped ${el.textContent}`);nodes.slice(i+1).forEach(other=>{const b=other.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)problems.push(`overlap ${el.textContent} / ${other.textContent}`);});});return problems;
   });assert.deepEqual(issues,[]);
  };
  for(const [i,values] of [[0,[2,0,0]],[1,[2,1,-1]],[2,[-2,1,2]],[3,[1,0,0]]]){await page.locator('#activities button').nth(i).click();await fraction(...values);await labels();}
  await page.locator('#activities button').nth(1).click();
  for(const [a,p,q] of [[2,-2,3],[-3,2,-1],[1,0,0],[-2,0,3],[-.5,-2.5,.5],[.5,2.5,-.5]]){await set('a',a);await set('p',p);await set('q',q);await fraction(a,p,q);await labels();
   const painted=await page.locator('canvas').evaluate((canvas,{x,y})=>{const r=canvas.getBoundingClientRect(),ratio=canvas.width/r.width,px=Math.round((r.width/2+x*42)*ratio),py=Math.round((r.height/2-y*42)*ratio),ctx=canvas.getContext('2d');for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const c=ctx.getImageData(px+dx,py+dy,1,1).data;if(Math.abs(c[0]-22)<12&&Math.abs(c[1]-121)<12&&Math.abs(c[2]-104)<12)return true;}return false;},{x:p+1,y:a+q});assert.ok(painted,`formula and graph agree for ${a},${p},${q}`);
  }
  await page.locator('#activities button').nth(3).click();await set('a',2);await set('p',-2);await set('q',3);await page.locator('#asymptotes').check();await labels();assert.equal(await page.locator('.target-asymptote').count(),2);assert.ok((await page.locator('.target-asymptote').allTextContents()).every(s=>s.startsWith('목표·현재')));assert.equal(await page.locator('.target-point').textContent(),'(-1, 5)');
  await page.locator('#successOverlay').waitFor({state:'hidden',timeout:2500});
  await page.screenshot({path:'/tmp/lab-fraction-desktop.png',fullPage:true});
  // Include an edge point, crowded asymptotes, and a viewport with the goals offscreen.
  await page.evaluate(()=>{v.cy=0;v.scale=42;draw();});await labels();
  for(const view of [{scale:10,cx:0,cy:0},{scale:300,cx:-1,cy:5},{scale:42,cx:9,cy:0},{scale:42,cx:-10,cy:0},{scale:42,cx:0,cy:10},{scale:42,cx:0,cy:-10},{scale:300,cx:10000,cy:10000}]){await page.evaluate(next=>{Object.assign(v,next);draw();},view);await labels();}
  await page.locator('#resetView').click();await page.locator('#zoomIn').click();await labels();await page.locator('#zoomOut').click();
  const canvas=await page.locator('#plot').boundingBox();await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width/2+90,canvas.y+canvas.height/2-50);await page.mouse.up();await labels();
  await page.locator('#resetView').click();
  for(const width of [820,768,390,320]){await page.setViewportSize({width,height:1100});await page.waitForFunction(()=>Math.abs(document.querySelector('canvas').width-document.querySelector('canvas').getBoundingClientRect().width*devicePixelRatio)<2);await set('a',-9.5);await set('p',-4.5);await set('q',-4.5);await fraction(-9.5,-4.5,-4.5);await labels();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===768)await page.screenshot({path:'/tmp/lab-fraction-tablet.png',fullPage:true});}
  await page.screenshot({path:'/tmp/lab-fraction-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: 4 activities use stacked fractions; 6 sign/zero/decimal samples; label bounds/non-overlap at 8 view states; zoom/pan; 1280/820/768/390/320px; no network or console errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
