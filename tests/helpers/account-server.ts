import {createServer} from 'node:http';
import {accountHandler,type AccountStore,type User,type StoredProgress} from '../../server/accounts.ts';
export async function startAccountServer(){
 const users=new Map<string,User>(),sessions=new Map<string,{userId:string;expires:number}>(),progress=new Map<string,StoredProgress>();
 const store:AccountStore={
  async createUser(username,password_hash){if(users.has(username))return null;const u={id:crypto.randomUUID(),username,password_hash};users.set(username,u);return u;},
  async findUser(username){return users.get(username)??null;},
  async createSession(token,userId){sessions.set(token,{userId,expires:Date.now()+2592000000});},
  async getSession(token){const s=sessions.get(token);return s&&s.expires>Date.now()?[...users.values()].find(u=>u.id===s.userId)??null:null;},
  async deleteSession(token){sessions.delete(token);},
  async getProgress(id){return structuredClone(progress.get(id)??null);},
  async putProgress(id,revision,payload){const old=progress.get(id);if((old?.revision??0)!==revision)return null;const p={revision:revision+1,payload:structuredClone(payload),updated_at:new Date().toISOString()};progress.set(id,p);return structuredClone(p);}
 };
 const send=(res:any,code:number,v:unknown)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
 const handler=accountHandler(store,async(req)=>{let raw='';for await(const v of req)raw+=v;return JSON.parse(raw);},send);
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url!,'http://localhost').pathname;if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){send(res,403,{error:'origin'});return;}if(!await handler(req,res,path))send(res,404,{});}catch{send(res,500,{error:'request failed'});}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};
 return {url:`http://127.0.0.1:${address.port}`,store,users,sessions,progress,close:()=>new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))};
}
