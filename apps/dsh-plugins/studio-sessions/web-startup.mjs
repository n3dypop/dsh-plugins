import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {acquireWebProfile,applyDeletions,assertDshStopped,assertReviewedRuntime} from '../../../scripts/maintenance/Apply-SessionDeletions.mjs';
import {createRuntimeConfig,runtimeRootOf} from '../shared/plugin-config.mjs';
import {noLinks,sessionPaths} from './session-store.mjs';
import {assertStartupOrder,runSessionStartup,samePath} from './startup.mjs';

export const name='studio-sessions-web-startup';
export const inject=['profileContext','appReady','loader','webStartup'];
export const Config=createRuntimeConfig();

export async function apply(ctx,config){
  const root=runtimeRootOf(config),paths=sessionPaths(root);
  const {name:profile,home,dir,installAnchor}=ctx.profileContext;
  if(process.platform!=='win32'||process.versions.electron||profile!=='web'||!samePath(home,paths.home)||
    !samePath(dir,join(paths.home,'profiles/web'))){
    throw Error('Session Library requires the managed Windows Web profile');
  }
  const settingsPath=join(root,'config/environment.json');
  await noLinks(root,settingsPath);
  await noLinks(root,dir);
  const settings=JSON.parse(await readFile(settingsPath,'utf8'));
  const {dshDirectory,dshPort}=settings;
  if(settings.dshHome!=='data/dsh'||!Number.isSafeInteger(dshPort)||dshPort<1024||dshPort>65535||
    typeof dshDirectory!=='string'||!samePath(installAnchor,join(dshDirectory,'node_modules/@deepseek-ai/dsh/package.json'))||
    !samePath(process.argv[1],join(dshDirectory,'node_modules/@deepseek-ai/dsh/lib/bin.js'))||
    (ctx.webStartup.host??'127.0.0.1')!=='127.0.0.1'||(ctx.webStartup.port??3080)!==dshPort||ctx.webStartup.tls){
    throw Error('Session Library Web startup does not match the configured DSH runtime and port');
  }
  await assertReviewedRuntime(dshDirectory);
  const release=await acquireWebProfile(paths,dshDirectory);
  ctx.effect(()=>release);
  await runSessionStartup(ctx,paths,()=>applyDeletions({
    root,settings,paths,stopped:async()=>{
      assertStartupOrder(ctx,paths);
      await assertDshStopped(root,settings,process.pid);
      assertStartupOrder(ctx,paths);
    },
  }));
}
