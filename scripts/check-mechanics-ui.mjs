// Replay real input events against the production React bundle with a controlled clock.
import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {stages,referenceInputs} from '../src/stages.ts';
import {replay,buildChain,saveState,echoPositions,remainingMoves} from '../src/engine.ts';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=readFileSync(new URL('../dist'+html.match(/src="([^"]+\.js)"/)[1],import.meta.url),'utf8');
let dom,w,clock,callbacks,id;const errors=[];
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,2));};
async function mount(stageId='first-light',saved){clock=0;callbacks=new Map();id=0;const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/play/'+stageId,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});w=dom.window;w.indexedDB=new IDBFactory();if(saved)await new Promise((resolve,reject)=>{const r=w.indexedDB.open('echoloop-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>{const db=r.result,t=db.transaction('data','readwrite');t.objectStore('data').put(saved,'save');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};});w.structuredClone=structuredClone;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.performance.now=()=>clock;w.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};w.cancelAnimationFrame=i=>callbacks.delete(i);w.eval(bundle);for(let i=0;i<40&&!area();i++)await flush();assert(area());await frame(0);}
function area(){return w.document.querySelector('[role=application]');}
function position(){return w.document.querySelector('.player').getAttribute('transform');}
function keyboard(type,key='ArrowRight',repeat=false){area().dispatchEvent(new w.KeyboardEvent(type,{key,repeat,bubbles:true,cancelable:true}));}
function pointer(type,name='오른쪽',pointerId=1){const button=w.document.querySelector(`.direction-pad button[aria-label="${name}"]`),e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId,pointerType:'touch',button:0});button.dispatchEvent(e);return e;}
async function frame(ms){clock+=ms;const pending=[...callbacks.values()];callbacks.clear();for(const cb of pending)cb(clock);await flush();}
async function advance(ms){while(ms>0){const step=Math.min(10,ms);await frame(step);ms-=step;}}
async function click(label){const button=[...w.document.querySelectorAll('button')].find(b=>b.textContent.includes(label));assert(button&&!button.disabled);button.click();await flush();await frame(0);}
const stage=id=>stages.find(m=>m.id===id),inputs=m=>referenceInputs[stages.indexOf(m)];
const transform=p=>`translate(${p.x*48+24},${p.y*48+24})`;
const command=async k=>{keyboard('keydown',k);keyboard('keyup',k);await flush();};
try{
 const m=stage('jump-02'),loops=inputs(m),ghosts=buildChain(m,loops.slice(0,-1)),prefix=loops.at(-1).slice(0,5),before=replay(m,prefix,ghosts),expected=echoPositions(m,before)[1];
 await mount(m.id,saveState(m,before));assert(w.document.querySelector('.collapsed-tile'));assert.equal(w.document.querySelector('[aria-label="도약할 과거"]').value,'0');
 keyboard('keydown','j',true);await frame(0);assert.equal(position(),transform(before.current),'held J ignored');
 await command('2');await command('j');await frame(100);assert.equal(position(),transform(expected));assert.equal(parseInt(w.document.querySelector('.moves-stat b').textContent),remainingMoves(m,before)-1);assert(w.document.querySelector('[aria-label="잔상 도약"]').disabled);
 await command('z');await frame(0);assert.equal(position(),transform(before.current));assert(!w.document.querySelector('[aria-label="잔상 도약"]').disabled);assert(w.document.querySelector('.collapsed-tile'),'jump undo preserves earlier collapsed floor');
 await click('잔상 도약');await frame(100);assert.equal(position(),transform(expected),'mobile button chooses ghost 2');
 await command('r');await frame(0);assert.equal(position(),transform(m.spawn));assert.equal(w.document.querySelectorAll('.collapsed-tile').length,0);assert.equal(w.document.querySelector('[aria-label="도약할 과거"]').disabled,false);
 await command('z');await frame(0);assert.equal(position(),transform(expected));assert(w.document.querySelector('[aria-label="잔상 도약"]').disabled);dom.window.close();console.log('PASS J repeat protection, chosen ghost 2, mobile jump, charge refund, fragile reset and restart recovery');
 const box=stage('crate-01'),pushed=replay(box,['R','R','U']);await mount(box.id,saveState(box,pushed));assert.equal(w.document.querySelector('.time-crate').dataset.cell,'3,2');assert.match(w.document.querySelector('.time-crate').textContent,/A/);await command('z');await frame(0);assert.equal(w.document.querySelector('.time-crate').dataset.cell,'3,3');await command('r');await frame(0);assert.equal(w.document.querySelector('.time-crate').dataset.cell,'3,3');dom.window.close();console.log('PASS crate placement label, save restore, undo and loop reset');
 const reversed=stage('reverse-01'),rg=buildChain(reversed,inputs(reversed).slice(0,-1));await mount(reversed.id,saveState(reversed,replay(reversed,[],rg)));assert.equal(w.document.querySelector('.echo-position').getAttribute('transform'),transform(rg[0].cells[rg[0].originalTicks]));assert.match(w.document.querySelector('.record-time').textContent,/역재생/);dom.window.close();console.log('PASS reverse echo initial position and record explanation');
 const sm=stage('stasis-01'),sg=buildChain(sm,inputs(sm).slice(0,-1)),ss=replay(sm,inputs(sm).at(-1).slice(0,15),sg);await mount(sm.id,saveState(sm,ss));const stopped=w.document.querySelector('.echo-position').getAttribute('transform');assert(w.document.querySelector('.is-frozen'));assert.match(w.document.querySelector('.echo-clock').textContent,/정지/);await command(' ');await advance(300);assert.equal(w.document.querySelector('.echo-position').getAttribute('transform'),stopped);assert(!w.document.querySelector('.live-label').textContent.includes('일시정지'));await command('z');await frame(0);assert(w.document.querySelector('.is-frozen'));dom.window.close();console.log('PASS frozen echo rendering, replay clock, world continuation and undo');

 await mount();await click('맵 제작실');
 const cell=async(x,y)=>{w.document.querySelector(`.cell-hit[aria-label="${x},${y} 셀"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await flush();};
 await click('공통 발판');await cell(3,2);await click('시간 상자');await cell(3,2);await click('붕괴 바닥');await cell(3,2);
 assert.equal(w.document.querySelectorAll('.time-crate').length,1);assert.equal(w.document.querySelectorAll('.fragile-tile').length,1);
 for(const text of ['과거 기록 역재생','반복당 잔상 도약']){const label=[...w.document.querySelectorAll('label')].find(l=>l.textContent.includes(text));label.querySelector('input').click();await flush();}
 await click('재생 정지');await cell(4,2);const select=w.document.querySelector('[aria-label="정지 장치 과거 번호"]');select.value='2';select.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();assert.equal(w.document.querySelector('[aria-label="정지 장치 과거 번호"]').value,'2');
 assert.match(w.document.querySelector('.validation').textContent,/맵 구조 정상/);await click('내 맵에 저장');
 const maps=await new Promise((resolve,reject)=>{const r=w.indexedDB.open('echoloop-v1',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('data','readonly'),get=t.objectStore('data').get('maps');t.oncomplete=()=>{db.close();resolve(get.result)};t.onerror=()=>reject(t.error)};});
 assert.equal(maps[0].echoMode,'reverse');assert.equal(maps[0].echoJump,true);assert.equal(maps[0].stasis[0].ghost,2);assert.deepEqual(Array.from(maps[0].crates,c=>[c.x,c.y]),[[3,2]]);assert.equal(maps[0].plates.length,1,'crate preserves underlying plate');assert.equal(maps[0].fragile.length,1);dom.window.close();console.log('PASS editor crate/plate/floor overlays, reverse and jump settings, numbered stasis and local map persistence');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}
