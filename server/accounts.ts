import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {AccountProgress} from '../src/account-progress.ts';
import {validateProgress} from '../src/account-progress.ts';
const derive=promisify(scrypt),digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export type User={id:string;username:string;password_hash:string};
export type StoredProgress={revision:number;payload:AccountProgress;updated_at:string};
export interface AccountStore {
 createUser(username:string,passwordHash:string):Promise<User|null>;
 findUser(username:string):Promise<User|null>;
 createSession(hash:string,userId:string):Promise<void>;
 getSession(hash:string):Promise<User|null>;
 deleteSession(hash:string):Promise<void>;
 getProgress(userId:string):Promise<StoredProgress|null>;
 putProgress(userId:string,revision:number,payload:AccountProgress):Promise<StoredProgress|null>;
}
export async function passwordHash(password:string){const salt=randomBytes(16).toString('hex'),key=await derive(password,salt,64) as Buffer;return salt+':'+key.toString('hex');}
async function passwordMatches(password:string,encoded:string){const [salt,expected]=encoded.split(':'),key=await derive(password,salt,64) as Buffer;return timingSafeEqual(key,Buffer.from(expected,'hex'));}
export function accountHandler(store:AccountStore|null,readBody:(req:IncomingMessage)=>Promise<any>,send:(res:ServerResponse,status:number,value:unknown)=>void){
 const attempts=new Map<string,{time:number;count:number}>();
 function throttle(key:string,limit=15){const now=Date.now(),v=attempts.get(key);if(attempts.size>10000){for(const [k,b] of attempts)if(now-b.time>900000)attempts.delete(k);if(attempts.size>10000)return true;}if(!v||now-v.time>900000){attempts.set(key,{time:now,count:1});return false;}return ++v.count>limit;}
 const sessionKey=(req:IncomingMessage)=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('echoloop_session='))?.slice(17);
 const tokenHash=(req:IncomingMessage)=>{const token=sessionKey(req);return token&&/^[a-f0-9]{64}$/.test(token)?digest(token):null;};
 const cookie=(res:ServerResponse,token:string,age=2592000)=>res.setHeader('Set-Cookie',`echoloop_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.NODE_ENV==='production'?'; Secure':''}`);
 return async(req:IncomingMessage,res:ServerResponse,path:string)=>{
  if(!['/api/account/session','/api/account/register','/api/account/login','/api/account/logout','/api/account/progress'].includes(path))return false;
  if(!store){send(res,503,{error:'계정 저장 연결 준비 중입니다. 비회원 플레이는 계속할 수 있습니다.'});return true;}
  const respond=(code:number,value:unknown)=>{send(res,code,value);return true;};
  if(req.method!=='GET'&&req.headers['x-requested-with']!=='EchoLoop')return respond(403,{error:'요청을 확인할 수 없습니다. 새로고침 후 다시 시도하세요.'});
  if((path.endsWith('/register')||path.endsWith('/login'))&&req.method==='POST'){
   const v=await readBody(req),username=typeof v?.username==='string'?v.username.trim().toLowerCase():'';
   if(!/^[a-z0-9_]{3,24}$/.test(username)||typeof v?.password!=='string'||v.password.length<8||v.password.length>128)return respond(422,{error:'아이디는 영문·숫자·밑줄 3~24자, 비밀번호는 8~128자로 입력하세요.'});
   if(throttle('user:'+username)||throttle('ip:'+(req.socket.remoteAddress??'unknown'),300))return respond(429,{error:'로그인 시도가 많습니다. 15분 후 다시 시도하세요.'});
   let user:User|null;
   if(path.endsWith('/register')){user=await store.createUser(username,await passwordHash(v.password));if(!user)return respond(409,{error:'이미 사용 중인 아이디입니다.'});}
   else{user=await store.findUser(username);const valid=await passwordMatches(v.password,user?.password_hash??'00000000000000000000000000000000:'+('00'.repeat(64)));if(!user||!valid)return respond(401,{error:'아이디 또는 비밀번호가 올바르지 않습니다.'});}
   const token=randomBytes(32).toString('hex');await store.createSession(digest(token),user.id);cookie(res,token);return respond(200,{user:{id:user.id,username:user.username}});
  }
  const key=tokenHash(req),user=key?await store.getSession(key):null;
  if(path.endsWith('/session')&&req.method==='GET')return respond(200,{user:user?{id:user.id,username:user.username}:null});
  if(path.endsWith('/logout')&&req.method==='POST'){if(key)await store.deleteSession(key);cookie(res,'',0);return respond(200,{ok:true});}
  if(!user)return respond(401,{error:'로그인 후 이용하세요.'});
  if(path.endsWith('/progress')&&req.method==='GET')return respond(200,await store.getProgress(user.id)??{revision:0,payload:null,updated_at:null});
  if(path.endsWith('/progress')&&req.method==='PUT'){
   const v=await readBody(req);if(!Number.isInteger(v?.baseRevision)||v.baseRevision<0)return respond(422,{error:'저장 버전이 올바르지 않습니다.'});
   let payload:AccountProgress;try{payload=validateProgress(v.payload);}catch(e){return respond(422,{error:(e as Error).message});}
   const saved=await store.putProgress(user.id,v.baseRevision,payload);return saved?respond(200,saved):respond(409,{error:'다른 기기에서 저장한 기록이 있습니다. 불러오거나, 현재 진행으로 덮어쓰기를 선택하세요.'});
  }
  return respond(405,{error:'허용되지 않은 요청입니다.'});
 };
}
