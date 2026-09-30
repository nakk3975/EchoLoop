import {Traveler} from './Traveler.tsx';
export function Fracture(){return <div className="fracture-scene" aria-label="시간 균열 위에서 과거의 잔상과 마주한 현재의 여행자">
 <svg viewBox="0 0 660 520" role="img" aria-label="빛나는 시간 균열과 세 명의 나">
 <defs><linearGradient id="rift-light" x2=".9" y2="1"><stop stopColor="#9e66e5"/><stop offset=".5" stopColor="#f0b5eb"/><stop offset="1" stopColor="#7256be"/></linearGradient><radialGradient id="rift-aura"><stop stopColor="#7048ba" stopOpacity=".5"/><stop offset="1" stopColor="#382958" stopOpacity="0"/></radialGradient></defs>
 <ellipse cx="345" cy="250" rx="280" ry="245" fill="url(#rift-aura)"/>
 <g fill="none" stroke="#a998c9" opacity=".3"><ellipse cx="340" cy="267" rx="250" ry="90" transform="rotate(-28 340 267)"/><ellipse cx="340" cy="267" rx="215" ry="177" strokeDasharray="2 12"/></g>
 <g className="rift-shards" fill="#211938" stroke="#725991"><path d="m60 327 107-42 88 29-110 61Z"/><path d="m145 375 110-61-16 34-84 49Z"/><path d="m389 139 110-42 80 37-102 62Z"/><path d="m477 196 102-62-24 45-70 38Z"/><path d="m379 393 112-37 46 20-116 54Z"/></g>
 <path d="m313 60-67 132 67-20-59 139 53-8-30 154 123-200-65 17 54-132-63 20 63-123Z" fill="#291b42" stroke="url(#rift-light)" strokeWidth="3"/>
 <path className="rift-seam" d="m351 60-71 130 44-14-42 134 35-7-22 122 85-163-52 12 47-116-34 9" fill="none" stroke="#dfb7ff" strokeWidth="2"/>
 <path d="m155 317 109-45m102-57 123-48" stroke="#dbb9f8" strokeDasharray="5 9" opacity=".55"/>
 <g transform="translate(155 302) scale(2.1)"><Traveler echo/></g><g transform="translate(456 146) scale(2.6)"><Traveler/></g><g transform="translate(427 381) scale(1.4)" opacity=".55"><Traveler echo index={1}/></g>
 <g fill="#f1d8ff">{[[115,130],[552,270],[239,72],[576,354],[97,421]].map(([x,y],i)=><path key={i} d={`M${x-4} ${y}h8m-4-4v8`} stroke="#bd9ce2"/>)}</g>
 <g fill="#bdabd6" fontSize="10" letterSpacing="4"><text x="66" y="270">ECHO / 01</text><text x="471" y="75">YOU / NOW</text><text x="277" y="494">A FRACTURE IN TIME</text></g>
 </svg><span className="rift-caption">같은 나. 다른 시간.</span></div>;}
