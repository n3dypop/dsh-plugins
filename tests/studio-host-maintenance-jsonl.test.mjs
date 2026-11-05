import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {createJsonlSessionReader} from '../apps/dsh-plugins/studio-host/maintenance-jsonl.mjs';
async function fixture(t){
 const runtime=await mkdtemp(join(tmpdir(),'jsonl-candidate-'));t.after(()=>rm(runtime,{recursive:true,force:true}));await writeFile(join(runtime,'package.json'),'{}');for(const name of ['dsh-session-persistence-jsonl','dsh-agent-loop']){const dir=join(runtime,'node_modules/@deepseek-ai',name);await mkdir(dir,{recursive:true});await writeFile(join(dir,'package.json'),JSON.stringify({name:'@deepseek-ai/'+name,version:'0.2.2-rc.1'}));}
 let verified=true,events=[],items=[{sessionId:'s1',running:false}],stored=[{header:{id:'s1'}}],pending=[];
 const ctx={sessions:{list:()=>[{id:'s1',seq:events.length}]},sessionPersistence:{async list(){return stored;}},sessionQuery:{async observeSession(){return {events,[Symbol.dispose](){}};}}};
 const read=createJsonlSessionReader({ctx,runtimeDirectory:runtime,port:4321,verifyBackend:async()=>verified,fetcher:async(_url,init)=>{const body=JSON.parse(init.body),value=body.method==='session/state'?{cursor:events.length-1,active:true,running:false,queue:[],pendingInput:pending}:{items};return Response.json({rpcId:body.rpcId,result:{ok:true,value}});}});
 return {read,setVerified:v=>verified=v,setEvents:v=>events=v,setItems:v=>items=v,setStored:v=>stored=v,setPending:v=>pending=v};
}
test('catalog combines native DSH list, storage, loaded sessions and complete event history',async t=>{const f=await fixture(t);const result=await f.read({cookie:'fixture'});assert.equal(result.complete,true);assert.equal(result.sessions[0].id,'s1');assert.equal(result.sessions[0].sequence,0);});
test('unverified backend, incomplete catalog and pending inbox block maintenance',async t=>{for(const mode of ['backend','busy','storage','inbox','seq','pending','open-turn']){const f=await fixture(t);if(mode==='backend')f.setVerified(false);if(mode==='busy')f.setItems([{sessionId:'s1',running:true}]);if(mode==='storage')f.setStored([]);if(mode==='inbox')f.setEvents([{seq:0,type:'agent/inbox/spliced',data:{target:'next-turn',start:0,inserted:[{id:'input'}]}}]);if(mode==='seq')f.setEvents([{seq:2,type:'other'}]);if(mode==='pending')f.setPending(['question']);if(mode==='open-turn')f.setEvents([{seq:0,type:'turn/start',data:{turn:1}}]);await assert.rejects(f.read({cookie:'fixture'}));}});
