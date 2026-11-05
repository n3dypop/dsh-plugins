import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,realpath,readFile,access} from 'node:fs/promises';
import {resolve,join,sep,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {createRuntimeAdapter} from '../apps/dsh-plugins/studio-host/runtime-adapter.mjs';
import {createRestartManager} from '../apps/dsh-plugins/studio-host/restart-manager.mjs';
import {paths,atomicJson,readJournal} from '../apps/dsh-plugins/studio-host/restart-state.mjs';

const tick=()=>new Promise(done=>setImmediate(done));
const until=async predicate=>{const deadline=Date.now()+2000;while(Date.now()<deadline){if(predicate())return;await new Promise(done=>setTimeout(done,1));}assert.fail('Fixture did not reach its boundary');};

async function fixture(t){
  const base=await realpath(tmpdir()),root=await mkdtemp(join(base,'dsh-host-disposal-'));
  const state={held:0,released:0,workers:0,exits:0,ready:true,flush:async()=>{},verify:async()=>{},beforeWrite:async()=>{},persistFailure:false,failCancellationWrites:false,onExit:null};
  const routes=new Map(),abort=new AbortController();
  const agent={status:'idle',inbox:{hasPending:false,nextTurn:[],nextStep:[]},runMaintenance(fn){state.held++;return fn(abort.signal).then(()=>{state.released++;});}};
  const ctx={agents:{list:()=>[agent]},sessions:{list:()=>[]},sessionPersistence:{flush:async()=>{}},connection:{fetch:{register(route){routes.set(route.path,route);return()=>routes.delete(route.path);}}},on(){return()=>{};},appExit(){state.exits++;state.onExit?.();}};
  const actual=await createRuntimeAdapter({root,ctx,settings:{nodeExecutable:process.execPath,port:39985},launcher:{executable:'fixture-only',args:[],cwd:root},workerPath:join(root,'fixture-only.mjs')});
  const epoch={pid:101,startTimeUtcTicks:'639293000000000000',executable:process.execPath,url:'http://127.0.0.1:39985'};
  const adapter={...actual,async verify(_context,{mode}={}){await state.verify();return{epoch,local:{running:0,queued:0},...(mode==='force'?{revision:'a'.repeat(64),affected:{runningSessions:0,queuedSessions:0,queuedMessages:0,totalSessions:0}}:{})};},flush:()=>state.flush(),cancelConfirmed:async()=>{},async spawnWorker(operation){state.workers++;if(state.ready)await atomicJson(root,paths(root).ready(operation.requestId),{requestId:operation.requestId,nonce:operation.workerNonce,pid:4242});return{pid:4242};}};
  const manager=await createRestartManager({root,adapter,writeJournal:async(...args)=>{await state.beforeWrite(args[2]);if(state.persistFailure||state.failCancellationWrites&&args[2].operations.some(operation=>operation.state==='cancelled'))throw Error('fixture persistence failure');return atomicJson(...args);}});
  const intent=async(mode='normal')=>{const preview=await manager.preview({},{mode});return{requestId:randomUUID(),previewId:preview.previewId,...(mode==='force'?{mode}:{})};};
  t.after(async()=>{state.persistFailure=false;abort.abort();await manager.dispose();await tick();assert.ok(root.startsWith(base+sep)&&basename(root).startsWith('dsh-host-disposal-'));assert.equal(await realpath(root),root);await rm(root,{recursive:true,force:false});});
  return{root,state,routes,manager,intent};
}

test('unload after handshake durably cancels its own restart and releases actual maintenance holds',async t=>{
  const f=await fixture(t),body=await f.intent();await f.manager.restart(body,{});
  assert.equal(f.state.held,1);assert.equal(f.state.released,0);assert.ok(f.routes.size);
  assert.equal((await f.manager.dispose()).state,'cancelled');await f.manager.commitExit(body.requestId);await tick();
  const saved=(await readJournal(f.root)).operations[0];
  assert.equal(saved.state,'cancelled');assert.equal(saved.cancelledBeforeExitDispatch,true);assert.equal(saved.workerPid,4242);assert.ok(saved.workerNonce);
  assert.equal(f.state.exits,0);assert.equal(f.state.released,1);assert.equal(f.routes.size,0);
  await assert.rejects(access(paths(f.root).lock),{code:'ENOENT'});
});

test('unload interrupts a pending pre-exit flush without starting a worker or losing the cancellation receipt',async t=>{
  const f=await fixture(t),body=await f.intent();let flushing=false;
  f.state.flush=()=>{flushing=true;return new Promise(()=>{});};
  const work=f.manager.restart(body,{});await until(()=>flushing);
  const rejected=assert.rejects(work,/無効化/);await f.manager.dispose();await rejected;await tick();
  assert.equal(f.state.workers,0);assert.equal(f.state.exits,0);assert.equal(f.state.released,1);assert.equal(f.routes.size,0);
  assert.equal((await readJournal(f.root)).operations[0].state,'cancelled');
  await assert.rejects(access(paths(f.root).lock),{code:'ENOENT'});
});

test('unload while awaiting a worker handshake records cancellation without waiting for its deadline',async t=>{
  const f=await fixture(t),body=await f.intent();f.state.ready=false;
  const work=f.manager.restart(body,{});await until(()=>f.state.workers===1);
  const rejected=assert.rejects(work,/無効化/);await f.manager.dispose();await rejected;await tick();
  assert.equal((await readJournal(f.root)).operations[0].state,'cancelled');assert.equal(f.state.exits,0);assert.equal(f.state.released,1);
});

test('unload during exit verification cancels instead of dispatching exit after a late result',async t=>{
  const f=await fixture(t),body=await f.intent();await f.manager.restart(body,{});let verifying=false,finish;
  f.state.verify=()=>{verifying=true;return new Promise(done=>{finish=done;});};
  const exit=f.manager.commitExit(body.requestId);await until(()=>verifying);await f.manager.dispose();await exit;finish();await tick();
  assert.equal(f.state.exits,0);assert.equal(f.state.released,1);assert.equal((await readJournal(f.root)).operations[0].state,'cancelled');
});

test('unload after native exit dispatch preserves the worker handoff, identity and lock',async t=>{
  const f=await fixture(t),body=await f.intent('force');await f.manager.restart(body,{});
  f.state.onExit=()=>{void f.manager.dispose();};await f.manager.commitExit(body.requestId);await f.manager.dispose();
  const saved=(await readJournal(f.root)).operations[0];
  assert.equal(f.state.exits,1);assert.equal(saved.state,'exiting');assert.ok(saved.exitArmedAt);assert.equal(saved.cancelledConfirmed,true);
  assert.equal(saved.cancelledBeforeExitDispatch,undefined);assert.equal(f.state.released,0);await access(paths(f.root).lock);
});

test('failed cancellation persistence remains unknown and retains protection without unhandled disposer rejection',async t=>{
  const f=await fixture(t),body=await f.intent();await f.manager.restart(body,{});f.state.persistFailure=true;
  assert.equal((await f.manager.dispose()).state,'unknown');await tick();
  assert.equal((await readJournal(f.root)).operations[0].state,'exiting');assert.equal(f.state.exits,0);assert.equal(f.state.released,0);assert.ok(f.routes.size);await access(paths(f.root).lock);
});

test('cancelling an admitted operation never removes a replacement lifecycle lock',async t=>{
  const f=await fixture(t),body=await f.intent();await f.manager.restart(body,{});
  const foreign={kind:'services',requestId:randomUUID(),ownerPid:777};await atomicJson(f.root,paths(f.root).lock,foreign);
  await f.manager.dispose();assert.deepEqual(JSON.parse(await readFile(paths(f.root).lock,'utf8')),foreign);assert.equal(f.state.released,1);assert.equal(f.state.exits,0);
});

test('background exit cancellation handles persistence failure without rejecting an unawaited timer callback',async t=>{
  const f=await fixture(t),body=await f.intent();await f.manager.restart(body,{});
  f.state.verify=async()=>{throw Error('fixture identity unavailable');};f.state.persistFailure=true;
  assert.equal((await f.manager.commitExit(body.requestId)).state,'unknown');
  assert.equal(f.state.exits,0);assert.equal(f.state.released,0);assert.equal((await readJournal(f.root)).operations[0].state,'exiting');await access(paths(f.root).lock);
});

test('post-spawn cancellation persistence failure retains exact guards and reports unknown before active transfer',async t=>{
  const f=await fixture(t),body=await f.intent();let writing=false,finish;
  f.state.beforeWrite=journal=>{
    if(journal.operations.some(operation=>operation.workerPid===4242)&&!writing){writing=true;return new Promise(done=>{finish=done;});}
  };
  const work=f.manager.restart(body,{});await until(()=>writing);
  const rejected=assert.rejects(work,error=>error.uncertain===true);
  const cleanup=f.manager.dispose();f.state.failCancellationWrites=true;finish();
  assert.equal((await cleanup).state,'unknown');await rejected;await tick();
  const saved=(await readJournal(f.root)).operations[0];
  assert.equal(saved.state,'prepared');assert.equal(saved.workerPid,4242);assert.ok(saved.workerNonce);
  assert.equal(f.state.exits,0);assert.equal(f.state.released,0);assert.ok(f.routes.size);
  const lock=JSON.parse(await readFile(paths(f.root).lock,'utf8'));assert.equal(lock.requestId,body.requestId);assert.equal(lock.kind,'dsh-restart');
});
