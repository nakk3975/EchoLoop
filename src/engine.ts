export const ENGINE = 'echoloop-core-1';
export const LIMIT = 300;
export type Cell = {x:number;y:number};
export type Direction = 'U'|'D'|'L'|'R';
export type Move = Direction|'.'|'J1'|'J2'|'J3';
export type Plate = Cell & {id:string;kind?:'weight'|'echo'|'present'|'resonance'|'toggle'|'charge'|'solo';minActors?:2|3;chargeTicks?:number};
export type Door = Cell & {id:string;mode:'AND'|'OR';plateIds:string[];inverted?:boolean;pulse?:{period:number;openTicks:number;offset:number}};
export type Portal = {id:string;a:Cell;b:Cell};
export type Arrow = Cell & {direction:Direction};
export type Stasis = Cell & {ghost:1|2|3};
export type Stage = {id:string;title:string;description:string;hint:string;schemaVersion:1;engineVersion:string;width:number;height:number;tickHz:10;loopTicks:300;maxGhosts:number;tiles:number[];spawn:Cell;goal:Cell;plates:Plate[];doors:Door[];portals?:Portal[];arrows?:Arrow[];shards?:Cell[];moveLimit?:number;crates?:Cell[];fragile?:Cell[];echoMode?:'reverse';echoJump?:boolean;stasis?:Stasis[]};
export type RecordLoop = {originalTicks:number;inputPrefix:Move[];cells:Cell[];checksum:string;parentChecksum:string};
export type State = {tick:number;current:Cell;ghosts:RecordLoop[];inputPrefix:Move[];trajectory:Cell[];plates:Record<string,boolean>;doors:Record<string,boolean>;charges?:Record<string,number>;collected?:number[];switches?:Record<string,boolean>;switchOccupied?:Record<string,boolean>;movesUsed?:number;crates?:Cell[];broken?:number[];echoTicks?:number[];jumpUsed?:boolean;outcome:'RUNNING'|'WON'|'TIMEOUT'|'OUT_OF_MOVES'};
export type Solution = {engineVersion:string;stageChecksum:string;committedLoops:Move[][];finalLoop:Move[]};
export const equal = (a:Cell,b:Cell) => a.x===b.x&&a.y===b.y;
export const movementCount = (cells:Cell[]) => cells.slice(1).reduce((sum,c,i)=>sum+Number(!equal(c,cells[i])),0);
export const recordedMoves = (ghosts:RecordLoop[]) => ghosts.reduce((sum,g)=>sum+movementCount(g.cells.slice(0,g.originalTicks+1)),0);
export const remainingMoves = (m:Stage,s:State) => m.moveLimit===undefined?null:Math.max(0,m.moveLimit-(s.movesUsed??0));
export function hash(value:unknown):string {
  const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const s=JSON.stringify(canonical(value)); let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');
}
export function validateStage(value:unknown):string[] {
  const e:string[]=[];const m=value as Stage;
  if(!m||typeof m!=='object'||Array.isArray(m))return ['맵 JSON 객체가 필요합니다.'];
  const keys=['id','title','description','hint','schemaVersion','engineVersion','width','height','tickHz','loopTicks','maxGhosts','tiles','spawn','goal','plates','doors','portals','arrows','shards','moveLimit','crates','fragile','echoMode','echoJump','stasis'];
  if(Object.keys(m).some(k=>!keys.includes(k)))e.push('지원하지 않는 맵 속성이 있습니다.');
  if(m.schemaVersion!==1||m.engineVersion!==ENGINE||m.tickHz!==10||m.loopTicks!==300)e.push('지원하지 않는 맵/엔진 버전 또는 시간 설정입니다.');
  if(!Number.isInteger(m.width)||m.width<8||m.width>32||!Number.isInteger(m.height)||m.height<6||m.height>24)return [...e,'맵 크기는 8×6~32×24여야 합니다.'];
  for(const [k,max] of [['id',100],['title',80],['description',1000],['hint',1000]] as const)if(typeof m[k]!=='string'||m[k].length>max||(k==='title'&&!m[k].trim()))e.push(`${k}: 문자열 길이를 확인하세요.`);
  if(!Number.isInteger(m.maxGhosts)||m.maxGhosts<0||m.maxGhosts>3)e.push('과거 기록은 0~3개만 허용됩니다.');
  if(m.moveLimit!==undefined&&(!Number.isInteger(m.moveLimit)||m.moveLimit<1||m.moveLimit>1200))e.push('이동 한도는 1~1200회여야 합니다.');
  if(!Array.isArray(m.tiles)||m.tiles.length!==m.width*m.height||m.tiles.some(t=>t!==0&&t!==1))return [...e,'타일 배열이 올바르지 않습니다.'];
  if(!Array.isArray(m.plates)||m.plates.length>16||!Array.isArray(m.doors)||m.doors.length>16)return [...e,'발판과 문은 각각 최대 16개입니다.'];
  if(m.portals!==undefined&&(!Array.isArray(m.portals)||m.portals.length>8)||m.arrows!==undefined&&(!Array.isArray(m.arrows)||m.arrows.length>32))return [...e,'포털은 최대 8쌍, 방향 통로는 최대 32개입니다.'];
  for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if((!x||!y||x===m.width-1||y===m.height-1)&&m.tiles[y*m.width+x]!==1)e.push(`(${x},${y}): 가장자리는 벽이어야 합니다.`);
  if(m.shards!==undefined&&(!Array.isArray(m.shards)||m.shards.length>8))return [...e,'시간 조각은 최대 8개입니다.'];
  if(m.crates!==undefined&&(!Array.isArray(m.crates)||m.crates.length>8))return [...e,'시간 상자는 최대 8개입니다.'];
  if(m.fragile!==undefined&&(!Array.isArray(m.fragile)||m.fragile.length>64))return [...e,'붕괴 바닥은 최대 64칸입니다.'];
  if(m.stasis!==undefined&&(!Array.isArray(m.stasis)||m.stasis.length>8))return [...e,'재생 정지 장치는 최대 8개입니다.'];
  if(m.echoMode!==undefined&&m.echoMode!=='reverse')e.push('역재생 규칙을 확인하세요.');
  if(m.echoJump!==undefined&&typeof m.echoJump!=='boolean')e.push('잔상 도약 설정은 참/거짓이어야 합니다.');
  const occupied=new Set<string>(),ids=new Set<string>();
  for(const [name,p] of [['출발',m.spawn],['출구',m.goal],...m.plates.map(p=>['발판',p]),...m.doors.map(d=>['문',d]),...(m.portals??[]).flatMap(p=>[['포털',p?.a],['포털',p?.b]]),...(m.arrows??[]).map(a=>['방향 통로',a]),...(m.shards??[]).map(a=>['시간 조각',a]),...(m.stasis??[]).map(a=>['재생 정지 장치',a])] as [string,Cell][]){
    if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.y<1||p.x>=m.width-1||p.y>=m.height-1){e.push(`${name}: 내부 좌표를 확인하세요.`);continue;}
    const key=`${p.x},${p.y}`;if(occupied.has(key)||m.tiles[p.y*m.width+p.x])e.push(`${name} (${key}): 장치가 겹치거나 벽 위에 있습니다.`);occupied.add(key);
  }
  // Fragile flooring is a terrain overlay; plates/shards may be on top of it.
  for(const [name,cells] of [['붕괴 바닥',m.fragile??[]],['시간 상자',m.crates??[]]] as const){const seen=new Set<string>();for(const p of cells){
   if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.y<1||p.x>=m.width-1||p.y>=m.height-1){e.push(`${name}: 내부 좌표를 확인하세요.`);continue;}
   const key=`${p.x},${p.y}`;
   if(seen.has(key)||m.tiles[p.y*m.width+p.x]||name==='시간 상자'&&occupied.has(key)&&!m.plates.some(a=>equal(a,p)))e.push(`${name} (${key}): 겹침 또는 벽 위 배치를 확인하세요.`);seen.add(key);
  }}
  for(const p of m.stasis??[])if(!p||![1,2,3].includes(p.ghost)||p.ghost>m.maxGhosts)e.push('정지할 과거 번호는 기록 한도 안에서 1~3으로 선택하세요.');
  for(const p of [...m.plates,...m.doors]){if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,40}$/.test(p.id)||ids.has(p.id))e.push('장치 ID가 잘못되었거나 중복됩니다.');if(p)ids.add(p.id);}
  for(const p of m.plates){if(p?.kind!==undefined&&!['weight','echo','present','resonance','toggle','charge','solo'].includes(p.kind))e.push('발판 종류가 잘못되었습니다.');if(p?.minActors!==undefined&&(p.kind!=='resonance'||![2,3].includes(p.minActors)))e.push('공명 발판은 2명 또는 3명으로 설정하세요.');}
  for(const p of m.plates)if(p?.chargeTicks!==undefined&&(p.kind!=='charge'||!Number.isInteger(p.chargeTicks)||p.chargeTicks<2||p.chargeTicks>50))e.push('충전 발판은 2~50tick으로 설정하세요.');
  for(const d of m.doors)if(d?.inverted!==undefined&&typeof d.inverted!=='boolean')e.push('반전 문 설정은 참/거짓이어야 합니다.');
  for(const p of m.portals??[]){if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,40}$/.test(p.id)||ids.has(p.id))e.push('포털 ID가 잘못되었거나 중복됩니다.');if(p)ids.add(p.id);}
  for(const a of m.arrows??[])if(!a||!['U','D','L','R'].includes(a.direction))e.push('방향 통로의 방향이 잘못되었습니다.');
  let links=0;
  for(const d of m.doors){if(!d)continue;if(!['OR','AND'].includes(d.mode)||!Array.isArray(d.plateIds)||!d.plateIds.length||d.plateIds.some(id=>!m.plates.some(p=>p?.id===id))||new Set(d.plateIds).size!==d.plateIds.length)e.push(`문 ${d.id}: 연결할 발판과 OR/AND를 확인하세요.`);links+=Array.isArray(d.plateIds)?d.plateIds.length:0;}
  if(links>64)e.push('연결은 최대 64개입니다.');
  for(const d of m.doors){const p=d?.pulse;if(p!==undefined&&(!p||!Number.isInteger(p.period)||p.period<4||p.period>100||!Number.isInteger(p.openTicks)||p.openTicks<1||p.openTicks>=p.period||!Number.isInteger(p.offset)||p.offset<0||p.offset>=p.period))e.push('주기 문은 4~100tick 주기와 유효한 열림 시간을 지정하세요.');}
  return [...new Set(e)];
}
function devices(m:Stage,current:Cell,echoes:Cell[],tick:number,previous?:State,crates:Cell[]=[]){
  const actors=[current,...echoes],switches:Record<string,boolean>={},switchOccupied:Record<string,boolean>={};
  for(const p of m.plates.filter(p=>p.kind==='toggle')){const occupied=actors.some(c=>equal(p,c));switchOccupied[p.id]=occupied;const was=previous?.switches?.[p.id]??false;switches[p.id]=occupied&&!previous?.switchOccupied?.[p.id]?!was:was;}
  const charges=Object.fromEntries(m.plates.filter(p=>p.kind==='charge').map(p=>[p.id,actors.some(c=>equal(p,c))?Math.min(p.chargeTicks??10,(previous?.charges?.[p.id]??0)+1):0]));
  const plates=Object.fromEntries(m.plates.map(p=>[p.id,p.kind==='charge'?charges[p.id]>=(p.chargeTicks??10):p.kind==='solo'?actors.filter(c=>equal(p,c)).length===1:p.kind==='toggle'?switches[p.id]:p.kind==='resonance'?actors.filter(c=>equal(p,c)).length>=(p.minActors??2):p.kind==='echo'?echoes.some(c=>equal(p,c)):p.kind==='present'?equal(p,current):[...actors,...crates].some(c=>equal(p,c))]));
  const doors=Object.fromEntries(m.doors.map(d=>{const signal=d.mode==='AND'?d.plateIds.every(id=>plates[id]):d.plateIds.some(id=>plates[id]);return [d.id,(d.inverted?!signal:signal)&&(!d.pulse||(tick+d.pulse.offset)%d.pulse.period<d.pulse.openTicks)];}));
  return {plates,doors,...(Object.keys(charges).length?{charges}:{}),...(Object.keys(switches).length?{switches,switchOccupied}:{})};
}
export function echoPositions(m:Stage,s:Pick<State,'ghosts'|'tick'|'echoTicks'>):Cell[]{return s.ghosts.map((g,i)=>g.cells[m.echoMode==='reverse'?Math.max(0,g.originalTicks-(s.echoTicks?.[i]??s.tick)):Math.min(LIMIT,s.echoTicks?.[i]??s.tick)]);}
export function frozenEcho(m:Stage,s:Pick<State,'current'>,i:number){return !!m.stasis?.some(p=>p.ghost===i+1&&equal(p,s.current));}
function openFloor(m:Stage,s:State,p:Cell){return p.x>=0&&p.y>=0&&p.x<m.width&&p.y<m.height&&!m.tiles[p.y*m.width+p.x]&&!m.fragile?.some((f,i)=>equal(f,p)&&s.broken?.includes(i));}
export function canEchoJump(m:Stage,s:State,i:number){const p=echoPositions(m,s)[i];return !!(m.echoJump&&!s.jumpUsed&&p&&!equal(p,s.current)&&openFloor(m,s,p)&&!s.crates?.some(c=>equal(c,p))&&!m.arrows?.some(a=>equal(a,p))&&!m.doors.some(d=>equal(d,p)&&!s.doors[d.id]));}
export function initial(m:Stage,ghosts:RecordLoop[]=[]):State {
 const movesUsed=m.moveLimit===undefined?undefined:recordedMoves(ghosts),crates=m.crates?.length?m.crates.map(c=>({...c})):undefined;
 return {tick:0,current:{...m.spawn},ghosts,inputPrefix:[],trajectory:[{...m.spawn}],...(movesUsed===undefined?{}:{movesUsed}),...(m.shards?.length?{collected:[]}:{}),...(crates?{crates}:{}),...(m.fragile?.length?{broken:[]}:{}),...(m.stasis?.length?{echoTicks:ghosts.map(()=>0)}:{}),...(m.echoJump?{jumpUsed:false}:{}),...devices(m,m.spawn,echoPositions(m,{ghosts,tick:0}),0,undefined,crates),outcome:movesUsed!==undefined&&movesUsed>=m.moveLimit!?'OUT_OF_MOVES':'RUNNING'};
}
export function step(m:Stage,s:State,input:Move):State {
  if(s.outcome!=='RUNNING')return s;
  if(!['U','D','L','R','.','J1','J2','J3'].includes(input)||input.startsWith('J')&&!m.echoJump)throw new Error('잘못된 이동 입력');
  const jumping=input.startsWith('J'),delta={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],'.':[0,0],J1:[0,0],J2:[0,0],J3:[0,0]}[input];
  const dest={x:s.current.x+delta[0],y:s.current.y+delta[1]};
  const door=m.doors.find(d=>equal(d,dest));
  const arrow=m.arrows?.find(a=>equal(a,dest));
  let valid=!jumping&&openFloor(m,s,dest)&&(!door||s.doors[door.id])&&(!arrow||arrow.direction===input),crates=s.crates;
  const box=crates?.findIndex(c=>equal(c,dest))??-1;
  if(input!=='.'&&valid&&box>=0){const push={x:dest.x+delta[0],y:dest.y+delta[1]},pushDoor=m.doors.find(d=>equal(d,push)),pushArrow=m.arrows?.find(a=>equal(a,push));
   valid=openFloor(m,s,push)&&!crates!.some(c=>equal(c,push))&&(!pushDoor||s.doors[pushDoor.id])&&(!pushArrow||pushArrow.direction===input)&&!m.portals?.some(p=>equal(p.a,push)||equal(p.b,push));
   if(valid)crates=crates!.map((c,i)=>i===box?push:c);
  }
  let current=input==='.'||!valid?s.current:dest,jumpUsed=s.jumpUsed;const tick=s.tick+1;
  if(jumping&&canEchoJump(m,s,+input[1]-1)){current=echoPositions(m,s)[+input[1]-1];jumpUsed=true;}
  if(!jumping&&input!=='.'&&valid){const portal=m.portals?.find(p=>equal(p.a,dest)||equal(p.b,dest));if(portal){const exit=equal(portal.a,dest)?portal.b:portal.a;current=openFloor(m,s,exit)&&!crates?.some(c=>equal(c,exit))?exit:s.current;}}
  const moved=!equal(current,s.current),broken=m.fragile?.length?[...new Set([...(s.broken??[]),...m.fragile.flatMap((p,i)=>moved&&equal(p,s.current)?[i]:[])])].sort((a,b)=>a-b):undefined;
  const echoTicks=m.stasis?.length?s.ghosts.map((g,i)=>Math.min(m.echoMode==='reverse'?g.originalTicks:LIMIT,(s.echoTicks?.[i]??s.tick)+Number(!frozenEcho(m,s,i)))):undefined;
  const movesUsed=m.moveLimit===undefined?undefined:(s.movesUsed??0)+Number(!equal(current,s.current));
  const collected=m.shards?.length?[...new Set([...(s.collected??[]),...m.shards.flatMap((p,i)=>equal(p,current)?[i]:[])])].sort((a,b)=>a-b):undefined;
  return {...s,...(movesUsed===undefined?{}:{movesUsed}),...(collected?{collected}:{}),...(crates?{crates}:{}),...(broken?{broken}:{}),...(echoTicks?{echoTicks}:{}),...(m.echoJump?{jumpUsed}:{}),tick,current,inputPrefix:[...s.inputPrefix,input],trajectory:[...s.trajectory,current],...devices(m,current,echoPositions(m,{ghosts:s.ghosts,tick,echoTicks}),tick,s,crates),outcome:equal(current,m.goal)&&(!m.shards?.length||collected?.length===m.shards.length)?'WON':movesUsed!==undefined&&movesUsed>=m.moveLimit!?'OUT_OF_MOVES':tick===LIMIT?'TIMEOUT':'RUNNING'};
}
export function commit(m:Stage,s:State):RecordLoop {
  if(s.tick<1)throw new Error('1tick 이상 이동하거나 기다린 후 기록할 수 있습니다.');
  if(s.ghosts.length>=m.maxGhosts)throw new Error('과거 기록 한도에 도달했습니다. 기록을 삭제하거나 다시 시도하세요.');
  if(s.outcome==='WON')throw new Error('완료된 반복은 과거 기록으로 확정할 수 없습니다.');
  if(s.outcome==='OUT_OF_MOVES')throw new Error('이동 횟수를 모두 사용했습니다. 되돌리거나 다시 시작하세요.');
  const cells=[...s.trajectory,...Array.from({length:LIMIT-s.tick},()=>({...s.current}))];
  const parentChecksum=s.ghosts.at(-1)?.checksum??hash(m);
  const record={originalTicks:s.tick,inputPrefix:s.inputPrefix,cells,parentChecksum};return {...record,checksum:hash(record)};
}
export function replay(m:Stage,prefix:Move[],ghosts:RecordLoop[]=[]):State {
  if(!Array.isArray(prefix)||prefix.length>LIMIT)throw new Error('입력 길이는 최대 300tick입니다.');
  let s=initial(m,ghosts);for(const move of prefix){if(s.outcome!=='RUNNING')throw new Error('종료 이후 입력이 있습니다.');s=step(m,s,move);}return s;
}
export function buildChain(m:Stage,prefixes:Move[][]):RecordLoop[]{
  if(!Array.isArray(prefixes)||prefixes.length>m.maxGhosts)throw new Error('기록 수가 한도를 초과했습니다.');
  const records:RecordLoop[]=[];for(const p of prefixes)records.push(commit(m,replay(m,p,records)));return records;
}
export function solution(m:Stage,s:State):Solution{return {engineVersion:ENGINE,stageChecksum:hash(m),committedLoops:s.ghosts.map(g=>g.inputPrefix),finalLoop:s.inputPrefix};}
export function verifySolution(m:Stage,v:Solution):State {
  if(validateStage(m).length)throw new Error('맵 구조 오류');
  if(v.engineVersion!==ENGINE||v.stageChecksum!==hash(m))throw new Error('맵 또는 엔진 버전이 다릅니다.');
  const state=replay(m,v.finalLoop,buildChain(m,v.committedLoops));if(state.outcome!=='WON')throw new Error('출구에 도달하지 못한 해답입니다.');return state;
}
export function saveState(m:Stage,s:State){return {stage:m,solution:solution(m,s),checksum:hash(s),savedAt:new Date().toISOString()};}
export function restoreState(value:unknown):{stage:Stage;state:State}{
  const v=value as ReturnType<typeof saveState>;if(!v||validateStage(v.stage).length)throw new Error('저장 맵을 읽을 수 없습니다.');
  if(v.solution.engineVersion!==ENGINE||v.solution.stageChecksum!==hash(v.stage))throw new Error('저장 버전이 다릅니다.');
  const state=replay(v.stage,v.solution.finalLoop,buildChain(v.stage,v.solution.committedLoops));
  if(hash(state)!==v.checksum)throw new Error('저장 기록 검증에 실패했습니다. 원본을 내보낸 후 새로 시작하세요.');return {stage:v.stage,state};
}
export function inputDirection(held:Move[],queued:Move|null):Move {
  if((held.includes('U')&&held.includes('D'))||(held.includes('L')&&held.includes('R')))return '.';
  return held.at(-1)??queued??'.';
}
export function frameTicks(delta:number,accumulator:number):{ticks:number;accumulator:number;pause:boolean}{
  if(delta>=500)return {ticks:0,accumulator:0,pause:true};
  const total=accumulator+Math.max(0,delta),ticks=Math.min(3,Math.floor(total/100));return {ticks,accumulator:total-ticks*100,pause:false};
}

// Replay is the source of truth: rewind also restores doors, switches, charge and collectibles.
export function rewind(m:Stage,s:State):State {
 if(s.tick>0)return replay(m,s.inputPrefix.slice(0,-1),s.ghosts);
 const last=s.ghosts.at(-1);
 return last?replay(m,last.inputPrefix,s.ghosts.slice(0,-1)):s;
}
