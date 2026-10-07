import {writeFileSync} from 'node:fs';
import {stages,referenceInputs} from '../src/stages.ts';
import {buildChain,replay,recordedMoves,movementCount} from '../src/engine.ts';
const limits:Record<string,number>={};
for(const [i,stage] of stages.entries()){
 const {moveLimit,...m}=stage,loops=referenceInputs[i],ghosts=buildChain(m,loops.slice(0,-1)),state=replay(m,loops.at(-1)!,ghosts);
 if(state.outcome!=='WON')throw new Error('Unsolved '+m.id);
 limits[m.id]=recordedMoves(ghosts)+movementCount(state.trajectory)+4;
}
writeFileSync(new URL('../src/campaign-move-limits.json',import.meta.url),JSON.stringify(limits,null,2)+'\n');
console.log(stages.length+' verified movement budgets regenerated; four spare moves each.');
