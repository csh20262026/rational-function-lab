/* Apps Script 제출 화면 연결 설정. 교사가 제공한 웹앱 URL을 사용합니다.
 * 이 모듈은 화면만 엽니다. 학번·이름을 읽거나 전송 성공을 판정하지 않습니다.
 */
(function(root){
 const config={
   url:'https://script.google.com/macros/s/AKfycby6pO3ZDO-pX4WTD7lJWeyYwmjN9QnIIEphnRzo0tBPrBjJa8LXpN_X-qfd50RRL1WDzQ/exec',       // 교사의 https://script.google.com/macros/s/.../exec URL
   embed:true    // iframe이 허용되지 않는 경우 false: 새 탭 방식만 사용
 };
 function webAppUrl(){
   try{
     const u=new URL(config.url);
     if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)||u.search||u.hash||u.username||u.password||u.port)return '';
     return u.href;
   }catch{return '';}
 }
 function createFrame(){
   const url=webAppUrl();if(!url||!config.embed)return null;
   const frame=document.createElement('iframe');
   frame.title='Google Apps Script 학번·이름 제출 화면';frame.referrerPolicy='no-referrer';
   frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
   frame.src=url;
   return frame;
 }
 root.LabSubmission={config,webAppUrl,isConfigured:()=>Boolean(webAppUrl()),createFrame};
})(window);
