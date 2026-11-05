// Narrow fingerprint for the observed DSH 0.2.2-rc.1 Web build. It verifies
// loaded function bodies as well as installed package bytes. This is a drift
// detector, not authentication against an adversary controlling the process.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join,resolve,win32} from 'node:path';

const pins=Object.freeze({
 backendFile:'69efef5f84dddf947032bc1425067878fa610416c8885acde2ded9b01230c9b7',
 loopFile:'a6fa8e0c7c90191caf5f4a3bb5c624a86e9845cf3c79d020b71420d0e20ae4c1',
 backendClass:'3b266ac3f592216e5967eedce615630e07024c68637fe9f86ba152419805c3f7',
 agentClass:'457ff92f059a142903dbe3061211c8af1c7612429919471a945c04f7b6f04935',
 inboxClass:'a916b138f90aa67fbf2d9deedf6e7f97e497f92cea517e777f48aa1a16aea4e7'
});
const hash=value=>createHash('sha256').update(value).digest('hex');
function inspect(object,name,expected,methods){
 if(!object)return false;const prototype=Object.getPrototypeOf(object),constructor=Object.getOwnPropertyDescriptor(prototype??{},'constructor')?.value;
 if(typeof constructor!=='function'||constructor.name!==name||hash(Function.prototype.toString.call(constructor))!==expected)return false;
 // Cordis returns a fresh service proxy with bound methods on each access;
 // compare the underlying prototype bodies, not proxy/method object identity.
 return methods.every(method=>!Object.hasOwn(object,method)&&typeof prototype[method]==='function');
}
export function createBackendIdentityVerifier({ctx,runtimeDirectory,sessionRoot}){
 if(!ctx?.sessionPersistence||!ctx?.agents?.list||typeof runtimeDirectory!=='string'||typeof sessionRoot!=='string')throw TypeError('Backend identity dependencies are incomplete');
 const require=createRequire(join(resolve(runtimeDirectory),'package.json')),backendPath=require.resolve('@deepseek-ai/dsh-session-persistence-jsonl'),loopPath=require.resolve('@deepseek-ai/dsh-agent-loop'),expectedRoot=win32.normalize(resolve(sessionRoot)).toLowerCase();
 const servicePrototype=Object.getPrototypeOf(ctx.sessionPersistence);
 return async()=>{
  try{
   const service=ctx.sessionPersistence;if(Object.getPrototypeOf(service)!==servicePrototype||service.name!=='session-persistence-jsonl'||typeof service.root!=='string'||win32.normalize(resolve(service.root)).toLowerCase()!==expectedRoot||!inspect(service,'JsonlSessionPersistence',pins.backendClass,['list','open','flush']))return false;
   if(hash(await readFile(backendPath))!==pins.backendFile||hash(await readFile(loopPath))!==pins.loopFile)return false;
   const agents=ctx.agents.list();if(!Array.isArray(agents)||!agents.length)return false;
   for(const agent of agents)if(!inspect(agent,'ReactLoopAgent',pins.agentClass,['runMaintenance','cancel'])||!inspect(agent.inbox,'ReactLoopInbox',pins.inboxClass,['append','remove','splice']))return false;
   return Object.getPrototypeOf(ctx.sessionPersistence)===servicePrototype;
  }catch{return false;}
 };
}
