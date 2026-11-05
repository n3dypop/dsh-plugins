import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const helper=fileURLToPath(new URL('./native/Set-DesktopOpacity.ps1',import.meta.url));
// Only the fixed helper and a bounded percentage can be passed to PowerShell.
// PID and window ownership are independently validated by the helper itself.
export function createNativeOpacityAdapter({run}={}){
  let opacity=null;
  const execute=run??(percent=>new Promise((resolve,reject)=>{
    if(process.platform!=='win32'||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1'||!process.env.SystemRoot)return reject(Error('Desktop runtime unavailable'));
    const executable=join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=spawn(executable,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper,'-Percent',String(percent)],{windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});
    let out='',err='',done=false;const timer=setTimeout(()=>{child.kill();finish(Error('helper timed out'));},10000);
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
    child.stdout.on('data',x=>{out+=x;if(out.length>8192){child.kill();finish(Error('helper response too large'));}});
    child.stderr.on('data',x=>{err+=x;if(err.length>8192){child.kill();finish(Error('helper error too large'));}});
    child.once('error',()=>finish(Error('helper unavailable')));
    child.once('close',code=>{if(code!==0)return finish(Error('helper failed'));try{finish(null,JSON.parse(out));}catch{finish(Error('invalid helper response'));}});
  }));
  return {get:async()=>({opacity}),async set(value){
    if(!Number.isInteger(value)||value<30||value>100)throw Error('Invalid opacity');
    // Once a mutation starts, a timeout or lost response can follow a real OS
    // change. The previous success is no longer evidence of the current state.
    opacity=null;
    const result=await execute(value);
    if(result?.status!=='applied'||result.percent!==value)throw Error('Unconfirmed opacity');
    opacity=value;return {opacity};
  }};
}
