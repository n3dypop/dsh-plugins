import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('packaged Desktop admits Session Library before starting storage and HTTP',{
  skip:!process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE,timeout:65000,
},async t=>{
  const home=await mkdtemp(join(tmpdir(),'dsh-session-startup-'));
  t.after(()=>rm(home,{recursive:true,force:true,maxRetries:5,retryDelay:200}));
  const profile=join(home,'profiles','desktop');
  await mkdir(profile,{recursive:true});
  await writeFile(join(profile,'package.json'),JSON.stringify({
    name:'dsh-profile-desktop',private:true,
    dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}},
  }));
  await writeFile(join(profile,'cordis.yml'),'[]\n');
  await writeFile(join(profile,'pnpm-workspace.yaml'),'packages: []\n');
  const source=resolve(import.meta.dirname,'..');
  const entry=name=>pathToFileURL(join(source,'apps/dsh-plugins/studio-sessions',name)).href;
  await writeFile(join(profile,'cordis.patch.yml'),JSON.stringify([
    {insert:[
      {id:'studio-sessions-desktop-startup',name:entry('desktop-startup.mjs')},
      {id:'studio-sessions',name:entry('index.mjs'),config:{platform:'desktop'}},
    ]},
    {id:'session-persistence-jsonl',inject:['studioSessionStartup']},
    {id:'storage-json',inject:['studioSessionStartup']},
    {id:'webserver',inject:['webStartup','studioSessionStartup']},
  ]));
  const script=String.raw`
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {once} from 'node:events';
const {home,profile,adapter}=JSON.parse(process.argv[1]);
const runtime=join(process.resourcesPath,'app.asar/dsh');
await (await import(adapter)).assertReviewedRuntime(runtime);
const child=spawn(process.execPath,[
  '--expose-internals',join(runtime,'node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js'),runtime,profile,'',
],{cwd:profile,windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],
  env:{...process.env,DSH_HOME:home,ELECTRON_RUN_AS_NODE:'1',DSH_TELEMETRY_MODE:'DISABLED',DSH_TELEMETRY_DISABLED:'1'}});
let diagnostic='';
child.stderr.on('data',data=>{diagnostic=(diagnostic+data).slice(-12000);});
const exited=once(child,'exit');
const deadline=setTimeout(()=>child.kill(),45000);
try{
  const ready=await new Promise((resolve,reject)=>{
    child.on('message',message=>{
      if(message.type==='ready')resolve(message);
      if(message.type==='fatal')reject(Error(message.message));
    });
    child.once('error',reject);
    child.once('exit',()=>reject(Error('Desktop Host exited before readiness: '+diagnostic)));
  });
  const url=new URL(ready.url),login=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});
  const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert.ok(cookie,'Desktop owner login missing');
  const response=await fetch(url.origin+'/api/local-studio/sessions',{headers:{cookie},signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200);
  const library=await response.json();
  assert.equal(library.desktop,true);assert.equal(library.startup,true);
  assert.equal(library.sessions.length,0);assert.equal(library.requests.length,0);
  assert.doesNotMatch(diagnostic,/disabling profile plugin.*studio-sessions|startup failed/);
  console.log('desktop-session-startup-passed');
}finally{
  if(child.connected)child.send({type:'shutdown'});
  await exited;clearTimeout(deadline);
}
`;
  const result=spawnSync(process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE,[
    '--expose-internals','--input-type=module','-e',script,
    JSON.stringify({home,profile,adapter:pathToFileURL(join(source,'scripts/maintenance/Apply-SessionDeletions.mjs')).href}),
  ],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(result.status,0,result.stderr||result.error?.message);
  assert.match(result.stdout,/desktop-session-startup-passed/);
});

test('managed Web still admits Session Library before starting HTTP',{
  skip:!process.env.MEDIA_STUDIO_WEB_TEST_RUNTIME||process.platform!=='win32',timeout:65000,
},async t=>{
  const {createServer}=await import('node:net');
  const {spawn}=await import('node:child_process');
  const {once}=await import('node:events');
  const home=await mkdtemp(join(tmpdir(),'dsh-web-session-startup-'));
  t.after(()=>rm(home,{recursive:true,force:true,maxRetries:5,retryDelay:200}));
  const profile=join(home,'data/dsh/profiles/web');
  await mkdir(profile,{recursive:true});await mkdir(join(home,'config'));
  const portProbe=createServer();portProbe.listen(0,'127.0.0.1');await once(portProbe,'listening');
  const port=portProbe.address().port;await new Promise((ok,fail)=>portProbe.close(e=>e?fail(e):ok()));
  const runtime=resolve(process.env.MEDIA_STUDIO_WEB_TEST_RUNTIME);
  await writeFile(join(home,'config/environment.json'),JSON.stringify({dshDirectory:runtime,dshHome:'data/dsh',dshPort:port}));
  await writeFile(join(profile,'package.json'),JSON.stringify({
    name:'dsh-profile-web',private:true,dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}},
  }));
  await writeFile(join(profile,'cordis.yml'),'[]\n');
  const entry=name=>pathToFileURL(resolve(import.meta.dirname,'../apps/dsh-plugins/studio-sessions',name)).href;
  await writeFile(join(profile,'cordis.patch.yml'),JSON.stringify([
    {insert:[
      {id:'studio-sessions-web-startup',name:entry('web-startup.mjs'),config:{runtimeRoot:home}},
      {id:'studio-sessions',name:entry('index.mjs'),config:{runtimeRoot:home}},
    ]},
    {id:'session-persistence-jsonl',inject:['studioSessionStartup']},
    {id:'storage-json',inject:['studioSessionStartup']},
    {id:'webserver',inject:['webStartup','studioSessionStartup']},
  ]));
  const child=spawn(process.execPath,[join(runtime,'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    'web','--host','127.0.0.1','--port',String(port),'--no-open'],{
    cwd:home,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,DSH_HOME:join(home,'data/dsh'),DSH_TELEMETRY_MODE:'DISABLED',DSH_TELEMETRY_DISABLED:'1'},
  });
  let diagnostic='';const capture=data=>{diagnostic=(diagnostic+data).slice(-12000);};
  child.stdout.on('data',capture);child.stderr.on('data',capture);
  const exited=once(child,'exit');
  try{
    let url;
    for(let n=0;n<200;n++){
      const address=diagnostic.match(/dsh web: (http:\/\/\S+)/)?.[1];
      if(address){url=new URL(address);break;}
      assert.equal(child.exitCode,null,'Web Host exited before readiness');
      await new Promise(ok=>setTimeout(ok,250));
    }
    assert.ok(url,'Web Host did not become ready');
    const login=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(5000)});
    const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
    assert.ok(cookie,'Web owner login missing');
    const response=await fetch(url.origin+'/api/local-studio/sessions',{headers:{cookie},signal:AbortSignal.timeout(5000)});
    assert.equal(response.status,200);const library=await response.json();
    assert.equal(library.desktop,false);assert.equal(library.startup,true);
    assert.equal(library.sessions.length,0);assert.equal(library.requests.length,0);
    assert.doesNotMatch(diagnostic,/disabling profile plugin.*studio-sessions|startup failed/);
  }finally{
    if(child.exitCode===null&&child.signalCode===null)child.kill();await exited;
  }
});
