/** A time apparatus, drawn as geometry so the interface stays crisp at every size. */
export function TimeMachine(){
 return <figure className="time-machine" aria-label="과거의 잔상이 시간 고리를 지나 미래의 출구로 이어지는 시간 장치">
  <div className="apparatus-label"><span>CHRONO / 030</span><span>시간 간섭 장치</span></div>
  <svg viewBox="0 0 620 470" role="img" aria-label="과거와 미래가 만나는 시간 고리">
   <defs><linearGradient id="time-spectrum"><stop stopColor="#d77a38"/><stop offset=".48" stopColor="#d9b777"/><stop offset=".52" stopColor="#74c9d2"/><stop offset="1" stopColor="#bceaf1"/></linearGradient><radialGradient id="time-halo"><stop stopColor="#6ca7aa" stopOpacity=".2"/><stop offset="1" stopColor="#6ca7aa" stopOpacity="0"/></radialGradient></defs>
   <circle cx="310" cy="229" r="212" fill="url(#time-halo)"/>
   <g stroke="#79766a" strokeWidth=".6" opacity=".35"><path d="M10 229H610M310 12V448"/>{[100,160,204].map(r=><circle key={r} cx="310" cy="229" r={r} fill="none"/>)}</g>
   <g className="dial-orbit" transform="translate(310 229)">{Array.from({length:60},(_,i)=><path key={i} transform={`rotate(${i*6})`} d={`M0 -193v${i%5===0?13:5}`} stroke={i<30?'#82bbc0':'#bb8653'} strokeWidth={i%5===0?2:1}/>)}</g>
   <circle cx="310" cy="229" r="170" fill="none" stroke="url(#time-spectrum)" strokeWidth="2"/>
   <circle cx="310" cy="229" r="153" fill="none" stroke="#d7c8a2" strokeWidth=".5" strokeDasharray="1 7"/>
   <path d="M310 59a170 170 0 0 1 147 255" fill="none" stroke="#aee7e9" strokeWidth="7"/>
   <path d="M310 399a170 170 0 0 1-147-255" fill="none" stroke="#d7894c" strokeWidth="7"/>
   <g fill="#191e1d" stroke="#68675b" strokeWidth="1.5"><path d="m117 304 117-69 77 44-117 69z"/><path d="m194 348 117-69v19l-117 69z"/><path d="m117 304 77 44v19l-77-44z"/><path d="m305 194 117-69 77 44-117 69z"/><path d="m382 238 117-69v19l-117 69z"/></g>
   <path d="m193 311 78-45 39 23 41-24v-49l72-42" fill="none" stroke="url(#time-spectrum)" strokeWidth="3" strokeDasharray="7 7"/>
   <g className="past-echo" stroke="#e19a5a" fill="#362a20"><circle cx="193" cy="286" r="15" strokeDasharray="3 3"/><path d="M181 305v-8h24v8"/><circle cx="253" cy="252" r="15" opacity=".4" strokeDasharray="3 3"/></g>
   <g className="present-echo"><ellipse cx="347" cy="251" rx="19" ry="8" fill="#83d3dc" opacity=".16"/><circle cx="347" cy="228" r="14" fill="#ecf3e8" stroke="#92d7df" strokeWidth="3"/><path d="M342 226h2m6 0h2" stroke="#202925" strokeWidth="2"/></g>
   <g stroke="#96d9dc" fill="none"><path d="M415 178v-58l29-17v58" strokeWidth="4"/><path d="M422 171v-47l15-9v49" opacity=".5"/><path d="m401 180 29 17 29-17"/></g>
   <g fill="#d5c9af" fontFamily="monospace" fontSize="10" letterSpacing="2"><text x="26" y="216">PAST</text><text x="514" y="216">FUTURE</text><text x="310" y="27" textAnchor="middle">00 : 30</text><text x="310" y="451" textAnchor="middle">RECORD. REWIND. RECONNECT.</text></g>
   <circle cx="310" cy="59" r="5" fill="#e9e1ca"/><circle cx="310" cy="399" r="5" fill="#e9e1ca"/>
  </svg>
  <figcaption><span><i/> 과거는 남고</span><span className="time-thread"/><span>미래는 열린다 <i/></span></figcaption>
 </figure>;
}
