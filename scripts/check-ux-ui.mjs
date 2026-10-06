// User journeys against the shipped bundle: recovery, pause, focus and saved progress.
import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {stages} from '../src/stages.ts';
import {initial,step,saveState} from '../src/engine.ts';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=readFileSync(new URL('../dist'+html.match(/src="([^"]+\.js)"/)[1],import.meta.url),'utf8');
let dom,w,clock,callbacks,id,db,model;const errors=[];
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,2));};
const query=s=>w.document.querySelector(s);
async function frame(ms=0){clock+=ms;const pending=[...callbacks.values()];callbacks.clear();for(const cb of pending)cb(clock);await flush();}
async function settle(){await frame();await frame();await frame();}
async function seed(values){await new Promise((resolve,reject)=>{const r=db.open('echoloop-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>{const d=r.result,t=d.transaction('data','readwrite');for(const [k,v] of Object.entries(values))t.objectStore('data').put(v,k);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>reject(t.error);};});}
async function mount(path='/play/first-echo',values={}){dom?.window.close();db=new IDBFactory();await seed(values);clock=0;callbacks=new Map();id=0;model=null;const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});w=dom.window;w.indexedDB=db;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.performance.now=()=>clock;w.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};w.cancelAnimationFrame=i=>callbacks.delete(i);w.document.modelContext={registerTool:tool=>{model=tool;}};w.eval(bundle);for(let i=0;i<40&&(!model||!query(path==='/'?'.completion':'[role=application]'));i++)await flush();await settle();assert(model);}
function current(){return JSON.parse(JSON.stringify(model.execute().current));}
function position(){return query('.player').getAttribute('transform');}
async function key(key,options={},target=query('[role=application]')??w.document){const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options});target.dispatchEvent(event);target.dispatchEvent(new w.KeyboardEvent('keyup',{key,bubbles:true,...options}));await settle();return event;}
async function click(label,scope=w.document){const b=[...scope.querySelectorAll('button')].find(b=>b.textContent.includes(label));assert(b&&!b.disabled,'enabled '+label);b.click();await settle();}
async function tap(keyName){await key(keyName);await frame(100);}
async function freeze(){if(!query('.live-label').textContent.includes('일시정지'))await key('Escape');}
async function expectFrozen(label){await freeze();const before=current();await frame(200);assert.deepEqual(current(),before,label);}
function savedAt(n){return saveState(stages[n],step(stages[n],initial(stages[n]),'R'));}
try{
 await mount();for(const k of ['ArrowUp','ArrowUp','ArrowRight'])await tap(k);await key('Enter');assert.equal(current().ghosts,1);await tap('ArrowRight');await freeze();const before=current(),pos=position();
 await key('r');assert.equal(current().tick,0);assert.equal(current().ghosts,1);assert(query('[aria-label="재시작 취소"]'));await key('r');await key('z');assert.deepEqual(current(),before);assert.equal(position(),pos);await expectFrozen('restart recovery stays paused');console.log('PASS restart + repeated restart + Z restores exact tick, position and ghosts');
 await click('레벨 처음부터');assert.equal(current().ghosts,0);await click('재시작 취소');assert.deepEqual(current(),before);assert.equal(position(),pos);console.log('PASS full reset can restore committed ghosts and current loop');
 await key('r');await tap('ArrowRight');await freeze();assert(!query('[aria-label="재시작 취소"]'));await key('z');assert.equal(current().tick,0);assert.equal(current().ghosts,1);assert.notEqual(current().tick,before.tick);console.log('PASS new movement expires restart recovery; Z rewinds the new loop');
 await tap('ArrowRight');const cancelBefore=current();w.confirm=()=>false;await click('레벨 처음부터');assert.deepEqual(current(),cancelBefore);await expectFrozen('cancelled reset pauses');console.log('PASS cancelled reset preserves progress and pauses time');
 for(const modifier of ['ctrlKey','metaKey','altKey']){const event=await key('r',{[modifier]:true});assert(!event.defaultPrevented);assert.deepEqual(current(),cancelBefore);}console.log('PASS browser shortcut modifiers are not intercepted');
 await key('Escape');await frame(100);assert.equal(current().tick,cancelBefore.tick+1);await key('Escape');const paused=current();await key('Escape',{repeat:true});await frame(200);assert.deepEqual(current(),paused);console.log('PASS Escape pauses/resumes and held Escape is ignored');
 for(const label of ['? 도움말','⚙ 설정']){await key('Escape');await frame(100);await click(label,query('.map-tools'));const stopped=current();assert(query('[role=dialog]'));await frame(200);assert.deepEqual(current(),stopped);await key('Escape',{},query('[role=dialog]'));assert(!query('[role=dialog]'));assert.equal(w.document.activeElement,query('[role=application]'));await frame(200);assert.deepEqual(current(),stopped);}console.log('PASS help/settings stop the clock; Escape closes and restores game focus');
 for(const label of ['막혔을 때 힌트','⊕ 확대']){await key('Escape');await frame(100);await click(label);const stopped=current();await frame(200);assert.deepEqual(current(),stopped);}console.log('PASS hint and map zoom pause time');
 await mount('/',{save:savedAt(61),completed:stages.slice(0,55).map(s=>s.id)});assert.match(query('.resume-summary').textContent,new RegExp(stages[61].title));assert.equal(query('.chapter-index').textContent,'13');assert(query('.active-save'));await click(stages[61].title,query('.constellation'));assert.equal(current().stageId,stages[61].id);assert.equal(current().tick,1);console.log('PASS saved experiment selects its chapter and card resumes exact progress');
 await mount('/',{completed:stages.slice(0,55).map(s=>s.id)});assert.equal(query('.chapter-index').textContent,'12');assert(!query('.resume-summary'));await click('첫 번째 균열',query('.chapter-orbit'));assert.equal(query('.chapter-index').textContent,'01');console.log('PASS asynchronously loaded completions select the next chapter; manual chapter selection works');
 await mount('/',{save:{invalid:true}});assert(!query('.resume-summary'));assert(![...w.document.querySelectorAll('.intro-actions button')].some(b=>b.textContent==='이어하기'));console.log('PASS invalid save has no misleading continue action');
 let won=initial(stages[0]);for(let i=0;i<6;i++)won=step(stages[0],won,'R');await mount('/',{save:saveState(stages[0],won),completed:[stages[0].id]});assert(!query('.resume-summary'));assert(!query('.active-save'));assert.match(query('.intro-actions').textContent,/다음 미완료 실험/);console.log('PASS completed save offers the next experiment instead of continuing a result');
 assert.deepEqual(errors,[]);
}finally{dom?.window.close();}
