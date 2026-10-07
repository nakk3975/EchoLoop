// Production React bundle + DOM events. This is DOM integration, not a real-browser E2E.
import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {stages,referenceInputs} from '../src/stages.ts';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=readFileSync(new URL('../dist'+html.match(/src="([^"]+\.js)"/)[1],import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r, 2));};
const db=new IDBFactory(),errors=[];let dom,w,clock,callbacks,id;
async function mount(url){clock=0;callbacks=new Map();id=0;const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));dom=new JSDOM('<!doctype html><div id="root"></div>',{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});w=dom.window;w.indexedDB=db;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.performance.now=()=>clock;w.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};w.cancelAnimationFrame=i=>callbacks.delete(i);w.eval(bundle);for(let i=0;i<40&&!w.document.querySelector('[role=application]');i++)await flush();await frame(0);}
async function frame(ms=100){clock+=ms;const pending=[...callbacks.values()];callbacks.clear();for(const cb of pending)cb(clock);await flush();}
function area(){return w.document.querySelector('[role=application]');}
async function key(k){area().dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));area().dispatchEvent(new w.KeyboardEvent('keyup',{key:k,bubbles:true}));await flush();}
async function click(text,scope=w.document){const b=[...scope.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert(b,`missing button ${text}`);assert(!b.disabled,`disabled ${text}`);b.click();await flush();await frame(0);}
async function move(m){if(m.startsWith('J')){await key(m[1]);await key('j');}else if(m!=='.')await key({U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[m]);else if(w.document.querySelector('.live-label').textContent.includes('일시정지'))await key(' ');await frame();}
async function readDB(key){return new Promise((resolve,reject)=>{const req=db.open('echoloop-v1',1);req.onsuccess=()=>{const d=req.result,t=d.transaction('data','readonly'),r=t.objectStore('data').get(key);t.oncomplete=()=>{d.close();resolve(r.result);};t.onerror=()=>reject(t.error);};});}
const results=[];await mount('http://localhost/play/'+stages[0].id);
try{for(let n=0;n<stages.length;n++){const stage=stages[n],loops=referenceInputs[n];assert.equal(w.location.pathname,'/play/'+stage.id);assert.equal(w.document.querySelector('.play-title h1').textContent,stage.title);for(let l=0;l<loops.length;l++){
 for(let t=0;t<loops[l].length;t++){await move(loops[l][t]);if(t===Math.floor(loops[l].length/2)&&l===loops.length-1&&n%10===0){await key(' ');await frame(0);await flush();const saved=await readDB('save');assert.equal(saved.stage.id,stage.id);const pos=w.document.querySelector('.player').getAttribute('transform');dom.window.close();await mount('http://localhost/play/'+stage.id);assert.equal(w.document.querySelector('.player').getAttribute('transform'),pos,'reload position');}}
 if(l<loops.length-1){await key('Enter');await frame(0);assert.equal(w.document.querySelectorAll('.record').length,l+1,`record count ${stage.id}`);}
 }
 const result=w.document.querySelector('.result');assert(result,`no victory ${stage.id}`);assert.match(result.textContent,/우리는, 해냈습니다/);assert.equal(w.document.activeElement,result.querySelector('button'),'victory default focus');
 if(n%10===0){await click('한 수 되돌리기',result);assert(!w.document.querySelector('.result'));await move(loops.at(-1).at(-1));assert(w.document.querySelector('.result'),'rewind then win');}
 const dialog=w.document.querySelector('.result');const undoButton=[...dialog.querySelectorAll('button')].find(b=>b.textContent.includes('한 수 되돌리기'));undoButton.focus();undoButton.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));await flush();assert(w.document.querySelector('.result'),'held Enter must not advance');undoButton.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await flush();await frame(0);results.push({level:n+1,id:stage.id,status:'passed',loops:loops.map(x=>x.length)});console.log(`PASS ${String(n+1).padStart(2,'0')} ${stage.title}`);
 }
 assert.equal(w.location.pathname,'/');assert(w.document.querySelector('.completion').textContent.includes(`${stages.length} / ${stages.length}`));await flush();assert.equal((await readDB('completed')).length,stages.length);assert.deepEqual(errors,[]);
 mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});writeFileSync(new URL('../artifacts/campaign-ui.json',import.meta.url),JSON.stringify({kind:'production-bundle DOM integration',levels:results.length,results},null,2));console.log('PASS all levels, record/Enter advance from Undo focus, repeated Enter ignored, chapter boundaries, final home, persisted completion, sampled reload and rewind');
}finally{dom.window.close();}
