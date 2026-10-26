/* Only completion flags and anonymous submission metadata are persisted. */
(function(root){
 const KEY='chodang-lab-progress-v1',VERSION=1;
 const matrix=()=>Array.from({length:3},()=>[false,false,false]);
 function empty(){return {version:VERSION,quiz:matrix(),missionQuiz:matrix(),missions:[false,false,false],submission:null};}
 function normalize(raw){
   const clean=empty();if(!raw||raw.version!==VERSION)return clean;
   for(const key of ['quiz','missionQuiz'])for(let i=0;i<3;i++)for(let j=0;j<3;j++)clean[key][i][j]=raw[key]?.[i]?.[j]===true;
   for(let i=0;i<3;i++)clean.missions[i]=raw.missions?.[i]===true&&(i===0||clean.missions[i-1]);
   const s=raw.submission;
   if(s&&typeof s.id==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(s.id)&&typeof s.submittedAt==='string'&&Number.isFinite(Date.parse(s.submittedAt)))clean.submission={id:s.id,submittedAt:s.submittedAt,confirmed:s.confirmed===true};
   return clean;
 }
 function createStore(storage){
   let state=empty(),available=Boolean(storage);
   try{if(storage)state=normalize(JSON.parse(storage.getItem(KEY)));}catch{available=false;}
   function save(){try{if(storage){storage.setItem(KEY,JSON.stringify(state));available=true;}}catch{available=false;}}
   const valid=n=>Number.isInteger(n)&&n>=0&&n<3;
   function row(activity,mission){return activity===3?(valid(mission)?state.missionQuiz[mission]:null):(valid(activity)?state.quiz[activity]:null);}
   const store={
     get missions(){return state.missions;},get storageAvailable(){return available;},
     isQuestionDone:(activity,mission,i)=>valid(i)&&row(activity,mission)?.[i]===true,
     markQuestion(activity,mission,i){const r=row(activity,mission);if(valid(i)&&r&&!r[i]){r[i]=true;save();}},
     markMission(i){if(valid(i)&&(i===0||state.missions[i-1])&&!state.missions[i]){state.missions[i]=true;save();}},
     activityDone(i){return i===3?state.missionQuiz.flat().every(Boolean)&&state.missions.every(Boolean):valid(i)&&state.quiz[i].every(Boolean);},
     allComplete:()=>state.quiz.flat().every(Boolean)&&state.missionQuiz.flat().every(Boolean)&&state.missions.every(Boolean),
     counts:()=>({questions:[...state.quiz.flat(),...state.missionQuiz.flat()].filter(Boolean).length,missions:state.missions.filter(Boolean).length}),
     restartMissions(){state.missions.fill(false);state.missionQuiz=matrix();state.submission=null;save();},
     reset(){state.quiz=matrix();state.missionQuiz=matrix();state.missions.fill(false);state.submission=null;save();},
     submission(){return state.submission?{...state.submission}:null;},
     beginSubmission(){
       if(!store.allComplete())throw new Error('모든 활동을 먼저 완료해 주세요.');
       if(!state.submission){const id=root.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;state.submission={id,submittedAt:new Date().toISOString(),confirmed:false};save();}
       return {...state.submission};
     },
     confirmSubmission(id){if(store.allComplete()&&state.submission?.id===id){state.submission.confirmed=true;save();}},
     snapshot:()=>JSON.parse(JSON.stringify(state))
   };
   return store;
 }
 const api={KEY,createStore,normalize};
 if(typeof module!=='undefined')module.exports=api;else root.LabProgress=api;
})(typeof window!=='undefined'?window:globalThis);
