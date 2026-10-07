import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {stages as orderedStages,referenceInputs as orderedInputs,restoreCampaignProgress} from '../src/stages.ts';
import {rhythmFoldPuzzles} from '../src/rhythm-fold-stages.ts';
import {campaignStages,campaignInputs} from '../src/campaign-data.ts';
import {buildChain,replay,initial,step,recordedMoves,movementCount,remainingMoves,validateStage,equal,hash,saveState,type Move} from '../src/engine.ts';
import {puzzleRoute} from '../scripts/puzzle-route.ts';

const stages=Array.from({length:80},(_,i)=>orderedStages.find(m=>m.id===(i<5?['first-light','pressure','first-echo','two-doors','together'][i]:`fracture-${String(i+1).padStart(2,'0')}`))!);
const referenceInputs=stages.map(m=>orderedInputs[orderedStages.indexOf(m)]);

test('chapters 5 and 6 are ten compact, distinct cooperative puzzles with spare moves',()=>{
 const results=[];
 for(let i=20;i<30;i++){
  const m=stages[i],loops=referenceInputs[i],ghosts=buildChain(m,loops.slice(0,-1)),state=replay(m,loops.at(-1)!,ghosts),old=campaignStages[i-5];
  assert.deepEqual(validateStage(m),[]);assert(m.width<=13&&m.height<=9);assert(m.width*m.height<old.width*old.height);
  assert(state.tick<=40,'compact final loop '+m.id);assert.equal(state.outcome,'WON');assert.equal(remainingMoves(m,state),4);
  assert(recordedMoves(ghosts)+movementCount(state.trajectory)<=30,'avoid walking to kill time '+m.id);
  // Authored witnesses wait in place, rather than repeatedly pushing blocked doors.
  for(const [l,loop] of loops.entries()){
   let s=initial(m,ghosts.slice(0,l));for(const move of loop){const next=step(m,s,move);if(move!=='.')assert(!equal(next.current,s.current),`${m.id} blocked ${move}`);s=next;}
  }
  results.push({level:orderedStages.indexOf(m)+1,id:m.id,title:m.title,idea:rhythmFoldPuzzles[i-20].idea,before:{width:old.width,height:old.height,finalTicks:campaignInputs[i-5].at(-1)!.length},after:{width:m.width,height:m.height,loopTicks:loops.map(l=>l.length),moves:state.movesUsed,limit:m.moveLimit,remainingMoves:4}});
 }
 writeFileSync(new URL('../artifacts/chapter-redesign.json',import.meta.url),JSON.stringify({levels:10,results},null,2)+'\n');
});

test('pulse puzzles require phase-aware waiting, current-only occupancy, and deliberate ghost departure',()=>{
 for(let i=20;i<25;i++){
  const m=stages[i],loops=referenceInputs[i],ghosts=buildChain(m,loops.slice(0,-1));
  assert(loops.at(-1)!.includes('.'),'the pulse changes the final timing '+m.id);
  assert.notEqual(replay(m,loops.at(-1)!.filter(d=>d!=='.'),ghosts).outcome,'WON',m.id);
  const last=replay(m,loops.at(-1)!,ghosts.slice(0,-1));assert.notEqual(last.outcome,'WON','missing record '+m.id);
 }
 for(const i of [21,23]){
  const m=stages[i],loops=referenceInputs[i],last=loops.at(-2)!,departure=last.reduce((index,d,i)=>d==='.'?index:i,-1),stay=last.slice(0,departure),ghosts=buildChain(m,[...loops.slice(0,-2),stay]);
  assert.equal(puzzleRoute(m,m.goal,ghosts),null,'a permanently occupied echo plate deadlocks '+m.id);
 }
 const m=stages[22],loops=referenceInputs[22],ghosts=buildChain(m,loops.slice(0,-1));
 assert(m.doors.some(d=>d.mode==='AND'&&d.plateIds.length===2));
 const currentPlate=m.plates.find(p=>p.kind==='present')!,recorded=buildChain(m,[['R','R']]);
 assert.equal(replay(m,Array<Move>(10).fill('.'),recorded).plates[currentPlate.id],false,'an echo cannot supply the current obligation');
 assert.equal(replay(m,loops.at(-1)!,ghosts).outcome,'WON');
});

test('every portal pair has a required job and the return-trip record ends at a meeting plate',()=>{
 for(let i=25;i<30;i++){
  const m=stages[i],loops=referenceInputs[i];
  for(const portal of m.portals!){
   const changed={...m,portals:m.portals!.filter(p=>p.id!==portal.id)},ghosts=buildChain(changed,loops.slice(0,-1));
   assert.equal(puzzleRoute(changed,changed.goal,ghosts),null,`${m.id}: ${portal.id} must not be decoration`);
  }
 }
 const m=stages[26],ghost=buildChain(m,referenceInputs[26].slice(0,-1))[0],portal=m.portals![0];
 assert(ghost.cells.some(c=>equal(c,portal.a)));assert(ghost.cells.some(c=>equal(c,portal.b)));
 assert(equal(ghost.cells[300],m.plates.find(p=>p.kind==='resonance')!));
});

test('changed chapter maps preserve verified previous progress under its original geometry',()=>{
 const previous={...campaignStages[15],moveLimit:250},state=replay(previous,['.','.']),save=saveState(previous,state),restored=restoreCampaignProgress(save);
 assert.notEqual(hash(previous.tiles),hash(stages[20].tiles));assert.equal(restored.stage.id,stages[20].id);
 assert.equal(hash(restored.stage),hash(previous));assert.equal(hash(restored.state),hash(state));
});
