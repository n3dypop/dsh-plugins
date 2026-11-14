import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

export async function openBackend(dshDirectory,storage){
  const require=createRequire(join(dshDirectory,'package.json'));
  const {Context}=await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')));
  const backend=await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-session-persistence-jsonl')));
  const ctx=new Context();try{await ctx.plugin(backend,{root:storage}).await();return {list:()=>ctx.sessionPersistence.list(),dispose:()=>ctx.fiber.dispose()};}catch(e){await ctx.fiber.dispose();throw e;}
}
/** Compatible with DSH 0.2.1-rc.5's session-persistence-jsonl Win32 write lease.
 * Same kernel semaphore namespace is essential; a second unrelated lock is insufficient.
 * Algorithm: DeepSeek Harness, MIT, packages/session/session-persistence-jsonl/src/win32.ts.
 */
export async function acquireLease(dshDirectory,directory){
  const name='Local\\dsh-session-lock-'+createHash('sha256').update(resolve(directory,'session.lock').toLowerCase()).digest('hex');
  return acquireWindowsSemaphore(dshDirectory,name,'Session still has a write owner; deletion was refused');
}

export function acquireWindowsSemaphore(dshDirectory,name,busyMessage){
  if(process.platform!=='win32')throw Error('This deletion adapter supports the verified Windows backend only');
  const require=createRequire(join(dshDirectory,'package.json')),backendRequire=createRequire(require.resolve('@deepseek-ai/dsh-session-persistence-jsonl'));
  const koffi=backendRequire('koffi'),kernel=koffi.load('kernel32.dll');
  const create=kernel.func('__stdcall','CreateSemaphoreW','intptr',['void*','int','int','str16']),wait=kernel.func('__stdcall','WaitForSingleObject','uint',['intptr','uint']),release=kernel.func('__stdcall','ReleaseSemaphore','int',['intptr','int','void*']),close=kernel.func('__stdcall','CloseHandle','int',['intptr']);
  const handle=create(null,1,1,name);if(!handle)throw Error('Cannot acquire the Windows semaphore');const status=wait(handle,0);if(status!==0){close(handle);throw Error(busyMessage);}
  let done=false;return()=>{if(done)return;done=true;const ok=release(handle,1,null),closed=close(handle);if(!ok||!closed)throw Error('Failed to release session deletion lease');};
}
