import {useState,useRef,useEffect} from 'react';
import {stages} from './stages.ts';
import {Board} from './Board.tsx';
import type {Stage} from './engine.ts';
import {chapterNames,chapterDescriptions,difficultyLabel} from './campaign-difficulty.ts';
export {chapterNames} from './campaign-difficulty.ts';
export function Campaign({completed,onPlay,focusStageId,onResume}:{completed:string[];onPlay:(m:Stage)=>void;focusStageId?:string;onResume?:()=>void}){
 const saved=stages.findIndex(s=>s.id===focusStageId),next=stages.findIndex(s=>!completed.includes(s.id)),preferred=Math.floor(Math.max(0,saved>=0?saved:next)/5);
 const [chapter,setChapter]=useState(preferred),chosen=useRef(false),orbit=useRef<HTMLElement>(null);
 const choose=(value:number)=>{chosen.current=true;setChapter(value);};
 useEffect(()=>{if(!chosen.current)setChapter(preferred);},[preferred]);
 useEffect(()=>{const nav=orbit.current,button=nav?.querySelector<HTMLElement>('[aria-pressed=true]');if(nav&&button){const n=nav.getBoundingClientRect(),b=button.getBoundingClientRect();nav.scrollLeft+=b.left+b.width/2-n.left-nav.clientWidth/2;}},[chapter]);
 const difficulty=difficultyLabel(stages[chapter*5]);
 return <section className="campaign" aria-labelledby="campaign-title"><div className="campaign-heading"><div><span className="eyebrow">THE SHATTERED TIMELINE</span><h2 id="campaign-title">{stages.length}개의 시간 균열</h2></div><span className="completion">{stages.filter(s=>completed.includes(s.id)).length} / {stages.length} 복원</span></div>
 <nav ref={orbit} className="chapter-orbit" aria-label="챕터 선택">{chapterNames.map((name,i)=><button key={name} aria-pressed={chapter===i} className={chapter===i?'selected':''} onClick={()=>choose(i)}><span>{String(i+1).padStart(2,'0')}</span><small>{name}</small></button>)}</nav>
 <div className="chapter-intro"><span className="chapter-index">{String(chapter+1).padStart(2,'0')}</span><div><span className="eyebrow">CHAPTER / {difficulty}</span><h3>{chapterNames[chapter]}</h3><p>{chapterDescriptions[chapter]}</p></div><div className="chapter-switch"><button aria-label="이전 챕터" disabled={chapter===0} onClick={()=>choose(chapter-1)}>←</button><button aria-label="다음 챕터" disabled={chapter===chapterNames.length-1} onClick={()=>choose(chapter+1)}>→</button></div></div>
 <div className="constellation">{stages.slice(chapter*5,chapter*5+5).map((m,i)=><button key={m.id} className={'level-shard '+(completed.includes(m.id)?'completed ':'')+(m.id===focusStageId?'active-save':'')} onClick={()=>m.id===focusStageId&&onResume?onResume():onPlay(m)}><span className="shard-number">{String(chapter*5+i+1).padStart(2,'0')}<small>{m.id===focusStageId?'이어가기':completed.includes(m.id)?'✓ 복원 완료':difficultyLabel(m)}</small></span><span className="shard-map"><Board stage={m}/></span><strong>{m.title}</strong><span className="shard-detail">{m.maxGhosts?`잔상 ${m.maxGhosts}명`:'혼자 걷기'} <i>↗</i></span></button>)}</div>
 <p className="campaign-note">기본 실험 뒤에는 난이도 순으로 진행합니다. 모든 균열을 자유롭게 선택할 수 있어요.</p></section>;
}
