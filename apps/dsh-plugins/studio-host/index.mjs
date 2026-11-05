import {pathToFileURL} from 'node:url';
import {createRuntimeAdapter} from './runtime-adapter.mjs';
import {createRestartManager} from './restart-manager.mjs';
import {UUID,restartMode} from './restart-state.mjs';
import {hostConfiguration} from './config.mjs';
import {configuredFile} from '../shared/runtime-files.mjs';
export {Config} from './config.mjs';
export const name='studio-host';
export const inject=['connection','agents','sessions','sessionQuery','sessionPersistence','appExit'];
export const PATH='/api/local-studio/host';
// This lifecycle manager identifies and restarts the managed standalone Node
// Web Host. Electron's Desktop process ownership is different; never register
// its mutation route there, even if a compatible DSH engine version matches.
// This also conservatively excludes an Electron-powered Web CLI Host.
export function assertWebOnlyHost(versions=process.versions){if(versions?.electron)throw new Error('studio-host requires the standalone Node Web Host; Desktop is unsupported.');}
const response=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function hostHandler({manager,origin,schedule=fn=>setTimeout(fn,250)}){return async request=>{try{
  const url=new URL(request.url);
  if(request.method==='GET'){if([...url.searchParams.keys()].some(k=>k!=='requestId')||url.searchParams.getAll('requestId').length>1)return response(400,{error:'要求が不正です。'});const id=url.searchParams.get('requestId');if(id&&!UUID.test(id))return response(400,{error:'操作IDが不正です。'});return response(200,await manager.snapshot(id??undefined));}
  if(request.method!=='POST')return response(405,{error:'未対応の操作です。'});
  if(url.search||request.headers.get('origin')!==origin||request.headers.get('x-local-studio-host')!=='1'||!(request.headers.get('content-type')??'').startsWith('application/json')||request.headers.get('sec-fetch-site')==='cross-site')return response(403,{error:'DSH設定画面からの本人操作を確認できません。'});
  const input=await request.json(),context={cookie:request.headers.get('cookie')};if(!input||Array.isArray(input)||Object.keys(input).some(k=>!['action','requestId','previewId','mode'].includes(k)))return response(400,{error:'要求が不正です。'});
  const mode=restartMode(input.mode);
  if(input.action==='preview')return response(200,await manager.preview(context,{mode}));if(input.action!=='restart')return response(400,{error:'未対応の操作です。'});
  const result=await manager.restart(input,context);if(result.created)schedule(()=>void manager.commitExit(input.requestId));return response(result.created?202:200,result);
}catch(error){return response(error.status??503,{error:error.status?error.message:'DSH再起動の結果を確認できません。受付記録を確認し、自動で再送しないでください。'});}};}
export async function apply(ctx,input){
  assertWebOnlyHost();
  const config=hostConfiguration(input),root=config.runtimeRoot;
  let policy=null;
  if(config.policyModule){const path=await configuredFile(config.policyModule),module=await import(pathToFileURL(path).href);if(typeof module.createHostRestartPolicy!=='function')throw TypeError('Configured host policy has no createHostRestartPolicy');policy=await module.createHostRestartPolicy({root,ctx});if(!policy)throw TypeError('Configured host policy returned no guard');}
  if(config.requirePolicy&&!policy)throw TypeError('The required host restart policy is unavailable');
  const adapter=await createRuntimeAdapter({root,ctx,settings:{nodeExecutable:config.nodeExecutable,port:config.port},launcher:config.launcher,workerPath:config.workerPath,policy}),manager=await createRestartManager({root,adapter});
  ctx.effect(()=>()=>manager.dispose());
  ctx.effect(()=>ctx.connection.fetch.register({path:PATH,methods:['GET','POST'],requestBody:'buffered',fetch:hostHandler({manager,origin:`http://127.0.0.1:${config.port}`})}));
}
