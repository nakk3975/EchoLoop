import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {startAccountServer} from '../tests/helpers/account-server.ts';
import {stages,referenceInputs} from '../src/stages.ts';
import {saveState,replay,buildChain,restoreState} from '../src/engine.ts';
const html=readFileSync('dist/index.html','utf8'),bundle=readFileSync('dist'+html.match(/src="([^"]+\.js)"/)[1],'utf8'),api=await startAccountServer(),windows=[],errors=[];
const stage=stages[3],inputs=referenceInputs[3],saved=saveState(stage,replay(stage,inputs.at(-1).slice(0,5),buildChain(stage,inputs.slice(0,-1))));
const sleep=()=>new Promise(r=>setTimeout(r,10));
async function until(check,label){for(let i=0;i<300;i++){if(check())return;await sleep();}throw new Error('Timed out: '+label);}
async function mount(device={cookie:'',db:new IDBFactory()},seed){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));const dom=new JSDOM('<div id="root"></div>',{url:api.url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;windows.push(w);
 w.indexedDB=device.db;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;w.AbortSignal=AbortSignal;w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.fetch=async(path,options={})=>{const r=await fetch(new URL(path,api.url),{...options,headers:{...options.headers,Cookie:device.cookie}});const cookie=r.headers.get('set-cookie');if(cookie)device.cookie=cookie.split(';')[0];return r;};
 if(seed){const db=await new Promise((r,j)=>{const q=device.db.open('echoloop-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('data');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});await new Promise(r=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(seed,'save');tx.objectStore('data').put(stages.slice(0,3).map(s=>s.id),'completed');tx.oncomplete=r;});db.close();}
 w.eval(bundle);await until(()=>[...w.document.querySelectorAll('button')].some(b=>b.textContent==='로그인 / 가입'&&!b.disabled)||w.document.querySelector('.account-bar b')?.textContent.includes('님'),'session initialized');return {w,device};
}
const button=(w,label)=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===label);
async function click(w,label){const b=button(w,label);assert(b&&!b.disabled,label+' available');b.click();await sleep();}
function input(w,selector,value){const el=w.document.querySelector(selector);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));}
async function login(w,register=false){await click(w,'로그인 / 가입');if(register)await click(w,'계정 만들기');input(w,'input[name=username]','ui_player');input(w,'input[name=password]','password123');if(register)input(w,'input[autocomplete=new-password]:not([name=password])','password123');w.document.querySelector('.account-dialog form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!w.document.querySelector('.account-dialog'),'auth dialog closed');await until(()=>button(w,'진행 저장')&&!button(w,'진행 저장').disabled,'save available');}
try{
 const phone=await mount(undefined,saved);await login(phone.w,true);await click(phone.w,'진행 저장');await until(()=>phone.w.document.querySelector('.account-bar')?.textContent.includes('계정 저장 완료'),'phone saved');const first=[...api.progress.values()][0];assert.deepEqual(first.payload.current,saved);assert.equal(first.payload.completed.length,3);
 const pc=await mount();await login(pc.w);assert(pc.w.document.querySelector('.resume-summary')?.textContent.includes(stage.title));await click(pc.w,'이어하기');assert.equal(pc.w.document.querySelector('.player').getAttribute('transform'),`translate(${restoreState(saved).state.current.x*48+24},${restoreState(saved).state.current.y*48+24})`);
 // A separate device commits a newer revision. Stale browser must not overwrite it.
 const user=[...api.users.values()][0],newPayload={version:1,current:saveState(stages[0],replay(stages[0],['R'])),completed:[stages[0].id]};await api.store.putProgress(user.id,first.revision,newPayload);await click(pc.w,'진행 저장');await until(()=>button(pc.w,'현재 진행으로 덮어쓰기'),'conflict shown');assert.deepEqual((await api.store.getProgress(user.id)).payload,newPayload);await click(pc.w,'불러오기');await until(()=>pc.w.document.querySelector('.play-title h1')?.textContent===stages[0].title,'new remote restored');
 await until(()=>!button(pc.w,'로그아웃').disabled,'load finished');await click(pc.w,'로그아웃');await until(()=>button(pc.w,'로그인 / 가입')&&!button(pc.w,'로그인 / 가입').disabled,'guest restored');assert(!pc.w.document.querySelector('.resume-summary'),'account record did not leak into empty guest');
 phone.w.close();const reload=await mount(phone.device);assert(reload.w.document.querySelector('.resume-summary')?.textContent.includes(stages[0].title),'cookie survives page recreation and remote autoloads');await click(reload.w,'로그아웃');await until(()=>button(reload.w,'로그인 / 가입')&&!button(reload.w,'로그인 / 가입').disabled,'logout finished');assert(reload.w.document.querySelector('.resume-summary')?.textContent.includes(stage.title),'original guest retained');
 // A failed/offline account save must survive reload, even if another device has saved.
 await login(reload.w);await until(()=>!button(reload.w,'진행 저장').disabled,'login complete');
 const newer=await api.store.getProgress(user.id);const db=await new Promise(r=>{const q=phone.device.db.open('echoloop-v1',1);q.onsuccess=()=>r(q.result);});await new Promise(r=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(saved,'account:'+user.id+':save');tx.oncomplete=r;});db.close();
 await api.store.putProgress(user.id,newer.revision,newPayload);reload.w.close();const offlineResume=await mount(phone.device);assert(offlineResume.w.document.querySelector('.resume-summary')?.textContent.includes(stage.title),'unsynced local replay retained across reload');assert(button(offlineResume.w,'현재 진행으로 덮어쓰기'),'remote change blocks automatic overwrite of unsynced local play');
 assert.deepEqual(errors,[]);console.log('PASS production React bundle: guest adoption, two-device auth/replay, completion progress, conflict recovery, session reload, logout isolation');
}finally{for(const w of windows)w.close();await api.close();}
