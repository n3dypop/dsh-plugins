import test from 'node:test';
import assert from 'node:assert/strict';
import {apply as applyHostAppearance,Config,inject} from '../apps/dsh-plugins/studio-appearance/index.mjs';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('Host contributes appearance styles without serving fonts or overriding native font choices',async()=>{
  const styles=[];
  await applyHostAppearance({on(event,contribute){assert.equal(event,'webserver/index-inject');contribute(styles);}});
  assert.equal(styles.length,1);
  assert.equal(styles[0].kind,'style');
  assert.doesNotMatch(styles[0].text,/@font-face|--dsh-font-family-[a-z]+\s*:|noto-sans|font-form/i);
});

test('native window setting is explicit and plugin declares the required connection service',()=>{
  assert.ok(inject.includes('webServer'));assert.ok(inject.includes('connection'));
  const validate=Config['~standard'].validate;
  assert.deepEqual(validate({desktopWindowOpacity:true}),{value:{desktopWindowOpacity:true}});
  assert.deepEqual(validate({desktopWindowOpacity:false}),{value:{desktopWindowOpacity:false}});
  assert.ok(validate({desktopWindowOpacity:'true'}).issues);
  assert.ok(validate({desktopWindowOpacity:true,unexpected:true}).issues);
  assert.throws(()=>applyHostAppearance({on(){}},{desktopWindowOpacity:true}),/packaged Windows Desktop Host/);
});

const source=await readFile(new URL('../apps/dsh-plugins/studio-appearance/client.js',import.meta.url),'utf8');
function appearance(){
  let entry;
  const react={createElement(type,props,...children){return{type,props:props??{},children};},useState(initial){return[typeof initial==='function'?initial():initial,()=>{}];},useRef(value){return{current:value};},useEffect(){}};
  runInNewContext(source,{window:{__ModuleLoader__:{load(value){entry=value;}}}});
  return entry.factory(id=>id==='react'?react:{Button:'button'});
}
function memoryDb(){
  let image;
  const db={objectStoreNames:{contains:()=>true},close(){},transaction(){
    const tx={objectStore(){return{get(){return request(()=>image);},put(value){return request(()=>{image=value;});},delete(){return request(()=>{image=undefined;});}};}};
    function request(action){const result={};queueMicrotask(()=>{result.result=action();result.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return result;}
    return tx;
  }};
  return{open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}};
}
const tick=()=>new Promise(done=>setImmediate(done));

test('accent and wallpaper work without native font APIs and preserve native font settings',async()=>{
  const api=appearance(),style=new Map([['--dsw-font-family','Native text font']]),attributes=new Map(),storage=new Map(),overrides=[],revoked=[];
  const theme=new Proxy({overrideTokens(owner,tokens){assert.equal(owner,'studio-appearance');assert.ok(Object.keys(tokens).every(key=>!key.includes('font')));const record={tokens,released:false};overrides.push(record);return()=>{record.released=true;};}},{get(target,key){if(key in target)return target[key];throw Error('Unexpected native theme API: '+String(key));}});
  const controller=api.createController({theme,storage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},indexedDB:memoryDb(),doc:{body:{style:{setProperty:(key,value)=>style.set(key,value),removeProperty:key=>style.delete(key)},setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key)}},urlApi:{createObjectURL:()=> 'blob:owned-wallpaper',revokeObjectURL:value=>revoked.push(value)},decode:async()=>({width:32,height:24,close(){}})});
  await tick();
  assert.equal(Object.hasOwn(controller.snapshot(),'font'),false);assert.equal(controller.setFont,undefined);
  controller.setPreferences({accentEnabled:true,accent:'#8057d8',wallpaperScope:'window'});
  assert.equal(controller.snapshot().accent,'#8057d8');assert.equal(overrides.length,1);
  const image=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])],{type:'image/png'});
  await controller.setWallpaper(image);
  assert.equal(controller.snapshot().hasWallpaper,true);assert.equal(attributes.get('data-studio-wallpaper-scope'),'window');
  assert.equal(style.get('--studio-wallpaper-image'),'url("blob:owned-wallpaper")');
  await controller.clearWallpaper();assert.equal(controller.snapshot().hasWallpaper,false);assert.deepEqual(revoked,['blob:owned-wallpaper']);
  controller.reloadPreferences();assert.equal(controller.snapshot().accent,'#8057d8');
  controller.dispose();assert.ok(overrides.every(record=>record.released));assert.equal(style.size,1);assert.equal(style.get('--dsw-font-family'),'Native text font');assert.equal(attributes.size,0);
  assert.equal(storage.size,1);assert.ok(storage.has('studio-appearance.preferences.v1'));
});

function nodes(tree){return tree&&typeof tree==='object'?[tree,...(tree.children??[]).flatMap(nodes)]:[];}
test('appearance renders accent, wallpaper and Desktop window controls with localized browser limitations',()=>{
  const api=appearance(),state={accentEnabled:false,accent:'#4176e6',opacity:18,wallpaperFit:'cover',wallpaperPosition:'center',wallpaperScope:'conversation',hasWallpaper:false,wallpaperUrl:null,error:''};
  for(const [locale,titles,title]of [['en',['Accent','Wallpaper','Window opacity'],'Accent & wallpaper'],['ja',['アクセント','背景画像','ウィンドウの不透明度'],'アクセントと背景']]){
    const t=key=>api[locale][key]??key,tree=nodes(api.Appearance({controller:{snapshot:()=>state},t}));
    assert.equal(tree[0].props['aria-label'],title);assert.equal(tree.find(node=>node.type==='h3').children[0],title);
    assert.deepEqual(tree.filter(node=>node.props.className==='studio-appearance-card').map(node=>node.props['aria-label']),titles);
    assert.equal(tree.filter(node=>node.type==='input'&&node.props.type==='text').length,0);
    assert.equal(tree.filter(node=>node.type==='select').length,3);
    const scope=tree.find(node=>node.type==='select'&&node.props['aria-label']===api[locale].scope);
    assert.ok(scope);assert.deepEqual(scope.children.map(option=>[option.props.value,option.children[0]]),[['conversation',api[locale].conversation],['window',api[locale].window]]);
    assert.equal(tree.filter(node=>node.type==='p'&&node.children.includes(api[locale].imageLimits)).length,1);
    assert.equal(tree.filter(node=>node.type==='p'&&node.children.includes(api[locale].windowDesktopOnly)).length,1);
    assert.ok(api[locale].imageLimits.includes('20 MiB'));assert.ok(api[locale].imageLimits.includes('8192'));assert.ok(api[locale].imageLimits.includes('40'));
  }
  assert.ok(api.en.imageLimits.includes('8192px/side'));assert.ok(api.ja.imageLimits.includes('一辺8192px'));
  assert.ok(Object.keys(api.en).every(key=>!key.toLowerCase().includes('font')));
  assert.deepEqual(Object.keys(api.en).sort(),Object.keys(api.ja).sort());
});

test('browser never sends native window requests and Desktop saves only confirmed changes',async()=>{
  const api=appearance(),calls=[],values=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const browser=api.createWindowOpacityController({desktop:false,storage,fetchImpl(){assert.fail('Browser must not call the native route.');}});
  await tick();await browser.setOpacity(60);assert.equal(browser.snapshot().desktop,false);assert.equal(values.size,0);browser.dispose();
  let fail=false;
  const fetchImpl=async(path,options={})=>{
    calls.push({path,options});
    if(path.endsWith('/window-opacity-proof'))return {ok:true,json:async()=>({proof:'test'})};
    if(options.method==='POST'){const value=JSON.parse(options.body).opacity;return {ok:!fail,json:async()=>({available:true,opacity:value})};}
    return {ok:true,json:async()=>({available:true,opacity:null})};
  };
  const desktop=api.createWindowOpacityController({desktop:true,storage,fetchImpl});await tick();await tick();
  assert.equal(desktop.snapshot().opacity,100);assert.equal(desktop.snapshot().available,true);assert.equal(desktop.snapshot().confirmed,false);assert.equal(calls.filter(x=>x.options.method==='POST').length,0);
  await desktop.setOpacity(60);assert.equal(desktop.snapshot().opacity,60);assert.equal(values.get('studio-appearance.window-opacity.v1'),'60');
  fail=true;await desktop.setOpacity(70);assert.equal(desktop.snapshot().opacity,60);assert.equal(values.get('studio-appearance.window-opacity.v1'),'60');assert.match(desktop.snapshot().error,/確認できません/);
  const count=calls.length;await desktop.setOpacity(29);assert.equal(calls.length,count);desktop.dispose();
  fail=false;const restored=api.createWindowOpacityController({desktop:true,storage,fetchImpl});await tick();await tick();assert.equal(restored.snapshot().opacity,60);assert.equal(restored.snapshot().confirmed,true);restored.dispose();
});

test('lost opacity response remains unconfirmed until the user explicitly reapplies',async()=>{
  const api=appearance(),values=new Map(),calls=[];
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  let actual=100,cached=null,loseResponse=false;
  const fetchImpl=async(path,options={})=>{
    calls.push({path,options});
    if(path.endsWith('/window-opacity-proof'))return {ok:true,json:async()=>({proof:'test'})};
    if(options.method==='POST'){
      const value=JSON.parse(options.body).opacity;actual=value;cached=null;
      if(loseResponse)throw Error('connection lost after native change');
      cached=value;return {ok:true,json:async()=>({available:true,opacity:value})};
    }
    return {ok:true,json:async()=>({available:true,opacity:cached})};
  };
  const desktop=api.createWindowOpacityController({desktop:true,storage,fetchImpl});
  await tick();await tick();
  await desktop.setOpacity(60);assert.equal(desktop.snapshot().confirmed,true);
  loseResponse=true;await desktop.setOpacity(80);
  assert.equal(actual,80);assert.equal(desktop.snapshot().opacity,60);
  assert.equal(desktop.snapshot().confirmed,false);assert.equal(values.get('studio-appearance.window-opacity.v1'),'60');
  loseResponse=false;
  const postedBefore=calls.filter(call=>call.options.method==='POST').length;
  await desktop.retry();
  assert.equal(calls.filter(call=>call.options.method==='POST').length,postedBefore);
  assert.equal(desktop.snapshot().available,true);assert.equal(desktop.snapshot().confirmed,false);
  assert.match(desktop.snapshot().error,/直前の結果は不明/);
  await desktop.setOpacity(60);
  assert.equal(actual,60);assert.equal(desktop.snapshot().confirmed,true);assert.equal(desktop.snapshot().opacity,60);
  assert.equal(desktop.snapshot().error,'');desktop.dispose();
});

test('moving the opacity slider only changes a draft; Apply performs the operation',()=>{
  const api=appearance(),state={accentEnabled:false,accent:'#4176e6',opacity:18,wallpaperFit:'cover',wallpaperPosition:'center',wallpaperScope:'conversation',hasWallpaper:false,wallpaperUrl:null,error:''},sent=[];
  const windowOpacity={snapshot:()=>({desktop:true,opacity:100,confirmed:false,available:true,pending:false,error:''}),setOpacity:value=>sent.push(value)};
  const tree=nodes(api.Appearance({controller:{snapshot:()=>state},windowOpacity,t:key=>api.ja[key]??key}));
  const range=tree.find(node=>node.type==='input'&&node.props['aria-label']==='ウィンドウの不透明度');
  range.props.onChange({target:{value:'60'}});assert.deepEqual(sent,[]);
  const apply=tree.find(node=>node.type==='button'&&node.children.includes('適用'));assert.ok(apply);apply.props.onClick();assert.deepEqual(sent,[100]);
});

test('browser-storage failures keep their concise localized error',()=>{
  const api=appearance(),error='このブラウザーまたはアプリに設定を保存できません。';
  const controller=api.createController({theme:{overrideTokens(){assert.fail('Failed preferences must not override theme.');}},storage:{getItem:()=>null,setItem(){throw Error('Unavailable storage');}},indexedDB:memoryDb(),doc:{body:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){}}},urlApi:{revokeObjectURL(){}},decode(){}});
  controller.setPreferences({accentEnabled:true});assert.equal(controller.snapshot().error,error);
  for(const locale of ['en','ja']){
    const tree=nodes(api.Appearance({controller,t:key=>api[locale][key]??key}));
    assert.equal(tree.find(node=>node.props.role==='alert').children[0],api[locale].preferencesFailed);
  }
  controller.dispose();
});
