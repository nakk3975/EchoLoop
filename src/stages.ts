import {ENGINE,type Stage,type Move} from './engine.ts';
export function fromRows(id:string,title:string,description:string,hint:string,rows:string[],maxGhosts=3):Stage{
 const width=rows[0].length,m:Stage={id,title,description,hint,schemaVersion:1,engineVersion:ENGINE,width,height:rows.length,tickHz:10,loopTicks:300,maxGhosts,tiles:[],spawn:{x:1,y:1},goal:{x:width-2,y:rows.length-2},plates:[],doors:[]};
 rows.forEach((row,y)=>[...row].forEach((c,x)=>{m.tiles.push(c==='#'?1:0);if(c==='S')m.spawn={x,y};if(c==='G')m.goal={x,y};if('ABC'.includes(c))m.plates.push({id:`plate-${c.toLowerCase()}`,x,y});if('abc'.includes(c))m.doors.push({id:`door-${c}`,x,y,mode:'OR',plateIds:[`plate-${c}`]});}));return m;
}
export const stages:Stage[]=[
 fromRows('first-light','첫 번째 발자국','출구까지 걸어가세요. 시간은 첫 이동부터 흐릅니다.','방향키 또는 WASD로 이동하세요. 밝은 초록색 출구에 도착하면 됩니다.',['##########','#........#','#..###...#','#S.....G.#','#........#','#........#','##########'],0),
 fromRows('pressure','발판의 무게','발판을 밟으면 문이 열립니다. 다음 순간을 생각해 보세요.','발판 A를 밟은 다음 오른쪽으로 이동하세요. 문이 닫혀도 안에 있는 나는 안전하게 나갈 수 있습니다.',['##########','#...#....#','#...#....#','#S.Aa..G.#','#...#....#','#...#....#','##########'],0),
 fromRows('first-echo','기다리는 나','발판에 기록을 남기고, 다음 나는 문 너머로 향하세요.','첫 번째 나는 A 위에서 Enter로 기록합니다. 두 번째 나는 과거가 발판에 도착할 때까지 기다렸다가 문을 지나갑니다.',['##########','#...#....#','#.A.#....#','#...#....#','#S..a..G.#','#...#....#','##########'],1),
 fromRows('two-doors','두 개의 문, 세 명의 나','과거의 나에게 하나씩 역할을 맡겨 보세요.','첫 기록은 A에서, 다음 기록은 B에서 기다리게 하세요. 마지막 나는 두 문을 지나 출구로 갑니다.',['#############','#....#...#..#','#..A.#.B.#..#','#....#...#..#','#.S..a...b.G#','#....#...#..#','#....#...#..#','#....#...#..#','#############'],2),
 fromRows('together','같은 순간에','두 발판이 동시에 눌려야 마지막 문이 열립니다.','과거 1은 A, 과거 2는 B 위에서 기다리게 하세요. AND 문은 두 발판 모두 켜져 있어야 열립니다.',['#############','#......#....#','#..A...#....#','#......#....#','#.S....a..G.#','#......#....#','#..B...#....#','#......#....#','#############'],2)
];
stages[4].doors[0].plateIds=['plate-a','plate-b'];stages[4].doors[0].mode='AND';
export const referenceInputs:Move[][][]=[
 [['R','R','R','R','R','R']],
 [['R','R','R','R','R','R']],
 [['U','U','R'],['R','R','.','R','R','R','R']],
 [['U','U','R'],['R','R','.','R','R','R','U','U'],['R','R','.','R','R','R','R','.','R','R','R']],
 [['U','U','R'],['D','D','R'],['R','R','R','R','R','R','R','R']]
];
export function blankStage(width=13,height=9):Stage{return fromRows('local-'+crypto.randomUUID(),'이름 없는 실험','직접 만든 타임루프 퍼즐','발판과 문을 연결해 보세요.',Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>!x||!y||x===width-1||y===height-1?'#':x===2&&y===Math.floor(height/2)?'S':x===width-3&&y===Math.floor(height/2)?'G':'.').join('')));}
