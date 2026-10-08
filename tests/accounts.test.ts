import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startAccountServer} from './helpers/account-server.ts';
import {stages,referenceInputs} from '../src/stages.ts';
import {initial,step,saveState,buildChain,replay} from '../src/engine.ts';
import {IDBFactory} from 'fake-indexeddb';
import {read,write,setProgressOwner} from '../src/storage.ts';
test('two devices: register, cookie auth, replay + completed restoration, CAS conflict, ownership, expiry and logout',async()=>{
 const api=await startAccountServer();const cookies=new Map<string,string>();
 async function call(device:string,path:string,method='GET',value?:unknown,headers={}){const r=await fetch(api.url+'/api/account/'+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'EchoLoop',Cookie:cookies.get(device)??'',...headers},body:value===undefined?undefined:JSON.stringify(value)});const cookie=r.headers.get('set-cookie');if(cookie)cookies.set(device,cookie.split(';')[0]);return {status:r.status,body:await r.json(),cookie};}
 try{
 assert.equal((await call('phone','progress')).status,401);
 assert.equal((await call('phone','register','POST',{username:'ab',password:'12345678'})).status,422);
 const credentials={username:'player_one',password:'good_password'};const registered=await call('phone','register','POST',credentials);assert.equal(registered.status,200);assert.match(registered.cookie!,/HttpOnly; SameSite=Lax/);const id=registered.body.user.id;
 assert(!JSON.stringify(registered.body).includes('password'));assert.notEqual(api.users.get('player_one')!.password_hash,credentials.password);assert(![...api.sessions.keys()].some(k=>cookies.get('phone')!.endsWith(k)));
 assert.equal((await call('pc','register','POST',credentials)).status,409);
 assert.equal((await call('pc','login','POST',{...credentials,password:'bad_password'})).status,401);
 const stage=stages[3],inputs=referenceInputs[3],state=replay(stage,inputs.at(-1)!.slice(0,5),buildChain(stage,inputs.slice(0,-1)));const payload={version:1,current:saveState(stage,state),completed:stages.slice(0,3).map(s=>s.id)};
 const saved=await call('phone','progress','PUT',{baseRevision:0,payload});assert.equal(saved.status,200);assert.equal(saved.body.revision,1);
 assert.equal((await call('pc','login','POST',credentials)).status,200);const loaded=await call('pc','progress');assert.deepEqual(loaded.body.payload,payload);
 const changed={...payload,current:saveState(stages[0],step(stages[0],initial(stages[0]),'R'))};assert.equal((await call('pc','progress','PUT',{baseRevision:1,payload:changed})).status,200);
 assert.equal((await call('phone','progress','PUT',{baseRevision:1,payload})).status,409);assert.deepEqual((await call('phone','progress')).body.payload,changed);
 assert.equal((await call('phone','progress','PUT',{baseRevision:2,payload:{...payload,completed:['forged']}})).status,422);
 assert.equal((await call('phone','progress','PUT',{baseRevision:2,payload:{...payload,current:{...payload.current,checksum:'bad'}}})).status,422);
 assert.equal((await call('phone','progress','PUT',{baseRevision:2,payload},{'X-Requested-With':''})).status,403);
 assert.equal((await call('phone','progress','PUT',{baseRevision:2,payload},{Origin:'https://evil.example'})).status,403);
 assert.equal((await call('other','register','POST',{username:'player_two',password:'good_password'})).status,200);assert.equal((await call('other','progress')).body.revision,0);
 assert.equal((await call('phone','logout','POST')).status,200);assert.equal((await call('phone','progress')).status,401);assert.equal((await call('pc','progress')).status,200);
 for(const session of api.sessions.values())if(session.userId===id)session.expires=0;assert.equal((await call('pc','progress')).status,401);
 }finally{await api.close();}
});
test('guest and different account local saves are isolated, including queued writes',async()=>{
 Object.assign(globalThis,{indexedDB:new IDBFactory()});setProgressOwner(null);const guest=write('save','guest');setProgressOwner('one');const one=write('save','one');setProgressOwner('two');await Promise.all([guest,one]);assert.equal(await read('save'),undefined);await write('completed',['two']);setProgressOwner('one');assert.equal(await read('save'),'one');assert.equal(await read('completed'),undefined);setProgressOwner(null);assert.equal(await read('save'),'guest');
});
