/* Set only after deploying and testing the teacher's Apps Script endpoint.
 * Empty URL deliberately prevents all network requests.
 * Server contract and CORS/idempotency requirements: SUBMISSION_SETUP.md.
 */
(function(root){
 const config={url:''};
 function isConfigured(){
   try{const u=new URL(config.url);return u.protocol==='https:'&&u.hostname==='script.google.com'&&/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash&&!u.username&&!u.password&&u.port==='';}catch{return false;}
 }
 function validIdentity(studentNumber,name){return /^[0-9]{1,20}$/.test(studentNumber)&&/^[가-힣]{1,20}$/.test(name);}
 async function sendCompletion(payload){
   if(!isConfigured())throw new Error('선생님 전송 주소가 아직 설정되지 않았습니다.');
   if(!validIdentity(payload.studentNumber,payload.name))throw new Error('학번은 숫자, 이름은 한글로 입력해 주세요.');
   if(payload.result?.source!=='browser-local-progress'||payload.result?.complete!==true||payload.result?.questions!==18||payload.result?.missions!==3)throw new Error('모든 활동을 먼저 완료해 주세요.');
   const bytes=new TextEncoder().encode(JSON.stringify(payload));
   const payloadHash=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
     const response=await fetch(config.url,{
       method:'POST',mode:'cors',credentials:'omit',redirect:'follow',signal:controller.signal,
       // Form encoding avoids a JSON Content-Type preflight. The final response
       // still MUST allow CORS; an opaque/no-cors response is never success.
       body:new URLSearchParams({payload:JSON.stringify({...payload,payloadHash})})
     });
     if(!response.ok||response.type==='opaque')throw new Error('서버 응답을 확인할 수 없습니다. 다시 시도해 주세요.');
     let ack;try{ack=await response.json();}catch{throw new Error('서버 확인 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');}
     if(!ack||typeof ack!=='object'||ack.ok!==true||ack.submissionId!==payload.submissionId||ack.payloadHash!==payloadHash||typeof ack.receiptId!=='string'||!ack.receiptId.trim())throw new Error('서버의 저장 확인을 받지 못했습니다. 다시 시도해 주세요.');
     return {confirmed:true};
   }catch(error){
     if(error.name==='AbortError')throw new Error('응답 대기 시간이 지났습니다. 같은 제출 번호로 다시 시도해 주세요.');
     if(error instanceof TypeError)throw new Error('연결 또는 CORS 응답 확인에 실패했습니다. 다시 시도해 주세요.');
     throw error;
   }finally{clearTimeout(timer);}
 }
 root.LabSubmission={config,isConfigured,validIdentity,sendCompletion};
})(window);
