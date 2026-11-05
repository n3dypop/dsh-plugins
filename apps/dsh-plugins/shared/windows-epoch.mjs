import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { win32 } from 'node:path';

const executeFile = promisify(execFile);
const fail = detail => { throw new Error('管理プロセスの実体を確認できません。操作を保留します。 '+detail); };
const validPid = value => Number.isSafeInteger(value) && value > 0 && value <= 0xffffffff;
const validTicks = value => typeof value === 'string' && /^[1-9][0-9]{16,18}$/.test(value) && BigInt(value) <= 3155378975999999999n;
const executablePath = value => {
  if(typeof value !== 'string' || !win32.isAbsolute(value) || /[\u0000-\u001f]/.test(value)) fail('実行ファイルの絶対パスが不正です。');
  return win32.normalize(value).toLowerCase();
};
// Only numeric PID/port values are inserted into this fixed read-only script.
// No path, prompt, credential, runtime-record text, or user shell expression is evaluated.
export async function probeWindowsEpoch({pid,port}) {
  if(process.platform !== 'win32') fail('Windows以外ではこの管理プロセスを証明できません。');
  if(!validPid(pid) || !Number.isInteger(port) || port < 1 || port > 65535) fail('プロセス照合引数が不正です。');
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$managed = Get-Process -Id ${pid} -ErrorAction Stop
if (-not $managed.Path) { throw 'Managed process identity unavailable' }
$connections = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction Stop | Where-Object LocalAddress -eq '127.0.0.1')
if ($connections.Count -ne 1) { throw 'Expected exactly one loopback listener' }
$listener = Get-Process -Id $connections[0].OwningProcess -ErrorAction Stop
if (-not $listener.Path) { throw 'Listener process identity unavailable' }
$child = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.Id) -ErrorAction Stop
if ($null -eq $child) { throw 'Listener ancestry unavailable' }
$managedTicks = $managed.StartTime.ToUniversalTime().Ticks.ToString()
$listenerTicks = $listener.StartTime.ToUniversalTime().Ticks.ToString()
$managedAgain = Get-Process -Id ${pid} -ErrorAction Stop
$listenerAgain = Get-Process -Id $listener.Id -ErrorAction Stop
$connectionsAgain = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction Stop | Where-Object LocalAddress -eq '127.0.0.1')
if ($connectionsAgain.Count -ne 1 -or $connectionsAgain[0].OwningProcess -ne $listener.Id -or $managedAgain.StartTime.ToUniversalTime().Ticks.ToString() -ne $managedTicks -or $listenerAgain.StartTime.ToUniversalTime().Ticks.ToString() -ne $listenerTicks) { throw 'Process changed during identity check' }
[ordered]@{ managed=[ordered]@{ pid=$managed.Id; startTimeUtcTicks=$managedTicks; executable=$managed.Path }; listener=[ordered]@{ pid=$listener.Id; startTimeUtcTicks=$listenerTicks; executable=$listener.Path; parentPid=[int]$child.ParentProcessId } } | ConvertTo-Json -Compress -Depth 4
`;
  const powershell = win32.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  let result;
  try {
    result=await executeFile(powershell,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:8000,maxBuffer:65536,encoding:'utf8'});
  } catch(error) {
    fail(error.killed || error.code === 'ETIMEDOUT' ? 'Windows照合がタイムアウトしました。' : 'WindowsからPID・開始時刻・待受ポート所有者を取得できません。');
  }
  try { return JSON.parse(result.stdout.trim().replace(/^\uFEFF/,'')); }
  catch { fail('Windows照合結果を読み取れません。'); }
}

export function validateEpochEvidence(identity,evidence) {
  const managed=evidence?.managed,listener=evidence?.listener;
  if(!managed || !listener || !validPid(managed.pid) || !validPid(listener.pid) || !validTicks(managed.startTimeUtcTicks) || !validTicks(listener.startTimeUtcTicks)) fail('実プロセス情報が不足しています。');
  if(managed.pid !== identity.pid || managed.startTimeUtcTicks !== identity.startTimeUtcTicks || executablePath(managed.executable) !== identity.executable) fail('管理PIDが終了・再利用されたか、実行ファイルが変わっています。');
  const listenerExecutable=executablePath(listener.executable);
  if(listener.pid === managed.pid) {
    if(listener.startTimeUtcTicks !== managed.startTimeUtcTicks || listenerExecutable !== identity.executable) fail('待受プロセスの情報が矛盾しています。');
  } else {
    if(listener.parentPid !== managed.pid || BigInt(listener.startTimeUtcTicks) < BigInt(managed.startTimeUtcTicks)) fail('待受プロセスが管理PID本人または直接の子であると証明できません。');
  }
  return {pid:managed.pid,startTimeUtcTicks:managed.startTimeUtcTicks,listenerPid:listener.pid,listenerStartTimeUtcTicks:listener.startTimeUtcTicks,executable:identity.executable,listenerExecutable,url:identity.url};
}

