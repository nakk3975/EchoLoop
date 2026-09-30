import {fromRows} from './stage-factory.ts';
import type {Stage,Cell,Move,Plate} from './engine.ts';
export type AdvancedPuzzle={stage:Stage;records:Cell[];idea:string};
type Spec={title:string;idea:string;family:'charge'|'solo'|'relay';b?:Plate['kind'];charge?:number;pulse?:number;shards?:number;portal?:boolean;arrow?:boolean;triple?:boolean;flip?:boolean};
// Each specification changes the cooperative obligation, route, or timing constraint.
const specs:Spec[]=[
 {title:'기다림의 밀도',idea:'충전은 서 있는 시간이 쌓여야 켜집니다. 과거에게 충전을 맡기세요.',family:'charge',b:'present',charge:8},
 {title:'충전된 순간에',idea:'현재가 두 번째 충전 발판을 채운 뒤 문으로 옮겨갑니다.',family:'charge',b:'charge',charge:12},
 {title:'혼자는 충분하다',idea:'단독 발판에 둘이 서면 꺼집니다. 합류해서 첫 반전 문을 열고 헤어져 다음 문을 여세요.',family:'solo'},
 {title:'겹치면 사라지는 빛',idea:'단독 발판의 반전 신호와 박동이 겹치는 순간을 기다리세요.',family:'solo',pulse:16},
 {title:'충전과 합류',idea:'한 과거는 충전하고 다른 과거는 문 앞에서 합류를 기다립니다.',family:'charge',b:'resonance',charge:14},
 {title:'돌아와야 할 이유',idea:'시간 조각을 전부 모아야 출구가 반응합니다. 충전은 과거에게 맡기세요.',family:'charge',b:'present',shards:1,charge:10},
 {title:'기억은 가져갈 수 없다',idea:'과거가 지나간 조각은 수집되지 않습니다. 현재가 직접 두 조각을 모으세요.',family:'charge',b:'toggle',shards:2,charge:12},
 {title:'접힌 곳의 조각',idea:'포털은 지름길이지만 조각까지 대신 모아주지는 않습니다.',family:'charge',b:'charge',shards:2,portal:true,charge:16},
 {title:'혼자 남는 수집가',idea:'겹쳐서 반전 문을 열고 홀로 돌아다니며 조각을 모으세요.',family:'solo',shards:3},
 {title:'출구를 지나서',idea:'출구 뒤의 조각까지 챙긴 뒤 돌아와야 합니다. 첫 도착으로 끝나지 않습니다.',family:'charge',b:'resonance',shards:3,charge:18},
 {title:'꺼짐의 박자',idea:'단독 발판이 꺼지는 순간에도 박동 문은 자기 박자를 따릅니다.',family:'solo',pulse:12,shards:1},
 {title:'충전된 메아리',idea:'과거의 충전과 현재의 단독 점유를 이어 붙이세요.',family:'charge',b:'solo',charge:20,arrow:true,shards:1},
 {title:'스위치를 켜는 순서',idea:'충전을 맡긴 뒤 스위치를 켜세요. 수집 도중 다시 밟으면 길이 닫힙니다.',family:'charge',b:'toggle',charge:16,shards:3,pulse:20},
 {title:'둘만의 박동',idea:'공명 상태를 유지하며 두 번째 문의 박자를 기다려야 합니다.',family:'charge',b:'resonance',charge:20,pulse:16,shards:2},
 {title:'외로운 문지기',idea:'두 명이 만날 때와 한 명만 남을 때를 구분하고 조각을 회수하세요.',family:'solo',shards:3,pulse:20,portal:true},
 {title:'세 번째 임무',idea:'충전, 공명, 기억 스위치. 세 개의 문에 서로 다른 역할을 배분하세요.',family:'relay',charge:18,shards:1},
 {title:'접힌 협력',idea:'포털 뒤에서 충전을 끝내고 다음 기록은 공명 발판까지 보내세요.',family:'relay',charge:20,shards:2,portal:true},
 {title:'완충과 맥박',idea:'충전이 끝난 뒤에도 첫 문의 박자를 맞춰야 합니다.',family:'relay',charge:22,shards:2,pulse:16},
 {title:'되돌아오는 수집',idea:'세 구역의 조각을 회수하세요. 일방향 통로는 옆길로 돌아올 수 있습니다.',family:'relay',charge:20,shards:3,arrow:true},
 {title:'문 앞의 세 사람',idea:'공명 발판이 세 명을 요구합니다. 충전 담당을 포함해 기록 세 개를 계획하세요.',family:'relay',charge:24,shards:2,triple:true},
 {title:'두 번 켜는 문',idea:'마지막 스위치를 켜서 조각 방을 연 뒤 다시 꺼야 출구 문이 열립니다.',family:'relay',charge:20,shards:3,flip:true},
 {title:'홀로 남는 박자',idea:'반전 단독 발판, 포털, 세 조각, 박동을 한 경로에 묶으세요.',family:'solo',pulse:24,shards:3,portal:true,arrow:true},
 {title:'꺼지지 않게 이어가기',idea:'충전 담당은 자리를 지키고 세 명의 공명은 문 앞에서 완성하세요.',family:'relay',charge:28,triple:true,shards:3,pulse:20},
 {title:'갈라진 수집 경로',idea:'포털과 일방향 통로를 지나 조각을 회수한 뒤 마지막 스위치를 반전시키세요.',family:'relay',charge:24,shards:3,flip:true,portal:true,arrow:true},
 {title:'세 기록의 약속',idea:'과거 세 명의 도착 시간과 현재의 합류를 맞추세요.',family:'relay',charge:30,triple:true,shards:3,pulse:24,portal:true},
 {title:'마지막 방의 조건',idea:'수집 방은 스위치 ON, 출구는 OFF입니다. 문이 닫히기 전에 방에서 나오는 순서를 생각하세요.',family:'relay',charge:28,shards:3,flip:true,pulse:20},
 {title:'모든 나의 도착',idea:'세 명의 공명과 충전 담당을 분리하고 포털 너머 조각까지 돌아보세요.',family:'relay',charge:32,triple:true,shards:3,portal:true,arrow:true},
 {title:'빛을 모으고 지우고',idea:'조각을 모은 기억만 남기고 스위치는 꺼야 합니다. 충전과 박동은 과거가 유지합니다.',family:'relay',charge:30,shards:3,flip:true,pulse:24,portal:true},
 {title:'네 명의 한순간',idea:'현재와 세 과거가 서로 다른 역할을 합니다. 공명 후 수집, 마지막 반전을 완성하세요.',family:'relay',charge:34,triple:true,shards:3,flip:true,arrow:true},
 {title:'시간을 완성하는 순서',idea:'충전, 삼중 공명, 박동, 포털, 수집, 반전. 작은 방의 모든 조건을 순서대로 완성하세요.',family:'relay',charge:36,triple:true,shards:3,flip:true,pulse:24,portal:true,arrow:true},
];
function create(s:Spec,i:number):AdvancedPuzzle{
 const width=s.family==='relay'?15:11,height=9,parts=s.family==='relay'?[4,7,10]:[4,7];
 const rows=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>!x||!y||x===width-1||y===height-1||parts.includes(x)&&y!==4?'#':x===1&&y===4?'S':x===width-2&&y===4?'G':'.').join(''));
 const m=fromRows(`fracture-${51+i}`,s.title,s.idea,'',rows,s.family==='solo'?1:s.family==='relay'?(s.triple?3:2):s.b==='resonance'?2:1),records:Cell[]=[];
 const a:Plate={id:'a',x:s.family==='solo'?3:2,y:s.family==='solo'?4:2,kind:s.family==='solo'?'solo':'charge',...(s.family==='solo'?{}:{chargeTicks:s.charge??10})};m.plates=[a];records.push(a);
 m.doors=[{id:'a-door',x:4,y:4,mode:'AND',plateIds:['a'],...(s.family==='solo'?{inverted:true}:{})}];
 if(s.family==='solo')m.doors.push({id:'b-door',x:7,y:4,mode:'AND',plateIds:['a']});
 else{const b:Plate={id:'b',x:6,y:4,kind:s.family==='relay'?'resonance':s.b,...(s.b==='charge'?{chargeTicks:8+(i%3)*4}:{}),...(s.triple?{minActors:3}:{})};m.plates.push(b);m.doors.push({id:'b-door',x:7,y:4,mode:'AND',plateIds:['b']});if(b.kind==='resonance'){records.push(b);if(s.triple)records.push(b);}}
 if(s.family==='relay'){m.plates.push({id:'c',x:9,y:2,kind:'toggle'});m.doors.push({id:'c-door',x:10,y:4,mode:'AND',plateIds:['c'],...(s.flip?{inverted:true}:{})});}
 if(s.pulse)m.doors[s.family==='charge'?1:0].pulse={period:s.pulse,openTicks:6,offset:(i*3)%s.pulse};
 if(s.portal)m.portals=[{id:'fold',a:{x:1,y:6},b:{x:3,y:1}}];
 if(s.arrow)m.arrows=[{x:5,y:5,direction:'D'}];
 if(s.shards){m.shards=[{x:2,y:6}];if(s.shards>=2)m.shards.push({x:width-2,y:6});if(s.shards>=3)m.shards.push({x:s.family==='relay'?8:5,y:2});}
 if(s.flip){ // Third shard is in a side room that requires ON; the exit requires OFF.
  m.shards![2]={x:9,y:6};for(let x=8;x<=9;x++)m.tiles[5*width+x]=1;m.tiles[5*width+9]=0;
  m.doors.push({id:'collection-door',x:9,y:5,mode:'AND',plateIds:['c']});
 }
 // Offset gates create distinct approaches while keeping every room compact.
 if(s.family!=='solo'&&i>=5){const y=s.flip?3:i%2?3:5;m.tiles[4*width+7]=1;m.tiles[y*width+7]=0;m.doors[1].y=y;m.plates[1].y=y;}
 if(s.portal){for(let x=1;x<=3;x++)m.tiles[3*width+x]=1;if(s.family==='solo'&&m.shards)m.shards[0]={x:2,y:2};}
 m.hint=s.family==='solo'?'A에 과거를 남기고 현재가 겹치면 단독 조건이 꺼져 첫 문이 열립니다. 떠나면 다음 문이 열립니다. 조각은 현재만 모을 수 있습니다.':`첫 기록은 A에서 충전을 유지합니다. ${records.length>1?`다음 ${records.length-1}개 기록은 B에서 기다리게 하세요. 현재가 B에 합류합니다.`:'현재는 B를 직접 조작하세요.'}${s.flip?' C를 켜고 아래 조각 방에 들어갔다 나온 뒤, C를 다시 밟아 꺼 주세요.':''}${s.shards?' 모든 시간 조각을 직접 회수한 뒤 출구로 돌아오세요.':''}`;
 return {stage:m,records,idea:s.idea};
}
export const advancedPuzzles=specs.map(create);
