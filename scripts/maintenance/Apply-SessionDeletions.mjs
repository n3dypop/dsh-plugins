import {readFile,open,unlink,lstat,realpath} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep,basename,dirname,win32} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createConnection} from 'node:net';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readQueue,writeQueue,sessionPaths,desktopSessionPaths,assertLocalDesktopHome,noLinks,contained,digest,identity,blockers,fingerprintDirectory,removeArtifacts,cleanDerivedState,validateDerivedState} from '../../apps/dsh-plugins/studio-sessions/session-store.mjs';
import {openBackend,acquireLease} from '../../apps/dsh-plugins/studio-sessions/offline-backend.mjs';

export async function assertDshStopped(root,settings){
  try{const record=JSON.parse(await readFile(join(root,'runtime/DSH.json'),'utf8'));if(Number.isInteger(record.processId)){try{process.kill(record.processId,0);throw Error('DSH process is still present; session deletion is offline-only');}catch(e){if(e.code!=='ESRCH')throw e;}}}catch(e){if(e.code!=='ENOENT')throw e;}
  await new Promise((done,fail)=>{const socket=createConnection({host:'127.0.0.1',port:settings.dshPort});socket.setTimeout(5000);socket.once('connect',()=>{socket.destroy();fail(Error('DSH is listening; offline session deletion was refused'));});socket.once('timeout',()=>{socket.destroy();fail(Error('Cannot establish that DSH is stopped'));});socket.once('error',error=>error.code==='ECONNREFUSED'?done():fail(error));});
}
// The hashes pin the five backend entry points reviewed against the official
// release payloads. Unknown versions, builds and paths fail closed.
const REVIEWED_RC1=Object.freeze({
  'dsh-session-persistence-jsonl':'69efef5f84dddf947032bc1425067878fa610416c8885acde2ded9b01230c9b7',
  'dsh-session':'6fad466aa1f7aa64bfa038681ead5721f66c88e9891e25d357d2b8edbccd5494',
  'dsh-session-format':'6c7417ec2cd555e2781197d91c4566c88ffcf2728f362d7a2937859be57226ec',
  'dsh-session-format-catalog':'836bbb772ab505c299f1a4a246164c50c7c08b67ab0d17f1251d7ea2cd8c1818',
  'dsh-workspace':'931ca0cb10c5102066c7723690a887f0e6e8e7ab0ffdee1a782686745b0b934f',
});
const REVIEWED_BACKENDS=new Map([
  ['0.2.2-rc.1',REVIEWED_RC1],
  ['0.2.2-rc.3',{
    ...REVIEWED_RC1,
    'dsh-session':'d9911b5e1585bcb142d03ce46eb2990b3fc7c254de5a76d3ffb124bd2469216c',
    'dsh-workspace':'8964c54f3c3f2fd79ed92e5fb1413d84ba80272c4eb984677aaf70bf4d687848',
  }],
]);
export async function assertReviewedRuntime(dshDirectory){
  if(typeof dshDirectory!=='string'||!isAbsolute(dshDirectory))throw Error('DSH runtime directory must be absolute');
  const require=createRequire(join(dshDirectory,'package.json'));
  const dshManifest=require.resolve('@deepseek-ai/dsh/package.json');
  const pkg=JSON.parse(await readFile(dshManifest,'utf8'));
  if(pkg.version==='0.2.1-rc.5')return pkg.version;
  const reviewed=REVIEWED_BACKENDS.get(pkg.version);
  if(!reviewed)throw Error('Session deletion adapter must be reviewed for this DSH version');
  const runtime=await realpath(dshDirectory);
  async function inside(path){const actual=await realpath(path),part=relative(runtime,actual);if(!part||part==='..'||part.startsWith('..'+sep)||isAbsolute(part))throw Error('Reviewed backend resolved outside the selected runtime');}
  await inside(dshManifest);
  for(const [name,expected] of Object.entries(reviewed)){
    const manifestPath=require.resolve(`@deepseek-ai/${name}/package.json`),entryPath=require.resolve(`@deepseek-ai/${name}`);
    await inside(manifestPath);await inside(entryPath);
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    if(manifest.version!==pkg.version)throw Error('Reviewed backend package version differs');
    if(createHash('sha256').update(await readFile(entryPath)).digest('hex')!==expected)throw Error('Reviewed backend code hash differs');
  }
  return pkg.version;
}
/** All irreversible work runs before the Host, its writers and derived caches exist. */
export async function applyDeletions({root,settings,paths=sessionPaths(root),stopped=assertDshStopped,backendFactory=openBackend,leaseFactory=acquireLease}){
  if(typeof root!=='string')await stopped();
  const queue=await readQueue(paths),pending=queue.requests.filter(q=>['pending','applying'].includes(q.state));if(!pending.length)return {deleted:0,blocked:0,requests:0};
  if(typeof root==='string'){
    await stopped(root,settings);
    if(settings.dshHome!=='data/dsh')throw Error('Unsupported DSH home layout');
  }
  const lockPath=paths.applyLock;await noLinks(paths.root,lockPath,{missing:true});let lock;
  try{try{lock=await open(lockPath,'wx',0o600);}catch(e){if(e.code!=='EEXIST')throw e;const previous=await lstat(lockPath),record=JSON.parse(await readFile(lockPath,'utf8'));if(!Number.isInteger(record.pid))throw e;try{process.kill(record.pid,0);throw e;}catch(check){if(check.code!=='ESRCH')throw check;}const observed=await lstat(lockPath);if(previous.ino!==observed.ino||previous.mtimeMs!==observed.mtimeMs||previous.size!==observed.size)throw e;await unlink(lockPath);lock=await open(lockPath,'wx',0o600);}await lock.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));await lock.sync();}catch(e){throw Error('Another deletion application may be running; inspect data/session-library/apply.lock',{cause:e});}
  let backend;const report={deleted:0,blocked:0,requests:pending.length};
  try{
    backend=await backendFactory(settings.dshDirectory,paths.sessions);
    for(const request of pending){
      for(const entry of request.sessions){
        if(!['pending','deleting'].includes(entry.state))continue;
        const recovering=entry.state==='deleting',storage=paths.sessions,directory=contained(storage,join(storage,entry.directory));
        if(!/^[A-Za-z0-9_-]{1,220}$/.test(entry.sessionId)||entry.directory.split('/').length!==2||
          basename(directory)!==entry.sessionId||dirname(dirname(directory))!==storage||entry.identity?.id!==entry.sessionId)throw Error('Unsupported deletion receipt identity');
        await noLinks(paths.root,directory,{missing:recovering});let release;
        try{
          release=await leaseFactory(settings.dshDirectory,directory);
          // Fresh headers come from the official backend, not filenames or a stale index.
          const records=await backend.list(),headers=records.map(r=>r.header),header=headers.find(h=>h.id===entry.sessionId);
          if(blockers(headers,entry.sessionId).length)throw Error('Another session still depends on this history');
          if(!recovering){if(!header||digest(identity(header))!==digest(entry.identity))throw Error('Stored session identity changed');const observed=await fingerprintDirectory(paths,directory);if(observed.fingerprint!==entry.fingerprint)throw Error('Conversation changed after deletion was requested');}
          // Recovery checks every surviving byte against the exact journalled files;
          // a remaining older generation may legitimately expose an older header.
          await validateDerivedState(paths,new Set([entry.sessionId]));
          if(typeof root!=='string')await assertNoDesktopSchedule(paths,entry.sessionId);
          // Journal before the first unlink. A crash resumes exact recorded files only.
          request.state='applying';entry.state='deleting';await writeQueue(paths,queue);
          await removeArtifacts(paths,entry);await cleanDerivedState(paths,new Set([entry.sessionId]));
          const remaining=await backend.list();if(remaining.some(r=>r.header.id===entry.sessionId))throw Error('Deleted session remains in the persistence catalog');
          entry.state='deleted';entry.completedAt=new Date().toISOString();delete entry.error;report.deleted++;await writeQueue(paths,queue);
        }catch(e){
          if(entry.state==='deleting')throw e; // Do not launch with a half-deleted history.
          entry.state='blocked';entry.error=e.message;report.blocked++;await writeQueue(paths,queue);
        }finally{await release?.();}
      }
      request.state=request.sessions.every(e=>e.state==='deleted')?'deleted':'blocked';request.completedAt=new Date().toISOString();await writeQueue(paths,queue);
    }
    return report;
  }finally{try{await backend?.dispose();}finally{try{await lock?.close();}finally{await unlink(lockPath).catch(e=>{if(e.code!=='ENOENT')throw e;});}}}
}
async function assertNoDesktopSchedule(paths,sessionId){
  const file=join(paths.home,'storages/schedule.json');await noLinks(paths.root,file,{missing:true});
  let value;
  try{value=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
  const tasks=value.tables?.tasks;
  if(value.unit?.name!=='schedule'||![1,2].includes(value.unit.version)||!tasks||typeof tasks!=='object'||Array.isArray(tasks))throw Error('Unsupported scheduled-task storage schema');
  if(Object.values(tasks).some(task=>task.status==='active'&&(task.target?.sessionId===sessionId||task.involvedSessionIds?.includes(sessionId))))throw Error('An active scheduled task refers to this conversation');
}

async function assertDesktopStopped(){
  const powershell=win32.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const command=`$ErrorActionPreference='Stop'; $apps=@(Get-CimInstance Win32_Process -Filter "Name = 'DeepSeek Harness.exe'"); if(@($apps | Where-Object ProcessId -ne ${process.pid}).Count){exit 3}`;
  await promisify(execFile)(powershell,['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,timeout:10000});
}

async function applyDesktopQueue(home){
  if(process.platform!=='win32'||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1'||
    basename(process.execPath).toLowerCase()!=='deepseek harness.exe'||!isAbsolute(process.resourcesPath??'')||
    resolve(dirname(process.execPath),'resources').toLowerCase()!==resolve(process.resourcesPath).toLowerCase())throw Error('Use the installed Windows Desktop executable in Node mode');
  const paths=desktopSessionPaths(home);await assertLocalDesktopHome(paths);
  const queue=await readQueue(paths);
  if(!queue.requests.some(q=>['pending','applying'].includes(q.state)))return;
  const settings={dshDirectory:join(process.resourcesPath,'app.asar/dsh')};
  await assertReviewedRuntime(settings.dshDirectory);
  // The official Desktop launcher acquires this same profile lock before
  // starting its Host. Check process absence under the lock, including the tray.
  const lockPath=join(paths.home,'profiles/desktop/lock');
  await noLinks(paths.root,lockPath,{missing:true});
  const lock=await open(lockPath,'wx',0o600);
  try{
    await lock.writeFile(`${process.pid}\n`);await lock.sync();
    return await applyDeletions({settings,paths,stopped:assertDesktopStopped});
  }finally{try{await lock.close();}finally{await unlink(lockPath);}}
}

async function main(){
  const [flag,value,...rest]=process.argv.slice(2);
  if(!value||rest.length)throw Error('Specify --root or --desktop-home with one local absolute path');
  if(flag==='--desktop-home'){
    const report=await applyDesktopQueue(value);
    if(report)console.log(`Session Library: ${report.deleted} deleted, ${report.blocked} blocked.`);
    return;
  }
  if(flag!=='--root')throw Error('--root is required');
  const root=resolve(value);await noLinks(root,join(root,'config/environment.json'));const settings=JSON.parse(await readFile(join(root,'config/environment.json'),'utf8'));const queue=await readQueue(root);if(!queue.requests.some(q=>['pending','applying'].includes(q.state)))return;
  await assertReviewedRuntime(settings.dshDirectory);
  const report=await applyDeletions({root,settings});console.log(`Session Library: ${report.deleted} deleted, ${report.blocked} blocked.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('Session deletion was not completed: '+error.message);process.exitCode=1;});
