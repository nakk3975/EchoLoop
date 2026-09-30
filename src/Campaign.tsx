import {useState} from 'react';
import {stages} from './stages.ts';
import {Board} from './Board.tsx';
import type {Stage} from './engine.ts';
export const chapterNames=['첫 번째 균열','잔상의 숲','망각의 성소','실체의 경계','박동하는 시간','공간의 접힘','역행 금지','인과의 교차','붕괴 직전','마지막 역설'];
export const chapterDescriptions=['다섯 번의 작은 실험으로 시간을 다루는 법을 배웁니다.','멀어진 발판과 갈라진 길. 과거에게 하나씩 역할을 맡기세요.','현재는 아무리 밟아도 열리지 않습니다. 과거의 흔적만 남겨야 합니다.','잔상에게 맡길 수 없는 일. 이번에는 직접 문을 열어야 합니다.','발판만으로는 부족합니다. 시간의 박동에 맞춰 지나가세요.','멀리 떨어진 두 장소가 연결됩니다. 기록도 같은 공간을 건넙니다.','어느 쪽에서 들어오는지가 중요합니다. 돌아올 길까지 생각하세요.','세 개의 기록, 서로 다른 발판, 박동 문이 한 번에 얽힙니다.','포털 너머의 방향과 문이 열리는 순간을 함께 계산하세요.','모든 장치가 만납니다. 3명의 과거와 가장 깊은 미궁을 통과하세요.'];
export function Campaign({completed,onPlay}:{completed:string[];onPlay:(m:Stage)=>void}){
 const next=stages.findIndex(s=>!completed.includes(s.id));const [chapter,setChapter]=useState(Math.floor(Math.max(0,next)/5));
 const difficulty=chapter===0?'튜토리얼':chapter<3?'초급':chapter<6?'중급':chapter<9?'고급':'최상급';
 return <section className="campaign" aria-labelledby="campaign-title"><div className="campaign-heading"><div><span className="eyebrow">THE SHATTERED TIMELINE</span><h2 id="campaign-title">50개의 시간 균열</h2></div><span className="completion">{stages.filter(s=>completed.includes(s.id)).length} / {stages.length} 복원</span></div>
 <nav className="chapter-orbit" aria-label="챕터 선택">{chapterNames.map((name,i)=><button key={name} aria-pressed={chapter===i} className={chapter===i?'selected':''} onClick={()=>setChapter(i)}><span>{String(i+1).padStart(2,'0')}</span><small>{name}</small></button>)}</nav>
 <div className="chapter-intro"><span className="chapter-index">{String(chapter+1).padStart(2,'0')}</span><div><span className="eyebrow">CHAPTER / {difficulty}</span><h3>{chapterNames[chapter]}</h3><p>{chapterDescriptions[chapter]}</p></div><div className="chapter-switch"><button aria-label="이전 챕터" disabled={chapter===0} onClick={()=>setChapter(chapter-1)}>←</button><button aria-label="다음 챕터" disabled={chapter===9} onClick={()=>setChapter(chapter+1)}>→</button></div></div>
 <div className="constellation">{stages.slice(chapter*5,chapter*5+5).map((m,i)=><button key={m.id} className={'level-shard '+(completed.includes(m.id)?'completed':'')} onClick={()=>onPlay(m)}><span className="shard-number">{String(chapter*5+i+1).padStart(2,'0')}<small>{completed.includes(m.id)?'✓ 복원 완료':difficulty}</small></span><span className="shard-map"><Board stage={m}/></span><strong>{m.title}</strong><span className="shard-detail">{m.maxGhosts?`잔상 ${m.maxGhosts}명`:'혼자 걷기'} <i>↗</i></span></button>)}</div>
 <p className="campaign-note">모든 균열을 자유롭게 선택할 수 있어요. 처음이라면 01부터 시작하세요.</p></section>;
}
