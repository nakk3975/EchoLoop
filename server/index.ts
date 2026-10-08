import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {accountHandler,type AccountStore} from './accounts.ts';
import {createAccountStore} from './account-store.ts';
import {neon} from '@neondatabase/serverless';
import {stages} from '../src/stages.ts';
import {restoreState,verifySolution,validateStage,hash} from '../src/engine.ts';
const root=resolve('dist'),sql=process.env.DATABASE_URL?neon(process.env.DATABASE_URL):null;
let databaseReady=false;
if(sql){try{await sql`CREATE SCHEMA IF NOT EXISTS echoloop`;await sql`CREATE TABLE IF NOT EXISTS echoloop.device_backup (owner_hash text PRIMARY KEY, revision integer NOT NULL DEFAULT 1, payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 393216), mutation_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;databaseReady=true;}catch{console.error('Database initialization failed; local gameplay remains available.');}}
let accountStore:AccountStore|null=null;
if(sql&&databaseReady){try{accountStore=await createAccountStore(sql);}catch{console.error('Account initialization failed; guest gameplay remains available.');}}
const budgets=new Map<string,{time:number;count:number}>();
const json=(res:ServerResponse,code:number,value:unknown)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function body(req:IncomingMessage){let size=0;const parts:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>393216)throw Object.assign(new Error('요청 파일이 너무 큽니다.'),{status:413});parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Object.assign(new Error('JSON 형식이 올바르지 않습니다.'),{status:400});}}
const handleAccount=accountHandler(accountStore,body,json);
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 try{
 const url=new URL(req.url??'/','http://localhost');
 if(url.pathname.startsWith('/api/')){
  const now=Date.now();if(budgets.size>10000)budgets.clear();const ip=req.socket.remoteAddress??'unknown',budget=budgets.get(ip);if(!budget||now-budget.time>60000)budgets.set(ip,{time:now,count:1});else if(++budget.count>120)return json(res,429,{error:'요청이 많습니다. 잠시 후 다시 시도하세요.'});
  if(req.headers.origin){const allowed=process.env.PUBLIC_ORIGIN??`https://${req.headers.host}`;if(req.headers.origin!==allowed&&!(process.env.NODE_ENV!=='production'&&req.headers.origin===`http://${req.headers.host}`))return json(res,403,{error:'다른 사이트의 요청은 허용되지 않습니다.'});}
  if(await handleAccount(req,res,url.pathname))return;
  if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{game:'EchoLoop',version:'0.1.0',database:databaseReady,storage:databaseReady?'DEVICE_BACKUP':'LOCAL_ONLY',accounts:!!accountStore});
  if(url.pathname==='/api/catalog'&&req.method==='GET')return json(res,200,{stages:stages.map(({id,title,description,width,height,maxGhosts})=>({id,title,description,width,height,maxGhosts}))});
  if(url.pathname==='/api/verify'&&req.method==='POST'){const v=await body(req);if(!v||validateStage(v.stage).length)return json(res,422,{error:'맵 구조 오류'});try{const state=verifySolution(v.stage,v.solution);return json(res,200,{status:'VALID',trust:'SERVER_REPLAY_VERIFIED',ticks:state.tick,ghosts:state.ghosts.length});}catch(e){return json(res,422,{error:(e as Error).message});}}
  if(url.pathname==='/api/backup'&&['GET','PUT'].includes(req.method??'')){
   if(!sql||!databaseReady)return json(res,503,{error:'온라인 저장 연결 준비 중입니다. 이 기기의 저장은 유지됩니다.'});
   const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return json(res,401,{error:'브라우저 백업 키가 필요합니다.'});const owner=createHash('sha256').update(token).digest('hex');
   if(req.method==='GET'){const rows=await sql`SELECT revision,payload,updated_at FROM echoloop.device_backup WHERE owner_hash=${owner}`;return json(res,rows.length?200:404,rows[0]??{error:'저장된 백업이 없습니다.'});}
   const v=await body(req);if(!v||!Number.isInteger(v.baseRevision)||v.baseRevision<0||typeof v.clientMutationId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v.clientMutationId))return json(res,422,{error:'저장 요청 형식이 올바르지 않습니다.'});
   try{restoreState(v.payload);}catch(e){return json(res,422,{error:(e as Error).message});}
   const payload=JSON.stringify(v.payload);let rows;
   if(v.baseRevision===0){rows=await sql`INSERT INTO echoloop.device_backup(owner_hash,payload,mutation_id) SELECT ${owner},${payload}::jsonb,${v.clientMutationId}::uuid WHERE (SELECT count(*) FROM echoloop.device_backup)<1000 ON CONFLICT(owner_hash) DO NOTHING RETURNING revision`;}
   else rows=await sql`UPDATE echoloop.device_backup SET payload=${payload}::jsonb,revision=revision+1,mutation_id=${v.clientMutationId}::uuid,updated_at=now() WHERE owner_hash=${owner} AND revision=${v.baseRevision} AND mutation_id<>${v.clientMutationId}::uuid RETURNING revision`;
   if(!rows.length){const prior=await sql`SELECT revision,mutation_id,payload FROM echoloop.device_backup WHERE owner_hash=${owner}`;if(prior[0]?.mutation_id===v.clientMutationId&&hash(prior[0].payload)===hash(JSON.parse(payload)))return json(res,200,{revision:prior[0].revision});return json(res,409,{error:'백업이 다른 탭에서 변경되었거나 저장 한도에 도달했습니다. 로컬 기록은 유지됩니다.'});}
   return json(res,200,{revision:rows[0].revision});
  }
  return json(res,404,{error:'API를 찾을 수 없습니다.'});
 }
 if(url.pathname==='/health/live')return json(res,200,{status:'ok'});
 if(!['GET','HEAD'].includes(req.method??''))return json(res,405,{error:'허용되지 않은 요청입니다.'});
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep))return json(res,403,{error:'허용되지 않은 경로입니다.'});
 const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
 let file:Buffer,extension=extname(path);try{file=await readFile(path);}catch{if(extension)return json(res,404,{error:'파일을 찾을 수 없습니다.'});file=await readFile(resolve(root,'index.html'));extension='.html';}
 res.writeHead(200,{'Content-Type':mime[extension]??'application/octet-stream','Cache-Control':extension==='.html'?'no-cache':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'public,max-age=3600'});res.end(req.method==='HEAD'?undefined:file);
 }catch(e){const status=(e as {status?:number}).status??500;if(status===500)console.error('Request failed',e instanceof Error?e.name:'unknown');json(res,status,{error:status===500?'요청 처리 중 오류가 발생했습니다. 로컬 저장을 확인해 주세요.':(e as Error).message});}
});
server.listen(Number(process.env.PORT??3000),'0.0.0.0',()=>console.log('EchoLoop server ready'));
