import {join,resolve,win32} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {configuredFile} from '../shared/runtime-files.mjs';
import {probeWindowsEpoch,validateEpochEvidence} from '../shared/windows-epoch.mjs';
import {noLinks,fault,readJson} from './restart-state.mjs';

export const MUTATION_PATHS=['/api/session/prompt','/api/session/create','/api/session/fork','/api/session/updateQueue','/api/commands/execute','/api/subagents/prompt'];
const DEFAULT_BLOCKED_MESSAGE='保護対象の処理中はDSHを強制再起動できません。';

const sessionId=agent=>agent.session?.id??agent.id;
export function localState(ctx){const agents=ctx.agents.list();return {running:agents.filter(a=>a.status==='running').length,queued:agents.filter(a=>a.inbox.hasPending).length,queuedMessages:agents.reduce((n,a)=>n+(a.inbox.nextTurn?.length??0)+(a.inbox.nextStep?.length??0),0)};}
export function pendingGenerationTools(events,protectedTools=new Set()){const pending=new Map();for(const event of events){if(event.type==='tool/call')pending.set(event.data.callId,event.data.name);else if(event.type==='tool/result'&&event.surfaceOp==='append')pending.delete(event.data.message?.source?.callId);}return [...pending.values()].some(name=>protectedTools.has(name));}
// Async query snapshots seed this guard; the synchronous seq check closes the
// tool-POST race without introducing deprecated synchronous log reads.
export function forceImpact(ctx,observations,{protectedTools=new Set(),blockedMessage=DEFAULT_BLOCKED_MESSAGE}={}){const rows=ctx.agents.list().map(agent=>{const id=sessionId(agent),observed=observations.get(id),turn=agent.inbox.nextTurn,step=agent.inbox.nextStep;if(typeof id!=='string'||!observed||agent.session?.seq!==observed.seq||!Array.isArray(turn)||!Array.isArray(step)||!['idle','running'].includes(agent.status)||typeof agent.inbox.remove!=='function'||typeof agent.cancel!=='function'||typeof agent.whenIdle!=='function')throw fault('会話の確定状態を照合できません。対象を再確認してください。');if(pendingGenerationTools(observed.events,protectedTools))throw fault(blockedMessage);const messages=[...turn,...step].map(message=>{if(typeof message.id!=='string')throw fault('未処理入力の識別情報を確認できません。');return message.id;});if(agent.inbox.hasPending!==Boolean(messages.length))throw fault('未処理入力の状態が変わりました。');const activeTurn=agent.status==='running'?observed.events.filter(e=>e.type==='turn/start').at(-1):null;return {id,status:agent.status,activeTurn:activeTurn?{seq:activeTurn.seq,turn:activeTurn.data.turn}:null,turn:turn.map(m=>m.id),step:step.map(m=>m.id)};}).sort((a,b)=>a.id.localeCompare(b.id));if(new Set(rows.map(r=>r.id)).size!==rows.length)throw fault('会話の所有者が重複しています。');const affected={runningSessions:rows.filter(r=>r.status==='running').length,queuedSessions:rows.filter(r=>r.turn.length+r.step.length).length,queuedMessages:rows.reduce((n,r)=>n+r.turn.length+r.step.length,0),totalSessions:rows.filter(r=>r.status==='running'||r.turn.length+r.step.length).length};return {affected,revision:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),rows};}
export async function createRuntimeAdapter({root,ctx,settings,launcher,workerPath,policy=null,spawnProcess=spawn,probe=probeWindowsEpoch,fetcher=fetch}){
  root=resolve(root);
  if(!settings||typeof settings.nodeExecutable!=='string'||!Number.isInteger(settings.port)||settings.port<1024||settings.port>65535)throw TypeError('Explicit DSH host settings are required');
  if(policy&&(!(policy.protectedTools instanceof Set)||[...policy.protectedTools].some(name=>typeof name!=='string')||typeof policy.verifyExternal!=='function'||typeof policy.cancelOwnedInference!=='function'))throw TypeError('Invalid host restart policy');
  const observations=new Map(),protection={protectedTools:new Set(policy?.protectedTools??[]),blockedMessage:policy?.blockedMessage??DEFAULT_BLOCKED_MESSAGE};
  const impact=()=>forceImpact(ctx,observations,protection);
  ctx.on('session/event',(session,event)=>{const observed=observations.get(session.id);if(!observed)return;if(event.seq!==observed.seq){observations.delete(session.id);return;}observed.events.push(event);observed.seq=event.seq+1;});
  const executable=resolve(settings.nodeExecutable),url=`http://127.0.0.1:${settings.port}`;
  async function requestJson(address,options={}){const target=new URL(address);if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password)throw Error('Unexpected restart service address');const response=await fetcher(address,{...options,signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw fault('再起動前のサービス状態を照合できません。');return response.json();}
  async function observeAgents(){observations.clear();if(!ctx.sessionQuery?.observeSession)throw fault('会話の参照機能を確認できません。');for(const agent of ctx.agents.list()){let observed;try{observed=await ctx.sessionQuery.observeSession(sessionId(agent),{signal:AbortSignal.timeout(8000),projectionMode:'none'});if(!Array.isArray(observed.events))throw Error('Missing events');const events=[...observed.events],seq=events.length?events.at(-1).seq+1:0;observations.set(sessionId(agent),{events,seq});}finally{observed?.[Symbol.dispose]?.();}}return impact();}
  async function verify(context,{mode='normal',quiescent=false}={}){
    const local=localState(ctx);if(mode!=='force'){if(local.running)throw fault(`実行中の会話が${local.running}件あります。完了後に再起動してください。`);if(local.queued)throw fault(`未処理の入力がある会話が${local.queued}件あります。入力を保持するため再起動を保留します。`);}
    await noLinks(root,join(root,'runtime/DSH.json'));const record=await readJson(root,join(root,'runtime/DSH.json'));
    if(record?.service!=='DSH'||record.processId!==process.pid||record.url!==url||win32.normalize(record.executable).toLowerCase()!==win32.normalize(executable).toLowerCase()||win32.normalize(process.execPath).toLowerCase()!==win32.normalize(executable).toLowerCase())throw fault('このDSHが管理起動した実体と一致しません。再起動は行いません。');
    const epoch=validateEpochEvidence({pid:record.processId,startTimeUtcTicks:record.startTimeUtcTicks,executable:win32.normalize(executable).toLowerCase(),url},await probe({pid:record.processId,port:settings.port}));
    let observedImpact;
    if(mode==='force'){
      if(!context.cookie)throw fault('本人のDSH接続を確認できません。',403);
      const rpcId=randomUUID(),native=await requestJson(url+'/api/session/list',{method:'POST',headers:{Cookie:context.cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'client-request',rpcId,method:'session/list',payload:{args:{_request:{}}}})}),items=native.result?.value?.items;
      if(native.rpcId!==rpcId||native.result?.ok!==true||!Array.isArray(items)||items.some(item=>typeof item.running!=='boolean'))throw fault('DSHの会話状態を確認できません。');
      const owned=new Set(ctx.agents.list().map(sessionId));if(items.some(item=>item.running&&!owned.has(item.sessionId)))throw fault('所有者を確認できない実行中のDSH会話があります。');
      await policy?.verifyExternal(context,{mode,quiescent});observedImpact=await observeAgents();if(quiescent&&observedImpact.affected.queuedMessages)throw fault('確認後に入力が追加されました。');
    }else await policy?.verifyExternal(context,{mode,quiescent});

    const last=localState(ctx);if(mode!=='force'&&(last.running||last.queued))throw fault('会話の状態が変わりました。再起動を保留します。');
    return {local:last,epoch:{pid:epoch.pid,startTimeUtcTicks:epoch.startTimeUtcTicks,executable:epoch.executable,url:epoch.url},...(observedImpact?{affected:observedImpact.affected,revision:observedImpact.revision}:{})};
  }
  function freeze({mode='normal'}={}){
    let changed=false,released=false;const disposers=[],holds=[],releases=[];
    try{
      for(const path of MUTATION_PATHS)disposers.push(ctx.connection.fetch.register({path,methods:['POST'],requestBody:'buffered',fetch:()=>new Response(JSON.stringify({error:'DSHを再起動中です。再接続後に入力してください。'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}));
      disposers.push(ctx.on('agent/created',()=>{throw fault('DSHを再起動中です。');}));
      disposers.push(ctx.on('session/created',()=>{throw fault('DSHを再起動中です。');}));
      disposers.push(ctx.on('agent/inbox/inserted',()=>{changed=true;}));
      if(mode==='force')disposers.push(ctx.on('session/event',(_session,event)=>{if(event.type==='turn/start'||event.type==='tool/call'&&protection.protectedTools.has(event.data?.name))changed=true;}));
      for(const agent of ctx.agents.list()){
        if(agent.status!=='idle'||agent.inbox.hasPending){if(mode==='force')continue;throw fault('未処理または実行中の会話があります。');}
        const held=agent.runMaintenance(signal=>new Promise(resolve=>{releases.push(resolve);signal.addEventListener('abort',resolve,{once:true});}));holds.push(held);held.catch(()=>{changed=true;});
      }
    }catch(error){for(const release of releases)release();for(const dispose of disposers.reverse())dispose?.();throw error;}
    return {changed:()=>changed||(mode!=='force'&&(localState(ctx).running>0||localState(ctx).queued>0)),release(){if(released)return;released=true;for(const dispose of disposers.reverse())dispose?.();for(const release of releases)release();}};
  }
  async function cancelConfirmed(revision,freeze,onCancellationStarted=()=>{}){const currentImpact=impact();if(currentImpact.revision!==revision||freeze.changed())throw fault('確認後に会話または未処理入力が変わりました。再確認してください。');const agents=ctx.agents.list().filter(agent=>agent.status==='running'||agent.inbox.hasPending),byId=new Map(currentImpact.rows.map(row=>[row.id,row]));
    // Deliberately no await between the final revision/tool guard and cancel.
    // A synchronous inbox/discarded or abort listener can insert new input.
    // Remove only confirmed message identities, then abort with keepInbox;
    // never call the public bulk-clear default during force admission.
    for(const agent of agents){const row=byId.get(sessionId(agent));for(const id of [...row.step,...row.turn]){onCancellationStarted();if(!agent.inbox.remove(id))throw fault('確認済みの入力の状態が変わりました。');if(freeze.changed())throw fault('確認後の新しい入力を保持し、再起動を中止しました。');}if(freeze.changed())throw fault('確認後の新しい入力を保持し、再起動を中止しました。');const current=impact().rows.find(r=>r.id===row.id);if(current.status==='running'&&JSON.stringify(current.activeTurn)!==JSON.stringify(row.activeTurn))throw fault('確認後に別の会話ターンが始まったため、再起動を中止しました。');onCancellationStarted();agent.cancel({kind:'user'},{keepInbox:true});if(freeze.changed())throw fault('確認後の新しい入力を保持し、再起動を中止しました。');}
    await policy?.cancelOwnedInference({agents,observations});
    // A non-cooperative DSH agent must not make the force option wait forever.
    // Resource quiescence is checked separately before the worker can be armed.
    let timer;await Promise.race([Promise.all(agents.map(a=>a.whenIdle())),new Promise(resolve=>{timer=setTimeout(resolve,1500);})]).finally(()=>clearTimeout(timer));
    return {affected:currentImpact.affected};
  }
  return {pid:process.pid,workerConfiguration:()=>({host:{nodeExecutable:executable,port:settings.port},launcher:structuredClone(launcher)}),localState:()=>localState(ctx),verify,freeze,cancelConfirmed,async flush(){for(const session of ctx.sessions.list())await ctx.sessions.flush(session);await ctx.sessionPersistence.flush();},
    async spawnWorker(operation){const helper=await configuredFile(workerPath);return new Promise((done,fail)=>{const child=spawnProcess(executable,[helper,'--root',root,'--request',operation.requestId],{cwd:root,windowsHide:true,detached:true,stdio:'ignore',shell:false});child.once('error',()=>fail(Error('再起動補助プロセスを開始できません。')));child.once('spawn',()=>{child.unref();done({pid:child.pid});});});},exit(){ctx.appExit(0);}};
}
