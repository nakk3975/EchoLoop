import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {stages,referenceInputs} from '../src/stages.ts';
import {replay,buildChain,solution} from '../src/engine.ts';
test('API verifies real replay, rejects forgery, isolates unavailable DB, serves health',async()=>{
 const port=31000+Math.floor(Math.random()*10000),child=spawn(process.execPath,['server/index.ts'],{env:{...process.env,PORT:String(port),DATABASE_URL:''},stdio:['ignore','pipe','pipe']});
 try{await once(child.stdout,'data');const base=`http://127.0.0.1:${port}`;let r=await fetch(base+'/health/live');assert.equal(r.status,200);r=await fetch(base+'/api/status');assert.equal((await r.json()).database,false);
 const m=stages[3],s=replay(m,referenceInputs[3][2],buildChain(m,referenceInputs[3].slice(0,2))),proof=solution(m,s);
 r=await fetch(base+'/api/verify',{method:'POST',body:JSON.stringify({stage:m,solution:proof})});assert.equal(r.status,200);assert.equal((await r.json()).trust,'SERVER_REPLAY_VERIFIED');
 r=await fetch(base+'/api/verify',{method:'POST',body:JSON.stringify({stage:m,solution:{...proof,committedLoops:[]}})});assert.equal(r.status,422);
 r=await fetch(base+'/api/verify',{method:'POST',body:'not JSON'});assert.equal(r.status,400);
 r=await fetch(base+'/api/backup',{method:'PUT',body:'{}'});assert.equal(r.status,503);
 r=await fetch(base+'/api/verify',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'});assert.equal(r.status,403);
 const finale=stages[79],fi=referenceInputs[79],fs=replay(finale,fi.at(-1)!,buildChain(finale,fi.slice(0,-1)));
 r=await fetch(base+'/api/verify',{method:'POST',body:JSON.stringify({stage:finale,solution:solution(finale,fs)})});assert.equal(r.status,200);assert.equal((await r.json()).trust,'SERVER_REPLAY_VERIFIED');
 r=await fetch(base+'/api/catalog');assert.equal((await r.json()).stages.length,80);
 }finally{child.kill();await once(child,'exit');}
});
