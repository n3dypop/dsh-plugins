import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

// This proof supplements, but never replaces, DSH connection.fetch's owner
// authentication. It is scoped to the current Host, cookie and route.
const PATH='/api/studio-appearance/window-opacity';
const PROOF_PATH='/api/studio-appearance/window-opacity-proof';
const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const pct=value=>Number.isInteger(value)&&value>=30&&value<=100;

export function createWindowOpacityRoutes({origin,adapter,now=Date.now}) {
  const key=randomBytes(32);let boundOrigin=null,chain=Promise.resolve();
  const hostOrigin=()=>{try{const value=origin();if(typeof value!=='string')return null;const u=new URL(value);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.origin!==value||!u.port)return null;if(boundOrigin&&boundOrigin!==value)return null;boundOrigin=value;return value;}catch{return null;}};
  const cookie=request=>{const s=request.headers.get('cookie');return s&&s.length<=16384&&/(?:^|;\s*)dsh-auth-[A-Za-z0-9_-]+=/.test(s)?s:null;};
  const shape=request=>{const host=hostOrigin(),source=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');return host&&(source===null||source===host)&&(site===null||site==='same-origin');};
  const signature=(s,time)=>createHmac('sha256',key).update('studio-window-opacity-v1\0').update(PATH).update('\0').update(time).update('\0').update(s).digest('base64url');
  function validProof(request){const s=cookie(request),p=request.headers.get('x-studio-window-proof');if(!s||!p||p.length>128)return false;const m=/^(0|[1-9]\d{0,15})\.([A-Za-z0-9_-]{43})$/.exec(p);if(!m)return false;const t=Number(m[1]),current=now();if(!Number.isSafeInteger(t)||!Number.isSafeInteger(current)||t>current||current-t>300000)return false;const a=Buffer.from(m[2]),b=Buffer.from(signature(s,m[1]));return a.length===b.length&&timingSafeEqual(a,b);}
  async function proof(request){if(request.method!=='GET'||new URL(request.url).search||request.headers.get('x-studio-window-proof-request')!=='1'||!shape(request))return reply(403,{error:'not available'});const s=cookie(request),time=now();if(!s||!Number.isSafeInteger(time)||time<0)return reply(403,{error:'not available'});return reply(200,{proof:`${time}.${signature(s,String(time))}`});}
  async function action(request){
    if(!shape(request)||!cookie(request)||new URL(request.url).search)return reply(403,{error:'not available'});
    if(request.method==='GET'){
      try{const state=await adapter.get();if(!state||!(state.opacity===null||pct(state.opacity)))throw Error('invalid');return reply(200,{available:true,opacity:state.opacity});}catch{return reply(503,{error:'ウィンドウの状態を確認できません。'});}
    }
    if(request.method!=='POST')return reply(405,{error:'not available'});
    if(request.headers.get('x-studio-window-action')!=='1'||!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||!validProof(request))return reply(403,{error:'not available'});
    let input;try{input=await request.json();}catch{return reply(400,{error:'設定を読み取れません。'});}
    if(!input||Array.isArray(input)||Object.keys(input).length!==1||!pct(input.opacity))return reply(400,{error:'不透明度は30〜100%で指定してください。'});
    const operation=chain.then(async()=>{const value=await adapter.set(input.opacity);if(!value||value.opacity!==input.opacity)throw Error('unconfirmed');return value;});
    chain=operation.catch(()=>{});
    try{const value=await operation;return reply(200,{available:true,opacity:value.opacity});}catch{return reply(503,{error:'ウィンドウの不透明度を変更できません。設定は保存していません。'});}
  }
  return {proof,action};
}
export {PATH as WINDOW_OPACITY_PATH,PROOF_PATH as WINDOW_OPACITY_PROOF_PATH};
