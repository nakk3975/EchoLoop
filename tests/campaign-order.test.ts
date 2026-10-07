import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {stages,referenceInputs,restoreCampaignProgress} from '../src/stages.ts';
import {newMechanicPuzzles} from '../src/new-mechanic-stages.ts';
import {difficultyRank,difficultyLabel,chapterNames} from '../src/campaign-difficulty.ts';
import {initial,step,replay,buildChain,saveState,hash,equal,remainingMoves,type Move} from '../src/engine.ts';
import {puzzleRoute} from '../scripts/puzzle-route.ts';
test('100 levels ascend authored challenge ranks; IDs, paired witnesses and existing saves survive reordering',()=>{
 assert.equal(stages.length,100);assert.equal(chapterNames.length*5,stages.length);
 const results=stages.map((m,i)=>{if(i)assert(difficultyRank(m)>=difficultyRank(stages[i-1]),m.id);const s=replay(m,['.']);assert.equal(hash(restoreCampaignProgress(saveState(m,s)).state),hash(s));return {level:i+1,id:m.id,title:m.title,difficulty:difficultyLabel(m),rank:difficultyRank(m),moveLimit:m.moveLimit};});
 for(const family of ['crate','crumble','reverse','jump','stasis']){const intro=stages.findIndex(m=>m.id===family+'-01');assert(intro>=5&&intro<40,'intro early '+family);for(const n of ['02','03'])assert(stages.findIndex(m=>m.id===family+'-'+n)>intro);}
 assert.equal(stages.at(-1)!.id,'confluence-05');
 writeFileSync(new URL('../artifacts/campaign-order.json',import.meta.url),JSON.stringify({levels:stages.length,criteria:'Actor roles, state changes, timing and mechanic combinations; original five tutorials first.',results},null,2)+'\n');
});
test('20 new rooms have active mechanics, compact witnesses, refunds and spare moves in every recorded loop',()=>{
 const results=[];
 for(const {stage:authored,idea} of newMechanicPuzzles){const i=stages.findIndex(m=>m.id===authored.id),m=stages[i],loops=referenceInputs[i],chain=buildChain(m,loops.slice(0,-1));let pushes=0,holes=0,freezes=0,jumps=0;
  for(const [l,loop] of loops.entries()){let s=initial(m,chain.slice(0,l));for(const d of loop){const next=step(m,s,d);if(d!=='.')assert(!equal(next.current,s.current),m.id+' blocked '+d);pushes+=Number(hash(next.crates??[])!==hash(s.crates??[]));holes+=Number((next.broken?.length??0)>(s.broken?.length??0));freezes+=Number(!!s.echoTicks?.some((t,k)=>t<chain[k].originalTicks&&next.echoTicks?.[k]===t));jumps+=Number(d.startsWith('J'));s=next;}}
  const final=replay(m,loops.at(-1)!,chain);assert.equal(final.outcome,'WON');assert.equal(remainingMoves(m,final),4);assert(m.width<=12&&m.height<=7);assert(loops.at(-1)!.length<=60,m.id);
  if(m.crates?.length)assert(pushes>0,m.id+' crate matters');if(m.fragile?.length)assert(holes>0,m.id+' floor matters');if(m.echoJump)assert(jumps===1,m.id+' jump matters');if(m.stasis?.length)assert(freezes>0,m.id+' stasis matters');
  results.push({level:i+1,id:m.id,idea,size:`${m.width}×${m.height}`,ticks:loops.map(l=>l.length),pushes,collapses:holes,frozenTicks:freezes,jumps,remainingMoves:4});
 }
 writeFileSync(new URL('../artifacts/new-mechanics.json',import.meta.url),JSON.stringify({levels:20,results},null,2)+'\n');
});
test('jump pockets have no walking exit and stopped transient echoes cannot be replaced by plain waiting',()=>{
 for(const id of ['jump-01','jump-02','jump-03','confluence-03','confluence-04','confluence-05']){const i=stages.findIndex(m=>m.id===id),m=stages[i],loops=referenceInputs[i],g=buildChain(m,loops.slice(0,-1));const changed={...m,echoJump:false};assert.notEqual(replay(changed,loops.at(-1)!.map(d=>d.startsWith('J')?'.':d),g).outcome,'WON',id);}
 for(const id of ['stasis-01','stasis-02','stasis-03','confluence-02']){const i=stages.findIndex(m=>m.id===id),m=stages[i],loops=referenceInputs[i],changed={...m,stasis:[]},g=buildChain(changed,loops.slice(0,-1));assert.equal(puzzleRoute(changed,changed.goal,g),null,id+' requires stopping');}
 const i=stages.findIndex(m=>m.id==='confluence-05'),m=stages[i],loops=referenceInputs[i],g=buildChain(m,loops.slice(0,-1)),withoutStasis={...m,stasis:[]};assert.notEqual(replay(withoutStasis,loops.at(-1)!,g).outcome,'WON');assert(m.crates?.length&&m.fragile?.length&&m.echoMode==='reverse'&&m.echoJump&&m.stasis?.length);
});
