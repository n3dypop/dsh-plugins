import test from 'node:test';
import assert from 'node:assert/strict';
import {createWindowOpacityRoutes} from '../apps/dsh-plugins/studio-appearance/window-opacity.mjs';
import {createNativeOpacityAdapter} from '../apps/dsh-plugins/studio-appearance/native-adapter.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const origin='http://127.0.0.1:12345',cookie='dsh-auth-test=fixture',path='/api/studio-appearance/window-opacity';
const req=(url,headers={},options={})=>new Request(origin+url,{...options,headers:{cookie,...headers}});
const challenge=headers=>req(path+'-proof',{'x-studio-window-proof-request':'1',...headers});
const post=(proof,opacity,headers={})=>req(path,{'content-type':'application/json','x-studio-window-action':'1','x-studio-window-proof':proof,...headers},{method:'POST',body:JSON.stringify({opacity})});

test('proof is scoped to Desktop Host cookie and only bounded opacity requests reach the adapter',async()=>{
  const applied=[],routes=createWindowOpacityRoutes({origin:()=>origin,adapter:{get:async()=>({opacity:null}),set:async opacity=>{applied.push(opacity);return {opacity};}}});
  const response=await routes.proof(challenge());assert.equal(response.status,200);const {proof}=await response.json();
  assert.equal((await routes.action(post(proof,60))).status,200);assert.deepEqual(applied,[60]);
  for(const bad of [post(proof,29),post(proof,101),post(proof,60.5)])assert.equal((await routes.action(bad)).status,400);
  for(const bad of [post(proof,60,{cookie:'dsh-auth-other=other'}),post(proof,60,{origin:'https://outside.example'}),post(proof,60,{'sec-fetch-site':'cross-site'}),post('bad',60)])assert.equal((await routes.action(bad)).status,403);
  assert.deepEqual(applied,[60]);
});

test('proof expires and Host origin change is refused',async()=>{
  let time=1000000,host=origin;const adapter={get:async()=>({opacity:100}),set:async opacity=>({opacity})};
  const routes=createWindowOpacityRoutes({origin:()=>host,adapter,now:()=>time});
  const {proof}=await (await routes.proof(challenge())).json();time+=300001;
  assert.equal((await routes.action(post(proof,80))).status,403);
  host='http://127.0.0.1:12346';assert.equal((await routes.proof(challenge())).status,403);
});

test('helper failures and invalid identities never claim that opacity was applied',async()=>{
  const adapter=createNativeOpacityAdapter({run:async percent=>({status:'applied',percent:percent-1})});
  assert.deepEqual(await adapter.get(),{opacity:null});
  await assert.rejects(adapter.set(80));assert.deepEqual(await adapter.get(),{opacity:null});
  await assert.rejects(adapter.set(29));
  const good=createNativeOpacityAdapter({run:async percent=>({status:'applied',percent})});
  assert.deepEqual(await good.set(80),{opacity:80});assert.deepEqual(await good.get(),{opacity:80});
  const routes=createWindowOpacityRoutes({origin:()=>origin,adapter});const proof=(await (await routes.proof(challenge())).json()).proof;
  assert.equal((await routes.action(post(proof,80))).status,503);
});

test('lost response after an OS change invalidates old state until a confirmed reapplication',async()=>{
  let actual=100,loseResponse=false;
  const adapter=createNativeOpacityAdapter({run:async percent=>{
    actual=percent;
    if(loseResponse)throw Error('response lost after native change');
    return {status:'applied',percent};
  }});
  await adapter.set(60);assert.deepEqual(await adapter.get(),{opacity:60});
  loseResponse=true;await assert.rejects(adapter.set(80));
  assert.equal(actual,80);assert.deepEqual(await adapter.get(),{opacity:null});
  loseResponse=false;assert.deepEqual(await adapter.set(60),{opacity:60});
  assert.equal(actual,60);assert.deepEqual(await adapter.get(),{opacity:60});
});

test('an in-flight mutation does not expose an earlier confirmed value',async()=>{
  let release;const waiting=new Promise(resolve=>{release=resolve;});let delay=false;
  const adapter=createNativeOpacityAdapter({run:async percent=>{
    if(delay)await waiting;
    return {status:'applied',percent};
  }});
  await adapter.set(60);delay=true;
  const operation=adapter.set(80);
  assert.deepEqual(await adapter.get(),{opacity:null});
  release();await operation;assert.deepEqual(await adapter.get(),{opacity:80});
});

test('route mutations are serialized',async()=>{
  const order=[];let release;const wait=new Promise(resolve=>{release=resolve;});
  const routes=createWindowOpacityRoutes({origin:()=>origin,adapter:{get:async()=>({opacity:null}),async set(value){order.push(`start${value}`);if(value===60)await wait;order.push(`end${value}`);return {opacity:value};}}});
  const proof=(await (await routes.proof(challenge())).json()).proof;
  const first=routes.action(post(proof,60)),second=routes.action(post(proof,70));
  await new Promise(resolve=>setTimeout(resolve,20));assert.deepEqual(order,['start60']);release();await Promise.all([first,second]);assert.deepEqual(order,['start60','end60','start70','end70']);
});

test('actual Desktop Host rejects guest peers before opacity routes', {skip:!process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE},()=>{
  const module=fileURLToPath(new URL('../apps/dsh-plugins/studio-appearance/window-opacity.mjs',import.meta.url));
  const script=String.raw`
    const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
    (async()=>{
      const root=path.join(process.resourcesPath,'app.asar/dsh/node_modules/@deepseek-ai');
      const [{Context},{HostConnectionService},{createWindowOpacityRoutes}]=await Promise.all([import(pathToFileURL(path.join(root,'cordis/lib/index.js'))),import(pathToFileURL(path.join(root,'dsh-client-connection/lib/index.js'))),import(pathToFileURL(process.argv[1]))]);
      const ctx=new Context(),provider=ctx.plugin(c=>{new HostConnectionService(c,[],{});});await provider.await();
      const connection=ctx.get('connection'),guest=connection.createPeer({principal:{kind:'test-guest',guest:'fixture'}}),path1='/api/studio-appearance/window-opacity-proof',path2='/api/studio-appearance/window-opacity';let calls=0;
      const routes=createWindowOpacityRoutes({origin:()=> 'http://127.0.0.1:12345',adapter:{get:async()=>({opacity:null}),set:async opacity=>{calls++;return {opacity};}}});
      const dispose1=connection.fetch.register({path:path1,methods:['GET'],requestBody:'buffered',fetch:routes.proof});const dispose2=connection.fetch.register({path:path2,methods:['GET','POST'],requestBody:'buffered',fetch:routes.action});
      const handler=connection.createSharedFetchHandler('/api'),cookie='dsh-auth-fixture=synthetic',issue=()=>new Request('http://desktop.invalid'+path1,{headers:{cookie,'x-studio-window-proof-request':'1'}});
      try{
        assert.equal((await handler.fetch(issue(),guest)).status,403);
        const response=await handler.fetch(issue(),connection.browserPeer);assert.equal(response.status,200);const {proof}=await response.json();
        const request=()=>new Request('http://desktop.invalid'+path2,{method:'POST',headers:{cookie,'content-type':'application/json','x-studio-window-action':'1','x-studio-window-proof':proof},body:JSON.stringify({opacity:60})});
        assert.equal((await handler.fetch(request(),guest)).status,403);assert.equal(calls,0);
        assert.equal((await handler.fetch(request(),connection.browserPeer)).status,200);assert.equal(calls,1);
      }finally{await dispose2();await dispose1();await guest.dispose();await provider.dispose();}
    })().catch(error=>{console.error(error.stack||error);process.exitCode=1;});`;
  const child=spawnSync(process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE,['-e',script,module],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(child.status,0,child.stderr||child.error?.message||'Desktop Host fixture failed');
});
