import {fromRows} from './stage-factory.ts';
import type {Stage,Move,Cell} from './engine.ts';

// Authored small rooms: each one asks a different question about time, not distance.
function room(n:number,title:string,description:string,hint:string,width=9,ghosts=1):Stage{
 const rows=Array.from({length:7},(_,y)=>Array.from({length:width},(_,x)=>!x||!y||x===width-1||y===6||x===4&&y!==3?'#':x===1&&y===3?'S':x===width-2&&y===3?'G':'.').join(''));
 const m=fromRows(`fracture-${String(n).padStart(2,'0')}`,title,description,hint,rows,ghosts);
 m.plates=[{id:'a',x:3,y:3,kind:'resonance'}];m.doors=[{id:'gate-a',x:4,y:3,mode:'OR',plateIds:['a']}];return m;
}
function split(m:Stage,x:number,id:string,plateIds:string[],inverted=false){for(let y=1;y<6;y++)m.tiles[y*m.width+x]=y===3?0:1;m.doors.push({id,x,y:3,mode:'AND',plateIds,inverted});}
export type CompactPuzzle={stage:Stage;records:(Cell|Move[])[];idea:string};
const puzzles:CompactPuzzle[]=[];
function add(stage:Stage,records:(Cell|Move[])[],idea:string){puzzles.push({stage,records,idea});}
let m=room(6,'나와 나의 악수','혼자서는 반응하지 않는 발판. 같은 자리에 두 명이 필요합니다.','A에 도착해 기록하세요. 다음 나는 같은 A에 합류한 뒤 바로 문으로 이동합니다.');
add(m,[m.plates[0]],'같은 칸에서 과거와 현재가 합류');
m=room(7,'발판은 기억한다','한 번 밟으면 켜지고, 내려와도 켜져 있습니다.','스위치 A를 한 번 밟은 뒤 문으로 가세요. 모두 떠났다가 다시 밟으면 꺼집니다.',9,0);m.plates=[{id:'a',x:2,y:1,kind:'toggle'}];add(m,[],'자리 지키기 대신 상태 기억');
m=room(8,'떠나야 열리는 문','첫 문은 잔상이 있어야, 두 번째 문은 잔상이 없어야 열립니다.','A에 머물다가 내려오는 행동까지 기록하세요. 첫 문을 지난 현재는 잔상이 A를 떠날 때까지 기다립니다.');m.plates=[{id:'a',x:2,y:1,kind:'echo'}];split(m,6,'gate-not',['a'],true);add(m,[['U','U','R','.','.','.','D']],'마지막에 발판을 떠나는 과거');
m=room(9,'미래에 누르는 스위치','과거가 두 번째로 스위치를 누를 때, 문의 역할이 뒤집힙니다.','A를 밟고 잠깐 기다린 뒤 내려왔다가 다시 밟는 행동을 기록하세요. 현재는 두 문 사이에서 반전을 기다립니다.');m.plates=[{id:'a',x:2,y:1,kind:'toggle'}];split(m,6,'gate-not',['a'],true);add(m,[['U','U','R','.','.','.','D','.','U','D']],'과거에게 미래의 재조작을 예약');
m=room(10,'잠깐의 동행','합류해야 열리는 문과, 헤어져야 열리는 문.','A에 과거를 남기세요. 현재가 A에 합류하면 첫 문이 열리고, 현재가 떠나면 두 번째 반전 문이 열립니다.');split(m,6,'gate-not',['a'],true);add(m,[m.plates[0]],'같은 신호의 ON과 OFF를 연속 사용');
m=room(11,'나 없이 둘이','멀리 있는 공명 발판은 두 잔상에게 맡겨야 합니다.','A에서 두 번 기록하세요. 두 과거가 A를 유지하면 현재는 문으로 갈 수 있습니다.',9,2);m.plates[0]={id:'a',x:2,y:1,kind:'resonance'};add(m,[m.plates[0],m.plates[0]],'현재가 빠져도 남아 있어야 하는 두 존재');
m=room(12,'셋이 겹치는 순간','이번 발판에는 세 명이 동시에 서야 합니다.','A에 과거 두 명을 남기고 현재까지 합류하세요. 발판을 켠 직후 문으로 이동할 수 있습니다.',9,2);m.plates[0].minActors=3;add(m,[m.plates[0],m.plates[0]],'잔상 두 명과 현재의 삼중 공명');
m=fromRows('fracture-13','문 뒤의 스위치','문을 지난 뒤, 과거가 스위치를 다시 누르면 다음 길이 열립니다.','처음 스위치를 켠 뒤 내려왔다가 다시 누르는 기록을 만드세요. 현재는 첫 문을 지나 두 번째 문으로 향합니다.',['##########','#SA......#','#####a####','#........#','###b######','#.......G#','##########'],1);m.plates[0].kind='toggle';m.doors[1].plateIds=[m.plates[0].id];m.doors[1].inverted=true;add(m,[['R','.','.','.','.','.','L','R','L']],'현재가 돌아갈 수 없는 위치에서 원격 반전');
m=room(14,'길을 켜고 기다려','스위치를 켜러 갔던 과거가, 이번에는 나를 기다립니다.','첫 기록은 A를 켜고 첫 문을 지나 B까지 가세요. 현재는 과거가 A를 누르게 두고 B로 가서 합류합니다.',10,1);m.plates=[{id:'a',x:2,y:1,kind:'toggle'},{id:'b',x:6,y:3,kind:'resonance'}];split(m,7,'gate-b',['b']);add(m,[m.plates[1]],'한 기록이 스위치 조작과 합류 두 역할 수행');
m=room(15,'박자 맞춰 합류','둘이 모였다고 끝이 아닙니다. 문이 열리는 박자까지 기다리세요.','A에 과거를 남기고 현재가 합류하세요. 함께 선 채로 박동 문이 열릴 때 통과합니다.');m.doors[0].pulse={period:12,openTicks:4,offset:5};add(m,[m.plates[0]],'공명 유지와 박동 타이밍');
m=room(16,'접힌 방의 스위치','건너간 공간에서 스위치를 켜고, 열린 문으로 나가세요.','포털 1을 건너가면 A가 있습니다. A는 한 번 밟은 뒤 떠나도 켜져 있어요.',9,0);m.doors[0].x=6;for(let y=1;y<6;y++){m.tiles[y*m.width+4]=1;m.tiles[y*m.width+6]=y===3?0:1;}m.portals=[{id:'fold',a:{x:2,y:3},b:{x:5,y:1}}];m.plates=[{id:'a',x:5,y:2,kind:'toggle'}];add(m,[],'공간 이동과 스위치 기억');
m=room(17,'저편에 남긴 목소리','직접 밟을 수 없는 곳에 과거를 두고, 다른 길로 출구에 갑니다.','아래쪽 포털을 타고 위쪽 A에 기록하세요. 다음 나는 포털 대신 오른쪽 문으로 갑니다.');m.plates=[{id:'a',x:3,y:1,kind:'echo'}];for(let x=1;x<=3;x++)m.tiles[2*m.width+x]=1;m.portals=[{id:'fold',a:{x:2,y:4},b:{x:1,y:1}}];add(m,[m.plates[0]],'현재의 경로와 기록의 경로를 분리');
m=room(18,'열림과 닫힘 사이','잔상이 도착할 때 한 번, 떠날 때 한 번. 두 순간을 사용하세요.','A에 잠시 서 있다가 내려오는 기록을 만드세요. 첫 문은 박동까지 맞아야 열립니다. 두 번째는 A가 비었을 때 열립니다.');m.plates=[{id:'a',x:2,y:1,kind:'echo'}];m.doors[0].pulse={period:10,openTicks:5,offset:0};split(m,6,'gate-not',['a'],true);add(m,[['U','U','R','.','.','.','D']],'과거의 출발과 도착을 모두 신호로 사용');
m=room(19,'한 명은 떠나야 한다','두 잔상이 모이면 첫 문이, 한 명이 떠나면 두 번째 문이 열립니다.','한 과거는 A에 남기고, 다른 과거는 B에 잠시 서 있다가 떠나게 기록하세요.',9,2);m.plates=[{id:'a',x:2,y:1,kind:'echo'},{id:'b',x:2,y:5,kind:'echo'}];m.doors[0].mode='AND';m.doors[0].plateIds=['a','b'];split(m,6,'gate-not',['a','b'],true);add(m,[m.plates[0],['D','D','R','.','.','.','U']],'AND 조건을 성립시킨 뒤 일부러 해제');
m=room(20,'작은 방의 큰 역설','합류, 두 번의 스위치 조작, 그리고 세 개의 문. 길보다 순서가 중요합니다.','첫 과거는 A에서 기다립니다. 두 번째 나는 A에 합류해 건넌 뒤 B를 켰다가 잠시 후 다시 꺼 주세요. 마지막 현재는 두 과거가 만든 순간을 이용합니다.',11,2);m.plates.push({id:'b',x:5,y:1,kind:'toggle'});split(m,6,'gate-b',['b']);split(m,8,'gate-not',['b'],true);add(m,[m.plates[0],['R','R','R','R','U','U','.','.','.','.','.','D','U','D']],'한 명은 합류 상대, 다른 한 명은 시간차 조작자');
export const compactPuzzles=puzzles;
