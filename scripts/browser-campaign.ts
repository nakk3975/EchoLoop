import {stages,referenceInputs} from '../src/stages.ts';
const status=document.querySelector('#status')!,report=document.querySelector('#report')!,iframe=document.querySelector<HTMLIFrameElement>('#game')!;
const run=document.querySelector<HTMLButtonElement>('#run')!,download=document.querySelector<HTMLButtonElement>('#export')!;
const touchMode=new URLSearchParams(location.search).has('touch');
if(touchMode){iframe.style.width='390px';iframe.style.height='680px';document.querySelector('h1')!.textContent='80레벨 모바일 터치 검사';document.querySelector('h1+p')!.textContent='프로덕션 번들 · 390px 화면 · 터치 PointerEvent · 제어된 게임 시계';}
const viewport=document.querySelector<HTMLSelectElement>('#viewport')!;viewport.onchange=()=>{const [width,height]=viewport.value.split('x');iframe.style.width=width+'px';iframe.style.height=height+'px';};document.querySelector<HTMLButtonElement>('#preview')!.onclick=()=>mount(stages[2].id);
const results:unknown[]=[],errors:string[]=[];let w:any;
const flush=()=>new Promise<void>(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve()};channel.port2.postMessage(null)});
async function settle(){await flush();await flush();await flush()}
function assert(value:unknown,label:string){if(!value)throw new Error(label)}
async function frame(ms=100){w.qaFrame(ms);await settle()}
function area(){return w.document.querySelector('[role=application]')}
async function key(k:string,target=area(),repeat=false){target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,repeat,bubbles:true,cancelable:true}));target.dispatchEvent(new w.KeyboardEvent('keyup',{key:k,bubbles:true,cancelable:true}));await settle()}
async function click(label:string,scope=w.document){const b=Array.from(scope.querySelectorAll('button')).find((b:any)=>b.textContent.includes(label)) as HTMLButtonElement;assert(b&&!b.disabled,'missing/enabled '+label);b.click();await settle();await frame(0)}
async function move(m:string){if(m!=='.'){
 if(touchMode){const button=w.document.querySelector(`.direction-pad button[aria-label="${({U:'위',D:'아래',L:'왼쪽',R:'오른쪽'} as Record<string,string>)[m]}"]`);assert(button&&!button.disabled,'touch direction');for(const type of ['pointerdown','pointerup'])button.dispatchEvent(new w.PointerEvent(type,{pointerId:1,pointerType:'touch',button:0,bubbles:true,cancelable:true}));await settle()}
 else await key(({U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'} as Record<string,string>)[m]);
 }else if(w.document.querySelector('.live-label').textContent.includes('일시정지')){touchMode?await click('계속',w.document.querySelector('.game-controls')):await key(' ')}await frame()}

function readDB(key:string):Promise<any>{return new Promise((resolve,reject)=>{const req=indexedDB.open('echoloop-browser-qa-v1',1);req.onsuccess=()=>{const d=req.result,t=d.transaction('data','readonly'),r=t.objectStore('data').get(key);t.oncomplete=()=>{d.close();resolve(r.result)};t.onerror=()=>reject(t.error)}})}
async function mount(stage:string){iframe.src='/qa-frame.html?stage='+encodeURIComponent(stage);await new Promise<void>(resolve=>iframe.onload=()=>resolve());w=iframe.contentWindow;w.addEventListener('error',(e:ErrorEvent)=>errors.push(e.message));for(let i=0;i<200&&!area();i++)await new Promise(r=>setTimeout(r,10));assert(area(),'app mounted');await frame(0)}
run.onclick=async()=>{run.disabled=true;document.querySelector<HTMLButtonElement>('#preview')!.disabled=true;results.length=0;errors.length=0;const began=new Date().toISOString();try{
 await new Promise<void>((resolve,reject)=>{const r=indexedDB.deleteDatabase('echoloop-browser-qa-v1');r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
 await mount(stages[0].id);
 for(let n=0;n<stages.length;n++){const stage=stages[n],loops=referenceInputs[n];status.textContent=`진행 ${n+1}/80 · ${stage.title}`;assert(w.location.pathname==='/play/'+stage.id,'correct level '+stage.id);
  for(let l=0;l<loops.length;l++){for(let t=0;t<loops[l].length;t++){await move(loops[l][t]);if(t===Math.floor(loops[l].length/2)&&l===loops.length-1&&n%10===0){touchMode?await click('일시정지',w.document.querySelector('.game-controls')):await key(' ');await frame(0);const saved=await readDB('save');assert(saved?.stage.id===stage.id,'persist stage');const pos=w.document.querySelector('.player').getAttribute('transform');await mount(stage.id);assert(w.document.querySelector('.player').getAttribute('transform')===pos,'reload position')}}if(l<loops.length-1){touchMode?await click('기록 확정',w.document.querySelector('.game-controls')):await key('Enter');await frame(0);assert(w.document.querySelectorAll('.record').length===l+1,'committed record '+stage.id)}}
  let result=w.document.querySelector('.result');assert(result?.textContent.includes('우리는, 해냈습니다'),'victory '+stage.id);assert(w.document.activeElement===result.querySelector('button'),'default next focus');
  if(n%10===0){await click('한 수 되돌리기',result);assert(!w.document.querySelector('.result'),'undo closes victory');await move(loops.at(-1)!.at(-1)!);assert(w.document.querySelector('.result'),'reclear after undo');result=w.document.querySelector('.result')}
  if(touchMode){await click(n<stages.length-1?'다음 실험':'실험 목록으로',result)}else{
   await key('Enter',result.querySelector('button'),true);assert(w.document.querySelector('.result'),'repeated Enter ignored');
   // Enter must advance even if the user previously tabbed onto Undo.
   const undo=Array.from(result.querySelectorAll('button')).find((b:any)=>b.textContent.includes('한 수 되돌리기')) as HTMLButtonElement;undo.focus();await key('Enter',undo);await frame(0);
  }
  results.push({level:n+1,id:stage.id,status:'passed',loops:loops.map(v=>v.length)});report.textContent=JSON.stringify({passed:results.length,last:results.at(-1)},null,2);
 }
 assert(w.location.pathname==='/','final return home');assert(w.document.querySelector('.completion').textContent.includes('80 / 80'),'all completed UI');let persisted=await readDB('completed');for(let attempt=0;attempt<40&&persisted?.length!==80;attempt++){await new Promise(r=>setTimeout(r,50));persisted=await readDB('completed')}assert(persisted?.length===80,'all completion persisted: '+persisted?.length);assert(!errors.length,'browser errors');
 const result={kind:touchMode?'Chromium at 390px with DOM touch pointer input and controlled animation clock':'Chromium production bundle with DOM keyboard input and controlled animation clock',began,finished:new Date().toISOString(),levels:80,checks:['80 sequential victories','all record commits',...(touchMode?['touch directions and on-screen record/next buttons']:['result Enter advance even from Undo focus','held Enter ignored']),'sampled reload and rewind','persisted 80 completions'],results,errors};report.textContent=JSON.stringify(result,null,2);status.textContent=touchMode?'통과: 모바일 터치 80 / 80 · 기록 버튼 · 다음 레벨 · 되돌리기 · 저장 복구':'통과: 80 / 80 · 기록 확정 · 결과창 Enter · 되돌리기 · 저장 복구';download.disabled=false;document.querySelector<HTMLButtonElement>('#preview')!.disabled=false;download.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.download='campaign-browser.json';a.click()};if(touchMode)await mount(stages[2].id);
 }catch(e){status.textContent='실패: '+(e as Error).message;report.textContent=JSON.stringify({passed:results.length,errors,error:String(e)},null,2);run.disabled=false}}
