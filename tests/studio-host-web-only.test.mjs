import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertWebOnlyHost} from '../apps/dsh-plugins/studio-host/index.mjs';

test('host restart permits standalone Node and refuses Electron before configuring a route',()=>{
  assert.doesNotThrow(()=>assertWebOnlyHost({node:'24.0.0'}));
  assert.throws(()=>assertWebOnlyHost({node:'24.0.0',electron:'44.0.0'}),/Desktop is unsupported/);
});

test('packaged Desktop Electron cannot activate Web-only host lifecycle',{skip:!process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE},()=>{
  const entry=fileURLToPath(new URL('../apps/dsh-plugins/studio-host/index.mjs',import.meta.url));
  const source=String.raw`const {pathToFileURL}=require('node:url'); (async()=>{const p=await import(pathToFileURL(process.argv[1]));let used=false;try{await p.apply(new Proxy({}, {get(){used=true;throw Error('unexpected route access')}}),{});throw Error('Desktop was accepted')}catch(e){if(!String(e.message).includes('Desktop is unsupported')||used)throw e}})().catch(e=>{console.error(e);process.exitCode=1})`;
  const child=spawnSync(process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE,['-e',source,entry],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(child.status,0,child.stderr||child.error?.message||'Desktop Host check failed');
});
