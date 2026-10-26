const assert=require('node:assert/strict');
const P=require('../progress.js');
let raw=null;const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
const store=P.createStore(storage);
assert.equal(store.allComplete(),false);store.markMission(2);assert.equal(store.missions[2],false);
for(let a=0;a<3;a++)for(let q=0;q<3;q++)store.markQuestion(a,0,q);
for(let m=0;m<3;m++){store.markMission(m);for(let q=0;q<3;q++)if(m!==2||q!==2)store.markQuestion(3,m,q);}
assert.equal(store.allComplete(),false);store.markQuestion(3,2,2);assert.ok(store.allComplete());
assert.deepEqual(store.counts(),{questions:18,missions:3});
const restored=P.createStore(storage);assert.ok(restored.allComplete());const submission=restored.beginSubmission();assert.equal(restored.beginSubmission().id,submission.id);restored.confirmSubmission('wrong');assert.equal(restored.submission().confirmed,false);restored.confirmSubmission(submission.id);assert.ok(P.createStore(storage).submission().confirmed);
assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),['missionQuiz','missions','quiz','submission','version']);
restored.restartMissions();assert.equal(restored.allComplete(),false);assert.deepEqual(restored.counts(),{questions:9,missions:0});assert.equal(restored.submission(),null);restored.reset();assert.deepEqual(P.createStore(storage).counts(),{questions:0,missions:0});
raw='{broken';assert.equal(P.createStore(storage).allComplete(),false);
const denied=P.createStore({getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}});denied.markQuestion(0,0,0);assert.ok(denied.isQuestionDone(0,0,0));assert.equal(denied.storageAvailable,false);
const polluted=P.normalize({version:1,studentNumber:'not retained',name:'not retained',missions:[false,true,true]});assert.deepEqual(polluted.missions,[false,false,false]);assert.equal(polluted.name,undefined);
console.log('PASS: 18 confirmed question flags + 3 sequential missions, persistence, stable retry IDs, acknowledgment, resets, malformed/denied storage; no identity fields retained');
