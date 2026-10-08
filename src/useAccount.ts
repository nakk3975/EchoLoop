import {useEffect,useRef,useState} from 'react';
import {type AccountProgress,validateProgress} from './account-progress.ts';
import {hash} from './engine.ts';
import {read,write,setProgressOwner} from './storage.ts';
type User={id:string;username:string};
export async function accountRequest(path:string,method='GET',value?:unknown){
 const response=await fetch('/api/account/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'EchoLoop'},body:value===undefined?undefined:JSON.stringify(value),signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error??'계정 요청에 실패했습니다.'),{status:response.status});return data;
}
function progressHash(v:AccountProgress){const current=v.current as {stage:unknown;solution:unknown;checksum:string}|null;return hash({...v,current:current?{stage:current.stage,solution:current.solution,checksum:current.checksum}:null});}
export function useAccount(ready:boolean,snapshot:()=>AccountProgress,apply:(p:AccountProgress)=>Promise<void>,pause:()=>void,notify:(message:string)=>void){
 const [user,setUser]=useState<User|null>(null),[status,setStatus]=useState('비회원 · 이 기기에 저장'),[busy,setBusy]=useState(false),[checked,setChecked]=useState(false),[conflict,setConflict]=useState(false);
 const owner=useRef<User|null>(null),revision=useRef(0),savedHash=useRef(''),locked=useRef(false),blocked=useRef(false),callbacks=useRef({snapshot,apply,pause,notify});callbacks.current={snapshot,apply,pause,notify};
 function lock(){if(locked.current)return false;locked.current=true;setBusy(true);return true;}
 function unlock(){locked.current=false;setBusy(false);}
 function failed(e:unknown){const error=e as Error&{status?:number};if(error.status===409){blocked.current=true;setConflict(true);}if(error.status===401){blocked.current=true;setStatus('로그인이 만료되었습니다. 다시 로그인하세요.');}else setStatus('계정 저장 안 됨 · 이 기기 기록 유지');return error.message;}
 async function attach(next:User,guest?:AccountProgress){
  // Read remote progress before switching ownership; failed login never replaces local play.
  const remote=await accountRequest('progress');
  setProgressOwner(next.id);
  const [local,completed,memo]=await Promise.all([read('save'),read<string[]>('completed'),read<{revision:number;hash:string}>('account-sync:'+next.id)]);
  let pending:AccountProgress|null=null;
  try{if(local||completed?.length){const cached=validateProgress({version:1,current:local??null,completed:completed??[]});if(progressHash(cached)!==memo?.hash)pending=cached;}}catch{/* A damaged cache cannot replace verified remote progress. */}
  const payload=pending??(remote.payload?validateProgress(remote.payload):guest??{version:1 as const,current:null,completed:[]});
  callbacks.current.pause();await callbacks.current.apply(payload);
  owner.current=next;setUser(next);revision.current=remote.revision;savedHash.current=remote.payload?progressHash(validateProgress(remote.payload)):'';
  const hasConflict=!!pending&&memo?.revision!==remote.revision;
  blocked.current=hasConflict;setConflict(hasConflict);
  if(!pending)await write('account-sync:'+next.id,{revision:remote.revision,hash:savedHash.current});
  setStatus(hasConflict?'이 기기에 미저장 진행이 있습니다. 불러오기 또는 덮어쓰기를 선택하세요.':pending?'미저장 진행 복구 · 계정 저장 대기':remote.payload?'계정 기록 불러옴':'계정에 저장할 준비 완료');

 }
 useEffect(()=>{if(!ready)return;let live=true;void(async()=>{if(!lock())return;try{const v=await accountRequest('session');if(live&&v.user)await attach(v.user);}catch{if(live)setStatus('계정 연결 안 됨 · 비회원 플레이 가능');}finally{if(live){setChecked(true);unlock();}}})();return()=>{live=false;};},[ready]);
 async function login(username:string,password:string,register:boolean){if(!lock())return false;try{callbacks.current.pause();const guest=register?callbacks.current.snapshot():undefined;const v=await accountRequest(register?'register':'login','POST',{username,password});await attach(v.user,guest);callbacks.current.notify(register?'가입했습니다. 현재 진행을 계정에 저장할 수 있습니다.':'로그인했습니다. 진행 저장 상태를 확인하세요.');return true;}catch(e){throw new Error(failed(e));}finally{unlock();}}
 async function save(force=false,automatic=false){if(!owner.current||!lock())return;try{
  if(blocked.current&&!force)return;if(!automatic)callbacks.current.pause();
  const payload=validateProgress(callbacks.current.snapshot()),key=progressHash(payload);if(automatic&&key===savedHash.current)return;
  if(force){const remote=await accountRequest('progress');if(!confirm('다른 기기에 저장된 기록을 현재 진행으로 덮어쓸까요?'))return;revision.current=remote.revision;}
  setStatus('계정에 저장 중…');const result=await accountRequest('progress','PUT',{baseRevision:revision.current,payload});revision.current=result.revision;savedHash.current=key;await write('account-sync:'+owner.current!.id,{revision:revision.current,hash:key});blocked.current=false;setConflict(false);setStatus('계정 저장 완료 · '+new Date(result.updated_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
  if(!automatic)callbacks.current.notify('계정에 저장했습니다. 다른 기기에서 로그인하면 이어 할 수 있습니다.');
 }catch(e){const message=failed(e);if(!automatic||(e as {status?:number}).status===409)callbacks.current.notify(message);}finally{unlock();}}
 async function load(){if(!owner.current||!lock())return;try{callbacks.current.pause();const remote=await accountRequest('progress');if(!remote.payload)throw new Error('계정에 저장된 진행이 없습니다. 먼저 저장하세요.');const payload=validateProgress(remote.payload);if(!confirm('계정에 저장된 진행을 불러올까요? 현재 이 기기의 진행이 교체됩니다.'))return;await callbacks.current.apply(payload);revision.current=remote.revision;savedHash.current=progressHash(payload);await write('account-sync:'+owner.current!.id,{revision:revision.current,hash:savedHash.current});blocked.current=false;setConflict(false);setStatus('계정 기록 불러옴');callbacks.current.notify('저장된 레벨과 플레이 기록을 불러왔습니다.');}catch(e){callbacks.current.notify(failed(e));}finally{unlock();}}
 async function logout(){if(!lock())return;try{callbacks.current.pause();if(owner.current){const payload=validateProgress(callbacks.current.snapshot()),key=progressHash(payload);if(key!==savedHash.current){if(blocked.current){if(!confirm('계정에 저장되지 않은 진행이 있습니다. 먼저 저장하거나 파일로 내보내는 것이 좋습니다. 그래도 로그아웃할까요?'))return;}else{const result=await accountRequest('progress','PUT',{baseRevision:revision.current,payload});revision.current=result.revision;savedHash.current=key;await write('account-sync:'+owner.current.id,{revision:revision.current,hash:key});}}}await accountRequest('logout','POST');setProgressOwner(null);const [current,completed]=await Promise.all([read('save'),read<string[]>('completed')]);await callbacks.current.apply({version:1,current:current??null,completed:completed??[]});owner.current=null;setUser(null);blocked.current=false;setConflict(false);setStatus('비회원 · 이 기기에 저장');callbacks.current.notify('로그아웃했습니다. 비회원 기록으로 돌아왔습니다.');}catch(e){callbacks.current.notify(failed(e));}finally{unlock();}}
 useEffect(()=>{if(!checked||!user)return;const timer=setInterval(()=>{if(!blocked.current)void save(false,true);},5000);const hide=()=>{if(document.hidden&&!blocked.current)void save(false,true);};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);};},[checked,user]);
 return {user,status,busy,checked,conflict,login,save,load,logout};
}
