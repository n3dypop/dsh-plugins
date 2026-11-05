import {join,resolve,win32} from 'node:path';
import {createConnection} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {runManagedCommand} from '../shared/command-runner.mjs';
import {configuredFile} from '../shared/runtime-files.mjs';
import {hostConfiguration} from './config.mjs';
import {probeWindowsEpoch,validateEpochEvidence} from '../shared/windows-epoch.mjs';
import {UUID,FORCE_GRACE_MS,paths,readJson,readJournal,atomicJson,deletionSnapshot,releaseLock} from './restart-state.mjs';

const executeFile=promisify(execFile);
// The process object pins its native handle before identity inspection. The
// final TerminateProcess uses that SAME handle, never a later PID lookup or a
// process-tree operation. A reused PID or foreign/child listener is refused.
export async function terminateOwnedDsh({epoch,port},{execute=executeFile}={}){
  if(process.platform!=='win32'||!Number.isSafeInteger(epoch?.pid)||epoch.pid<1||epoch.pid===process.pid||!Number.isInteger(port)||port<1||port>65535||typeof epoch.startTimeUtcTicks!=='string'||!/^[1-9][0-9]{16,18}$/.test(epoch.startTimeUtcTicks)||!win32.isAbsolute(epoch.executable))throw Error('Forced restart target is not verifiable');
  const encodedExe=Buffer.from(epoch.executable,'utf8').toString('base64');
  const script=`$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class StudioHostTerminate { [DllImport("kernel32.dll", SetLastError=true)] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool TerminateProcess(IntPtr hProcess, uint exitCode); }'
$target=Get-Process -Id ${epoch.pid} -ErrorAction Stop
try {
  $heldHandle=$target.Handle
  if ($heldHandle -eq [IntPtr]::Zero -or $target.HasExited) { throw 'DSH handle unavailable' }
  $expectedExe=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedExe}'))
  if ($target.StartTime.ToUniversalTime().Ticks.ToString() -cne '${epoch.startTimeUtcTicks}' -or -not [String]::Equals($target.Path,$expectedExe,[StringComparison]::OrdinalIgnoreCase)) { throw 'DSH PID/start/executable changed' }
  $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object LocalPort -eq ${port})
  if ($listeners.Count -gt 1 -or ($listeners.Count -eq 1 -and ($listeners[0].LocalAddress -ne '127.0.0.1' -or $listeners[0].OwningProcess -ne ${epoch.pid}))) { throw 'DSH listener ownership changed' }
  if ($target.HasExited) { throw 'DSH exited during force check' }
  if (-not [StudioHostTerminate]::TerminateProcess($heldHandle,1)) { throw 'DSH termination was not accepted' }
  if (-not $target.WaitForExit(8000)) { throw 'DSH termination was not confirmed' }
  [ordered]@{terminated=$true;pid=${epoch.pid}}|ConvertTo-Json -Compress
} finally { $target.Dispose() }`;
  const powershell=win32.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),result=await execute(powershell,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:15000,maxBuffer:65536,encoding:'utf8'}),value=JSON.parse(result.stdout.trim().replace(/^\uFEFF/,''));
  if(value.terminated!==true||value.pid!==epoch.pid)throw Error('DSH termination evidence unavailable');return value;
}

export async function runRestartWorker({root,requestId,clock=()=>Date.now(),wait=delay,processExists=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}},start=runManagedCommand,probe=probeWindowsEpoch,terminate=terminateOwnedDsh,deadlineMs=180000}={}){
  root=resolve(root);if(!UUID.test(requestId??''))throw Error('Invalid restart request');
  let journal=await readJournal(root),operation=journal.operations.find(o=>o.requestId===requestId);if(!operation||operation.state!=='prepared')throw Error('Restart was not prepared');
  const config=hostConfiguration({runtimeRoot:root,nodeExecutable:operation.host?.nodeExecutable,port:operation.host?.port,launcher:operation.launcher});
  if(!operation.host||operation.host.port!==config.port||operation.host.nodeExecutable!==config.nodeExecutable)throw Error('Restart launch configuration is incomplete');
  const expectedExe=config.nodeExecutable,base=`http://127.0.0.1:${config.port}`;
  const lock=await readJson(root,paths(root).lock);if(lock?.kind!=='dsh-restart'||lock.requestId!==requestId||lock.ownerPid!==operation.epoch.pid)throw Error('Restart lock does not belong to this operation');
  if(operation.epoch.url!==base||operation.epoch.executable!==win32.normalize(expectedExe).toLowerCase())throw Error('Restart target differs from configured Host');
  await atomicJson(root,paths(root).ready(requestId),{requestId,nonce:operation.workerNonce,pid:process.pid});
  const until=clock()+deadlineMs;
  async function update(state,detail,extra={}){journal=await readJournal(root);operation=journal.operations.find(o=>o.requestId===requestId);if(!operation)throw Error('Restart receipt disappeared');Object.assign(operation,{state,detail,updatedAt:new Date(clock()).toISOString()},extra);await atomicJson(root,paths(root).journal,journal);}
  async function unchanged(){const queue=await deletionSnapshot(root);if(queue.revision!==operation.deletionRevision)throw Error('確認後に削除予約が変わりました。新しいDSHは開始していません。');const record=await readJson(root,join(root,'runtime/DSH.json')),lock=await readJson(root,paths(root).lock);if(lock?.kind!=='dsh-restart'||lock.requestId!==requestId||lock.ownerPid!==operation.epoch.pid||!record||record.processId!==operation.epoch.pid||record.startTimeUtcTicks!==operation.epoch.startTimeUtcTicks||win32.normalize(record.executable).toLowerCase()!==operation.epoch.executable||record.url!==base)throw Error('DSHの管理記録または操作所有者が変わりました。新しいDSHは開始していません。');}
  try{
    for(;;){journal=await readJournal(root);operation=journal.operations.find(o=>o.requestId===requestId);if(!operation)throw Error('Restart receipt disappeared');if(['cancelled','failed'].includes(operation.state)){await releaseLock(root,requestId);return {state:operation.state};}if(operation.state==='unknown')return {state:'unknown'};
      if(clock()>=until)throw Error('DSHの終了を期限内に確認できません。自動再試行しません。');
      if(operation.state==='exiting'&&!processExists(operation.epoch.pid))break;
      if(operation.mode==='force'&&operation.state==='exiting'&&operation.exitArmedAt){
        const armed=Date.parse(operation.exitArmedAt);if(!Number.isFinite(armed)||operation.forceGraceMs!==FORCE_GRACE_MS||operation.cancelledConfirmed!==true||operation.flushConfirmed!==true||operation.resourcesQuiescent!==true||operation.workerPid!==process.pid)throw Error('強制再起動の確認・保存・補助プロセス所有者を照合できません。');
        if(clock()>=armed+FORCE_GRACE_MS){if(operation.fallbackAttempted)throw Error('DSHの強制終了は実施済みまたは結果不明です。自動再試行しません。');await unchanged();await update('exiting','通常終了の期限を超えたため、照合済みDSH本体だけを終了します。',{fallbackAttempted:true});await terminate({epoch:operation.epoch,port:config.port});await update('exiting','DSH本体の終了を確認しました。',{fallbackUsed:true});if(processExists(operation.epoch.pid))throw Error('DSHのPIDが残っているか再利用されています。新しいDSHは開始していません。');break;}
      }
      await wait(250);
    }
    // Reused PIDs remain present and are never killed. A newly occupied port is
    // likewise not evidence that the old Host finished successfully.
    await new Promise((done,fail)=>{const socket=createConnection({host:'127.0.0.1',port:config.port});socket.setTimeout(3000);socket.once('connect',()=>{socket.destroy();fail(Error('DSHの待受が他のプロセスに使用されています。'));});socket.once('timeout',()=>{socket.destroy();fail(Error('DSHの待受状態を確認できません。'));});socket.once('error',error=>error.code==='ECONNREFUSED'?done():fail(error));});
    await unchanged();
    await update('starting','DSHを起動し、再接続を待っています。');
    const fileIndex=config.launcher.args.findIndex(arg=>arg.toLowerCase()==='-file');
    if(fileIndex>=0)await configuredFile(config.launcher.args[fileIndex+1]);
    await start(config.launcher.executable,config.launcher.args,{cwd:config.launcher.cwd,env:config.launcher.env,timeoutMs:165000});
    const record=await readJson(root,join(root,'runtime/DSH.json'));if(!record||record.processId===operation.epoch.pid||record.url!==base||win32.normalize(record.executable).toLowerCase()!==operation.epoch.executable)throw Error('新しいDSHの管理記録を確認できません。');
    validateEpochEvidence({pid:record.processId,startTimeUtcTicks:record.startTimeUtcTicks,executable:operation.epoch.executable,url:base},await probe({pid:record.processId,port:config.port}));
    await update('completed','DSHを再起動しました。',{newPid:record.processId});await releaseLock(root,requestId);return {state:'completed',newPid:record.processId};
  }catch(error){await update('unknown',error.message).catch(()=>{});return {state:'unknown'};}
}
