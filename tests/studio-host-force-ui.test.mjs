import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import vm from 'node:vm';

const h=(type,props,...children)=>({type,props:{...props,children:children.flat(Infinity)}});
const Button=()=>null;
async function load(){let api;vm.runInNewContext(await readFile(new URL('../apps/dsh-plugins/studio-host/client.js',import.meta.url),'utf8'),{window:{__ModuleLoader__:{load:entry=>{api=entry.factory(name=>name==='react'?{createElement:h,useEffect(){},useSyncExternalStore:(_subscribe,snapshot)=>snapshot()}:{Button});}}},AbortController,AbortSignal,setTimeout,clearTimeout,fetch:()=>assert.fail('unexpected default fetch')});return api;}
const json=value=>({ok:true,status:200,json:async()=>value});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const affected={runningSessions:2,queuedSessions:3,queuedMessages:7,totalSessions:4};
const preview=()=>({mode:'force',previewId:randomUUID(),deletions:{count:1},affected});
const store=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function find(tree,label){if(!tree||typeof tree!=='object')return;return tree.props?.['aria-label']===label?tree:tree.props?.children?.map(child=>find(child,label)).find(Boolean);}
function text(tree){if(tree===null||tree===undefined)return '';if(typeof tree!=='object')return String(tree);return tree.props?.children?.map(text).join(' ')??'';}
function render(api,patch={}){const state={value:{local:{running:2,queued:3}},preview:null,pending:null,busy:false,error:'',uncertain:false,...patch},calls=[];const controller={getSnapshot:()=>state,subscribe(){return()=>{};},prepare:mode=>calls.push(mode),refresh(){},confirm(){},cancel(){}};return {tree:api.HostSettings({controller,t:key=>api.ja[key]}),calls};}

test('force remains a separate native action when normal restart is blocked by queued or running conversations',async()=>{
  const api=await load(),{tree,calls}=render(api);
  const normal=find(tree,'Restart DSH'),force=find(tree,'Force restart DSH');
  assert.equal(normal.type,Button);assert.equal(force.type,Button);
  assert.equal(normal.props.disabled,true);assert.equal(force.props.disabled,false);
  force.props.onClick();assert.deepEqual(calls,['force']);
  assert.match(text(tree),/連携プラグインが保護する外部処理中/);
});

test('force cannot bypass an unknown result, another pending restart, or missing observations',async()=>{
  const api=await load();
  for(const patch of [{value:null},{pending:{requestId:randomUUID()}},{busy:true},{uncertain:true},{value:{local:{running:0,queued:0},operation:{state:'unknown'}}},{value:{local:{running:0,queued:0},operation:{state:'starting'}}}]){
    const {tree}=render(api,patch);assert.equal(find(tree,'Force restart DSH').props.disabled,true);assert.equal(find(tree,'Restart DSH').props.disabled,true);
  }
});

test('force confirmation identifies affected conversations and messages before cancellation, including queued deletions separately',async()=>{
  const api=await load(),{tree}=render(api,{preview:preview()});
  const confirm=find(tree,'Confirm force DSH restart');assert.ok(confirm);assert.match(confirm.props.className,/sh-confirm-force/);
  const impact=find(tree,'Force restart impact');assert.ok(impact);
  assert.deepEqual(impact.props.children.filter(child=>child.type==='dd').map(child=>child.props.children[0]),[4,2,3,7]);
  const body=text(confirm);assert.match(body,/待機入力を取り消し/);assert.match(body,/実行中のDSH応答を中断/);assert.match(body,/保存済みの会話履歴/);assert.match(body,/未保存部分/);assert.match(body,/他のサービスは再起動しません/);assert.match(body,/削除予約/);
});

test('force mode is bound from preview through explicit confirmation and stored intent, while normal payloads stay compatible',async()=>{
  const api=await load(),storage=store(),posts=[];const confirmed=preview();
  const controller=api.createController({storage,schedule:()=>0,cancelTimer(){},uuid:randomUUID,fetcher:async(_url,options)=>{const body=JSON.parse(options.body);posts.push(body);return json(body.action==='preview'?confirmed:{operation:{requestId:body.requestId,state:'exiting'}});}});
  await controller.prepare('force');assert.equal(posts.length,1);assert.equal(posts[0].mode,'force');assert.equal(storage.values.size,0);
  controller.confirm();await settle();assert.equal(posts.length,2);assert.equal(posts[1].mode,'force');assert.equal(posts[1].previewId,confirmed.previewId);
  assert.deepEqual(JSON.parse([...storage.values.values()][0]),posts[1]);controller.confirm();await settle();assert.equal(posts.length,2);controller.dispose();
  const normal=[];const old=api.createController({storage:store(),uuid:randomUUID,schedule:()=>0,cancelTimer(){},fetcher:async(_url,options)=>{const body=JSON.parse(options.body);normal.push(body);return json(body.action==='preview'?{previewId:randomUUID(),deletions:{count:0}}:{operation:{state:'exiting'}});}});
  await old.prepare();old.confirm();await settle();assert.equal(normal.length,2);assert.equal(Object.hasOwn(normal[0],'mode'),false);assert.equal(Object.hasOwn(normal[1],'mode'),false);old.dispose();
});

test('missing impact, invalid counts, or a different returned mode prevents force confirmation instead of displaying zero',async()=>{
  const api=await load();
  for(const value of [{...preview(),affected:undefined},{...preview(),affected:{...affected,queuedMessages:-1}},{...preview(),affected:{...affected,totalSessions:1}},{...preview(),affected:{...affected,queuedMessages:2}},{...preview(),mode:'normal'}]){
    let calls=0;const controller=api.createController({storage:store(),fetcher:async()=>{calls++;return json(value);}});await controller.prepare('force');assert.equal(controller.getSnapshot().preview,null);assert.match(controller.getSnapshot().error,/正確な影響/);controller.confirm();await settle();assert.equal(calls,1);controller.dispose();
  }
});

test('lost force acceptance is recovered with the same receipt and never sends the force action again automatically',async()=>{
  const api=await load(),storage=store(),posts=[],gets=[];let accepted;
  const controller=api.createController({storage,schedule:()=>0,cancelTimer(){},uuid:randomUUID,fetcher:async(url,options)=>{if(options.method==='POST'){const body=JSON.parse(options.body);posts.push(body);if(body.action==='preview')return json(preview());accepted=body;throw Error('connection lost');}gets.push(url);return json({local:{running:0,queued:0},operation:{requestId:accepted.requestId,state:'completed',mode:'force'}});}});
  await controller.prepare('force');controller.confirm();await settle();assert.equal(posts.length,2);assert.equal(controller.getSnapshot().pending.mode,'force');
  await controller.refresh();assert.equal(posts.length,2);assert.match(gets[0],new RegExp(accepted.requestId));assert.equal(controller.getSnapshot().pending,null);assert.equal(storage.values.size,0);controller.dispose();
});

test('saved force intents retain their mode and both locale dictionaries provide matching force copy',async()=>{
  const api=await load(),storage=store(),intent={action:'restart',mode:'force',requestId:randomUUID(),previewId:randomUUID()};storage.setItem('studio-host.restart.v1',JSON.stringify(intent));
  const controller=api.createController({storage});assert.equal(controller.getSnapshot().pending.mode,'force');assert.deepEqual(Object.keys(api.en).sort(),Object.keys(api.ja).sort());controller.dispose();
});
