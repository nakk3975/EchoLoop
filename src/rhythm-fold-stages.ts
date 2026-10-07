import {fromRows} from './stage-factory.ts';
import type {Stage,Move,Cell} from './engine.ts';

export type RhythmFoldPuzzle={stage:Stage;records:(Cell|Move[])[];idea:string};
const puzzles:RhythmFoldPuzzle[]=[];
const wait=(ticks:number):Move[]=>Array<Move>(ticks).fill('.');
function add(stage:Stage,records:(Cell|Move[])[],idea:string){puzzles.push({stage,records,idea});}

// Two short rooms, two phases, and a safe landing between them.
let m=fromRows('fracture-21','두 박동의 릴레이','한 발판이 두 문을 엽니다. 두 문은 서로 다른 박자로 움직입니다.','A에 잔상을 남기세요. 첫 문을 건넌 뒤 가운데 방에서 다음 문의 박자를 기다립니다.',['###########','#..A#..#..#','#...#..b.G#','#S..a..#..#','#...#..#..#','#...#..#..#','###########'],1);
m.doors.sort((a,b)=>a.id.localeCompare(b.id));
m.plates[0].kind='echo';m.doors[1].plateIds=['plate-a'];
m.doors[0].pulse={period:16,openTicks:4,offset:0};m.doors[1].pulse={period:16,openTicks:4,offset:8};
add(m,[m.plates[0]],'서로 다른 문 주기 사이의 대피 공간');

m=fromRows('fracture-22','떠나는 순간의 문','첫 문은 잔상이 있어야, 두 번째 문은 떠나야 열립니다. 둘 다 박자가 있습니다.','A에 올라가 약 2초 머물고 내려오는 행동까지 기록하세요. 현재는 첫 문을 먼저 건너고, 잔상이 떠난 뒤 다음 박자를 기다립니다.',['#########','#.A.#.#.#','#...#.#G#','#S..a.b.#','#...#.#.#','#...#.#.#','#########'],1);
m.plates[0].kind='echo';m.doors[1].plateIds=['plate-a'];m.doors[1].inverted=true;
m.doors[0].pulse={period:12,openTicks:4,offset:0};m.doors[1].pulse={period:12,openTicks:4,offset:6};
add(m,[['U','U','R',...wait(18),'D']],'대기하는 기록만으로는 두 문을 통과할 수 없음');

m=fromRows('fracture-23','지금만 잡을 수 있는 박자','A는 과거만, B는 현재만 누를 수 있습니다. B에서 박자를 맞추고 떠나세요.','A에는 잔상을 남깁니다. 현재는 B 위에서 첫 문의 박자를 기다려야 합니다. B에서 떠나면 두 번째 반전 문의 조건이 성립합니다.',['#########','#.A.#.#G#','#...#.b.#','#S.Ba.#.#','#...#.#.#','#...#.#.#','#########'],1);
m.doors.sort((a,b)=>a.id.localeCompare(b.id));
m.plates[0].kind='echo';m.plates[1].kind='present';m.doors[0].mode='AND';m.doors[0].plateIds=['plate-a','plate-b'];m.doors[1].inverted=true;
m.doors[0].pulse={period:14,openTicks:3,offset:5};m.doors[1].pulse={period:14,openTicks:3,offset:12};
add(m,[m.plates[0]],'현재의 점유와 이탈을 박동에 맞춰 사용');

m=fromRows('fracture-24','둘이 열고 하나가 떠나고','첫 문에는 두 잔상이 필요합니다. 다음 문에는 B의 빈자리가 필요합니다.','첫 잔상은 A에 남깁니다. 두 번째 잔상은 B에 약 2.5초 머물고 떠나게 기록하세요. 첫 문을 건넌 뒤 B의 이탈과 다음 박자를 기다립니다.',['###########','#.A.#..#..#','#...#..#..#','#S..a..#..#','#...#..b.G#','#.B.#..#..#','###########'],2);
m.plates.forEach(p=>p.kind='echo');m.doors[0].mode='AND';m.doors[0].plateIds=['plate-a','plate-b'];m.doors[1].inverted=true;
m.doors[0].pulse={period:20,openTicks:5,offset:0};m.doors[1].pulse={period:20,openTicks:5,offset:10};
add(m,[m.plates[0],['D','D','R',...wait(23),'U']],'두 기록의 역할과 ON/OFF 창을 분리');

m=fromRows('fracture-25','박동의 지휘자','한 잔상은 A를 지키고, 다른 잔상은 B를 켰다가 다시 끕니다. 현재는 C의 박자를 맡습니다.','A에 첫 기록을 남깁니다. 다음 나는 C에서 첫 박자를 기다려 건넌 뒤 B를 켜고 약 1.2초 후 내려왔다 다시 밟아 끄세요. 마지막 현재는 C에 서서 두 기록이 만든 순서를 따라갑니다.',['###########','#.A.#B#.#.#','#...#.#.#G#','#S.Ca.b.c.#','#...#.#.#.#','#...#.#.#.#','###########'],2);
m.plates[0].kind='echo';m.plates[1].kind='toggle';m.plates[2].kind='present';m.doors[0].mode='AND';m.doors[0].plateIds=['plate-a','plate-c'];m.doors[2].plateIds=['plate-b'];m.doors[2].inverted=true;
m.doors[0].pulse={period:12,openTicks:4,offset:0};m.doors[2].pulse={period:16,openTicks:5,offset:3};
add(m,[m.plates[0],['R','R',...wait(10),'R','R','U','U',...wait(12),'D','U','D']],'과거의 원격 반전과 현재 전용 발판의 합주');

// Disconnected pockets make portal choice and the return trip necessary.
m=fromRows('fracture-26','같은 출발, 다른 도착','포털 1은 발판으로, 포털 2는 출구 방으로 갑니다. 두 내가 서로 다른 길을 택해야 합니다.','첫 나는 위쪽 포털 1을 타고 A에서 기록합니다. 다음 나는 아래쪽 포털 2로 출구 방에 가세요. 현재만으로는 A를 누를 수 없습니다.',['###########','#...##....#','#...##....#','#...##....#','#.S.#######','#...##..#G#','#...##..a.#','#...##..#.#','###########'],1);
m.plates=[{id:'a',x:8,y:2,kind:'echo'}];m.doors[0].plateIds=['a'];m.portals=[{id:'memory-fold',a:{x:2,y:2},b:{x:6,y:2}},{id:'exit-fold',a:{x:2,y:6},b:{x:6,y:6}}];
add(m,[m.plates[0]],'같은 출발점에서 기록과 현재의 경로 선택');

m=fromRows('fracture-27','포털은 돌아오는 길','스위치만 켜고 저편에 남으면 부족합니다. 돌아온 과거가 합류 상대가 됩니다.','포털 1로 A를 켜고 같은 포털로 돌아오세요. 열린 첫 문을 지나 B에서 기록합니다. 현재는 과거가 A를 켜게 두고 B에 합류해 박동 문을 건넙니다.',['###########','#...##....#','#...##....#','#...#######','#...#..#..#','#S..a.Bb.G#','#...#..#..#','#...#..#..#','###########'],1);
m.plates.unshift({id:'a',x:8,y:1,kind:'toggle'});m.plates[1].kind='resonance';m.doors[0].plateIds=['a'];m.doors[1].pulse={period:12,openTicks:4,offset:3};
m.portals=[{id:'return-fold',a:{x:2,y:2},b:{x:6,y:1}}];
// The record must visit the remote switch before returning to B.
add(m,[['U','U','U','R','R','R','L','L','D','D','D','R','R','R','R']],'왕복한 기록이 원격 스위치와 공명 상대를 겸함');

m=fromRows('fracture-28','저편으로 옮겨 가는 신호','한 잔상이 A에서 기다렸다가 포털 2로 B에 갑니다. 현재는 도착과 이탈을 모두 이용합니다.','포털 1로 A에 가 약 1.8초 머문 뒤 포털 2를 타고 B에서 기록하세요. 현재는 A의 박동 문, A가 비어야 열리는 문, B의 문 순서로 건넙니다.',['#############','#...#...#...#','#...#...#...#','#...#...#...#','#...#########','#...#..#.#..#','#S..a..b.c.G#','#...#..#.#..#','#############'],1);
m.plates=[{id:'a',x:6,y:1,kind:'echo'},{id:'b',x:10,y:1,kind:'echo'}];m.doors[0].plateIds=['a'];m.doors[0].pulse={period:12,openTicks:4,offset:4};m.doors[1].plateIds=['a'];m.doors[1].inverted=true;m.doors[2].plateIds=['b'];
m.portals=[{id:'first-fold',a:{x:2,y:2},b:{x:5,y:2}},{id:'signal-fold',a:{x:7,y:2},b:{x:9,y:2}}];
add(m,[['U','U','U','R','U','U','R',...wait(18),'D','R','U','R']],'한 기록이 두 고립된 방 사이로 신호를 전달');

m=fromRows('fracture-29','접힌 곳의 합류','첫 잔상은 입구를 열고, 두 번째 잔상은 포털 너머에서 현재를 기다립니다.','포털 1로 A에 첫 기록을 남깁니다. 다음 나는 첫 문을 지나 포털 2로 B에 가서 기록합니다. 마지막 현재는 B에 합류해 박동 문을 건너고 포털 3으로 출구에 갑니다.',['#############','#...#..#.####','#...#..b.####','#...#..#.####','#############','#...#...#...#','#S..a...#..G#','#...#...#...#','#############'],2);
m.doors.sort((a,b)=>a.id.localeCompare(b.id));
m.plates=[{id:'a',x:1,y:2,kind:'echo'},{id:'b',x:6,y:2,kind:'resonance'}];m.doors[0].plateIds=['a'];m.doors[1].plateIds=['b'];m.doors[1].pulse={period:14,openTicks:4,offset:4};
m.portals=[{id:'memory-fold',a:{x:2,y:5},b:{x:2,y:2}},{id:'meeting-fold',a:{x:6,y:5},b:{x:5,y:2}},{id:'home-fold',a:{x:8,y:2},b:{x:9,y:6}}];
add(m,[m.plates[0],m.plates[1]],'세 포털과 두 기록이 서로 다른 의무를 가짐');

m=fromRows('fracture-30','공간의 매듭','왕복하는 과거, 저편에서 떠나는 과거, 그리고 현재의 합류. 세 경로를 하나의 순서로 묶으세요.','첫 나는 포털 1로 A를 켜고 돌아와 B에서 기록합니다. 다음 나는 B에 합류해 첫 박동 문을 건너고 포털 2로 C에 가 약 1.6초 머문 뒤 떠나는 기록을 만듭니다. 현재는 B에 합류한 뒤 C의 박동 문과 포털 3을 지나고, C가 비면 마지막 문을 건넙니다.',['#############','#...#..#.####','#...#..b.####','#...#..#.####','#############','#...#...#.#G#','#S.Ba...#.c.#','#...#...#.#.#','#############'],2);
m.doors.sort((a,b)=>a.id.localeCompare(b.id));
m.plates.unshift({id:'a',x:1,y:2,kind:'toggle'});m.plates[1].kind='resonance';m.plates.push({id:'c',x:6,y:1,kind:'echo'});
m.doors[0].mode='AND';m.doors[0].plateIds=['a','plate-b'];m.doors[0].pulse={period:14,openTicks:4,offset:0};m.doors[1].plateIds=['c'];m.doors[1].pulse={period:12,openTicks:4,offset:2};m.doors[2].plateIds=['c'];m.doors[2].inverted=true;
m.portals=[{id:'return-fold',a:{x:2,y:5},b:{x:2,y:2}},{id:'timing-fold',a:{x:6,y:5},b:{x:5,y:2}},{id:'exit-fold',a:{x:8,y:2},b:{x:9,y:6}}];
add(m,[['U','R','L','R','D','R'],['R','R',...wait(12),'R','R','U','R','U','R',...wait(16),'D','L']],'왕복 스위치·공명·신호 이탈·엇갈린 박동·포털 연쇄');

export const rhythmFoldPuzzles=puzzles;
