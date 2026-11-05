// Accent and wallpaper preferences stay in this browser. Fonts follow DSH.
window.__ModuleLoader__.load({
  id:'studio-appearance',
  factory(require){
    const React=require('react');
    const {Button}=require('@deepseek-ai/dsh-client-ui-primitives');
    const KEY='studio-appearance.preferences.v1', WINDOW_KEY='studio-appearance.window-opacity.v1', DB='studio-appearance', STORE='assets', WALLPAPER='wallpaper';
    const MAX_BYTES=20*1024*1024, MAX_PIXELS=40000000;
    const defaults=Object.freeze({accentEnabled:false,accent:'#4176e6',opacity:18,wallpaperFit:'cover',wallpaperPosition:'center',wallpaperScope:'conversation'});
    const presets=Object.freeze([{name:'ブルー',color:'#4176e6'},{name:'バイオレット',color:'#8057d8'},{name:'ジェイド',color:'#218071'},{name:'コーラル',color:'#c65d41'},{name:'ゴールド',color:'#a77b22'},{name:'スレート',color:'#64748b'}]);
    const copy={
      title:['アクセントと背景','Accent & wallpaper'],preview:['プレビュー','Preview'],accentTitle:['アクセント','Accent'],
      accentEnable:['カスタム色を使う','Custom color'],dshDefault:['DSH既定','DSH default'],presets:['カラープリセット','Color presets'],chooseColor:['色を選ぶ','Choose color'],
      contrast:['読みやすさを自動調整','Adjusted for contrast'],wallpaperTitle:['背景画像','Wallpaper'],
      selectWallpaper:['背景画像を選ぶ','Select wallpaper'],changeImage:['変更','Change'],selectImage:['画像を選ぶ','Choose image'],removeImage:['削除','Remove'],saved:['設定済み','Set'],notSet:['なし','None'],
      imageLimits:['PNG / JPEG / WebP · 20 MiB・一辺8192px・40MP以下 · このブラウザーまたはアプリに保存','PNG / JPEG / WebP · ≤20 MiB · ≤8192px/side · ≤40 MP · Stored in this browser or app'],scope:['背景の表示範囲','Wallpaper area'],conversation:['会話画面','Conversation area'],window:['画面全体','Entire window'],
      opacity:['濃さ','Opacity'],fit:['表示方法','Fit'],position:['位置','Position'],cover:['全体に広げる','Cover'],contain:['画像全体','Contain'],tile:['タイル','Tile'],center:['中央','Center'],top:['上','Top'],bottom:['下','Bottom'],
      windowOpacity:['ウィンドウの不透明度','Window opacity'],windowDesktopOnly:['ウィンドウの透過はDesktopアプリ版のみ利用できます。','Window transparency is available only in the Desktop app.'],windowIncludesText:['文字を含むウィンドウ全体に適用します。','Applies to the whole window, including text.'],windowUnavailable:['ウィンドウの不透明度を確認できません。','Window opacity could not be confirmed.'],windowSaveFailed:['不透明度を適用しましたが、設定を保存できません。','Opacity was applied, but the preference could not be saved.'],windowRetry:['もう一度確認','Try again'],windowApply:['適用','Apply'],windowUnset:['未設定','Not set'],windowApplied:['最後に適用','Last applied'],
      windowReapply:['直前の結果は不明です。値を選び、適用して確認してください。','The last result is unknown. Select a value and apply it to confirm.'],
      blue:['ブルー','Blue'],violet:['バイオレット','Violet'],jade:['ジェイド','Jade'],coral:['コーラル','Coral'],gold:['ゴールド','Gold'],slate:['スレート','Slate'],
      imageStorage:['このブラウザーまたはアプリでは画像を保存できません。','This browser or app cannot store images.'],imageReadWrite:['背景画像を読み書きできません。','The wallpaper could not be read or written.'],imageSave:['背景画像を保存できません。','The wallpaper could not be saved.'],
      storageOpen:['背景画像の保存先を開けません。','Wallpaper storage could not be opened.'],storageBusy:['背景画像の保存先が別の画面で使用中です。','Wallpaper storage is in use by another page.'],
      restoreFailed:['保存済みの背景画像を読み込めません。','Saved wallpaper could not be loaded.'],removeFailed:['背景画像を削除できません。','Wallpaper could not be removed.'],preferencesFailed:['このブラウザーまたはアプリに設定を保存できません。','Preferences could not be saved in this browser or app.'],
      imageType:['PNG・JPEG・WebP（20 MiB以下）を選んでください。','Choose PNG, JPEG or WebP up to 20 MiB.'],imageFormat:['画像形式を確認できません。','The image format could not be verified.'],imageDimensions:['このブラウザーまたはアプリでは画像の寸法を確認できません。','This browser or app cannot verify image dimensions.'],imageTooLarge:['背景画像の寸法が大きすぎます。','The wallpaper dimensions are too large.'],
    };
    const en=Object.fromEntries(Object.entries(copy).map(([key,pair])=>[key,pair[1]])),ja=Object.fromEntries(Object.entries(copy).map(([key,pair])=>[key,pair[0]])),copyKeys=new Map(Object.entries(copy).map(([key,pair])=>[pair[0],key]));
    const localizedText=(value,t)=>typeof value==='string'&&copyKeys.has(value)&&typeof t==='function'?t(copyKeys.get(value)):value;
    const validHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
    function normalize(value){
      const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
      return {accentEnabled:v.accentEnabled===true,accent:validHex(v.accent)?v.accent.toLowerCase():defaults.accent,
        opacity:Number.isInteger(v.opacity)&&v.opacity>=0&&v.opacity<=50?v.opacity:defaults.opacity,
        wallpaperFit:['cover','contain','tile'].includes(v.wallpaperFit)?v.wallpaperFit:defaults.wallpaperFit,
        wallpaperPosition:['center','top','bottom'].includes(v.wallpaperPosition)?v.wallpaperPosition:defaults.wallpaperPosition,
        wallpaperScope:['conversation','window'].includes(v.wallpaperScope)?v.wallpaperScope:defaults.wallpaperScope};
    }
    function readPreferences(storage){try{return normalize(JSON.parse(storage.getItem(KEY)||'null'));}catch{return {...defaults};}}
    function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
    function luminance(channels){return channels.map(v=>{const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0);}
    // Preserve the chosen hue where possible, while keeping accent text
    // readable against the light/dark base palettes.
    function contrastColor(hex,dark){
      const source=rgb(hex), background=dark?[15,17,21]:[255,255,255], target=dark?255:0;
      const bg=luminance(background);
      for(let i=0;i<=100;i++){
        const color=source.map(c=>Math.round(c+(target-c)*i/100)), lum=luminance(color);
        if((Math.max(lum,bg)+0.05)/(Math.min(lum,bg)+0.05)>=4.5)return '#'+color.map(c=>c.toString(16).padStart(2,'0')).join('');
      }
      return dark?'#ffffff':'#000000';
    }
    function accentOverrides(hex){
      if(!validHex(hex))throw new Error('Invalid accent');
      const light=contrastColor(hex,false),dark=contrastColor(hex,true),pair={light,dark};
      // DSH's send button uses a fixed white arrow in both schemes. The fill
      // therefore needs white-text contrast, independently of link contrast.
      const base=rgb(light), darkBg=luminance([15,17,21]);let darkFill=light;
      for(let i=0;i<=100;i++){
        const color=base.map(c=>Math.round(c+(255-c)*i/100)),lum=luminance(color);
        if((1.05/(lum+0.05))>=4.5&&(lum+0.05)/(darkBg+0.05)>=2){darkFill='#'+color.map(c=>c.toString(16).padStart(2,'0')).join('');break;}
      }
      const fill={light,dark:darkFill};
      return {'--dsw-alias-link':pair,'--dsw-alias-state-business-primary':pair,
        '--dsw-alias-button-info-fill':fill,'--dsw-alias-button-info-hover':fill};
    }
    function openDb(indexedDB){
      return new Promise((resolve,reject)=>{
        if(!indexedDB)return reject(new Error('このブラウザーまたはアプリでは画像を保存できません。'));
        let settled=false;
        const fail=message=>{if(settled)return;settled=true;reject(new Error(message));};
        const request=indexedDB.open(DB,1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
        request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;resolve(request.result);};
        request.onerror=()=>fail('背景画像の保存先を開けません。');
        request.onblocked=()=>fail('背景画像の保存先が別の画面で使用中です。');
      });
    }
    async function imageStore(indexedDB,action,value){
      const db=await openDb(indexedDB);
      try{return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,action==='get'?'readonly':'readwrite'),store=tx.objectStore(STORE);
        const req=action==='get'?store.get(WALLPAPER):action==='put'?store.put(value,WALLPAPER):store.delete(WALLPAPER);
        let result;req.onsuccess=()=>{result=req.result;};
        req.onerror=()=>reject(new Error('背景画像を読み書きできません。'));
        tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(new Error('背景画像を保存できません。'));
      });}finally{db.close();}
    }
    async function validateImage(file,decode){
      if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_BYTES)throw new Error('PNG・JPEG・WebP（20 MiB以下）を選んでください。');
      const b=new Uint8Array(await file.slice(0,12).arrayBuffer());
      const png=b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v),jpeg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
      const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
      if(!((file.type==='image/png'&&png)||(file.type==='image/jpeg'&&jpeg)||(file.type==='image/webp'&&webp)))throw new Error('画像形式を確認できません。');
      if(typeof decode!=='function')throw new Error('このブラウザーまたはアプリでは画像の寸法を確認できません。');
      let bitmap;try{bitmap=await decode(file);if(!Number.isSafeInteger(bitmap.width)||!Number.isSafeInteger(bitmap.height)||bitmap.width<1||bitmap.height<1||bitmap.width>8192||bitmap.height>8192||bitmap.width*bitmap.height>MAX_PIXELS)throw new Error('背景画像の寸法が大きすぎます。');}finally{bitmap?.close?.();}
      return file;
    }
    function createController({theme,storage,indexedDB,doc,urlApi,decode}){
      let prefs=readPreferences(storage),disposeAccent=null,objectUrl=null,alive=true,version=0,hasWallpaper=false,error='',assetChain=Promise.resolve();
      const listeners=new Set(), notify=()=>{for(const listener of listeners)listener();};
      function applyAccent(){disposeAccent?.();disposeAccent=null;if(prefs.accentEnabled)disposeAccent=theme.overrideTokens('studio-appearance',accentOverrides(prefs.accent));}
      function paintPreferences(){
        doc.body.style.setProperty('--studio-wallpaper-opacity',`${prefs.opacity}%`);
        doc.body.style.setProperty('--studio-wallpaper-size',prefs.wallpaperFit==='tile'?'auto':prefs.wallpaperFit);
        doc.body.style.setProperty('--studio-wallpaper-repeat',prefs.wallpaperFit==='tile'?'repeat':'no-repeat');
        doc.body.style.setProperty('--studio-wallpaper-position',prefs.wallpaperPosition);
        if(hasWallpaper)doc.body.setAttribute('data-studio-wallpaper-scope',prefs.wallpaperScope);
        else doc.body.removeAttribute('data-studio-wallpaper-scope');
      }
      function paint(blob){
        const next=blob?urlApi.createObjectURL(blob):null,old=objectUrl;objectUrl=next;hasWallpaper=Boolean(next);
        if(next){doc.body.style.setProperty('--studio-wallpaper-image',`url("${next}")`);doc.body.setAttribute('data-studio-wallpaper','');}
        else{doc.body.style.removeProperty('--studio-wallpaper-image');doc.body.removeAttribute('data-studio-wallpaper');}
        paintPreferences();
        if(old)urlApi.revokeObjectURL(old);
      }
      applyAccent();paintPreferences();
      imageStore(indexedDB,'get').then(async blob=>{
        if(!blob)return;
        const checked=await validateImage(blob,decode);
        if(alive&&version===0){paint(checked);notify();}
      }).catch(()=>{if(alive&&version===0){error='保存済みの背景画像を読み込めません。';notify();}});
      async function setWallpaper(file){
        const current=++version;error='';
        try{const checked=await validateImage(file,decode);if(!alive||current!==version)return;assetChain=assetChain.catch(()=>{}).then(async()=>{if(!alive||current!==version)return;await imageStore(indexedDB,'put',checked);if(alive&&current===version)paint(checked);});await assetChain;}
        catch(e){if(alive&&current===version)error=e?.message||'背景画像を保存できません。';}if(alive&&current===version)notify();
      }
      async function clearWallpaper(){
        const current=++version;error='';try{assetChain=assetChain.catch(()=>{}).then(async()=>{if(!alive||current!==version)return;await imageStore(indexedDB,'delete');if(alive&&current===version)paint(null);});await assetChain;}catch(e){if(alive&&current===version)error=e?.message||'背景画像を削除できません。';}if(alive&&current===version)notify();
      }
      function setPreferences(changes){
        const next=normalize({...prefs,...changes});
        try{storage.setItem(KEY,JSON.stringify(next));prefs=next;error='';applyAccent();paintPreferences();}
        catch{error='このブラウザーまたはアプリに設定を保存できません。';}notify();
      }
      return {snapshot:()=>({...prefs,hasWallpaper,wallpaperUrl:objectUrl,error}),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
        setPreferences,setWallpaper,clearWallpaper,
        reloadPreferences(){prefs=readPreferences(storage);applyAccent();paintPreferences();notify();},
        dispose(){alive=false;version++;disposeAccent?.();if(objectUrl)urlApi.revokeObjectURL(objectUrl);for(const key of ['image','opacity','size','repeat','position'])doc.body.style.removeProperty(`--studio-wallpaper-${key}`);doc.body.removeAttribute('data-studio-wallpaper');doc.body.removeAttribute('data-studio-wallpaper-scope');listeners.clear();}};
    }
    function createWindowOpacityController({desktop,storage,fetchImpl}){
      let opacity=100,confirmed=false,available=false,pending=false,initializing=false,uncertain=false,error='',alive=true;
      const listeners=new Set(),notify=()=>{if(alive)for(const listener of listeners)listener();};
      const valid=value=>Number.isInteger(value)&&value>=30&&value<=100;
      const snapshot=()=>({desktop,opacity,confirmed,available,pending:pending||initializing,error});
      async function apply(value){
        if(!alive||!desktop||!valid(value)||pending||initializing)return;
        pending=true;confirmed=false;error='';notify();
        try{
          const first=await fetchImpl('/api/studio-appearance/window-opacity-proof',{credentials:'same-origin',cache:'no-store',headers:{'X-Studio-Window-Proof-Request':'1'}});
          if(!first.ok)throw Error('proof');const proof=(await first.json())?.proof;if(typeof proof!=='string')throw Error('proof');
          const response=await fetchImpl('/api/studio-appearance/window-opacity',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Studio-Window-Action':'1','X-Studio-Window-Proof':proof},body:JSON.stringify({opacity:value})});
          if(!response.ok)throw Error('apply');const result=await response.json();if(result?.available!==true||result.opacity!==value)throw Error('unconfirmed');
          opacity=value;confirmed=true;uncertain=false;available=true;try{storage.setItem(WINDOW_KEY,String(value));}catch{error='不透明度を適用しましたが、設定を保存できません。';}
        }catch{confirmed=false;uncertain=true;available=false;error='ウィンドウの不透明度を確認できません。';}
        finally{pending=false;notify();}
      }
      async function initialize(){
        if(!alive||!desktop||pending||initializing)return;
        initializing=true;notify();
        try{
          const response=await fetchImpl('/api/studio-appearance/window-opacity',{credentials:'same-origin',cache:'no-store'});
          if(!response.ok)throw Error('unavailable');
          const state=await response.json();
          if(state?.available!==true||!(state.opacity===null||valid(state.opacity)))throw Error('invalid');
          available=true;
          if(uncertain){confirmed=false;error='直前の結果は不明です。値を選び、適用して確認してください。';return;}
          confirmed=valid(state.opacity);
          if(confirmed)opacity=state.opacity;
          let saved=null;try{const value=storage.getItem(WINDOW_KEY);saved=value===null?null:Number(value);}catch{}
          if(!valid(saved))saved=null;
          initializing=false;
          if(alive&&saved!==null&&state.opacity!==saved)await apply(saved);
        }catch{confirmed=false;available=false;error='ウィンドウの不透明度を確認できません。';}
        finally{initializing=false;notify();}
      }
      void initialize();
      return {snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},setOpacity:apply,retry:initialize,dispose(){alive=false;listeners.clear();}};
    }
    function Appearance({controller,t,windowOpacity}){
      const h=(type,props,...children)=>React.createElement(type,props?{...props,...Object.fromEntries(['aria-label','title','placeholder'].filter(key=>typeof props[key]==='string').map(key=>[key,localizedText(props[key],t)]))}:props,...children.map(value=>localizedText(value,t)));
      const [state,setState]=React.useState(()=>controller.snapshot());
      const [windowState,setWindowState]=React.useState(()=>windowOpacity?.snapshot?.()??{desktop:false,opacity:100,confirmed:false,available:false,pending:false,error:''});
      const [windowDraft,setWindowDraft]=React.useState(()=>windowOpacity?.snapshot?.().opacity??100);
      const fileInput=React.useRef(null);
      React.useEffect(()=>{
        const sync=()=>setState(controller.snapshot());
        const unsubscribe=controller.subscribe(sync);
        // IndexedDB restoration may complete between the
        // initial render and subscription. Adopt the latest snapshot now.
        sync();
        return unsubscribe;
      },[controller]);
      React.useEffect(()=>{if(!windowOpacity)return;const sync=()=>setWindowState(windowOpacity.snapshot());const stop=windowOpacity.subscribe(sync);sync();return stop;},[windowOpacity]);
      React.useEffect(()=>{setWindowDraft(windowState.opacity);},[windowState.opacity]);
      const card=(number,title,...children)=>h('section',{className:'studio-appearance-card','aria-label':title},
        h('header',{className:'studio-appearance-card-heading'},h('span',{className:'studio-appearance-number','aria-hidden':true},number),h('h4',null,title)),...children);
      const select=(label,value,onChange,choices)=>h('label',{className:'studio-appearance-field'},h('span',null,label),h('select',{value,onChange,'aria-label':label},...choices.map(([key,text])=>h('option',{key,value:key},text))));
      return h('section',{className:'studio-appearance','aria-label':'アクセントと背景'},
        h('header',{className:'studio-appearance-heading'},h('h3',null,'アクセントと背景')),
        h('div',{className:'studio-appearance-preview','aria-label':'プレビュー'},
          h('div',{className:'studio-appearance-preview-bg',style:{backgroundImage:state.wallpaperUrl?`url("${state.wallpaperUrl}")`:undefined,opacity:state.opacity/100,backgroundSize:state.wallpaperFit==='tile'?'auto':state.wallpaperFit,backgroundPosition:state.wallpaperPosition,backgroundRepeat:state.wallpaperFit==='tile'?'repeat':'no-repeat'}}),
          h('div',{className:'studio-appearance-preview-content'},h('div',{className:'studio-appearance-preview-label'},'DSH APPEARANCE · PREVIEW'),h('strong',null,'Your next creation starts here.'),h('p',null,'The details make the difference.  Aa / あいうえお'),h('div',{className:'studio-appearance-actions'},h('span',{className:'studio-appearance-chip'},'Plugin UI'),h('span',{className:'studio-appearance-preview-accent'},'Accent')))),
        card('01','アクセント',
          h('div',{className:'studio-appearance-actions studio-appearance-between'},h('label',{className:'studio-appearance-toggle'},h('input',{type:'checkbox',checked:state.accentEnabled,onChange:e=>controller.setPreferences({accentEnabled:e.target.checked})}),h('span',null,'カスタム色を使う')),h('code',null,state.accentEnabled?state.accent.toUpperCase():'DSH既定')),
          h('div',{className:'studio-appearance-swatches',role:'group','aria-label':'カラープリセット'},...presets.map(preset=>h(Button,{key:preset.color,type:'button',size:'sm',variant:'outline','aria-pressed':state.accentEnabled&&state.accent===preset.color,onClick:()=>controller.setPreferences({accentEnabled:true,accent:preset.color}),className:'studio-appearance-swatch'},h('span',{'aria-hidden':true,style:{background:preset.color}}),preset.name))),
          h('label',{className:'studio-appearance-field'},h('span',null,'色を選ぶ'),h('input',{type:'color',value:state.accent,onChange:e=>controller.setPreferences({accent:e.target.value,accentEnabled:true}),'aria-label':'アクセント'})),
          h('p',null,'読みやすさを自動調整')),
        card('02','背景画像',
          h('input',{ref:fileInput,type:'file',accept:'image/png,image/jpeg,image/webp',style:{display:'none'},onChange:e=>{const file=e.target.files?.[0];e.target.value='';if(file)void controller.setWallpaper(file);},'aria-label':'背景画像を選ぶ',tabIndex:-1}),
          h('div',{className:'studio-appearance-actions'},h(Button,{type:'button',size:'sm',variant:'outline',onClick:()=>fileInput.current?.click()},state.hasWallpaper?'変更':'画像を選ぶ'),h(Button,{type:'button',size:'sm',variant:'ghost',disabled:!state.hasWallpaper,onClick:()=>void controller.clearWallpaper()},'削除'),h('span',{className:'studio-appearance-muted'},state.hasWallpaper?'設定済み':'なし')),
          h('p',null,'PNG / JPEG / WebP · 20 MiB・一辺8192px・40MP以下 · このブラウザーまたはアプリに保存'),
          select('背景の表示範囲',state.wallpaperScope,e=>controller.setPreferences({wallpaperScope:e.target.value}),[['conversation','会話画面'],['window','画面全体']]),
          h('label',{className:'studio-appearance-field'},h('span',null,'濃さ'),h('output',null,`${state.opacity}%`)),h('input',{type:'range',min:0,max:50,step:1,value:state.opacity,onChange:e=>controller.setPreferences({opacity:Number(e.target.value)}),'aria-label':'濃さ'}),
          h('div',{className:'studio-appearance-grid'},select('表示方法',state.wallpaperFit,e=>controller.setPreferences({wallpaperFit:e.target.value}),[['cover','全体に広げる'],['contain','画像全体'],['tile','タイル']]),select('位置',state.wallpaperPosition,e=>controller.setPreferences({wallpaperPosition:e.target.value}),[['center','中央'],['top','上'],['bottom','下']]))),
        card('03','ウィンドウの不透明度',windowState.desktop
          ?h(React.Fragment,null,h('p',null,'文字を含むウィンドウ全体に適用します。'),h('label',{className:'studio-appearance-field'},h('span',null,'ウィンドウの不透明度'),h('output',null,`${windowDraft}%`)),h('input',{type:'range',min:30,max:100,step:1,value:windowDraft,disabled:!windowState.available||windowState.pending,onChange:e=>setWindowDraft(Number(e.target.value)),'aria-label':'ウィンドウの不透明度'}),h('div',{className:'studio-appearance-actions'},h(Button,{type:'button',size:'sm',variant:'outline',disabled:!windowState.available||windowState.pending,onClick:()=>void windowOpacity.setOpacity(windowDraft)},'適用'),h('span',{className:'studio-appearance-muted'},windowState.confirmed?`${t('windowApplied')} ${windowState.opacity}%`:'未設定')),windowState.error?h('p',{role:'alert',className:'studio-appearance-error'},windowState.error):null,!windowState.available?h(Button,{type:'button',size:'sm',variant:'outline',disabled:windowState.pending,onClick:()=>void windowOpacity.retry()},'もう一度確認'):null)
          :h('p',null,'ウィンドウの透過はDesktopアプリ版のみ利用できます。')),
        state.error?h('p',{role:'alert',className:'studio-appearance-error'},state.error):null);
    }
    function apply(ctx){
      if(typeof document==='undefined')return;
      let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};}
      let indexedDB;try{indexedDB=window.indexedDB;}catch{indexedDB=null;}
      const controller=createController({theme:ctx.theme,storage,indexedDB,doc:document,urlApi:URL,decode:window.createImageBitmap?.bind(window)});
      const windowOpacity=createWindowOpacityController({desktop:window.location?.protocol==='dsh-app:'&&window.location?.host==='app',storage,fetchImpl:window.fetch.bind(window)});
      ctx.effect(()=>()=>controller.dispose());
      ctx.effect(()=>()=>windowOpacity.dispose());
      ctx.effect(()=>ctx.locale.register('studio.appearance','en',en));
      ctx.effect(()=>ctx.locale.register('studio.appearance','ja',ja));
      ctx.effect(()=>{const sync=event=>{if(event.key===KEY)controller.reloadPreferences();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);});
      ctx.slots.inject('settings.general.item',()=>ctx.slots.register({name:'settings.general.item',id:'studio-appearance',order:12,locale:'studio.appearance',inject:()=>({controller,windowOpacity})},Appearance));
    }
    return {inject:['slots','theme','locale'],apply,Appearance,normalize,accentOverrides,contrastColor,validateImage,createController,createWindowOpacityController,imageStore,en,ja,localizedText};
  },
});
