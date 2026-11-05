import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,lstat,readdir,mkdtemp,writeFile,rm,realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {checkPackage,pluginSets} from '../scripts/check-package.mjs';

const root=resolve(import.meta.dirname,'..');
const json=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const text=path=>readFile(join(root,path),'utf8');
const metadata=await json('package.json'),ids=pluginSets[metadata.name];

test('public package contains only local source, operational docs and permitted assets',async()=>{
  const result=await checkPackage({root,syntax:false});assert.equal(result.name,metadata.name);assert.equal(result.plugins,4);assert.ok(result.modules>0);
});
test('the standalone package gate refuses another product before inspecting its contents',async t=>{
  const fixture=await realpath(await mkdtemp(join(tmpdir(),'dsh-package-boundary-')));
  t.after(()=>rm(fixture,{recursive:true,force:true}));
  await writeFile(join(fixture,'package.json'),JSON.stringify({name:'@n3dypop/media-studio',private:true,license:'MIT',type:'module'}));
  await assert.rejects(checkPackage({root:fixture,syntax:false}),/Package metadata contract is invalid/);
});
test('root metadata uses the documented dependency-free checks and publication boundary',()=>{
  assert.equal(metadata.private,true);assert.equal(metadata.license,'MIT');assert.equal(metadata.type,'module');assert.equal(metadata.engines?.dsh,'0.2.1-rc.5 || 0.2.2-rc.1');assert.equal(metadata.scripts.check,'node scripts/check-package.mjs');assert.equal(metadata.scripts.test,'node --test tests/*.test.mjs');assert.ok(ids);
});
test('plugin manifests expose their local host and web client entries consistently',async()=>{
  const actual=[];for(const entry of await readdir(join(root,'apps/dsh-plugins'),{withFileTypes:true})){if(!entry.isDirectory()||entry.name==='shared')continue;try{await lstat(join(root,'apps/dsh-plugins',entry.name,'package.json'));actual.push(entry.name);}catch(error){if(error.code!=='ENOENT')throw error;}}
  assert.deepEqual(actual.sort(),[...ids].sort());
  for(const id of ids){
    const prefix='apps/dsh-plugins/'+id+'/',manifest=await json(prefix+'package.json');
    const expectedEngine='0.2.1-rc.5 || 0.2.2-rc.1';
    assert.equal(manifest.private,true,id);assert.equal(manifest.type,'module',id);assert.equal(manifest.engines?.dsh,expectedEngine,id);
    const host=typeof manifest.exports==='string'?manifest.exports:manifest.exports?.['.']??manifest.main;
    assert.ok(['./index.mjs','index.mjs'].includes(host),id);assert.match(await text(prefix+'index.mjs'),/\bexport\s+(?:const\s+name|(?:async\s+)?function\s+apply)\b/,id);
    assert.equal(manifest.exports?.['./client'],'./client.js',id);assert.equal(manifest.dsh?.client?.platform,'web',id);assert.match(await text(prefix+'client.js'),/__ModuleLoader__\.load\s*\(/,id);
  }
});
test('bundle lists each public plugin once and leaves configuration-dependent entries disabled',async()=>{
  const bundle=await text('dsh.bundle.patch.yml');
  for(const id of ids){const expression=new RegExp('^\\s*(?:-\\s*)?id:\\s*["\\\']?'+id+'["\\\']?\\s*$','gm');assert.equal([...bundle.matchAll(expression)].length,1,id);}
  const blocks=bundle.split(/(?=^\s*-?\s*id:\s*)/m);
  for(const id of ['studio-host','studio-sessions']){const block=blocks.find(value=>new RegExp('^\\s*(?:-\\s*)?id:\\s*["\\\']?'+id+'["\\\']?\\s*$','m').test(value));assert.ok(block,id);assert.match(block,/^\s*disabled:\s*true\s*$/m,id);}
});
test('runtime configuration helper validates an explicit private root without opening it',async()=>{
  const helper=join(root,'apps/dsh-plugins/shared/plugin-config.mjs');
  try{await lstat(helper);}catch(error){if(error.code==='ENOENT')return;throw error;}
  const {runtimeRootOf,createRuntimeConfig}=await import(pathToFileURL(helper).href),home=resolve(tmpdir(),'public-plugin-contract-runtime');
  assert.equal(runtimeRootOf({runtimeRoot:home}),home);
  for(const value of [undefined,{},null,{runtimeRoot:'relative'},{runtimeRoot:'https://invalid.example/runtime'},{runtimeRoot:' '+home}])assert.throws(()=>runtimeRootOf(value));
  const schema=createRuntimeConfig(),valid=schema['~standard'].validate({runtimeRoot:home}),invalid=schema['~standard'].validate({runtimeRoot:'relative'});
  assert.equal(valid.value.runtimeRoot,home);assert.ok(Array.isArray(invalid.issues)&&invalid.issues.length>0);
});
