import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {stages,referenceInputs,restoreCampaignProgress,fromRows} from '../src/stages.ts';
import {initial,step,replay,buildChain,commit,rewind,solution,verifySolution,saveState,restoreState,movementCount,recordedMoves,remainingMoves,validateStage,hash,equal,type Move,type Stage,type State} from '../src/engine.ts';

test('all 100 budgets cover the verified complete solution plus exactly four spare moves',()=>{
 for(let i=0;i<stages.length;i++){
  const m=stages[i],loops=referenceInputs[i],ghosts=buildChain(m,loops.slice(0,-1)),s=replay(m,loops.at(-1)!,ghosts);
  assert.equal(s.outcome,'WON',m.id);assert.equal(remainingMoves(m,s),4,m.id);
  assert.equal(s.movesUsed,recordedMoves(ghosts)+movementCount(s.trajectory));
  assert.equal(verifySolution(m,solution(m,s)).movesUsed,s.movesUsed);
 }
});

function run(m:Stage,inputs:Move[],ghosts:State['ghosts']){
 let s=initial(m,ghosts);for(const input of inputs){if(s.outcome!=='RUNNING')break;s=step(m,s,input);}return s;
}
test('all 100 puzzles still win after two real out-and-back mistakes; a third exceeds the budget',()=>{
 const results=[];const opposite:Record<string,Move>={U:'D',D:'U',L:'R',R:'L'};
 for(let n=0;n<stages.length;n++){
  const m=stages[n],loops=referenceInputs[n],ghosts=buildChain(m,loops.slice(0,-1)),final=loops.at(-1)!;
  const baseline=replay(m,final,ghosts).movesUsed!;let found=false;
  for(let i=final.length-1;i>=0&&!found;i--)for(const d of ['U','D','L','R'] as Move[]){
   const prefix=final.slice(0,i),before=replay(m,prefix,ghosts),pair=[d,opposite[d]],twice=[...pair,...pair];
   const detour=run(m,[...prefix,...twice],ghosts);
   if(detour.outcome!=='RUNNING'||!equal(detour.current,before.current)||detour.movesUsed!==before.movesUsed!+4)continue;
   const after=run(m,[...prefix,...twice,...final.slice(i)],ghosts);
   if(after.outcome!=='WON'||after.movesUsed!==baseline+4)continue;
   const third=run(m,[...prefix,...twice,...pair,...final.slice(i)],ghosts);
   assert.equal(third.outcome,'OUT_OF_MOVES',m.id+' third mistake');
   assert.equal(remainingMoves(m,after),0);assert.equal(verifySolution(m,solution(m,after)).outcome,'WON');
   results.push({level:n+1,id:m.id,referenceMoves:baseline,limit:m.moveLimit,twoMistakes:'WON',thirdMistake:third.outcome,detour:{tick:i,direction:d}});
   found=true;break;
  }
  assert(found,m.id+' must tolerate two mistakes');
 }
 writeFileSync(new URL('../artifacts/movement-budgets.json',import.meta.url),JSON.stringify({levels:stages.length,spareMoves:4,results},null,2)+'\n');
});

test('waiting and blocked directions are free; the last permitted move can win even at tick 300',()=>{
 const m={...stages[0],moveLimit:6};const blocked=replay(m,['L','L','.']);assert.equal(blocked.movesUsed,0);
 const won=replay(m,[...Array<Move>(294).fill('.'),...referenceInputs[0][0]]);
 assert.equal(won.outcome,'WON');assert.equal(won.tick,300);assert.equal(remainingMoves(m,won),0);
 const waiting=replay(m,Array<Move>(300).fill('.'));assert.equal(waiting.outcome,'TIMEOUT');assert.equal(waiting.movesUsed,0);
});

test('recorded moves remain spent across loops without charging ghost playback a second time',()=>{
 const m=stages[3],ghosts=buildChain(m,referenceInputs[3].slice(0,2)),s=initial(m,ghosts),used=recordedMoves(ghosts);
 assert.equal(s.movesUsed,used);assert.equal(replay(m,Array<Move>(20).fill('.'),ghosts).movesUsed,used);
 const moved=step(m,s,'R');assert.equal(moved.movesUsed,used+1);assert.equal(rewind(m,moved).movesUsed,used);
 assert.equal(initial(m,moved.ghosts).movesUsed,used,'restart refunds only current loop');
 const uncommitted=rewind(m,s);assert.equal(uncommitted.movesUsed,used,'uncommit retains the restored loop movement');
 assert.equal(initial(m,ghosts.slice(0,1)).movesUsed,recordedMoves(ghosts.slice(0,1)),'deletion refunds deleted loops');
 assert.equal(initial(m).movesUsed,0,'full reset');
});

test('exhaustion stops simulation, refunds correctly on undo, and restores from verified saves',()=>{
 const m={...stages[0],moveLimit:2},s=replay(m,['R','R']);assert.equal(s.outcome,'OUT_OF_MOVES');
 assert.strictEqual(step(m,s,'R'),s);assert.throws(()=>commit(m,s));assert.equal(hash(restoreState(saveState(m,s)).state),hash(s));
 const back=rewind(m,s);assert.equal(back.outcome,'RUNNING');assert.equal(remainingMoves(m,back),1);
 assert.throws(()=>verifySolution(m,{engineVersion:m.engineVersion,stageChecksum:hash(m),committedLoops:[],finalLoop:Array<Move>(6).fill('R')}));
});

test('a teleport costs one move, and restricted or wall entries cost none',()=>{
 const m=fromRows('budget-portal','Portal','','',['########','#......#','#S....G#','#......#','#......#','########'],0);
 m.moveLimit=8;m.portals=[{id:'p',a:{x:2,y:2},b:{x:5,y:3}}];m.arrows=[{x:5,y:2,direction:'D'}];
 const s=step(m,initial(m),'R');assert.deepEqual(s.current,{x:5,y:3});assert.equal(s.movesUsed,1);
 assert.equal(step(m,s,'U').movesUsed,1);assert.equal(step(m,s,'.').movesUsed,1);
 assert.deepEqual(validateStage(m),[]);
});

test('invalid movement limits are rejected and unlimited custom maps keep the old state format',()=>{
 for(const moveLimit of [0,-1,1.5,1201,NaN,Infinity,null,'10'])assert(validateStage({...stages[0],moveLimit}).length);
 const {moveLimit,...m}=stages[0];assert.deepEqual(validateStage(m),[]);assert(!('movesUsed' in replay(m,['R'])));
});

test('old progress upgrades without changing time, position or ghost trajectories, while old over-budget saves remain usable',()=>{
 const {moveLimit,...m}=stages[3],s=replay(m,['R','R'],buildChain(m,referenceInputs[3].slice(0,2))),saved=saveState(m,s);
 const upgraded=restoreCampaignProgress(saved);assert.equal(upgraded.stage.moveLimit,moveLimit);
 assert.equal(upgraded.state.tick,s.tick);assert.deepEqual(upgraded.state.current,s.current);
 assert.deepEqual(upgraded.state.ghosts.map(g=>g.cells),s.ghosts.map(g=>g.cells));
 assert.equal(hash(restoreState(saveState(upgraded.stage,upgraded.state)).state),hash(upgraded.state));
 assert.throws(()=>restoreCampaignProgress({...saved,checksum:'forged'}));
 const {moveLimit:cap,...old}=stages[0],over=replay(old,Array<Move>(7).fill('U').flatMap(()=>['U','D'] as Move[]));
 const preserved=restoreCampaignProgress(saveState(old,over));assert.equal(preserved.stage.moveLimit,undefined);assert.equal(hash(preserved.state),hash(over));
});
