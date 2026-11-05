import {readFile,open,unlink,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {digest,noLinks,atomicJson} from './session-store.mjs';
import {UNCATEGORIZED_ID,validateVisual} from './workspace-catalog.mjs';

export const WORKSPACE_PATH='/api/local-studio/workspace-visuals';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const revision=/^[a-f0-9]{64}$/;
const fault=(message,status=409)=>Object.assign(Error(message),{status});
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const copy=value=>structuredClone(value);
const defaults=()=>({schemaVersion:1,workspaces:{},operations:[]});
export async function acquireWorkspaceLock(path,record,{openFile=open,removeFile=unlink}={}){
  let handle;
  try{handle=await openFile(path,'wx',0o600);await handle.writeFile(JSON.stringify(record));await handle.sync();}
  catch(error){if(handle){try{await handle.close();}finally{await removeFile(path);}}throw error;}
  let released=false;return async()=>{if(released)return;released=true;try{await handle.close();}finally{await removeFile(path);}};
}
export function validateDocument(value){
  if(!object(value)||value.schemaVersion!==1||!object(value.workspaces)||!Array.isArray(value.operations))throw Error('Unsupported workspace appearance schema');
  for(const [id,entry] of Object.entries(value.workspaces)){
    if((id!==UNCATEGORIZED_ID&&!/^[A-Za-z0-9_-]{1,220}$/.test(id))||!object(entry))throw Error('Invalid workspace appearance record');
    if(Object.hasOwn(entry,'visual'))validateVisual(entry.visual);
  }
  for(const operation of value.operations)if(!object(operation)||!uuid.test(operation.requestId)||!revision.test(operation.signature)||!['save','reset'].includes(operation.action)||typeof operation.workspaceId!=='string')throw Error('Invalid workspace appearance receipt');
  return value;
}
export function createWorkspaceVisuals({root,list,now=()=>new Date().toISOString()}){
  const path=join(root,'data/session-library/workspace-visuals.json'),lockPath=join(root,'data/session-library/workspace-visuals.lock');let tail=Promise.resolve();
  async function read(){await noLinks(root,path,{missing:true});try{const text=await readFile(path,'utf8');if(Buffer.byteLength(text)>8*1024*1024)throw Error('Workspace appearance store is too large');return validateDocument(JSON.parse(text));}catch(e){if(e.code==='ENOENT')return defaults();throw e;}}
  async function targets(){const native=await list();if(!Array.isArray(native))throw Error('Workspace registry unavailable');return [{workspaceId:UNCATEGORIZED_ID,identity:digest({type:'uncategorized'}),uncategorized:true},...native.map(workspace=>{if(typeof workspace.id!=='string'||!/^[A-Za-z0-9_-]{1,220}$/.test(workspace.id)||typeof workspace.path!=='string'||typeof workspace.createdAt!=='string')throw Error('Unsupported workspace identity');return {workspaceId:workspace.id,title:workspace.title,identity:digest({id:workspace.id,path:workspace.path,createdAt:workspace.createdAt})};})];}
  function result(document,items){const styles={};for(const target of items){const record=document.workspaces[target.workspaceId];styles[target.workspaceId]=record?.visual?validateVisual(record.visual):{icon:null,color:null};}return {schemaVersion:1,revision:digest(document),targets:items,styles,operations:document.operations.map(({requestId,workspaceId,action,completedAt})=>({requestId,workspaceId,action,completedAt}))};}
  async function snapshot(){const [document,items]=await Promise.all([read(),targets()]);return result(document,items);}
  async function mutate(input){
    if(!object(input)||Object.keys(input).some(key=>!['action','workspaceId','expectedRevision','expectedIdentity','visual','requestId'].includes(key))||!['save','reset'].includes(input.action)||!uuid.test(input.requestId??'')||!revision.test(input.expectedRevision??'')||!revision.test(input.expectedIdentity??'')||typeof input.workspaceId!=='string')throw fault('ワークスペース外観の要求が不正です。',400);
    let visual;try{visual=input.action==='save'?validateVisual(input.visual):null;}catch{throw fault('アイコンまたはカラーの指定が不正です。',400);}
    if(input.action==='reset'&&Object.hasOwn(input,'visual'))throw fault('リセットの指定が不正です。',400);
    // Verify the stored schema before taking the cross-process admission lock.
    await read();await noLinks(root,lockPath,{missing:true});
    const maintenancePath=join(root,'runtime/Studio-services.lock');await noLinks(root,maintenancePath,{missing:true});
    await mkdir(join(root,'data/session-library'),{recursive:true});await mkdir(join(root,'runtime'),{recursive:true});let releaseMaintenance,releaseVisual;
    try{releaseMaintenance=await acquireWorkspaceLock(maintenancePath,{service:'Workspace appearance',pid:process.pid,nonce:randomUUID(),startedAt:now()});}
    catch{throw fault('サービス操作または再起動の準備中です。完了後に外観を保存してください。');}
    try{
      try{releaseVisual=await acquireWorkspaceLock(lockPath,{pid:process.pid,startedAt:now()});}
      catch{throw fault('外観を保存中か、前回の保存結果が未確認です。再読込して確認してください。');}
      const document=await read(),items=await targets(),signature=digest({action:input.action,workspaceId:input.workspaceId,expectedRevision:input.expectedRevision,expectedIdentity:input.expectedIdentity,visual});
      const existing=document.operations.find(row=>row.requestId===input.requestId);if(existing){if(existing.signature!==signature)throw fault('操作IDは別の変更に使用されています。');return {...result(document,items),reused:true};}
      if(input.expectedRevision!==digest(document))throw fault('別の画面で外観が変更されました。再読込して確認してください。');
      const target=items.find(row=>row.workspaceId===input.workspaceId);if(!target||target.identity!==input.expectedIdentity)throw fault('ワークスペースが変更・削除されました。再読込して確認してください。');
      // Mutate only our visual field. Other feature namespaces and future fields survive.
      const entry=copy(document.workspaces[input.workspaceId]??{});if(input.action==='reset')delete entry.visual;else entry.visual=visual;
      if(Object.keys(entry).length)document.workspaces[input.workspaceId]=entry;else delete document.workspaces[input.workspaceId];
      document.operations.push({requestId:input.requestId,signature,workspaceId:input.workspaceId,action:input.action,completedAt:now()});
      await noLinks(root,path,{missing:true});await atomicJson(path,document);return {...result(document,items),reused:false};
    }finally{try{await releaseVisual?.();}finally{await releaseMaintenance();}}
  }
  return {snapshot,mutate:input=>{const current=tail.then(()=>mutate(input));tail=current.catch(()=>{});return current;}};
}
const response=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function workspaceVisualsHandler({store,origin}){return async request=>{try{const url=new URL(request.url);if(url.search)return response(400,{error:'要求が不正です。'});if(request.method==='GET')return response(200,await store.snapshot());if(request.method!=='POST')return response(405,{error:'未対応の操作です。'});if(request.headers.get('origin')!==origin||request.headers.get('x-local-studio-workspaces')!=='1'||!(request.headers.get('content-type')??'').startsWith('application/json')||request.headers.get('sec-fetch-site')==='cross-site')return response(403,{error:'DSH画面からの本人操作を確認できません。'});return response(200,await store.mutate(await request.json()));}catch(error){return response(error.status??503,{error:error.status?error.message:'外観の保存結果を確認できません。再読込してください。'});}};}
