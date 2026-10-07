// Replay real input events against the production React bundle with a controlled clock.
import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {stages} from '../src/stages.ts';
import {replay,buildChain,saveState} from '../src/engine.ts';
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
try{
 // A press may straddle two 100 ms simulation ticks. It still moves only once.
 for(const mode of ['keyboard','touch'])for(const duration of [40,110,180,250]){
  await mount();await click('시작하기');await advance(90);
  const start=position();if(mode==='keyboard')keyboard('keydown');else assert(pointer('pointerdown').defaultPrevented);
  await advance(duration);if(mode==='keyboard')keyboard('keyup');else pointer('pointerup');
  await advance(300);const after=position();assert.notEqual(after,start,`${mode} ${duration} ms moved`);
  await click('한 수 되돌리기');
  // Undo one input-bearing tick by rewinding the trailing wait ticks too.
  await click('레벨 처음부터');keyboard('keydown');keyboard('keyup');await advance(100);
  assert.equal(position(),after,`${mode} ${duration} ms must equal exactly one tap`);
  dom.window.close();console.log(`PASS ${mode} ${duration} ms: one cell across tick boundaries`);
 }
 for(const mode of ['keyboard','touch']){
  await mount();const start=position();if(mode==='keyboard')keyboard('keydown');else pointer('pointerdown');await advance(100);const one=position();assert.notEqual(one,start);
  if(mode==='keyboard')keyboard('keydown','ArrowRight',true);
  await advance(150);assert.equal(position(),one,'no early repeat');await advance(150);const held=position();assert.notEqual(held,one,'long hold repeats');
  if(mode==='keyboard')keyboard('keyup');else pointer('pointerup');await advance(300);assert.equal(position(),held,'release stops movement');dom.window.close();console.log(`PASS ${mode}: delayed repeat, release stops`);
 }
 for(const event of ['pointercancel','lostpointercapture']){
  await mount();const start=position();pointer('pointerdown');pointer(event);await advance(400);assert.equal(position(),start,`${event} cancels pending movement`);dom.window.close();console.log(`PASS ${event}: no stuck direction or delayed tap`);
 }
 await mount();pointer('pointerdown','오른쪽',1);pointer('pointerdown','왼쪽',2);await advance(100);const opposite=position();pointer('pointerup','왼쪽',2);await advance(300);assert.notEqual(position(),opposite,'releasing second finger preserves first');pointer('pointerup','오른쪽',1);const released=position();await advance(200);assert.equal(position(),released);dom.window.close();console.log('PASS multiple pointers: independent release');
 await mount();const start=position();w.document.querySelector('.direction-pad button[aria-label="오른쪽"]').click();await advance(200);assert.notEqual(position(),start);const tap=position();await advance(200);assert.equal(position(),tap);dom.window.close();console.log('PASS keyboard/assistive button activation: one cell');
 for(const mode of ['keyboard','touch']){
  const m=stages[2],ghosts=buildChain(m,[[...Array(20).fill('.'),'U','U','R']]),saved=saveState(m,replay(m,['R','R'],ghosts));
  await mount(m.id,saved);const before=position(),remaining=w.document.querySelector('.moves-stat b').textContent;
  if(mode==='keyboard')keyboard('keydown');else pointer('pointerdown');await frame(100);
  assert.equal(position(),before,'closed door blocks first attempt');
  for(let i=0;i<25;i++){if(mode==='keyboard')keyboard('keydown','ArrowRight',true);await frame(100);}
  assert(w.document.querySelector('path[fill="#8163a422"]'),'ghost opens the door');
  assert.equal(position(),before,'opening door must not release held blocked input');
  assert.equal(w.document.querySelector('.moves-stat b').textContent,remaining,'blocked input and waiting are free');
  if(mode==='keyboard'){keyboard('keyup');keyboard('keydown');keyboard('keyup');}else{pointer('pointerup');pointer('pointerdown');pointer('pointerup');}
  await frame(100);assert.notEqual(position(),before,'fresh press enters open door');const one=position();await frame(300);assert.equal(position(),one,'fresh tap only moves one cell');
  dom.window.close();console.log(`PASS ${mode}: held blocked input stays stopped when the door opens; fresh tap moves once`);
 }
 for(const mode of ['keyboard','touch']){
  await mount();if(mode==='keyboard')keyboard('keydown','ArrowLeft');else pointer('pointerdown','왼쪽');await frame(100);
  const wall=position();if(mode==='keyboard')keyboard('keydown','ArrowRight');else pointer('pointerdown','오른쪽',2);await frame(100);
  if(mode==='keyboard')keyboard('keyup','ArrowRight');else pointer('pointerup','오른쪽',2);await frame(300);
  assert.notEqual(position(),wall);assert.equal(position(),'translate(120,168)','old blocked direction cannot resume after another direction is released');
  dom.window.close();console.log(`PASS ${mode}: blocked wall direction cannot resume after another input`);
 }
 assert.deepEqual(errors,[]);
}finally{dom?.window.close();}
