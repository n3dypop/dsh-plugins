import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,readdir,lstat,open,mkdir,rename,unlink,rmdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute,dirname} from 'node:path';

export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const encodeSegment=raw=>{if(typeof raw!=='string'||!raw)throw Error('Invalid session ID');if(raw==='.')return '~002E';if(raw==='..')return '~002E~002E';let out='';for(let i=0;i<raw.length;i++){const ch=raw[i];out+=ch!=='~'&&/^[A-Za-z0-9._-]$/.test(ch)?ch:'~'+raw.charCodeAt(i).toString(16).toUpperCase().padStart(4,'0');}return out;};
export const sessionPaths=root=>({home:join(root,'data/dsh'),sessions:join(root,'data/dsh/sessions'),queue:join(root,'data/session-library/queue.json')});
export function contained(root,path){const rel=relative(resolve(root),resolve(path));if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Path outside the session storage root');return resolve(path);}
export async function noLinks(root,path,{missing=false}={}){
  root=resolve(root);path=resolve(path);const rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Path outside allowed root');
  let cursor=root;for(const part of ['',...rel.split(/[\\/]/).filter(Boolean)]){if(part)cursor=join(cursor,part);try{const st=await lstat(cursor);if(st.isSymbolicLink())throw Error('Linked session paths are not supported');}catch(e){if(missing&&e.code==='ENOENT')return;throw e;}}
}
export async function atomicJson(path,value){await mkdir(dirname(path),{recursive:true});const tmp=path+'.'+randomUUID()+'.partial';let handle;try{handle=await open(tmp,'wx',0o600);await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();await handle.close();handle=null;await rename(tmp,path);}finally{await handle?.close();await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
export async function readQueue(root){
  const path=sessionPaths(root).queue;await noLinks(root,path,{missing:true});
  try{
    const q=JSON.parse(await readFile(path,'utf8'));
    const requestStates=new Set(['pending','applying','deleted','blocked','cancelled']);
    const entryStates=new Set(['pending','deleting','deleted','blocked','cancelled']);
    if(!q||q.schemaVersion!==1||!Array.isArray(q.requests)||q.requests.some(request=>{
      if(!request||!requestStates.has(request.state)||!Array.isArray(request.sessions)||!request.sessions.length)return true;
      if(request.sessions.some(entry=>!entry||!entryStates.has(entry.state)))return true;
      if(['deleted','cancelled','blocked'].includes(request.state)&&request.sessions.some(entry=>['pending','deleting'].includes(entry.state)))return true;
      if(request.state==='deleted'&&request.sessions.some(entry=>entry.state!=='deleted'))return true;
      if(request.state==='cancelled'&&request.sessions.some(entry=>entry.state!=='cancelled'))return true;
      return false;
    }))throw Error('Unsupported or inconsistent session deletion queue');
    return q;
  }catch(e){if(e.code==='ENOENT')return {schemaVersion:1,requests:[]};throw e;}
}
export async function writeQueue(root,queue){const path=sessionPaths(root).queue;await noLinks(root,path,{missing:true});await atomicJson(path,queue);}
const logName=/^session(?:\.v[1-9][0-9]*)?\.jsonl(?:\.zstd)?$/;
export async function fileHash(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export async function locateDirectory(root,id){const storage=sessionPaths(root).sessions;await noLinks(root,storage);const matches=[];for(const project of await readdir(storage,{withFileTypes:true})){if(project.isSymbolicLink())throw Error('Linked project directories are not supported');if(!project.isDirectory())continue;const candidate=join(storage,project.name,encodeSegment(id));try{await noLinks(root,candidate);const st=await lstat(candidate);if(!st.isDirectory())throw Error('Session artifact is not a directory');matches.push(candidate);}catch(e){if(e.code!=='ENOENT')throw e;}}if(matches.length!==1)throw Error(matches.length?'Ambiguous stored session identity':'Session is not materialized');return matches[0];}
export async function fingerprintDirectory(root,directory,{allowPartial=false}={}){
  const storage=sessionPaths(root).sessions;contained(storage,directory);await noLinks(root,directory);const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){if(entry.name==='session.lock'&&entry.isFile())continue;if(!entry.isFile()||entry.isSymbolicLink()||!logName.test(entry.name))throw Error('Session directory contains unsupported artifacts');const path=join(directory,entry.name);await noLinks(root,path);const before=await lstat(path);const sha256=await fileHash(path),after=await lstat(path);if(before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('Session changed while it was inspected');files.push({name:entry.name,bytes:after.size,sha256});}
  if(!allowPartial&&!files.length)throw Error('Session has no durable generation log');files.sort((a,b)=>a.name.localeCompare(b.name));return {directory:relative(storage,directory).replaceAll('\\','/'),files,fingerprint:digest(files)};
}
export function blockers(headers,selectedId){return headers.filter(h=>h.parentSession===selectedId).map(h=>h.id);}
export function identity(header){return {id:header.id,createdAt:header.createdAt,version:header.version,cwd:header.cwd??null,parentSession:header.parentSession??null,isSeeded:header.isSeeded??false,origin:header.origin??null};}
export async function describeDeletion(root,header,headers,{busy=false}={}){
  const blockedBy=blockers(headers,header.id);if(busy)throw Error('このセッションは処理中です。停止完了後に確認してください。');if(header.origin==='subagent')throw Error('サブエージェントの内部履歴はこの操作では削除しません。');if(blockedBy.length)throw Error(`他のセッション ${blockedBy.length} 件がこの履歴を参照しています。`);
  const directory=await locateDirectory(root,header.id),disk=await fingerprintDirectory(root,directory);return {sessionId:header.id,identity:identity(header),...disk};
}
export async function removeArtifacts(root,entry){
  const storage=sessionPaths(root).sessions,directory=contained(storage,join(storage,entry.directory));await noLinks(root,directory,{missing:true});
  try{const observed=await fingerprintDirectory(root,directory,{allowPartial:true});for(const file of observed.files){const expected=entry.files.find(f=>f.name===file.name);if(!expected||expected.bytes!==file.bytes||expected.sha256!==file.sha256)throw Error('Deletion recovery found changed artifacts');}for(const file of observed.files){const path=contained(directory,join(directory,file.name));await noLinks(root,path);await unlink(path);}const lock=join(directory,'session.lock');try{await noLinks(root,lock);await unlink(lock);}catch(e){if(e.code!=='ENOENT')throw e;}await rmdir(directory);}catch(e){if(e.code!=='ENOENT')throw e;}
}
export async function validateDerivedState(root,ids){
  const {home}=sessionPaths(root),workspace=join(home,'storages/workspace.json');await noLinks(root,workspace,{missing:true});
  try{const value=JSON.parse(await readFile(workspace,'utf8'));if(value.unit?.name!=='workspace'||value.unit?.version!==2||!Array.isArray(value.global?.archivedSessionIds)||!Array.isArray(value.global?.pinnedSessionIds)||!value.tables?.workspaces||Array.isArray(value.tables.workspaces)||typeof value.tables.workspaces!=='object'||Object.values(value.tables.workspaces).some(record=>!Array.isArray(record.sessionIds)))throw Error('Unsupported workspace storage schema');}catch(e){if(e.code!=='ENOENT')throw e;}
  const legacy=join(home,'storages/session_projcache.json');await noLinks(root,legacy,{missing:true});try{await lstat(legacy);throw Error('Legacy shared projection cache requires a reviewed migration before deletion');}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const id of ids){if(!/^[A-Za-z0-9_-]+$/.test(id))throw Error('Unsupported projection-cache session key');const path=join(home,'storages/session_projcache/sessions',id+'.json');await noLinks(root,path,{missing:true});try{const st=await lstat(path);if(!st.isFile())throw Error('Unsupported projection cache artifact');}catch(e){if(e.code!=='ENOENT')throw e;}}
}
export async function cleanDerivedState(root,ids){
  const {home}=sessionPaths(root),workspace=join(home,'storages/workspace.json');await noLinks(root,workspace,{missing:true});
  try{const value=JSON.parse(await readFile(workspace,'utf8'));if(value.unit?.name!=='workspace'||value.unit?.version!==2||!Array.isArray(value.global?.archivedSessionIds)||!Array.isArray(value.global?.pinnedSessionIds)||typeof value.tables?.workspaces!=='object')throw Error('Unsupported workspace storage schema');for(const record of Object.values(value.tables.workspaces)){if(!Array.isArray(record.sessionIds))throw Error('Unsupported workspace membership');record.sessionIds=record.sessionIds.filter(id=>!ids.has(id));}value.global.archivedSessionIds=value.global.archivedSessionIds.filter(id=>!ids.has(id));value.global.pinnedSessionIds=value.global.pinnedSessionIds.filter(id=>!ids.has(id));await atomicJson(workspace,value);}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const id of ids){if(!/^[A-Za-z0-9_-]+$/.test(id))throw Error('Unsupported projection-cache session key');const path=join(home,'storages/session_projcache/sessions',id+'.json');await noLinks(root,path,{missing:true});await unlink(path).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
