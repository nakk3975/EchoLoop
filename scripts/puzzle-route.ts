import {initial,step,equal,type Move,type RecordLoop,type Cell,type Stage,type State} from '../src/engine.ts';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;

// Minimize actual movement first, elapsed ticks second. Waiting must not inflate
// either the reference movement budget or the recorded paths with pacing loops.
export function puzzleRoute(m:Stage,target:Cell,ghosts:RecordLoop[]):Move[]|null{
 const stop=Math.max(0,...ghosts.map(g=>g.originalTicks));
 const period=m.doors.reduce((p,d)=>d.pulse?p*d.pulse.period/gcd(p,d.pulse.period):p,1);
 const key=(s:State)=>JSON.stringify([s.current,s.tick<=stop?s.tick:stop+1+(s.tick-stop-1)%period,s.doors,s.switches,s.switchOccupied]);
 const nodes:{s:State;parent:number;move:Move;score:number}[]=[{s:initial(m,ghosts),parent:-1,move:'.',score:0}];
 const best=new Map<string,number>([[key(nodes[0].s),0]]),heap:number[]=[0];
 function push(id:number){heap.push(id);let i=heap.length-1;while(i){const p=(i-1)>>1;if(nodes[heap[p]].score<=nodes[id].score)break;heap[i]=heap[p];i=p;}heap[i]=id;}
 function pop(){const result=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&nodes[heap[c+1]].score<nodes[heap[c]].score)c++;if(nodes[last].score<=nodes[heap[c]].score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return result;}
 while(heap.length){
  const i=pop(),{s,score}=nodes[i];if(score!==best.get(key(s)))continue;
  if(equal(s.current,target)&&s.tick>0){const result:Move[]=[];for(let j=i;nodes[j].parent>=0;j=nodes[j].parent)result.unshift(nodes[j].move);return result;}
  if(s.outcome!=='RUNNING')continue;
  for(const move of ['.','U','D','L','R'] as Move[]){
   const next=step(m,{...s,inputPrefix:[],trajectory:[]},move),moved=!equal(next.current,s.current);
   if(move!=='.'&&!moved)continue;
   const nextScore=score+1+(moved?301:0),k=key(next);
   if((best.get(k)??Infinity)<=nextScore)continue;
   best.set(k,nextScore);const id=nodes.length;nodes.push({s:next,parent:i,move,score:nextScore});push(id);
  }
 }
 return null;
}
