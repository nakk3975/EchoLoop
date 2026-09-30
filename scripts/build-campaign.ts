import {writeFileSync} from 'node:fs';
import {ENGINE,initial,step,replay,commit,validateStage,verifySolution,solution,equal,type Stage,type Cell,type Move,type RecordLoop,type State} from '../src/engine.ts';

const chapters=[
 ['잔상의 숲','기록의 순서와 세 명의 역할','뒤얽힌 시작','멀어진 발판','되돌아온 발자국','세 개의 약속','잔상의 합창'],
 ['망각의 성소','과거만 반응하는 잔상 발판','나를 기억하는 바닥','살아 있는 나는 못 열어','유령의 열쇠','기억의 사슬','성소의 문지기'],
 ['실체의 경계','현재만 반응하는 실체 발판','지금 이 순간만','사라지는 도움','몸으로 여는 문','역할을 바꿔','실체와 잔상'],
 ['박동하는 시간','열림 주기를 기다리는 박동 문','첫 번째 박동','엇갈리는 초침','숨을 고르는 길','두 개의 주기','마지막 한 박자'],
 ['공간의 접힘','연결 포털을 통과하는 궤적','접힌 복도','저편의 발자국','기억도 건너간다','세 번의 도약','공간의 매듭'],
 ['역행 금지','들어오는 방향이 정해진 통로','돌아갈 수 없는 선','화살표의 의미','과거의 일방통행','우회하는 현재','방향의 미궁'],
 ['인과의 교차','잔상 발판 · 실체 발판 · 박동 문','순서를 묻는 문','불완전한 합주','지금과 그때 사이','역할의 교차점','인과의 고리'],
 ['붕괴 직전','포털 · 방향 통로 · 박동의 결합','낯선 출발점','어긋난 좌표','틈새의 박동','기억이 닿는 곳','균열을 봉합하라'],
 ['마지막 역설','세 개의 기록과 모든 장치','세 명의 열쇠','시간의 반대편','불가능한 동행','끝나지 않는 궤도','마지막의 나는 처음의 나']
];
function rng(seed:number){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const dirs:[Move,number,number][]=[['U',0,-1],['R',1,0],['D',0,1],['L',-1,0]];
function geometricPath(m:Stage,start:Cell,goal:Cell):Cell[]{
 const nodes=[{p:start,parent:-1}],seen=new Set([`${start.x},${start.y}`]);for(let i=0;i<nodes.length;i++){const n=nodes[i];if(equal(n.p,goal)){const result:Cell[]=[];let j=i;while(j>=0){result.unshift(nodes[j].p);j=nodes[j].parent;}return result;}
 for(const [,dx,dy]of dirs){const p={x:n.p.x+dx,y:n.p.y+dy},key=`${p.x},${p.y}`;if(p.x>0&&p.y>0&&p.x<m.width-1&&p.y<m.height-1&&!m.tiles[p.y*m.width+p.x]&&!seen.has(key)){seen.add(key);nodes.push({p,parent:i});}}}return [];
}
function search(m:Stage,target:Cell,ghosts:RecordLoop[]):Move[]|null{
 const stop=Math.max(0,...ghosts.map(g=>g.originalTicks)),period=m.doors.find(d=>d.pulse)?.pulse?.period??1;
 const nodes:{s:State;parent:number;move:Move}[]=[{s:initial(m,ghosts),parent:-1,move:'.'}],seen=new Set<string>();
 for(let i=0;i<nodes.length;i++){const n=nodes[i];if(equal(n.s.current,target)&&n.s.tick>0){const moves:Move[]=[];let j=i;while(nodes[j].parent>=0){moves.unshift(nodes[j].move);j=nodes[j].parent;}return moves;}
 if(n.s.outcome!=='RUNNING')continue;
 for(const [move]of [...dirs,['.',0,0] as [Move,number,number]]){const s=step(m,{...n.s,inputPrefix:[],trajectory:[]},move);const t=s.tick<=stop?s.tick:stop+1+(s.tick-stop-1)%period;const key=`${s.current.x},${s.current.y},${t},${Object.values(s.doors).map(Number).join('')}`;if(seen.has(key))continue;seen.add(key);nodes.push({s,parent:i,move});}}
 return null;
}
function create(ch:number,v:number,attempt:number){
 const number=6+ch*5+v,random=rng(number*3975+attempt*997),ghosts=ch>=6?3:ch===0?1+Math.floor(v/2):Math.min(3,1+Math.floor(v/2));
 const roomW=6,width=(ghosts+1)*roomW+1,height=ch===8?15+2*v:ch>=7?15:ch>=4?13:9+2*(v%2),exitY=height-2;
 const m:Stage={id:`fracture-${String(number).padStart(2,'0')}`,title:chapters[ch][v+2],description:chapters[ch][1],hint:'각 구역의 발판에 과거를 한 명씩 남기세요. 앞선 과거가 문을 열 때까지 기다리면 다음 구역으로 갈 수 있습니다.',schemaVersion:1,engineVersion:ENGINE,width,height,tickHz:10,loopTicks:300,maxGhosts:ghosts,tiles:Array(width*height).fill(1),spawn:{x:1,y:1},goal:{x:width-2,y:1},plates:[],doors:[]};
 for(let room=0;room<=ghosts;room++){const offset=room*roomW,stack=[{x:1,y:1}];m.tiles[width+offset+1]=0;
 while(stack.length){const p=stack.at(-1)!,options=dirs.map(([,dx,dy])=>({x:p.x+dx*2,y:p.y+dy*2,dx,dy})).filter(q=>q.x>0&&q.x<roomW&&q.y>0&&q.y<height-1&&m.tiles[q.y*width+offset+q.x]);if(!options.length){stack.pop();continue;}const q=options[Math.floor(random()*options.length)];m.tiles[(p.y+q.dy)*width+offset+p.x+q.dx]=0;m.tiles[q.y*width+offset+q.x]=0;stack.push(q);}
 if(room<ghosts){m.tiles[exitY*width+offset+roomW]=0;const entrance={x:offset+1,y:room?exitY:1};const candidates:Cell[]=[];for(let y=1;y<height-1;y++)for(let x=offset+1;x<offset+roomW;x++)if(!m.tiles[y*width+x]&&!equal({x,y},entrance)&&x!==offset+roomW-1)candidates.push({x,y});candidates.sort((a,b)=>geometricPath(m,entrance,b).length-geometricPath(m,entrance,a).length);const pad=candidates[Math.floor(random()*Math.min(3,candidates.length))];m.plates.push({...pad,id:`memory-${room}`,kind:ch===1||ch>=6?'echo':'weight'});m.doors.push({x:offset+roomW,y:exitY,id:`gate-${room}`,mode:ch>=6?'AND':'OR',plateIds:ch>=6?Array.from({length:room+1},(_,i)=>`memory-${i}`):[`memory-${room}`]});}
 }
 const targets=[...m.plates];const occupied=(p:Cell)=>equal(p,m.spawn)||equal(p,m.goal)||m.plates.some(x=>equal(p,x))||m.doors.some(x=>equal(p,x))||(m.portals??[]).some(x=>equal(p,x.a)||equal(p,x.b))||(m.arrows??[]).some(x=>equal(p,x));
 // Each new device changes a mandatory branch of a perfect maze; it is not decoration.
 for(let room=0;room<=ghosts;room++){
 const entrance={x:room*roomW+1,y:room?exitY:1},target=room<ghosts?targets[room]:m.goal,path=geometricPath(m,entrance,target);
 const usePortal=ch===4||ch>=7,usePresent=ch===2||ch===6||ch===8,useArrow=ch===5||ch>=7;
 if(usePresent){for(let k=2;k<path.length-2;k++){const p=path[k],d=path[k+1];if(!occupied(p)&&!occupied(d)){const id=`live-${room}`;m.plates.push({...p,id,kind:'present'});m.doors.push({...d,id:`live-gate-${room}`,mode:'OR',plateIds:[id]});break;}}}
 if(usePortal){for(let k=2;k<path.length-5;k++){const a=path[k],b=path[k+4],cut=path[k+2];if([a,b,cut,path[k+1],path[k+3]].every(p=>!occupied(p))){m.portals??=[];m.portals.push({id:`fold-${room}`,a,b});m.tiles[cut.y*width+cut.x]=1;break;}}}
 if(useArrow){for(let k=1;k<Math.min(path.length-1,4);k++){const p=path[k],prev=path[k-1];if(!occupied(p)&&m.tiles[p.y*width+p.x]===0){m.arrows??=[];m.arrows.push({...p,direction:dirs.find(([,dx,dy])=>p.x-prev.x===dx&&p.y-prev.y===dy)![0] as 'U'|'D'|'L'|'R'});break;}}}
 }
 if(ch===3||ch>=6){const period=ch===8?30:20;for(let i=0;i<m.doors.length;i++){const d=m.doors[i];if(d.id.startsWith('gate-')||ch===8)d.pulse={period,openTicks:ch>=7?5:8,offset:(i*7+v*3)%period};}}
 if(m.portals?.length)m.hint+=' 포털은 같은 번호끼리 연결됩니다. 들어간 순간 반대편으로 이동하며, 멈춰 있으면 재이동하지 않습니다.';
 if(m.plates.some(p=>p.kind==='echo'))m.hint+=' 잔상 발판(◇)은 과거만, 실체 발판(✦)은 현재만 인식합니다.';
 if(m.doors.some(d=>d.pulse))m.hint+=' 박동 문은 발판 조건과 시간 조건을 모두 만족해야 열립니다. 앞에서 기다리세요.';
 if(m.arrows?.length)m.hint+=' 화살표 통로는 화살표 방향으로만 진입할 수 있습니다.';
 if(validateStage(m).length)throw new Error(validateStage(m).join(';'));
 const records:RecordLoop[]=[],inputs:Move[][]=[];for(const target of [...targets,m.goal]){const moves=search(m,target,records);if(!moves)return null;const state=replay(m,moves,records);inputs.push(moves);if(equal(target,m.goal)){verifySolution(m,solution(m,state));}else records.push(commit(m,state));}
 return {stage:m,inputs,chapter:ch+1,requiredGhosts:ghosts,parTicks:inputs.at(-1)!.length};
}
const all:NonNullable<ReturnType<typeof create>>[]=[];
for(let ch=0;ch<9;ch++)for(let v=0;v<5;v++){let result=null;for(let attempt=0;attempt<100&&!result;attempt++)result=create(ch,v,attempt);if(!result)throw new Error(`Unsolved ${ch}/${v}`);all.push(result);console.log(`${result.stage.id} ${result.stage.title}: ${result.inputs.map(x=>x.length).join('/')} ticks`);}
writeFileSync(new URL('../src/campaign-data.ts',import.meta.url),`// Fixed, reproducible puzzles generated by scripts/build-campaign.ts; every witness is replay-verified.\nimport type {Stage,Move} from './engine.ts';\nexport const campaignStages:Stage[]=${JSON.stringify(all.map(x=>x.stage))};\nexport const campaignInputs:Move[][][]=${JSON.stringify(all.map(x=>x.inputs))};\nexport const campaignMeta=${JSON.stringify(all.map(({chapter,requiredGhosts,parTicks})=>({chapter,requiredGhosts,parTicks})))};\n`);
