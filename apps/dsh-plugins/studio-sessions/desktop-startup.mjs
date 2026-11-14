import {execFile} from 'node:child_process';
import {join,win32} from 'node:path';
import {promisify} from 'node:util';
import {applyDeletions,desktopRuntime,withDesktopProfileLock} from '../../../scripts/maintenance/Apply-SessionDeletions.mjs';
import {assertLocalDesktopHome,desktopSessionPaths} from './session-store.mjs';
import {assertStartupOrder,runSessionStartup,samePath} from './startup.mjs';

export const name='studio-sessions-desktop-startup';
export const inject=['profileContext','appReady','loader'];
const execFileAsync=promisify(execFile);

async function assertOnlyDesktopHost(paths){
  const powershell=win32.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const command=String.raw`$ErrorActionPreference='Stop'
$hosts=@(Get-CimInstance Win32_Process -Filter "Name = 'DeepSeek Harness.exe'")
$self=$hosts | Where-Object ProcessId -eq ([int]$env:STUDIO_STARTUP_PID)
$parent=$hosts | Where-Object ProcessId -eq $self.ParentProcessId
if(-not $self -or -not $parent -or $self.ExecutablePath -ine $parent.ExecutablePath){exit 2}
foreach($hostProcess in $hosts){
    if($hostProcess.ProcessId -eq $self.ProcessId -or $hostProcess.ProcessId -eq $parent.ProcessId){continue}
    if(-not $hostProcess.CommandLine){exit 3}
    if($hostProcess.CommandLine.IndexOf($env:STUDIO_STARTUP_PROFILE,[StringComparison]::OrdinalIgnoreCase) -ge 0){exit 3}
}`;
  await execFileAsync(powershell,['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{
    env:{...process.env,STUDIO_STARTUP_PID:String(process.pid),STUDIO_STARTUP_PROFILE:join(paths.home,'profiles/desktop')},
    windowsHide:true,timeout:10000,
  });
}

export async function apply(ctx){
  const dshDirectory=desktopRuntime();
  const {name:profile,home,dir,installAnchor}=ctx.profileContext;
  const officialHost=join(dshDirectory,'node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js');
  if(profile!=='desktop'||!process.connected||!samePath(process.argv[1],officialHost)||
    !samePath(process.argv[2],dshDirectory)||!samePath(process.argv[3],dir)||
    !samePath(installAnchor,join(dshDirectory,'node_modules/@deepseek-ai/dsh/package.json'))){
    throw Error('Desktop Session Library startup requires the packaged Desktop Host');
  }
  const paths=desktopSessionPaths(home);
  if(!samePath(dir,join(paths.home,'profiles/desktop')))throw Error('Desktop session home does not match the launched profile');

  await assertLocalDesktopHome(paths);
  await runSessionStartup(ctx,paths,dshDirectory,()=>withDesktopProfileLock(paths,()=>applyDeletions({
    paths,settings:{dshDirectory},stopped:async()=>{
      assertStartupOrder(ctx,paths);
      await assertOnlyDesktopHost(paths);
      assertStartupOrder(ctx,paths);
    },
  })));
}
