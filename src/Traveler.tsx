export const echoColors=['#d798ff','#ff84b7','#81aaff'];
/** Coordinates are centered on the same 48px game tile for every incarnation. */
export function Traveler({echo,index=0}:{echo?:boolean;index?:number}){
 const color=echo?echoColors[index%3]:'#ffe1a3';
 return <g className={echo?'traveler echo-being':'traveler present-being'}>
  <ellipse cy="17" rx="16" ry="5" fill={color} opacity=".13"/>
  {echo?<>
   <path className="echo-ribbon" d="M-11-7Q-21 4-11 17L-6 10 0 20 5 10 14 15Q8 2 11-7" fill={color} fillOpacity=".13" stroke={color} strokeWidth="1.3" strokeDasharray="3 2"/>
   <path d="M-9-8 0-18 9-8 7 3 0 8-7 3Z" fill="#221334" stroke={color} strokeWidth="1.8"/>
   <path d="m0-10 4 5-4 5-4-5Z" fill={color}/>
   <path d="M-17 1h4m21-14h5M-14-14h3" stroke={color} strokeWidth="1.5"/>
   <circle cx="13" cy="-13" r="6" fill="#251638" stroke={color}/><text x="13" y="-10" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">{index+1}</text>
  </>:<>
   <path className="traveler-scarf" d="M7 3Q19 0 20 8L12 6 17 13 5 7" fill="#f2a96f"/>
   <path d="m-7 0-4 12 7-2 4 5 4-5 7 2-4-12Z" fill="#ece8ff" stroke="#bdb1dc" strokeWidth="1"/>
   <path d="m-12-8 4-9 8-4 8 4 4 9-4 10H-8Z" fill="#ffdd9b"/>
   <path d="M-8-10Q0-15 8-10L7-3Q0 0-7-3Z" fill="#25213e"/>
   <path d="M-4-8v3m8-3v3" stroke="#fff5dc" strokeWidth="2.2" strokeLinecap="round"/>
   <path d="m0 3 3 4-3 4-3-4Z" fill="#8166ba"/>
   <path d="M-9-21h4m12 2h4" stroke="#ffedc8" strokeWidth="1.4"/>
  </>}
 </g>;
}
export function Portrait({echo,index=0}:{echo?:boolean;index?:number}){return <svg className="traveler-portrait" viewBox="-30 -30 60 60" role="img" aria-label={echo?`찢어진 빛의 잔상 ${index+1}`:'빛의 후드와 스카프를 가진 현재의 나'}><Traveler echo={echo} index={index}/></svg>;}
