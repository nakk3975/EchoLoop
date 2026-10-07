import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromRows} from '../src/stage-factory.ts';
import {initial,step,replay,buildChain,rewind,echoPositions,canEchoJump,saveState,restoreState,hash,validateStage,type Move} from '../src/engine.ts';
function room(){return fromRows('new-fixture','새 규칙','','',['##########','#........#','#........#','#S......G#','#........#','#........#','##########'],3);}

test('only current pushes boxes, boxes hold weight plates, and ghosts pass through without pushing',()=>{
 const m=room();m.crates=[{x:2,y:3}];m.plates=[{id:'a',x:4,y:3},{id:'e',x:2,y:2,kind:'echo'}];m.doors=[{id:'d',x:6,y:3,mode:'OR',plateIds:['a']}];
 const first=replay(m,['R','R']);assert.deepEqual(first.crates,[{x:4,y:3}]);assert.equal(first.doors.d,true);
 const ghosts=buildChain(m,[['R','R']]),next=replay(m,['.','.'],ghosts);
 assert.deepEqual(next.crates,m.crates);assert.deepEqual(echoPositions(m,next)[0],{x:3,y:3});assert.equal(next.doors.d,false);
 assert.equal(hash(restoreState(saveState(m,first)).state),hash(first));assert.deepEqual(rewind(m,first).crates,[{x:3,y:3}]);
});
test('boxes cannot chain-push, enter walls, closed doors, wrong arrows, or portals; failed pushes are free',()=>{
 const m=room();m.moveLimit=20;m.crates=[{x:2,y:3},{x:3,y:3}];assert.equal(replay(m,['R']).movesUsed,0);
 for(const blocker of ['wall','door','arrow','portal']){
  const n=room();n.moveLimit=20;n.crates=[{x:2,y:3}];
  if(blocker==='wall')n.tiles[3*n.width+3]=1;
  if(blocker==='door'){n.plates=[{id:'a',x:1,y:1,kind:'echo'}];n.doors=[{id:'d',x:3,y:3,mode:'OR',plateIds:['a']}];}
  if(blocker==='arrow')n.arrows=[{x:3,y:3,direction:'L'}];
  if(blocker==='portal')n.portals=[{id:'p',a:{x:3,y:3},b:{x:7,y:1}}];
  assert.deepEqual(replay(n,['R']).crates,n.crates);assert.equal(replay(n,['R']).movesUsed,0,blocker);
 }
});
test('crates do not impersonate present, echo, resonance, toggle, charge, or solo occupants',()=>{
 for(const kind of ['present','echo','resonance','toggle','charge','solo'] as const){const m=room();m.crates=[{x:3,y:3}];m.plates=[{id:'a',x:3,y:3,kind}];assert.equal(initial(m).plates.a,false,kind);}
});
test('fragile floors collapse on departure only; ghosts ignore holes and undo/reset restore flooring',()=>{
 const m=room();m.fragile=[{x:2,y:3}];let s=replay(m,['R','.']);assert.deepEqual(s.broken,[]);
 s=step(m,s,'R');assert.deepEqual(s.broken,[0]);assert.deepEqual(step(m,s,'L').current,s.current);
 assert.deepEqual(rewind(m,s).broken,[]);assert.deepEqual(initial(m).broken,[]);
 const ghosts=buildChain(m,[['R','R']]),withEcho=replay(m,['R','U','D'],ghosts);
 assert.deepEqual(withEcho.broken,[0]);assert.deepEqual(echoPositions(m,withEcho)[0],{x:3,y:3});
 assert.equal(hash(restoreState(saveState(m,withEcho)).state),hash(withEcho));
});
test('walking portals and echo jumps cannot land on collapsed flooring',()=>{
 const m=room();m.fragile=[{x:7,y:2}];m.portals=[{id:'p',a:{x:2,y:3},b:{x:7,y:2}}];
 let s=replay(m,['R','L']);assert.deepEqual(s.broken,[0]);
 s={...s,current:{x:1,y:3}};assert.deepEqual(step(m,s,'R').current,s.current);
 m.echoJump=true;const ghosts=buildChain(m,[['R']]);assert.equal(canEchoJump(m,{...s,ghosts,jumpUsed:false},0),false);
});
test('reverse playback starts at the recorded endpoint, retraces waits and teleport segments, then stays at spawn',()=>{
 const m=room();m.echoMode='reverse';m.portals=[{id:'p',a:{x:2,y:2},b:{x:6,y:4}}];
 const ghosts=buildChain(m,[['U','R','R','.']]);let s=initial(m,ghosts);
 assert.deepEqual(echoPositions(m,s)[0],{x:7,y:4});s=step(m,s,'.');assert.deepEqual(echoPositions(m,s)[0],{x:7,y:4});
 s=step(m,s,'.');assert.deepEqual(echoPositions(m,s)[0],{x:6,y:4});s=step(m,s,'.');assert.deepEqual(echoPositions(m,s)[0],{x:1,y:2});
 s=replay(m,Array<Move>(8).fill('.'),ghosts);assert.deepEqual(echoPositions(m,s)[0],m.spawn);
 assert.equal(hash(restoreState(saveState(m,s)).state),hash(s));
});
test('echo jump targets the chosen current ghost position, costs one move, and is refunded by undo and restart',()=>{
 const m=room();m.echoJump=true;m.moveLimit=30;const ghosts=buildChain(m,[['U','U'],['D','D']]);
 let s=replay(m,['.','.'],ghosts);const before=s;s=step(m,s,'J2');assert.deepEqual(s.current,{x:1,y:5});assert.equal(s.movesUsed,before.movesUsed!+1);assert.equal(s.jumpUsed,true);
 assert.equal(canEchoJump(m,s,0),false);assert.deepEqual(step(m,s,'J1').current,s.current);
 assert.equal(rewind(m,s).jumpUsed,false);assert.equal(initial(m,ghosts).jumpUsed,false);
 assert.equal(hash(restoreState(saveState(m,s)).state),hash(s));assert.deepEqual(replay(m,['.','.','J1'],ghosts).current,{x:1,y:1});
});
test('missing or occupied jump targets do not spend movement or charge, and ordinary maps reject jump commands',()=>{
 const m=room();assert.throws(()=>step(m,initial(m),'J1'));m.echoJump=true;m.moveLimit=10;
 assert.equal(replay(m,['J1']).jumpUsed,false);assert.equal(replay(m,['J1']).movesUsed,0);
 const ghosts=buildChain(m,[['R']]);m.crates=[{x:2,y:3}];const s=replay(m,['.'],ghosts);assert.equal(canEchoJump(m,s,0),false);assert.equal(step(m,s,'J1').jumpUsed,false);
 m.crates=[];m.plates=[{id:'e',x:4,y:1,kind:'echo'}];m.doors=[{id:'d',x:2,y:3,mode:'OR',plateIds:['e']}];assert.equal(canEchoJump(m,replay(m,['.'],ghosts),0),false);
});
test('stasis stops only the numbered echo, resumes on departure, and does not pause the world clock',()=>{
 const m=room();m.stasis=[{x:2,y:3,ghost:1}];const ghosts=buildChain(m,[['U','U','R'],['D','D','R']]);
 let s=replay(m,['R','.','.'],ghosts);assert.equal(s.tick,3);assert.deepEqual(s.echoTicks,[1,3]);assert.deepEqual(echoPositions(m,s),[{x:1,y:2},{x:2,y:5}]);
 s=step(m,s,'L');assert.deepEqual(s.echoTicks,[1,4]);s=step(m,s,'.');assert.deepEqual(s.echoTicks,[2,5]);
 assert.deepEqual(rewind(m,s).echoTicks,[1,4]);assert.equal(hash(restoreState(saveState(m,s)).state),hash(s));
});
test('stasis controls reversed playback independently for each record',()=>{
 const m=room();m.echoMode='reverse';m.stasis=[{x:2,y:3,ghost:1}];const ghosts=buildChain(m,[['U','U','R'],['D','D','R']]);
 const s=replay(m,['R','.','.'],ghosts);assert.deepEqual(s.echoTicks,[1,3]);assert.deepEqual(echoPositions(m,s),[{x:1,y:1},m.spawn]);
});
test('new map data rejects malformed boxes, floor overlays, replay modes and stasis targets',()=>{
 const m=room();for(const change of [{crates:[null]},{crates:[m.spawn]},{crates:[{x:2,y:3},{x:2,y:3}]},{fragile:[null]},{fragile:[{x:0,y:0}]},{echoMode:'forward'},{echoJump:1},{stasis:[null]},{stasis:[{x:2,y:3,ghost:0}]},{stasis:[{x:2,y:3,ghost:4}]}])assert(validateStage({...m,...change}).length,JSON.stringify(change));
 assert.deepEqual(validateStage({...m,crates:[{x:2,y:3}],fragile:[{x:2,y:3}],stasis:[{x:3,y:3,ghost:1}],echoMode:'reverse',echoJump:true}),[]);
});
