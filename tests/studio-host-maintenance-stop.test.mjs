import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceStop} from '../apps/dsh-plugins/studio-host/maintenance-stop.mjs';

const id='12883cb0-7801-44bd-b542-48c5007e4b86';
function fixture(){
 let owner={nonceHash:'a'.repeat(64),fenceInfoHash:'b'.repeat(64),holderPid:14,holderTicks:'123'},changed=false,released=0,exits=0,saved,admitted=false;
 const epoch={pid:123,startTimeUtcTicks:'638000000000000000',executable:'C:\\fixture\\node.exe',url:'http://127.0.0.1:4321'};
 let sessions={complete:true,running:0,queued:0,sessions:[{id:'private-session',sequence:2,persistedHash:'a'.repeat(64)}]};
 const deps={adapter:{async verify(){return {epoch};},freeze(){return {changed:()=>changed,release(){released++;}};},async flush(){},exit(){exits++;}},owner:{async verify(){return owner;}},ledger:{async admit(){if(admitted)throw Error('admission exists');admitted=true;},async savePrepared(record){saved=structuredClone(record);},async readPrepared(){return saved;}},async readSessions(){return sessions;}};
 return {deps,make:()=>createMaintenanceStop(deps),setOwner:v=>owner=v,setChanged:v=>changed=v,setSessions:v=>sessions=v,get saved(){return saved;},get released(){return released;},get exits(){return exits;}};
}

test('retains anonymous session proof before requesting exit and prevents replay',async()=>{
 const f=fixture(),manager=f.make(),op=await manager.prepare(id,{cookie:'fixture-cookie'});
 await assert.rejects(manager.prepare(id,{cookie:'fixture-cookie'}),/already active/);
 assert.deepEqual(await op.requestExit(),{requestId:id,state:'exit-requested'});
 assert.equal(f.exits,1);assert.equal(f.released,0);
 assert.equal(f.saved.sessionCount,1);assert.match(f.saved.sessionProofs[0].idHash,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(f.saved).includes('private-session'));
 await assert.rejects(op.requestExit(),/already resolved/);
});
test('rejects missing owner, incomplete enumeration, and altered evidence',async()=>{
 for(const mode of ['owner','catalog','changed','readback']){
  const f=fixture();if(mode==='owner')f.setOwner(false);if(mode==='catalog')f.setSessions({complete:false});
  if(mode==='readback')f.deps.ledger.readPrepared=async()=>({});
  const manager=f.make();
  if(mode==='owner'||mode==='catalog'){await assert.rejects(manager.prepare(id,{cookie:'x'}));assert.equal(f.exits,0);continue;}
  const op=await manager.prepare(id,{cookie:'x'});if(mode==='changed')f.setChanged(true);
  await assert.rejects(op.requestExit());assert.equal(f.exits,0);assert.equal(f.released,1);
 }
});
test('lost owner after admission preserves the receipt and releases the freeze',async()=>{
 const f=fixture(),op=await f.make().prepare(id,{cookie:'x'});f.setOwner(false);
 await assert.rejects(op.requestExit(),/owner/);assert.equal(f.saved.state,'prepared');assert.equal(f.released,1);assert.equal(f.exits,0);
});
test('partial or changed owner evidence cannot authorize stop',async()=>{for(const value of [true,{}, {nonceHash:'a'.repeat(64),fenceInfoHash:'b'.repeat(64),holderPid:1}]){const f=fixture();f.setOwner(value);await assert.rejects(f.make().prepare(id,{cookie:'x'}),/owner/);assert.equal(f.exits,0);}const f=fixture(),op=await f.make().prepare(id,{cookie:'x'});f.setOwner({nonceHash:'a'.repeat(64),fenceInfoHash:'c'.repeat(64),holderPid:14,holderTicks:'123'});await assert.rejects(op.requestExit(),/owner/);assert.equal(f.exits,0);});
