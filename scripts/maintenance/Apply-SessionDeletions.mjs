import {readFile,open,unlink,lstat,realpath} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createConnection} from 'node:net';
import {readQueue,writeQueue,sessionPaths,noLinks,contained,digest,identity,blockers,fingerprintDirectory,removeArtifacts,cleanDerivedState,validateDerivedState} from '../../apps/dsh-plugins/studio-sessions/session-store.mjs';
import {openBackend,acquireLease} from '../../apps/dsh-plugins/studio-sessions/offline-backend.mjs';

export async function assertDshStopped(root,settings){
  try{const record=JSON.parse(await readFile(join(root,'runtime/DSH.json'),'utf8'));if(Number.isInteger(record.processId)){try{process.kill(record.processId,0);throw Error('DSH process is still present; session deletion is offline-only');}catch(e){if(e.code!=='ESRCH')throw e;}}}catch(e){if(e.code!=='ENOENT')throw e;}
  await new Promise((done,fail)=>{const socket=createConnection({host:'127.0.0.1',port:settings.dshPort});socket.setTimeout(5000);socket.once('connect',()=>{socket.destroy();fail(Error('DSH is listening; offline session deletion was refused'));});socket.once('timeout',()=>{socket.destroy();fail(Error('Cannot establish that DSH is stopped'));});socket.once('error',error=>error.code==='ECONNREFUSED'?done():fail(error));});
}
// The hashes pin the five backend entry points reviewed against the official
// 0.2.2-rc.1 npm installation. This is not a signature or an attestation of all
// transitive dependencies. Unknown versions, builds and paths fail closed.
const REVIEWED_022={
  'dsh-session-persistence-jsonl':'69efef5f84dddf947032bc1425067878fa610416c8885acde2ded9b01230c9b7',
  'dsh-session':'6fad466aa1f7aa64bfa038681ead5721f66c88e9891e25d357d2b8edbccd5494',
  'dsh-session-format':'6c7417ec2cd555e2781197d91c4566c88ffcf2728f362d7a2937859be57226ec',
  'dsh-session-format-catalog':'836bbb772ab505c299f1a4a246164c50c7c08b67ab0d17f1251d7ea2cd8c1818',
  'dsh-workspace':'931ca0cb10c5102066c7723690a887f0e6e8e7ab0ffdee1a782686745b0b934f',
};
export async function assertReviewedRuntime(dshDirectory){
  if(typeof dshDirectory!=='string'||!isAbsolute(dshDirectory))throw Error('DSH runtime directory must be absolute');
  const require=createRequire(join(dshDirectory,'package.json'));
  const dshManifest=require.resolve('@deepseek-ai/dsh/package.json');
  const pkg=JSON.parse(await readFile(dshManifest,'utf8'));
  if(pkg.version==='0.2.1-rc.5')return pkg.version;
  if(pkg.version!=='0.2.2-rc.1')throw Error('Session deletion adapter must be reviewed for this DSH version');
  const runtime=await realpath(dshDirectory);
  async function inside(path){const actual=await realpath(path),part=relative(runtime,actual);if(!part||part==='..'||part.startsWith('..'+sep)||isAbsolute(part))throw Error('Reviewed backend resolved outside the selected runtime');}
  await inside(dshManifest);
  for(const [name,expected] of Object.entries(REVIEWED_022)){
    const manifestPath=require.resolve(`@deepseek-ai/${name}/package.json`),entryPath=require.resolve(`@deepseek-ai/${name}`);
    await inside(manifestPath);await inside(entryPath);
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    if(manifest.version!==pkg.version)throw Error('Reviewed backend package version differs');
    if(createHash('sha256').update(await readFile(entryPath)).digest('hex')!==expected)throw Error('Reviewed backend code hash differs');
  }
  return pkg.version;
}
/** All irreversible work runs before the Host, its writers and derived caches exist. */
export async function applyDeletions({root,settings,stopped=assertDshStopped,backendFactory=openBackend,leaseFactory=acquireLease}){
  const queue=await readQueue(root),pending=queue.requests.filter(q=>['pending','applying'].includes(q.state));if(!pending.length)return {deleted:0,blocked:0,requests:0};
  await stopped(root,settings);if(settings.dshHome!=='data/dsh')throw Error('Unsupported DSH home layout');
  const lockPath=join(root,'data/session-library/apply.lock');await noLinks(root,lockPath,{missing:true});let lock;
  try{try{lock=await open(lockPath,'wx',0o600);}catch(e){if(e.code!=='EEXIST')throw e;const previous=await lstat(lockPath),record=JSON.parse(await readFile(lockPath,'utf8'));if(!Number.isInteger(record.pid))throw e;try{process.kill(record.pid,0);throw e;}catch(check){if(check.code!=='ESRCH')throw check;}const observed=await lstat(lockPath);if(previous.ino!==observed.ino||previous.mtimeMs!==observed.mtimeMs||previous.size!==observed.size)throw e;await unlink(lockPath);lock=await open(lockPath,'wx',0o600);}await lock.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));await lock.sync();}catch(e){throw Error('Another deletion application may be running; inspect data/session-library/apply.lock',{cause:e});}
  let backend;const report={deleted:0,blocked:0,requests:pending.length};
  try{
    backend=await backendFactory(settings.dshDirectory,sessionPaths(root).sessions);
    for(const request of pending){
      for(const entry of request.sessions){
        if(!['pending','deleting'].includes(entry.state))continue;
        const recovering=entry.state==='deleting',storage=sessionPaths(root).sessions,directory=contained(storage,join(storage,entry.directory));
        if(!/^[A-Za-z0-9_-]+$/.test(entry.sessionId)||!entry.directory.endsWith('/'+entry.sessionId))throw Error('Unsupported deletion receipt identity');
        await noLinks(root,directory,{missing:recovering});let release;
        try{
          release=await leaseFactory(settings.dshDirectory,directory);
          // Fresh headers come from the official backend, not filenames or a stale index.
          const records=await backend.list(),headers=records.map(r=>r.header),header=headers.find(h=>h.id===entry.sessionId);
          if(blockers(headers,entry.sessionId).length)throw Error('Another session still depends on this history');
          if(!recovering){if(!header||digest(identity(header))!==digest(entry.identity))throw Error('Stored session identity changed');const observed=await fingerprintDirectory(root,directory);if(observed.fingerprint!==entry.fingerprint)throw Error('Conversation changed after deletion was requested');}
          // Recovery checks every surviving byte against the exact journalled files;
          // a remaining older generation may legitimately expose an older header.
          await validateDerivedState(root,new Set([entry.sessionId]));
          // Journal before the first unlink. A crash resumes exact recorded files only.
          request.state='applying';entry.state='deleting';await writeQueue(root,queue);
          await removeArtifacts(root,entry);await cleanDerivedState(root,new Set([entry.sessionId]));
          const remaining=await backend.list();if(remaining.some(r=>r.header.id===entry.sessionId))throw Error('Deleted session remains in the persistence catalog');
          entry.state='deleted';entry.completedAt=new Date().toISOString();delete entry.error;report.deleted++;await writeQueue(root,queue);
        }catch(e){
          if(entry.state==='deleting')throw e; // Do not launch with a half-deleted history.
          entry.state='blocked';entry.error=e.message;report.blocked++;await writeQueue(root,queue);
        }finally{await release?.();}
      }
      request.state=request.sessions.every(e=>e.state==='deleted')?'deleted':'blocked';request.completedAt=new Date().toISOString();await writeQueue(root,queue);
    }
    return report;
  }finally{try{await backend?.dispose();}finally{try{await lock?.close();}finally{await unlink(lockPath).catch(e=>{if(e.code!=='ENOENT')throw e;});}}}
}
async function main(){const rootIndex=process.argv.indexOf('--root');if(rootIndex<0||!process.argv[rootIndex+1])throw Error('--root is required');const root=resolve(process.argv[rootIndex+1]);await noLinks(root,join(root,'config/environment.json'));const settings=JSON.parse(await readFile(join(root,'config/environment.json'),'utf8'));const queue=await readQueue(root);if(!queue.requests.some(q=>['pending','applying'].includes(q.state)))return;
  await assertReviewedRuntime(settings.dshDirectory);
  const report=await applyDeletions({root,settings});console.log(`Session Library: ${report.deleted} deleted, ${report.blocked} blocked.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('Session deletion was not completed: '+error.message);process.exitCode=1;});
