/* Pure mathematical helpers shared by the browser and the regression tests. */
(function(root){
  const A_VALUES=Array.from({length:21},(_,i)=>(i-10)/2).filter(v=>v!==0);
  const MISSION_A_VALUES=Array.from({length:41},(_,i)=>(i-20)/2).filter(v=>v!==0);
  function value(x,a,p,q){return x===p?NaN:a/(x-p)+q;}
  function formula(a,p,q){return `y = ${a} / (${p===0?'x':p<0?`x + ${-p}`:`x − ${p}`})${q===0?'':q<0?` − ${-q}`:` + ${q}`}`;}
  function toScreen(x,y,v){return {x:v.width/2+(x-v.cx)*v.scale,y:v.height/2-(y-v.cy)*v.scale};}
  function toWorld(x,y,v){return {x:v.cx+(x-v.width/2)/v.scale,y:v.cy-(y-v.height/2)/v.scale};}
  // Sample separately on each side of the pole. Only retain points inside
  // a padded viewport; insert intersections with the top/bottom edges so
  // a branch cannot disappear when its visible portion is very narrow.
  function branches(a,p,q,v){
    const left=v.cx-v.width/(2*v.scale),right=v.cx+v.width/(2*v.scale);
    const bottom=v.cy-(v.height/2+4)/v.scale,top=v.cy+(v.height/2+4)/v.scale;
    return [[left,Math.min(p,right)],[Math.max(p,left),right]].map(([lo,hi])=>{
      if(lo>=hi)return [];
      const xs=[lo,hi];
      for(let px=0;px<=v.width;px++){const x=left+px/v.scale;if(x>lo&&x<hi)xs.push(x);}
      for(const y of [bottom,top]){if(y!==q){const x=p+a/(y-q);if(x>lo&&x<hi)xs.push(x);}}
      return xs.sort((x,y)=>x-y).filter(x=>x!==p).map(x=>({x,y:value(x,a,p,q)})).filter(pt=>Number.isFinite(pt.y)&&pt.y>=bottom-1e-8&&pt.y<=top+1e-8);
    });
  }
  // Mission definitions must have a nonzero solution and be reachable by the sliders.
  function makeMission(p,q,x,y){
    const a=(y-q)*(x-p);
    if(![p,q,x,y,a].every(Number.isFinite)||x===p||a===0||
      !Number.isInteger(a*2)||Math.abs(a)>10||
      ![p,q].every(n=>n>=-5&&n<=5&&Number.isInteger(n*2)))
      throw new Error('슬라이더로 만들 수 없는 미션입니다. 목표점과 점근선 조건을 확인하세요.');
    return Object.freeze({p,q,x,y,a});
  }
  function checkMission(a,p,q,target){
    const valid=[a,p,q].every(Number.isFinite)&&a!==0;
    const actual=valid?value(target.x,a,p,q):NaN;
    const near=(x,y)=>Number.isFinite(x)&&Math.abs(x-y)<=1e-9;
    const vertical=valid&&near(p,target.p),horizontal=valid&&near(q,target.q);
    const point=valid&&near(actual,target.y);
    return {vertical,horizontal,point,actual,success:vertical&&horizontal&&point};
  }
  const api={A_VALUES,MISSION_A_VALUES,value,formula,toScreen,toWorld,branches,makeMission,checkMission};
  if(typeof module!=='undefined')module.exports=api;else root.LabMath=api;
})(typeof window!=='undefined'?window:globalThis);
