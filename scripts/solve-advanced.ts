import {writeFileSync} from 'node:fs';
import {advancedPuzzles} from '../src/advanced-stages.ts';
import {initial,step,replay,commit,validateStage,verifySolution,solution,equal,type Move,type RecordLoop,type Cell,type Stage,type State} from '../src/engine.ts';
function search(m:Stage,target:Cell,ghosts:RecordLoop[]):Move[]{
 const stop=Math.max(0,...ghosts.map(g=>g.originalTicks)),period=m.doors.find(d=>d.pulse)?.pulse?.period??1;
 const nodes:{s:State;parent:number;move:Move}[]=[{s:initial(m,ghosts),parent:-1,move:'.'}],seen=new Set<string>();
 for(let i=0;i<nodes.length;i++){const {s}=nodes[i];if(equal(s.current,target)&&s.tick>0&&(!equal(target,m.goal)||s.outcome==='WON')){const result:Move[]=[];for(let j=i;nodes[j].parent>=0;j=nodes[j].parent)result.unshift(nodes[j].move);return result;}if(s.outcome!=='RUNNING')continue;
 for(const move of ['U','D','L','R','.'] as Move[]){const next=step(m,{...s,inputPrefix:[],trajectory:[]},move),time=next.tick<=stop?next.tick:stop+1+(next.tick-stop-1)%period;
 const key=JSON.stringify([next.current,time,next.doors,next.switches,next.switchOccupied,next.charges,next.collected]);if(seen.has(key))continue;seen.add(key);nodes.push({s:next,parent:i,move});}}
 throw new Error(`No route: ${m.id} to ${JSON.stringify(target)}`);
}
const witnesses:Move[][][]=[];
for(const {stage:m,records} of advancedPuzzles){const errors=validateStage(m);if(errors.length)throw new Error(m.id+': '+errors.join(';'));const ghosts:RecordLoop[]=[],inputs:Move[][]=[];for(const target of records){const prefix=Array.isArray(target)?target:search(m,target,ghosts);ghosts.push(commit(m,replay(m,prefix,ghosts)));inputs.push(prefix);}inputs.push(search(m,m.goal,ghosts));verifySolution(m,solution(m,replay(m,inputs.at(-1)!,ghosts)));witnesses.push(inputs);console.log(m.id,m.title,`${m.width}x${m.height}`,inputs.map(x=>x.length).join('/'));}
writeFileSync(new URL('../src/advanced-solutions.ts',import.meta.url),`// Verified with the shared engine by scripts/solve-advanced.ts.\nimport type {Move} from './engine.ts';\nexport const advancedInputs:Move[][][]=${JSON.stringify(witnesses)};\n`);
