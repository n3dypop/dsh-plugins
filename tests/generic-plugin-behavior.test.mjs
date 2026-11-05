import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hostConfiguration} from '../apps/dsh-plugins/studio-host/config.mjs';
import {createRestartManager} from '../apps/dsh-plugins/studio-host/restart-manager.mjs';
import {paths,atomicJson,readJournal} from '../apps/dsh-plugins/studio-host/restart-state.mjs';

async function fixture(t){
  const base=await realpath(resolve(tmpdir())),root=await mkdtemp(join(base,'dsh-plugin-behavior-'));
  t.after(async()=>{assert.equal(await realpath(root),root);assert.ok(root.startsWith(base+sep));await rm(root,{recursive:true,force:false});});
  const state={revision:'a'.repeat(64),local:{running:0,queued:1,queuedMessages:2},changed:false,cancellations:0,workers:0,exits:0,flushes:0};
  const epoch={pid:101,startTimeUtcTicks:'639293000000000000',executable:join(root,'fixture-node'),url:'http://127.0.0.1:39985'};
  const adapter={pid:101,localState:()=>({...state.local}),
    async verify(_context,{mode='normal'}={}){if(mode==='normal'&&(state.local.running||state.local.queued))throw Object.assign(Error('Normal restart preserves pending input'),{status:409});return{local:{...state.local},epoch,...(mode==='force'?{revision:state.revision,affected:{runningSessions:state.local.running,queuedSessions:state.local.queued,queuedMessages:state.local.queuedMessages,totalSessions:state.local.queued}}:{})};},
    freeze:()=>({changed:()=>state.changed,release(){},disposing(){}}),
    async cancelConfirmed(revision,_freeze,onStarted){assert.equal(revision,state.revision);const journal=await readJournal(root);assert.equal(journal.operations.length,1);assert.equal(journal.operations[0].state,'prepared');assert.equal(journal.operations[0].cancelledConfirmed,undefined);onStarted();state.cancellations++;state.local={running:0,queued:0,queuedMessages:0};},
    async flush(){state.flushes++;},
    async spawnWorker(operation){state.workers++;await atomicJson(root,paths(root).ready(operation.requestId),{requestId:operation.requestId,nonce:operation.workerNonce,pid:4242});return{pid:4242};},
    exit(){state.exits++;},
  };
  const manager=await createRestartManager({root,adapter});
  const context={cookie:'synthetic-cookie-not-for-receipts'};
  async function intent(){const preview=await manager.preview(context,{mode:'force'});return{preview,body:{mode:'force',previewId:preview.previewId,requestId:randomUUID()}};}
  return{root,state,manager,context,intent};
}

test('host configuration requires a managed launcher and can require an integration policy',()=>{
  const home=resolve(tmpdir(),'dsh-public-host-config'),input={runtimeRoot:home,launcher:{executable:'fixture-launcher',args:['--fixture'],cwd:home}};
  const value=hostConfiguration(input);assert.equal(value.runtimeRoot,home);assert.equal(value.port,3080);
  value.launcher.args.push('changed');assert.deepEqual(input.launcher.args,['--fixture']);
  assert.throws(()=>hostConfiguration({runtimeRoot:home}),/launcher/);
  assert.throws(()=>hostConfiguration({...input,requirePolicy:true}),/policyModule/);
  assert.throws(()=>hostConfiguration({...input,unexpected:true}),/unknown field/);
  assert.throws(()=>hostConfiguration({...input,port:80}),/port/);
});
test('normal restart preserves queued input and force refuses a changed confirmed revision',async t=>{
  const f=await fixture(t);await assert.rejects(f.manager.preview(f.context),/preserves pending/);
  const {preview,body}=await f.intent();assert.equal(preview.affected.queuedMessages,2);f.state.revision='b'.repeat(64);
  await assert.rejects(f.manager.restart(body,f.context));assert.equal(f.state.cancellations,0);assert.equal(f.state.workers,0);assert.equal(f.state.exits,0);assert.equal(f.state.local.queuedMessages,2);
});
test('force admission saves its receipt before cancellation and reuses the same request without another worker',async t=>{
  const f=await fixture(t),{body}=await f.intent(),first=await f.manager.restart(body,f.context);
  assert.equal(first.created,true);assert.equal(first.operation.mode,'force');assert.equal(first.operation.affected.queuedMessages,2);
  const repeated=await f.manager.restart(body,f.context);assert.equal(repeated.created,false);assert.equal(f.state.cancellations,1);assert.equal(f.state.workers,1);
  await assert.rejects(f.manager.restart({...body,mode:'normal'},f.context));
  const saved=(await readJournal(f.root)).operations[0];assert.equal(saved.cancelledConfirmed,true);assert.equal(saved.flushConfirmed,true);assert.equal(saved.resourcesQuiescent,true);
  assert.equal((await readFile(paths(f.root).journal,'utf8')).includes(f.context.cookie),false);
  await f.manager.commitExit(body.requestId);assert.equal(f.state.exits,1);
});
test('new input after force admission cancels exit instead of widening the cancellation target',async t=>{
  const f=await fixture(t),{body}=await f.intent();await f.manager.restart(body,f.context);
  f.state.local={running:0,queued:1,queuedMessages:1};f.state.changed=true;await f.manager.commitExit(body.requestId);
  assert.equal(f.state.exits,0);assert.equal(f.state.cancellations,1);assert.equal(f.state.local.queuedMessages,1);
  const saved=(await readJournal(f.root)).operations[0];assert.equal(saved.state,'cancelled');assert.equal(saved.exitArmedAt,undefined);
});
test('a shared lifecycle lock prevents force admission before any input cancellation',async t=>{
  const f=await fixture(t),{body}=await f.intent();await atomicJson(f.root,paths(f.root).lock,{kind:'services',requestId:randomUUID()});
  await assert.rejects(f.manager.restart(body,f.context));assert.equal(f.state.cancellations,0);assert.equal(f.state.workers,0);assert.equal(f.state.exits,0);
});
