// Read-only catalog candidate for the DSH 0.2.2-rc.1 JSONL backend. The
// configured backend identity verifier must confirm the *active* service,
// not merely that the package is installed. Not connected to a live route.
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

export function assertNoPendingInbox(events){
 const queues={'next-turn':[],'next-step':[]};
 for(const event of events){if(event?.type!=='agent/inbox/spliced')continue;const s=event.data,q=queues[s?.target],removed=s?.removedCount??0;if(!q||!Number.isSafeInteger(s.start)||s.start<0||s.start>q.length||!Number.isSafeInteger(removed)||removed<0||s.start+removed>q.length||!Array.isArray(s.inserted)||s.inserted.some(m=>!m||typeof m.id!=='string'||!m.id))throw Error('Invalid persisted inbox');q.splice(s.start,removed,...s.inserted);const ids=[...queues['next-turn'],...queues['next-step']].map(m=>m.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate inbox identity');}
 if(queues['next-turn'].length||queues['next-step'].length)throw Error('Pending persisted input');
}
function assertClosedTurns(events){let open=null;for(const event of events){if(event.type==='turn/start'){if(open!==null||!Number.isSafeInteger(event.data?.turn))throw Error('Session turn history is incomplete');open=event.data.turn;}else if(event.type==='turn/end'){if(open===null||event.data?.turn!==open)throw Error('Session turn history is inconsistent');open=null;}}if(open!==null)throw Error('Session turn remains open');}
export function createJsonlSessionReader({ctx,runtimeDirectory,port,verifyBackend,fetcher=fetch}){
 if(!ctx?.sessions?.list||!ctx?.sessionPersistence?.list||!ctx?.sessionQuery?.observeSession||!Number.isInteger(port)||port<1024||port>65535||typeof verifyBackend!=='function'||typeof runtimeDirectory!=='string')throw TypeError('JSONL catalog dependencies are incomplete');
 const require=createRequire(join(resolve(runtimeDirectory),'package.json'));
 if(require('@deepseek-ai/dsh-session-persistence-jsonl/package.json').version!=='0.2.2-rc.1'||require('@deepseek-ai/dsh-agent-loop/package.json').version!=='0.2.2-rc.1')throw Error('Unsupported DSH JSONL version');
 return async context=>{
  if(typeof context?.cookie!=='string'||!context.cookie||await verifyBackend()!==true)throw Error('DSH JSONL backend identity is unconfirmed');
  const rpcId=randomUUID(),response=await fetcher(`http://127.0.0.1:${port}/api/session/list`,{method:'POST',headers:{Cookie:context.cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'client-request',rpcId,method:'session/list',payload:{args:{_request:{}}}}),signal:AbortSignal.timeout(5000),redirect:'error'});
  if(!response.ok)throw Error('DSH session catalog is unavailable');const body=await response.json(),value=body?.result?.value;
  if(body?.rpcId!==rpcId||body.result?.ok!==true||!Array.isArray(value?.items)||value.hasMore===true||value.nextCursor||value.items.some(item=>typeof item.sessionId!=='string'||!item.sessionId||item.running!==false))throw Error('DSH session catalog is incomplete or busy');
  const ids=value.items.map(item=>item.sessionId).sort(),stored=(await ctx.sessionPersistence.list()).map(item=>item.header?.id).sort(),loaded=ctx.sessions.list();
  if(new Set(ids).size!==ids.length||stored.some(id=>typeof id!=='string'||!id)||new Set(stored).size!==stored.length||JSON.stringify(ids)!==JSON.stringify(stored)||!Array.isArray(loaded)||loaded.some(session=>!ids.includes(session.id)))throw Error('DSH session catalogs differ');
  const sessions=[];
  for(const id of ids){let observed;try{observed=await ctx.sessionQuery.observeSession(id,{signal:AbortSignal.timeout(5000),projectionMode:'none'});const events=observed?.events;if(!Array.isArray(events)||events.length>100000||events.some((event,index)=>event?.seq!==index))throw Error('Session history is incomplete');assertNoPendingInbox(events);assertClosedTurns(events);const current=loaded.find(session=>session.id===id);if(current&&current.seq!==events.length)throw Error('Session changed during observation');
   const stateId=randomUUID(),stateResponse=await fetcher(`http://127.0.0.1:${port}/api/session/state`,{method:'POST',headers:{Cookie:context.cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:stateId,method:'session/state',payload:{args:{request:{sessionId:id}}}}),signal:AbortSignal.timeout(5000),redirect:'error'});if(!stateResponse.ok)throw Error('DSH session state unavailable');const stateBody=await stateResponse.json(),state=stateBody?.result?.value;
   if(stateBody?.rpcId!==stateId||stateBody.result?.ok!==true||!state||state.running!==false||typeof state.active!=='boolean'||state.cursor!==events.length-1||!Array.isArray(state.pendingInput)||state.pendingInput.length||!(state.queue===null&&!state.active||Array.isArray(state.queue)&&state.queue.length===0&&state.active))throw Error('DSH session state is incomplete or has pending input');
   sessions.push({id,sequence:events.length,persistedHash:createHash('sha256').update(JSON.stringify(events)).digest('hex')});}finally{observed?.[Symbol.dispose]?.();}}
  const after=(await ctx.sessionPersistence.list()).map(item=>item.header?.id).sort();if(JSON.stringify(ids)!==JSON.stringify(after)||await verifyBackend()!==true)throw Error('DSH session catalog changed');
  return {complete:true,running:0,queued:0,sessions};
 };
}
