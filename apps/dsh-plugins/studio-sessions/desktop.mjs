import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {resolve,join} from 'node:path';
import {assertLocalDesktopHome,desktopSessionPaths,noLinks} from './session-store.mjs';

export const desktopProofPath='/api/local-studio/desktop-proof/sessions';

export async function resolveDesktopSessions(ctx){
  const profile=ctx.get('profileContext');
  const backend=ctx.sessionPersistence;
  if(process.platform!=='win32'||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1'||profile?.name!=='desktop' ||
    typeof profile.home!=='string'||typeof profile.dir!=='string'||backend?.name!=='session-persistence-jsonl'||typeof backend.config?.root!=='string') {
    throw Error('Desktop Session Library requires the packaged Windows Desktop Host and its standard persistence backend');
  }
  const paths=desktopSessionPaths(profile.home);
  await assertLocalDesktopHome(paths);
  await noLinks(paths.root,paths.sessions,{missing:true});
  if(resolve(backend.config.root).toLowerCase()!==paths.sessions.toLowerCase() ||
    resolve(profile.dir).toLowerCase()!==join(paths.home,'profiles/desktop').toLowerCase()) {
    throw Error('Desktop Session Library requires the same session home in the Host and the managed launcher');
  }
  return paths;
}

// Register this challenge and its POST only on DSH's authenticated owner
// connection. The Desktop protocol forwarder removes Origin and supplies the
// owner cookie. Require a cookie-bound proof to accept that originless POST.
export function desktopSessionTrust(hostOrigin,{now=Date.now}={}){
  const key=randomBytes(32);
  function context(request){
    const ownOrigin=hostOrigin(), origin=request.headers.get('origin'), site=request.headers.get('sec-fetch-site');
    const cookie=request.headers.get('cookie');
    if(!ownOrigin || (origin!==null&&origin!==ownOrigin) || (site!==null&&site!=='same-origin') ||
      !cookie||cookie.length>16384||!/(?:^|;\s*)dsh-auth-[A-Za-z0-9_-]+=/.test(cookie))return null;
    return {cookie,ownOrigin};
  }
  function sign({ownOrigin,cookie},issued){
    return createHmac('sha256',key).update(JSON.stringify(['POST','/api/local-studio/sessions',ownOrigin,cookie,issued])).digest('base64url');
  }
  return {
    issue(request){
      const owner=context(request);
      if(!owner||request.method!=='GET'||new URL(request.url).search||request.headers.get('x-local-studio-proof-request')!=='1')return null;
      const issued=String(now());
      return `${issued}.${sign(owner,issued)}`;
    },
    allows(request){
      if(request.method!=='POST'||request.headers.get('x-local-studio-sessions')!=='1'||
        request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')return false;
      const owner=context(request),proof=request.headers.get('x-local-studio-desktop-proof');
      const match=proof?.length<=64&&/^(\d{1,16})\.([A-Za-z0-9_-]{43})$/.exec(proof);
      if(!owner||!match)return false;
      const age=now()-Number(match[1]);
      return age>=0&&age<=300000&&timingSafeEqual(Buffer.from(match[2]),Buffer.from(sign(owner,match[1])));
    },
  };
}
