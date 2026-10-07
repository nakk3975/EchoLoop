import {writeFileSync} from 'node:fs';
import {rhythmFoldPuzzles} from '../src/rhythm-fold-stages.ts';
import {replay,commit,validateStage,verifySolution,solution,type Move,type RecordLoop,type Cell,type Stage} from '../src/engine.ts';
import {puzzleRoute} from './puzzle-route.ts';
function search(m:Stage,target:Cell,ghosts:RecordLoop[]){const route=puzzleRoute(m,target,ghosts);if(!route)throw new Error(`No route: ${m.id} to ${JSON.stringify(target)}`);return route;}
const inputs:Move[][][]=[];
for(const {stage:m,records} of rhythmFoldPuzzles){
 const errors=validateStage(m);if(errors.length)throw new Error(m.id+': '+errors.join(';'));
 const ghosts:RecordLoop[]=[],loops:Move[][]=[];
 for(const record of records){const prefix=Array.isArray(record)?record:search(m,record,ghosts);ghosts.push(commit(m,replay(m,prefix,ghosts)));loops.push(prefix);}
 loops.push(search(m,m.goal,ghosts));verifySolution(m,solution(m,replay(m,loops.at(-1)!,ghosts)));inputs.push(loops);
 console.log(m.id,m.title,`${m.width}x${m.height}`,loops.map(x=>x.length).join('/'));
}
writeFileSync(new URL('../src/rhythm-fold-solutions.ts',import.meta.url),`// Verified by scripts/solve-rhythm-fold.ts with the shared engine.\nimport type {Move} from './engine.ts';\nexport const rhythmFoldInputs:Move[][][]=${JSON.stringify(inputs)};\n`);
