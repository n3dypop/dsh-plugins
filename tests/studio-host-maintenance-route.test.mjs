import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceStopHandler} from '../apps/dsh-plugins/studio-host/maintenance-stop-route.mjs';
const origin='http://127.0.0.1:4321',id='12883cb0-7801-44bd-b542-48c5007e4b86';
const headers={'Origin':origin,'Cookie':'fixture-session','X-Local-Studio-Host':'1','Content-Type':'application/json'};
test('accepts only authenticated same-origin identity and never caller supplied ownership',async()=>{
 let prepared=0,exited=0,scheduled;
 const manager={async prepare(value,context){prepared++;assert.equal(value,id);assert.equal(context.cookie,'fixture-session');return {async requestExit(){exited++;},release(){}};},async status(value){return {requestId:value,state:'started'};}};
 const handle=maintenanceStopHandler({manager,origin,schedule:fn=>{scheduled=fn;}});
 for(const [patch,body] of [[{'Origin':'http://127.0.0.1:99'},{requestId:id}],[{'Cookie':''},{requestId:id}],[{}, {requestId:id,pipe:'attacker'}],[{}, {requestId:id,nonce:'secret'}]]){
  const result=await handle(new Request(origin+'/api/local-studio/maintenance-stop',{method:'POST',headers:{...headers,...patch},body:JSON.stringify(body)}));assert.notEqual(result.status,202);
 }
 assert.equal(prepared,0);const accepted=await handle(new Request(origin+'/api/local-studio/maintenance-stop',{method:'POST',headers,body:JSON.stringify({requestId:id})}));assert.equal(accepted.status,202);assert.equal(exited,0);scheduled();await new Promise(resolve=>setImmediate(resolve));assert.equal(exited,1);
 const result=await handle(new Request(origin+'/api/local-studio/maintenance-stop?requestId='+id,{headers}));assert.equal((await result.json()).state,'started');
});
test('missing dependencies and scheduling failure never request exit',async()=>{
 assert.throws(()=>maintenanceStopHandler({manager:{},origin}));let released=0,exited=0;
 const manager={async prepare(){return {async requestExit(){exited++;},release(){released++;}};},async status(){return {};}};
 const handle=maintenanceStopHandler({manager,origin,schedule(){throw Error('unavailable');}});
 assert.equal((await handle(new Request(origin+'/api/local-studio/maintenance-stop',{method:'POST',headers,body:JSON.stringify({requestId:id})}))).status,503);assert.equal(released,1);assert.equal(exited,0);
});
