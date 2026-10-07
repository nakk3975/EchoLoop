import type {Stage} from './engine.ts';
import {newMechanicPuzzles} from './new-mechanic-stages.ts';
// Authored challenge ranks: actor roles, state changes and timing, rather than corridor length.
// The five original tutorials are prerequisites; stable stage IDs never encode this order.
const tutorials=['first-light','pressure','first-echo','two-doors','together'];
const ranks:Record<number,number>={6:10,7:9,8:24,9:27,10:26,11:34,12:40,13:30,14:36,15:32,16:16,17:29,18:38,19:42,20:52,21:39,22:45,23:47,24:55,25:69,26:33,27:57,28:64,29:67,30:81,31:35,32:43,33:51,34:60,35:65,36:56,37:62,38:68,39:73,40:78,41:63,42:70,43:76,44:83,45:87,46:82,47:88,48:92,49:96,50:98,51:31,52:37,53:23,54:35,55:41,56:20,57:28,58:33,59:39,60:45,61:49,62:53,63:59,64:61,65:65,66:60,67:66,68:71,69:75,70:79,71:72,72:77,73:84,74:89,75:93,76:85,77:90,78:94,79:97,80:99};
const additions=Object.fromEntries(newMechanicPuzzles.map(p=>[p.stage.id,p.difficulty]));
export function difficultyRank(m:Stage){const tutorial=tutorials.indexOf(m.id);return tutorial>=0?tutorial+1:additions[m.id]??ranks[Number(m.id.replace('fracture-',''))]??100;}
export function difficultyLabel(m:Stage){const rank=difficultyRank(m);return rank<=5?'튜토리얼':rank<25?'초급':rank<50?'중급':rank<75?'고급':'최상급';}
export const chapterNames=['첫 번째 균열','작은 변화','낯선 발자국','혼자와 과거','시간의 쓰임','역할 나누기','겹치는 규칙','돌아오는 신호','합류의 조건','엇갈린 시계','인과의 연결','머무름의 설계','시간의 조율','여러 나의 협력','네 갈래 임무','사라지는 통로','복합 인과','정교한 순환','마지막 역설','시간의 결절'];
export const chapterDescriptions=[
 '이동, 발판, 기록과 합류를 익히는 다섯 기본 실험입니다.',
 '새 규칙은 짧은 방에서 하나씩 배웁니다. 무게와 발자국의 차이를 살펴보세요.',
 '기록의 끝과 공간의 연결을 이용해 현재가 떠날 길을 만듭니다.',
 '현재가 직접 해야 하는 일과 과거에게 맡길 일을 구분하세요.',
 '도약, 정지, 충전. 같은 위치라도 시간을 다루는 방식이 달라집니다.',
 '상자와 과거의 역할을 나누고 합류할 순간을 준비합니다.',
 '한 번의 동작이 두 조건을 바꿉니다. 다음 행동까지 생각하세요.',
 'ON과 OFF, 도착과 이탈을 서로 다른 신호로 사용합니다.',
 '함께 서는 인원과 각자의 경로를 맞춰 문을 엽니다.',
 '세계의 박자와 기록의 시계를 따로 계산합니다.',
 '두 기록의 임무와 장치 상태의 전환을 하나의 순서로 묶습니다.',
 '남아야 하는 기록과 떠나야 하는 기록을 설계하세요.',
 '포털, 박동, 정지를 조합해 신호가 필요한 시간을 확보합니다.',
 '여러 기록이 다른 장소에서 협력해야 현재의 길이 완성됩니다.',
 '조각 회수와 발판 조작, 시간차 신호를 함께 다룹니다.',
 '공간과 바닥이 바뀌어도 이어질 경로를 미리 준비합니다.',
 '각 기록이 맡을 역할과 현재가 지킬 조건을 분리하세요.',
 '돌아오는 경로까지 포함해 여러 장치의 순환을 설계합니다.',
 '세 기록과 여러 기믹을 조합하는 최상급 실험입니다.',
 '최상급 조합과 다섯 새 기믹을 함께 쓰는 마지막 결절입니다.'
];
