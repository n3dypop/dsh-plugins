import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../apps/dsh-plugins/studio-image-viewer/client.js',import.meta.url),'utf8');
function viewer(react){
  let entry;runInNewContext(source,{window:{__ModuleLoader__:{load(value){entry=value;}}},document:{body:{}}});
  return entry.factory(id=>id==='react'?(react??{createElement(){},useState(){},useEffect(){},useRef(){},useCallback(){}}):id==='react-dom'?{createPortal:value=>value}:{});
}
const translate=(dictionaries,language)=>(key,params)=>{let text=dictionaries[language][key]??key;for(const [name,value]of Object.entries(params??{}))text=text.replace('{'+name+'}',value);return text;};

test('viewer owns only its namespace and uses English and Japanese without changing native translations',()=>{
  const api=viewer(),registered=new Map([['conversation',{ja:{'image.zoomIn':'native'}}]]),disposers=[];
  let descriptor;
  const ctx={locale:{register(namespace,value){assert.equal(registered.has(namespace),false);registered.set(namespace,value);return()=>registered.delete(namespace);}},effect(fn){disposers.push(fn());},slots:{registerFactory(value){descriptor=value;},inject(){}}};
  api.apply(ctx);assert.equal(descriptor.locale,api.LOCALE);assert.equal(api.LOCALE,'studio.image-viewer');
  const dictionaries=registered.get(api.LOCALE);assert.equal(dictionaries.en['image.zoomIn'],'Zoom in');assert.equal(dictionaries.ja['image.zoomIn'],'拡大');
  assert.equal(api.labelsFor({t:translate(dictionaries,'en')}).openNamed('x'),'x — Open image');
  const labels=api.labelsFor({t:translate(dictionaries,'ja')});assert.equal(labels.lightbox.reset,'表示をリセット');assert.equal(labels.openNamed('x'),'x — 画像を拡大');
  assert.equal(registered.get('conversation').ja['image.zoomIn'],'native');for(const dispose of disposers.reverse())dispose();
  assert.equal(registered.has(api.LOCALE),false);assert.equal(registered.get('conversation').ja['image.zoomIn'],'native');
});

test('viewer declares the locale dependency and can register after unloading',async()=>{
  const api=viewer(),manifest=JSON.parse(await readFile(new URL('../apps/dsh-plugins/studio-image-viewer/package.json',import.meta.url),'utf8'));
  assert.ok(api.inject.includes('locale'));assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'));
  const registered=new Map();
  for(let cycle=0;cycle<2;cycle++){
    let dispose;api.apply({effect(fn){dispose=fn();},locale:{register(namespace,dictionaries){assert.equal(registered.has(namespace),false);registered.set(namespace,dictionaries);return()=>registered.delete(namespace);}},slots:{registerFactory(){},inject(){}}});
    assert.equal(registered.get(api.LOCALE).ja['image.zoomLevel'],'拡大率');dispose();assert.equal(registered.has(api.LOCALE),false);
  }
});

test('missing or failed translations use complete English viewer copy',()=>{
  const api=viewer();
  for(const t of [undefined,key=>key,()=>'',()=>null,()=>{throw Error('Unavailable translation');}]){
    const labels=api.labelsFor({t});assert.equal(labels.openNamed('Portrait'),'Portrait — Open image');
    for(const [field,key]of [['zoomLevel','image.zoomLevel'],['panArea','image.panArea'],['renderFailed','image.renderFailed']])assert.equal(labels.lightbox[field],api.dictionaries.en[key]);
  }
  const supplied={image:'Custom',lightbox:{zoomLevel:'Custom zoom'}};assert.equal(api.labelsFor({labels:supplied}),supplied);
});

test('rendered ARIA and image error copy follow the viewer locale while action identities stay stable',()=>{
  const state=[];let cursor=0;
  const api=viewer({createElement(type,props,...children){return{type,props:props??{},children};},useState(initial){const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial;return[state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value;}];},useRef(value){return{current:value};},useEffect(){},useCallback:fn=>fn});
  function render(labels){cursor=0;return api.ImageViewer({src:'blob:owned-fixture',alt:'Portrait',labels,onClose(){}});}
  function nodes(tree){return tree&&typeof tree==='object'?[tree,...tree.children.flatMap(nodes)]:[];}
  const en=api.labelsFor({t:translate(api.dictionaries,'en')}).lightbox;
  const first=nodes(render(en));first.find(node=>node.type==='img').props.onError();
  const renderedEn=nodes(render(en)),renderedJa=nodes(render(api.labelsFor({t:translate(api.dictionaries,'ja')}).lightbox));
  assert.equal(renderedEn.find(node=>node.type==='output').props['aria-label'],'Zoom level');
  assert.equal(renderedJa.find(node=>node.type==='output').props['aria-label'],'拡大率');
  assert.equal(renderedJa.find(node=>node.props.className==='siv-stage').props['aria-label'],'画像の移動・拡大縮小エリア');
  assert.equal(renderedEn.find(node=>node.props.role==='alert').children[0],api.dictionaries.en['image.renderFailed']);
  assert.equal(renderedJa.find(node=>node.props.role==='alert').children[0],api.dictionaries.ja['image.renderFailed']);
  assert.deepEqual(renderedJa.flatMap(node=>node.props['data-siv-action']??[]),renderedEn.flatMap(node=>node.props['data-siv-action']??[]));
});
