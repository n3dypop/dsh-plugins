// Route adapter for the DSH-authenticated Web connection. This module does not
// register itself. Registration requires a product manager whose owner,
// ledger and JSONL evidence have all been verified; none is client-provided.
import {UUID} from './restart-state.mjs';
import {jsonResponse as reply,isLocalJsonMutation} from '../shared/web-route.mjs';
export function maintenanceStopHandler({manager,origin,schedule=fn=>setTimeout(fn,250),onExitFailure=()=>{}}){
 if(!manager||typeof manager.prepare!=='function'||typeof manager.status!=='function'||typeof origin!=='string'||!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw TypeError('Maintenance route dependencies are incomplete');
 return async request=>{
  try{
   if(request.headers.get('origin')!==origin||request.headers.get('x-local-studio-host')!=='1'||!request.headers.get('cookie')||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'管理操作の接続を確認できません。'});
   // DSH 0.2.2 presents plugin routes with its synthetic internal origin;
   // the browser-supplied Origin above remains the same-origin CSRF check.
   const url=new URL(request.url);if(url.origin!==origin&&url.origin!=='http://dsh.internal')return reply(403,{error:'管理操作の接続を確認できません。'});
   if(request.method==='GET'){
    if([...url.searchParams.keys()].some(k=>k!=='requestId')||url.searchParams.getAll('requestId').length!==1||!UUID.test(url.searchParams.get('requestId')??''))return reply(400,{error:'操作IDが不正です。'});
    return reply(200,await manager.status(url.searchParams.get('requestId')));
   }
   if(request.method!=='POST')return reply(405,{error:'未対応の操作です。'});
   if(url.search||!isLocalJsonMutation(request,origin,'x-local-studio-host'))return reply(400,{error:'要求が不正です。'});
   const input=await request.json();if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='requestId'||!UUID.test(input.requestId??''))return reply(400,{error:'要求が不正です。'});
   const prepared=await manager.prepare(input.requestId,{cookie:request.headers.get('cookie')});
   try{schedule(()=>void prepared.requestExit().catch(error=>{try{onExitFailure(error);}catch{}}));}catch(error){prepared.release();throw error;}
   return reply(202,{requestId:input.requestId,state:'accepted',guidance:'停止の受付です。停止完了や正常終了の証拠ではありません。'});
  }catch{return reply(503,{error:'停止操作を確認できません。受付記録を確認し、同じ操作を再送しないでください。'});}
 };
}
