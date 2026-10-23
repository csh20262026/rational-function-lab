const assert=require('node:assert/strict');
const M=require('../math.js');
const samples=[{a:2,p:0,q:0,x:1,y:2},{a:-2,p:0,q:0,x:1,y:-2},{a:2,p:-2,q:1,x:0,y:2},{a:-.5,p:3,q:-2,x:2,y:-1.5},{a:5,p:5,q:5,x:4,y:0}];
for(const f of samples){assert.equal(M.value(f.x,f.a,f.p,f.q),f.y);assert.ok(Number.isNaN(M.value(f.p,f.a,f.p,f.q)));for(const cx of [0,10000,-10000])for(const scale of [10,42,300]){const v={cx,cy:0,scale,width:700,height:470};for(const branch of M.branches(f.a,f.p,f.q,v)){assert.ok(branch.every(pt=>Number.isFinite(pt.x)&&Number.isFinite(pt.y)));assert.ok(branch.every(pt=>pt.x<f.p)||branch.every(pt=>pt.x>f.p));for(const pt of branch)assert.equal(pt.y,M.value(pt.x,f.a,f.p,f.q));}const o=M.toScreen(0,0,v),x=M.toScreen(1,0,v),y=M.toScreen(0,1,v);assert.equal(x.x-o.x,o.y-y.y);assert.deepEqual(M.toWorld(o.x,o.y,v),{x:0,y:0});}}
assert.equal(M.A_VALUES.length,20);assert.ok(!M.A_VALUES.includes(0));assert.equal(M.formula(2,-2,1),'y = 2 / (x + 2) + 1');
console.log('PASS: 5 sample functions; 45 view combinations; poles, equal scales, nonzero a, formula signs');
const mission=M.makeMission(-2,3,-1,5);
assert.equal(mission.a,2);
assert.ok(M.checkMission(2,-2,3,mission).success);
assert.equal(M.checkMission(1,-2,4,mission).success,false);
assert.equal(M.checkMission(1,-2,4,mission).point,true);
assert.equal(M.checkMission(1,-1,3,mission).point,false);
assert.equal(M.checkMission(0,-2,5,mission).success,false);
assert.equal(M.checkMission(-2,-2,3,mission).success,false);
assert.equal(M.checkMission(2,-2,2.5,mission).success,false);
assert.throws(()=>M.makeMission(-2,3,-2,5));
assert.throws(()=>M.makeMission(-2,3,-1,3));
assert.throws(()=>M.makeMission(-2,3,-1,20));
console.log('PASS: mission numeric success, wrong asymptotes, passing point alone, pole, nonzero a, invalid mission rejection');
assert.equal(M.MISSION_A_VALUES.length,40);
assert.ok(M.MISSION_A_VALUES.includes(-6));assert.ok(!M.MISSION_A_VALUES.includes(0));
for(const [p,q,x,y,correctA] of [[-2,3,-1,5,2],[1,-2,3,-3,-2],[-1,2,1,-1,-6]]){
 const t=M.makeMission(p,q,x,y);assert.equal(t.a,correctA);
 assert.ok(M.checkMission(correctA,p,q,t).success);
 for(const wrong of [[correctA+.5,p,q],[correctA,p+.5,q],[correctA,p,q+.5],[correctA,x,q],[0,p,q],[correctA+1e-6,p,q]])assert.equal(M.checkMission(...wrong,t).success,false);
}
console.log('PASS: all 3 mission solutions; wrong a/p/q, pole, a=0, and near-but-wrong coefficients rejected; extended range includes -6');
