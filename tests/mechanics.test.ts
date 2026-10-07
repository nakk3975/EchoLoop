import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fromRows,stages,referenceInputs} from '../src/stages.ts';
import {initial,step,replay,buildChain,saveState,restoreState,hash,validateStage,equal,type Move} from '../src/engine.ts';
const make=()=>fromRows('mechanics','Mechanics','','',['########','#......#','#SAa.G.#','#......#','#......#','########']);
test('echo-only plate ignores present and responds to replayed ghost',()=>{const m=make();m.plates[0].kind='echo';const s=replay(m,['R']);assert.equal(s.plates['plate-a'],false);const chain=buildChain(m,[['R']]);assert.equal(step(m,initial(m,chain),'.').plates['plate-a'],true);});
test('present-only plate ignores recorded ghost and detects live traveler',()=>{const m=make();m.plates[0].kind='present';const chain=buildChain(m,[['R']]);assert.equal(step(m,initial(m,chain),'.').plates['plate-a'],false);assert.equal(replay(m,['R']).plates['plate-a'],true);});
test('pulse door requires both occupancy and phase; a closed door permits exit',()=>{const m=make();m.doors[0].pulse={period:10,openTicks:3,offset:0};const chain=buildChain(m,[['R']]);let s=initial(m,chain);s=step(m,s,'R');assert.equal(s.doors['door-a'],true);s=step(m,s,'R');assert.equal(s.current.x,3);s=step(m,s,'.');assert.equal(s.doors['door-a'],false);s=step(m,s,'R');assert.equal(s.current.x,4);s=replay(m,Array<Move>(10).fill('.'),chain);assert.equal(s.doors['door-a'],true);assert.equal(replay(m,Array<Move>(10).fill('.')).doors['door-a'],false);});
test('portal teleports once on entry, waits in place, and records destination',()=>{const m=make();m.portals=[{id:'fold',a:{x:2,y:3},b:{x:5,y:4}}];let s=replay(m,['D','R']);assert.deepEqual(s.current,{x:5,y:4});s=step(m,s,'.');assert.deepEqual(s.current,{x:5,y:4});s=step(m,s,'L');assert.deepEqual(s.current,{x:4,y:4});s=step(m,s,'R');assert.deepEqual(s.current,{x:2,y:3});const chain=buildChain(m,[['D','R']]);assert.deepEqual(chain[0].cells[300],{x:5,y:4});const saved=saveState(m,replay(m,['D'],chain));assert.equal(hash(restoreState(saved).state),hash(replay(m,['D'],chain)));});
test('one-way tiles restrict entry but allow departure in any direction',()=>{const m=make();m.arrows=[{x:2,y:3,direction:'R'}];assert.deepEqual(replay(m,['R','D']).current,{x:2,y:2});let s=replay(m,['D','R']);assert.deepEqual(s.current,{x:2,y:3});s=step(m,s,'U');assert.deepEqual(s.current,{x:2,y:2});});
test('optional mechanics validate ranges, overlapping endpoints, directions and nulls',()=>{const m=make();for(const change of [{portals:[null]},{portals:[{id:'x',a:m.spawn,b:{x:4,y:4}}]},{arrows:[{x:2,y:3,direction:'Q'}]},{doors:[{...m.doors[0],pulse:{period:0,openTicks:1,offset:0}}]},{plates:[{...m.plates[0],kind:'invalid'}]}])assert.ok(validateStage({...m,...change}).length);});
const original=(n:number)=>stages.find(m=>m.id===`fracture-${String(n).padStart(2,'0')}`)!;
const range=(a:number,b:number)=>Array.from({length:b-a+1},(_,i)=>original(a+i));
test('100 unique puzzles retain verified records, saves and required echoes after difficulty ordering',()=>{
 assert.equal(stages.length,100);assert.equal(new Set(stages.map(s=>s.id)).size,100);
 assert.equal(new Set(stages.map(s=>hash({tiles:s.tiles,plates:s.plates,doors:s.doors,portals:s.portals,arrows:s.arrows,shards:s.shards,crates:s.crates,fragile:s.fragile,echoMode:s.echoMode,echoJump:s.echoJump,stasis:s.stasis}))).size,100);
 for(let i=5;i<stages.length;i++){const m=stages[i],inputs=referenceInputs[i],chain=buildChain(m,inputs.slice(0,-1));assert.equal(chain.length,m.maxGhosts);
 if(chain.length)assert.notEqual(replay(m,inputs.at(-1)!,chain.slice(0,-1)).outcome,'WON',`missing echo must block ${m.id}`);
 assert.equal(hash(restoreState(saveState(m,replay(m,inputs.at(-1)!,chain))).state),hash(replay(m,inputs.at(-1)!,chain)));}
 assert.ok(referenceInputs[stages.indexOf(original(50))].at(-1)!.length>200);
});
test('existing compact mechanics and original finales stay attached to their stable IDs',()=>{
 for(const m of range(6,20)){assert.ok(m.width<=11&&m.height<=7);assert.ok(referenceInputs[stages.indexOf(m)].at(-1)!.length<=20);}
 for(const kind of ['resonance','toggle'])assert.ok(range(6,20).some(m=>m.plates.some(p=>p.kind===kind)));
 assert.ok(range(6,20).some(m=>m.doors.some(d=>d.inverted)));
 for(const m of range(21,25))assert.ok(m.doors.some(d=>d.pulse));
 for(const m of range(26,30))assert.ok(m.portals?.length);
 for(const m of range(31,35))assert.ok(m.arrows?.length);
 for(const m of range(46,50)){assert.ok(m.portals?.length);assert.ok(m.arrows?.length);assert.ok(m.doors.some(d=>d.pulse));assert.ok(m.plates.some(p=>p.kind==='echo'));assert.ok(m.plates.some(p=>p.kind==='present'));}
});

test('pre-expansion save retains its verified replay checksum and two ghosts',()=>{const v=JSON.parse(readFileSync(new URL('./fixtures/legacy-save.json',import.meta.url),'utf8'));const restored=restoreState(v);assert.equal(hash(restored.state),v.checksum);assert.equal(restored.state.ghosts.length,2);assert.equal(restored.stage.id,'two-doors');});

test('toggle remembers departure, ignores held occupancy, flips on re-entry and restores OFF state',()=>{const m=make();m.plates[0].kind='toggle';let s=replay(m,['R','.','.','L']);assert.equal(s.plates['plate-a'],true);s=step(m,s,'R');assert.equal(s.plates['plate-a'],false);assert.equal(hash(restoreState(saveState(m,s)).state),hash(s));assert.equal(initial(m).plates['plate-a'],false);});
test('overlapping ghost and present do not double toggle; a ghost can activate a switch',()=>{const m=make();m.plates[0].kind='toggle';const chain=buildChain(m,[['R']]);assert.equal(replay(m,['.'],chain).plates['plate-a'],true);assert.equal(replay(m,['R','.','L','R'],chain).plates['plate-a'],true);});
test('resonance counts all actors and requires the configured threshold',()=>{const m=make();m.maxGhosts=2;m.plates[0].kind='resonance';const one=buildChain(m,[['R']]);assert.equal(replay(m,['R']).plates['plate-a'],false);assert.equal(replay(m,['R'],one).plates['plate-a'],true);assert.equal(replay(m,['R','L'],one).plates['plate-a'],false);m.plates[0].minActors=3;const two=buildChain(m,[['R'],['R']]);assert.equal(replay(m,['R'],one).plates['plate-a'],false);assert.equal(replay(m,['R'],two).plates['plate-a'],true);});
test('inversion applies to the complete AND/OR signal and still respects the pulse',()=>{const m=make();m.plates.push({id:'b',x:2,y:3});const d=m.doors[0];d.plateIds.push('b');d.inverted=true;d.mode='AND';assert.equal(replay(m,['R']).doors[d.id],true);d.mode='OR';assert.equal(replay(m,['R']).doors[d.id],false);assert.equal(initial(m).doors[d.id],true);d.pulse={period:10,openTicks:3,offset:0};assert.equal(replay(m,['.','.','.']).doors[d.id],false);});
test('new device settings reject invalid thresholds and inversion types',()=>{const m=make();assert.ok(validateStage({...m,plates:[{...m.plates[0],kind:'resonance',minActors:1}]}).length);assert.ok(validateStage({...m,plates:[{...m.plates[0],kind:'toggle',minActors:2}]}).length);assert.ok(validateStage({...m,doors:[{...m.doors[0],inverted:'yes'}]}).length);});
