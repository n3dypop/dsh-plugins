import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertWebSessionHost} from '../apps/dsh-plugins/studio-sessions/index.mjs';

test('managed Web session routes reject Electron-hosted processes before reading state',()=>{
  assert.doesNotThrow(()=>assertWebSessionHost({node:'24.0.0'}));
  assert.throws(()=>assertWebSessionHost({electron:'44.0.0'}),/only in the managed Web Host/);
});

test('installed Desktop runtime does not register session management routes',{skip:!process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE},()=>{
  const file=fileURLToPath(new URL('../apps/dsh-plugins/studio-sessions/index.mjs',import.meta.url));
  const code=String.raw`
    const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
    (async()=>{const m=await import(pathToFileURL(process.argv[1]));let touched=false;
      const ctx=new Proxy({}, {get(){touched=true;throw Error('context accessed');}});
      await assert.rejects(m.apply(ctx,{}),/only in the managed Web Host/);assert.equal(touched,false);
    })().catch(e=>{console.error(e);process.exitCode=1});
  `;
  const p=spawnSync(process.env.MEDIA_STUDIO_DESKTOP_TEST_EXE,['-e',code,file],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(p.status,0,p.stderr||p.error?.message);
});
