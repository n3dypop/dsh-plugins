import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRuntimeConfig,runtimeRootOf} from '../shared/plugin-config.mjs';
import {digest,readQueue,writeQueue,describeDeletion,blockers,identity,noLinks} from './session-store.mjs';
import {createWorkspaceVisuals,workspaceVisualsHandler,WORKSPACE_PATH,acquireWorkspaceLock} from './workspace-visuals.mjs';

export const name='studio-sessions',inject=['connection','sessionPersistence','sessions','agents','workspaceRegistry'];
export const Config=createRuntimeConfig();
export const PATH='/api/local-studio/sessions';
// The shared managed runtime and offline deletion journal belong to Web.
// Desktop has an independent session store and must never mount these routes.
// Electron Node mode is rejected conservatively, including any experimental
// Electron-hosted Web profile whose identity cannot be distinguished here.
export function assertWebSessionHost(versions=process.versions){
  if(versions?.electron)throw new Error('Session Library is available only in the managed Web Host.');
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const response=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const refuse=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export function createLibrary({root,list,live,now=()=>Date.now(),uuidFactory=randomUUID}){
  const previews=new Map();let tail=Promise.resolve();
  const exclusive=operation=>{const current=tail.then(operation);tail=current.catch(()=>{});return current;};
  const busy=id=>{const value=live(id);return Boolean(value?.running||value?.pending);};
  async function headers(){return (await list()).map(record=>record.header);}
  const receipts=queue=>queue.requests.map(({id,requestedAt,state,sessions,error})=>({id,requestedAt,state,count:sessions.length,sessionIds:sessions.map(s=>s.sessionId),...(error?{error}:{}),results:sessions.map(s=>({sessionId:s.sessionId,state:s.state??state,error:s.error??null}))}));
  async function snapshot(){const current=await headers(),queue=await readQueue(root);return {revision:digest(current.map(h=>[identity(h),live(h.id)])),sessions:current.map(h=>({sessionId:h.id,createdAt:h.createdAt,busy:busy(h.id),origin:h.origin??null,dependencies:blockers(current,h.id),pending:queue.requests.some(q=>q.state==='pending'&&q.sessions.some(s=>s.sessionId===h.id))})),requests:receipts(queue)};}
  async function prepare(input){
    if(!Array.isArray(input.sessionIds)||!input.sessionIds.length||input.sessionIds.length>100||new Set(input.sessionIds).size!==input.sessionIds.length||input.sessionIds.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]+$/.test(id)||id.length>220))refuse('削除対象の指定が不正です。',400);
    for(const [id,value] of previews)if(value.expiresAt<now())previews.delete(id);
    const current=await headers(),queue=await readQueue(root),entries=[];
    for(const id of input.sessionIds){if(queue.requests.some(q=>q.state==='pending'&&q.sessions.some(s=>s.sessionId===id)))refuse('既に削除予約されているセッションがあります。');const header=current.find(h=>h.id===id);if(!header)refuse('対象のセッションが見つかりません。');try{entries.push(await describeDeletion(root,header,current,{busy:busy(id)}));}catch(e){refuse(e.message);}}
    const id=uuidFactory(),value={id,expiresAt:now()+300000,entries};previews.set(id,value);
    return {previewId:id,count:entries.length,sessionIds:entries.map(e=>e.sessionId),bytes:entries.reduce((n,e)=>n+e.files.reduce((s,f)=>s+f.bytes,0),0),expiresAt:value.expiresAt,requiresRestart:true,preserves:['shared attachments','external inputs and outputs','models']};
  }
  async function schedule(input){
    if(!uuid.test(input.requestId??'')||!uuid.test(input.previewId??''))refuse('操作IDが不正です。',400);
    const queue=await readQueue(root),prior=queue.requests.find(q=>q.id===input.requestId);if(prior){if(prior.previewId!==input.previewId)refuse('操作IDは別の予約で使用済みです。');return {request:receipts({requests:[prior]})[0],reused:true};}
    const preview=previews.get(input.previewId);if(!preview||preview.expiresAt<now())refuse('削除対象の確認期限が切れました。もう一度対象を確認してください。');
    const current=await headers();for(const expected of preview.entries){const header=current.find(h=>h.id===expected.sessionId);if(!header||digest(identity(header))!==digest(expected.identity))refuse('セッションの識別情報が変わりました。');if(queue.requests.some(q=>q.state==='pending'&&q.sessions.some(s=>s.sessionId===expected.sessionId)))refuse('既に予約済みです。');const observed=await describeDeletion(root,header,current,{busy:busy(expected.sessionId)});if(digest(observed)!==digest(expected))refuse('確認後に会話が更新されました。削除対象を再確認してください。');}
    const request={id:input.requestId,previewId:input.previewId,requestedAt:new Date(now()).toISOString(),state:'pending',sessions:preview.entries.map(e=>({...e,state:'pending'}))};queue.requests.push(request);await writeQueue(root,queue);previews.delete(input.previewId);return {request:receipts({requests:[request]})[0],reused:false};
  }
  async function cancel(input){if(!uuid.test(input.requestId??''))refuse('操作IDが不正です。',400);const queue=await readQueue(root),request=queue.requests.find(q=>q.id===input.requestId);if(!request)refuse('削除予約が見つかりません。',404);if(request.state==='cancelled')return {request:receipts({requests:[request]})[0]};if(request.state!=='pending')refuse('この削除予約は取消できません。');request.state='cancelled';for(const entry of request.sessions)entry.state='cancelled';await writeQueue(root,queue);return {request:receipts({requests:[request]})[0]};}
  return {snapshot,mutate:input=>exclusive(async()=>{
    const lockPath=join(root,'runtime/Studio-services.lock');await noLinks(root,lockPath,{missing:true});await mkdir(join(root,'runtime'),{recursive:true});let release;
    try{release=await acquireWorkspaceLock(lockPath,{service:'Session Library',pid:process.pid,nonce:randomUUID()});}catch{refuse('サービス操作または再起動の準備中です。完了後に削除予約を操作してください。');}
    try{if(input?.action==='preview')return await prepare(input);if(input?.action==='schedule')return await schedule(input);if(input?.action==='cancel')return await cancel(input);refuse('未対応のセッション操作です。',400);}finally{await release();}
  })};
}
export function libraryHandler({library,origin}){return async request=>{try{const url=new URL(request.url);if(url.search)return response(400,{error:'要求が不正です。'});if(request.method==='GET')return response(200,await library.snapshot());if(request.method!=='POST')return response(405,{error:'未対応の操作です。'});if(request.headers.get('origin')!==origin||request.headers.get('x-local-studio-sessions')!=='1'||!(request.headers.get('content-type')??'').startsWith('application/json')||request.headers.get('sec-fetch-site')==='cross-site')return response(403,{error:'DSH画面からの本人操作を確認できません。'});return response(200,await library.mutate(await request.json()));}catch(e){return response(e.status??503,{error:e.status?e.message:'セッション操作の結果を確認できません。状態を再読込してください。'});}};}
export async function apply(ctx,config){
  assertWebSessionHost();
  const root=runtimeRootOf(config),settings=JSON.parse(await readFile(join(root,'config/environment.json'),'utf8'));
  if(settings.dshHome!=='data/dsh'||!Number.isInteger(settings.dshPort))throw Error('Session Library requires the verified runtime session layout');
  const library=createLibrary({root,list:()=>ctx.sessionPersistence.list(),live:id=>{const agent=ctx.agents.get(id),session=ctx.sessions.get(id);return {running:agent?.status==='running',pending:Boolean(agent?.inbox?.hasPending),seq:session?.seq??null};}});
  ctx.effect(()=>ctx.connection.fetch.register({path:PATH,methods:['GET','POST'],requestBody:'buffered',fetch:libraryHandler({library,origin:`http://127.0.0.1:${settings.dshPort}`})}));
  const visuals=createWorkspaceVisuals({root,list:()=>ctx.workspaceRegistry.list()});
  ctx.effect(()=>ctx.connection.fetch.register({path:WORKSPACE_PATH,methods:['GET','POST'],requestBody:'buffered',fetch:workspaceVisualsHandler({store:visuals,origin:`http://127.0.0.1:${settings.dshPort}`})}));
}
