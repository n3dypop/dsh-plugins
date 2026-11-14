import {join,resolve} from 'node:path';
import {assertReviewedRuntime} from '../../../scripts/maintenance/Apply-SessionDeletions.mjs';
import {readQueue} from './session-store.mjs';

export const startupService='studioSessionStartup';
export const samePath=(a,b)=>typeof a==='string'&&resolve(a).toLowerCase()===resolve(b).toLowerCase();

export function assertStartupOrder(ctx,paths){
  const rows=[...ctx.loader.entries()];
  for(const [id,directory] of [['session-persistence-jsonl','sessions'],['storage-json','storages'],['webserver',null]]){
    const entries=rows.filter(entry=>entry.options.id===id);
    const [entry]=entries;
    if(entries.length!==1||entry.disabled||!Array.isArray(entry.options.inject)||!entry.options.inject.includes(startupService)){
      throw Error('Session Library startup dependency is missing: '+id);
    }
    if(directory){
      const root=entry.options.config?.root;
      if(root?.__jsExpr!==`dshHomePath('${directory}')`&&!samePath(root,join(paths.home,directory))){
        throw Error('Session Library requires the standard storage root: '+id);
      }
    }
  }
  if(ctx.get('sessionPersistence')||ctx.get('storageDomain')||ctx.get('webServer')){
    throw Error('Session storage or HTTP service is already active');
  }
}

export async function runSessionStartup(ctx,paths,dshDirectory,processPending){
  // A reload of profile configuration during a live Host must never delete history.
  let alreadyReady=false;
  ctx.appReady.onReady(()=>{alreadyReady=true;})();
  if(!alreadyReady){
    assertStartupOrder(ctx,paths);
    const queue=await readQueue(paths);
    if(queue.requests.some(request=>['pending','applying'].includes(request.state))){
      const query=[...ctx.loader.entries()].find(entry=>entry.options.id==='session-query-sqlite');
      if(query&&!query.disabled&&query.options.config?.openAt!=='never'){
        throw Error('Session Library requires full-text session indexing to be disabled');
      }
      await assertReviewedRuntime(dshDirectory);
      await processPending();
    }
  }
  ctx.provide(startupService,true);
}
