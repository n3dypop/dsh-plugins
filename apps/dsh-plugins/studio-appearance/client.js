// Accent and wallpaper preferences stay in this browser. Fonts follow DSH.
window.__ModuleLoader__.load({
  id:'studio-appearance',
  factory(require){
    const React=require('react');
    const {Button,IconSettingsOutlineMedium,IconChevronDownOutlineRegular}=require('@deepseek-ai/dsh-client-ui-primitives');
    const {createPortal}=require('react-dom');
    const KEY='studio-appearance.preferences.v1', WINDOW_KEY='studio-appearance.window-opacity.v1', DB='studio-appearance', STORE='assets', WALLPAPER='wallpaper';
    const MAX_BYTES=20*1024*1024, MAX_PIXELS=40000000;
    const SETTINGS_LAUNCHER='settings.launcher';
    const defaults=Object.freeze({accentEnabled:false,accent:'#4176e6',surface:'dsh',opacity:18,wallpaperFit:'cover',wallpaperPosition:'center',wallpaperScope:'conversation',settingsOnly:false,compactNavigation:false,heroTitle:'Into the Unknown',heroBadge:'Preview'});
    const studioSurfaces={
      '--dsw-alias-bg-base':{light:'#f7f8fa',dark:'#181a1e'},
      '--dsw-alias-bg-layer-1':{light:'#fbfcfe',dark:'#202226'},
      '--dsw-alias-bg-layer-2':{light:'#f0f2f5',dark:'#282b30'},
    };
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
      settingsOnly:['左下に設定だけを表示','Show only Settings in the sidebar footer'],settings:['設定','Settings'],
      navigation:['追加メニュー','More tools'],compactNavigation:['左ペインの追加メニューを折りたたむ','Collapse extra tools in the sidebar'],
      surface:['背景のグレー','Surface palette'],nativeSurface:['DSH標準','DSH Default'],studioSurface:['Media Studioのグレー','Media Studio Gray'],
      hero:['新規セッションの見出し','New session heading'],heroTitle:['見出し','Heading'],heroBadge:['バッジ','Badge'],resetHero:['英語の既定値に戻す','Restore English defaults'],
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
        surface:v.surface==='studio'?'studio':'dsh',
        opacity:Number.isInteger(v.opacity)&&v.opacity>=0&&v.opacity<=50?v.opacity:defaults.opacity,
        wallpaperFit:['cover','contain','tile'].includes(v.wallpaperFit)?v.wallpaperFit:defaults.wallpaperFit,
        wallpaperPosition:['center','top','bottom'].includes(v.wallpaperPosition)?v.wallpaperPosition:defaults.wallpaperPosition,
        wallpaperScope:['conversation','window'].includes(v.wallpaperScope)?v.wallpaperScope:defaults.wallpaperScope,
        settingsOnly:v.settingsOnly===true,compactNavigation:v.compactNavigation===true,
        heroTitle:typeof v.heroTitle==='string'?v.heroTitle.replace(/[\r\n]/g,' ').slice(0,72):defaults.heroTitle,
        heroBadge:typeof v.heroBadge==='string'?v.heroBadge.replace(/[\r\n]/g,' ').slice(0,24):defaults.heroBadge};
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
    async function validateImage(file,decode,{dimensions=false}={}){
      if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_BYTES)throw new Error('PNG・JPEG・WebP（20 MiB以下）を選んでください。');
      const b=new Uint8Array(await file.slice(0,12).arrayBuffer());
      const png=b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v),jpeg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
      const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
      if(!((file.type==='image/png'&&png)||(file.type==='image/jpeg'&&jpeg)||(file.type==='image/webp'&&webp)))throw new Error('画像形式を確認できません。');
      if(typeof decode!=='function')throw new Error('このブラウザーまたはアプリでは画像の寸法を確認できません。');
      let bitmap;try{bitmap=await decode(file);if(!Number.isSafeInteger(bitmap.width)||!Number.isSafeInteger(bitmap.height)||bitmap.width<1||bitmap.height<1||bitmap.width>8192||bitmap.height>8192||bitmap.width*bitmap.height>MAX_PIXELS)throw new Error('背景画像の寸法が大きすぎます。');return dimensions?{width:bitmap.width,height:bitmap.height}:file;}finally{bitmap?.close?.();}
    }
    function createController({theme,storage,indexedDB,doc,urlApi,decode}){
      let prefs=readPreferences(storage),disposeAccent=null,objectUrl=null,alive=true,version=0,hasWallpaper=false,error='',assetChain=Promise.resolve();
      const listeners=new Set(), notify=()=>{for(const listener of listeners)listener();};
      function applyAccent(){
        disposeAccent?.();disposeAccent=null;
        const tokens={...(prefs.surface==='studio'?studioSurfaces:{}),...(prefs.accentEnabled?accentOverrides(prefs.accent):{})};
        if(Object.keys(tokens).length)disposeAccent=theme.overrideTokens('studio-appearance',tokens);
      }
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
        const current=++version;error='';let saved=false;
        try{const checked=await validateImage(file,decode);if(!alive||current!==version)return false;assetChain=assetChain.catch(()=>{}).then(async()=>{if(!alive||current!==version)return;await imageStore(indexedDB,'put',checked);if(alive&&current===version){paint(checked);saved=true;}});await assetChain;}
        catch(e){if(alive&&current===version)error=e?.message||'背景画像を保存できません。';}if(alive&&current===version)notify();
        return saved;
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
      let opacity=100,confirmed=false,available=false,pending=false,initializing=false,uncertain=false,error='',alive=true,modal=false,applied=null;
      const listeners=new Set(),notify=()=>{if(alive)for(const listener of listeners)listener();};
      const valid=value=>Number.isInteger(value)&&value>=30&&value<=100;
      const snapshot=()=>({desktop,opacity,confirmed,available,pending:pending||initializing,error});
      async function synchronize(preference=opacity){
        const value=modal?100:preference;
        if(!alive||!desktop||pending||initializing)return;
        if(applied===value&&confirmed)return true;
        pending=true;confirmed=false;error='';notify();
        try{
          const first=await fetchImpl('/api/studio-appearance/window-opacity-proof',{credentials:'same-origin',cache:'no-store',headers:{'X-Studio-Window-Proof-Request':'1'}});
          if(!first.ok)throw Error('proof');const proof=(await first.json())?.proof;if(typeof proof!=='string')throw Error('proof');
          const response=await fetchImpl('/api/studio-appearance/window-opacity',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Studio-Window-Action':'1','X-Studio-Window-Proof':proof},body:JSON.stringify({opacity:value})});
          if(!response.ok)throw Error('apply');const result=await response.json();if(result?.available!==true||result.opacity!==value)throw Error('unconfirmed');
          applied=value;confirmed=true;uncertain=false;available=true;return true;
        }catch{confirmed=false;uncertain=true;available=false;error='ウィンドウの不透明度を確認できません。';}
        finally{pending=false;notify();}
      }
      async function apply(value){
        if(!alive||!desktop||!valid(value)||pending||initializing)return;
        if(!await synchronize(value))return;
        opacity=value;
        try{storage.setItem(WINDOW_KEY,String(value));notify();}
        catch{error='このブラウザーまたはアプリに設定を保存できません。';notify();}
        if(applied!==(modal?100:opacity))void synchronize();
      }
      function setModal(value){if(modal!==value){modal=value;if(available)void synchronize().then(ok=>{if(ok&&applied!==(modal?100:opacity))void synchronize();});}}
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
          applied=state.opacity;
          if(confirmed)opacity=state.opacity;
          let saved=null;try{const value=storage.getItem(WINDOW_KEY);saved=value===null?null:Number(value);}catch{}
          if(!valid(saved))saved=null;
          initializing=false;
          if(saved!==null)opacity=saved;
          if(alive&&(saved!==null||modal)){await synchronize();if(available&&applied!==(modal?100:opacity))void synchronize();}
        }catch{confirmed=false;available=false;error='ウィンドウの不透明度を確認できません。';}
        finally{initializing=false;notify();}
      }
      void initialize();
      return {snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},setOpacity:apply,setModal,retry:initialize,dispose(){alive=false;listeners.clear();}};
    }

    function cropBounds(width,height,{x=0,y=0,w=100,h=100}={}){
      const left=Math.min(width-1,Math.floor(width*x/100)),top=Math.min(height-1,Math.floor(height*y/100));
      return [left,top,Math.max(1,Math.min(width-left,Math.round(width*w/100))),Math.max(1,Math.min(height-top,Math.round(height*h/100)))];
    }
    const originalCrop={ratio:'original',zoom:100,x:50,y:50};
    function cropArea(width,height,{ratio,zoom,x,y},windowRatio){
      const aspect=ratio==='window'?windowRatio:ratio==='square'?1:width/height;
      const widthFraction=Math.min(1,aspect*height/width)*10000/zoom;
      const heightFraction=Math.min(1,width/(aspect*height))*10000/zoom;
      return {x:Math.max(0,Math.min(100-widthFraction,x-widthFraction/2)),y:Math.max(0,Math.min(100-heightFraction,y-heightFraction/2)),w:widthFraction,h:heightFraction};
    }
    async function cropWallpaper(file,area,decode,doc){
      await validateImage(file,decode);
      if(area.x===0&&area.y===0&&area.w===100&&area.h===100)return file;
      const bitmap=await decode(file);
      try{
        const [x,y,w,h]=cropBounds(bitmap.width,bitmap.height,area),canvas=doc.createElement('canvas');
        const scale=Math.min(1,4096/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
        canvas.getContext('2d').drawImage(bitmap,x,y,w,h,0,0,canvas.width,canvas.height);
        return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('背景画像を保存できません。')),'image/webp',0.94));
      }finally{bitmap.close?.();}
    }
    function SettingsLauncher({openSettings,settingsOpen,settingsShortcut,wide,t}){
      return React.createElement(Button,{
        type:'button',variant:'ghost',size:'sm',className:'studio-settings-launcher',onClick:()=>openSettings(),
        title:t('settings'),'aria-label':t('settings'),'aria-haspopup':'dialog','aria-expanded':settingsOpen,
        'aria-keyshortcuts':settingsShortcut?.aria,
      },React.createElement(IconSettingsOutlineMedium,{size:16,'aria-hidden':true}),wide?t('settings'):null);
    }
    function useAppearance(controller){
      const [state,setState]=React.useState(()=>controller.snapshot());
      React.useEffect(()=>{
        const sync=()=>setState(controller.snapshot());
        const stop=controller.subscribe(sync);sync();return stop;
      },[controller]);
      return state;
    }
    function HeroTitle({hero,children,controller,nativeCopy}){
      const {heroTitle,heroBadge}=useAppearance(controller);
      const frame=React.useRef(null),[seat,setSeat]=React.useState(null);
      React.useEffect(()=>{
        const root=frame.current;
        if(!hero||!root){setSeat(null);return;}
        let marked=null;
        const update=()=>{
          const {title,badge}=nativeCopy();
          const next=[...root.querySelectorAll('[data-composer-seat] span > span + span')]
            .find(node=>node.textContent===badge&&node.previousElementSibling?.textContent===title)?.parentElement??null;
          if(next===marked)return;
          marked?.removeAttribute('data-studio-hero-seat');marked=next;
          marked?.setAttribute('data-studio-hero-seat','');setSeat(marked);
        };
        const observer=new MutationObserver(update);observer.observe(root,{subtree:true,childList:true,characterData:true});update();
        return()=>{observer.disconnect();marked?.removeAttribute('data-studio-hero-seat');};
      },[hero,nativeCopy]);
      return React.createElement('div',{ref:frame,style:{display:'contents'}},children,hero&&seat?createPortal(React.createElement(React.Fragment,null,
        React.createElement('span',{'data-studio-hero-copy':''},heroTitle.trim()||defaults.heroTitle),
        heroBadge.trim()?React.createElement('span',{'data-studio-hero-copy':'badge'},heroBadge.trim()):null),seat):null);
    }
    function CompactNavigation({wide,controller,navigationLabel,t}){
      const {compactNavigation}=useAppearance(controller);
      const [nav,setNav]=React.useState(null),[mount,setMount]=React.useState(null),[expanded,setExpanded]=React.useState(false);
      React.useEffect(()=>{
        if(!compactNavigation){setNav(null);return;}
        const update=()=>{
          const sidebar=document.querySelector('[data-slot="sidebar"]');
          setNav(sidebar?.querySelector('[data-sidebar-scrollport] > nav')??[...(sidebar?.querySelectorAll('nav[aria-label]')??[])].find(el=>el.getAttribute('aria-label')===navigationLabel())??null);
        };
        const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});update();
        return()=>observer.disconnect();
      },[compactNavigation,navigationLabel,wide]);
      React.useEffect(()=>{
        const parent=nav?.parentElement;
        if(!parent||!compactNavigation){setMount(null);return;}
        const seat=document.createElement('div');seat.className='studio-compact-navigation-seat';
        parent.insertBefore(seat,nav);
        parent.setAttribute('data-studio-compact-nav','');setMount(seat);
        return()=>{seat.remove();parent.removeAttribute('data-studio-compact-nav');};
      },[nav,compactNavigation]);
      React.useEffect(()=>{
        if(!nav||!compactNavigation)return;
        nav.toggleAttribute('hidden',!expanded);
        return()=>nav.removeAttribute('hidden');
      },[nav,compactNavigation,expanded]);
      return compactNavigation&&mount?createPortal(React.createElement(Button,{type:'button',size:'sm',variant:'ghost',
        className:'studio-compact-navigation','aria-label':t('navigation'),'aria-expanded':expanded,onClick:()=>setExpanded(!expanded),
        icon:React.createElement(IconChevronDownOutlineRegular,{size:14})},wide?t('navigation'):null),mount):null;
    }
    function Appearance({controller,t,windowOpacity,settingsLauncherAvailable}){
      const h=(type,props,...children)=>React.createElement(type,props?{...props,...Object.fromEntries(['aria-label','title','placeholder'].filter(key=>typeof props[key]==='string').map(key=>[key,localizedText(props[key],t)]))}:props,...children.map(value=>localizedText(value,t)));
      const state=useAppearance(controller);
      const [windowState,setWindowState]=React.useState(()=>windowOpacity?.snapshot?.()??{desktop:false,opacity:100,confirmed:false,available:false,pending:false,error:''});
      const [windowDraft,setWindowDraft]=React.useState(()=>windowOpacity?.snapshot?.().opacity??100);
      const [source,setSource]=React.useState(null),[framing,setFraming]=React.useState(originalCrop),[cropping,setCropping]=React.useState(false),[cropError,setCropError]=React.useState('');
      const fileInput=React.useRef(null),fileRequest=React.useRef(0);
      React.useEffect(()=>source?()=>URL.revokeObjectURL(source.url):undefined,[source]);
      React.useEffect(()=>()=>{fileRequest.current++;},[]);
      const japanese=t('title')==='アクセントと背景';
      const pick=(ja,en)=>japanese?ja:en;
      const crop=source?cropArea(source.width,source.height,framing,window.innerWidth/window.innerHeight):null;
      async function choose(file){
        const request=++fileRequest.current;setCropError('');
        try{const dimensions=await validateImage(file,window.createImageBitmap?.bind(window),{dimensions:true});if(request!==fileRequest.current)return;setFraming(originalCrop);setSource({file,url:URL.createObjectURL(file),...dimensions});}
        catch(error){if(request===fileRequest.current)setCropError(error.message);}
      }
      async function saveCrop(){
        fileRequest.current++;setCropping(true);setCropError('');
        try{if(await controller.setWallpaper(await cropWallpaper(source.file,crop,window.createImageBitmap.bind(window),document)))setSource(null);}
        catch(error){setCropError(error.message);}finally{setCropping(false);}
      }
      function cropPoint(event){
        const rect=event.currentTarget.getBoundingClientRect();
        return {x:Math.max(0,Math.min(100,Math.round(100*(event.clientX-rect.left)/rect.width))),y:Math.max(0,Math.min(100,Math.round(100*(event.clientY-rect.top)/rect.height)))};
      }
      React.useEffect(()=>{if(!windowOpacity)return;const sync=()=>setWindowState(windowOpacity.snapshot());const stop=windowOpacity.subscribe(sync);sync();return stop;},[windowOpacity]);
      React.useEffect(()=>{setWindowDraft(windowState.opacity);},[windowState.opacity]);
      const card=(title,...children)=>h('section',{className:'studio-appearance-card','aria-label':title},
        h('h4',null,title),...children);
      const select=(label,value,onChange,choices)=>h('label',{className:'studio-appearance-field'},h('span',null,label),h('select',{value,onChange,'aria-label':label},...choices.map(([key,text])=>h('option',{key,value:key},text))));
      return h('section',{className:'studio-appearance','aria-label':'アクセントと背景'},
        h('header',{className:'studio-appearance-heading'},h('h3',null,'アクセントと背景')),
        h('div',{className:'studio-appearance-preview','aria-label':'プレビュー'},
          h('div',{className:'studio-appearance-preview-bg',style:{backgroundImage:state.wallpaperUrl?`url("${state.wallpaperUrl}")`:undefined,opacity:state.opacity/100,backgroundSize:state.wallpaperFit==='tile'?'auto':state.wallpaperFit,backgroundPosition:state.wallpaperPosition,backgroundRepeat:state.wallpaperFit==='tile'?'repeat':'no-repeat'}}),
          h('div',{className:'studio-appearance-preview-content'},
            h('strong',null,pick('次の制作をここから','Your next creation starts here.')),
            h('p',null,'Aa / あいうえお'),
            h('div',{className:'studio-appearance-actions'},h('span',{className:'studio-appearance-chip'},pick('入力欄','Composer')),h('span',{className:'studio-appearance-preview-accent'},'アクセント')))),
        card('アクセント',
          h('div',{className:'studio-appearance-actions studio-appearance-between'},h('label',{className:'studio-appearance-toggle'},h('input',{type:'checkbox',checked:state.accentEnabled,onChange:e=>controller.setPreferences({accentEnabled:e.target.checked})}),h('span',null,'カスタム色を使う')),h('code',null,state.accentEnabled?state.accent.toUpperCase():'DSH既定')),
          h('div',{className:'studio-appearance-swatches',role:'group','aria-label':'カラープリセット'},...presets.map(preset=>h(Button,{key:preset.color,type:'button',size:'sm',variant:'outline','aria-pressed':state.accentEnabled&&state.accent===preset.color,onClick:()=>controller.setPreferences({accentEnabled:true,accent:preset.color}),className:'studio-appearance-swatch'},h('span',{'aria-hidden':true,style:{background:preset.color}}),preset.name))),
          h('label',{className:'studio-appearance-field'},h('span',null,'色を選ぶ'),h('input',{type:'color',value:state.accent,onChange:e=>controller.setPreferences({accent:e.target.value,accentEnabled:true}),'aria-label':'アクセント'})),
          h('p',null,'読みやすさを自動調整')),
        card('背景のグレー',
          select('背景のグレー',state.surface??'dsh',e=>controller.setPreferences({surface:e.target.value}),[['dsh','DSH標準'],['studio','Media Studioのグレー']])),
        card('背景画像',
          h('input',{ref:fileInput,type:'file',accept:'image/png,image/jpeg,image/webp',style:{display:'none'},onChange:e=>{const file=e.target.files?.[0];e.target.value='';if(file)void choose(file);},'aria-label':'背景画像を選ぶ',tabIndex:-1}),
          h('div',{className:'studio-appearance-actions'},h(Button,{type:'button',size:'sm',variant:'outline',disabled:cropping,onClick:()=>fileInput.current?.click()},state.hasWallpaper?'変更':'画像を選ぶ'),h(Button,{type:'button',size:'sm',variant:'ghost',disabled:!state.hasWallpaper||cropping,onClick:()=>void controller.clearWallpaper()},'削除'),h('span',{className:'studio-appearance-muted'},state.hasWallpaper?'設定済み':'なし')),
          source?h('section',{className:'studio-wallpaper-crop','aria-label':pick('切り抜き','Crop')},
            select(pick('切り抜きの比率','Crop ratio'),framing.ratio,e=>setFraming({...framing,ratio:e.target.value}),[['original',pick('元の比率','Original')],['window',pick('ウィンドウに合わせる','Match window')],['square',pick('正方形','Square')]]),
            h('p',null,pick('残したい場所をクリックします。必要に応じて拡大してください。','Click the area to keep. Adjust the zoom as needed.')),
            h('button',{type:'button',className:'studio-wallpaper-crop-source',disabled:cropping,'aria-label':pick('切り抜きの中心。矢印キーで移動','Crop center. Move with arrow keys'),
            onClick:e=>{if(e.detail>0){const point=cropPoint(e);setFraming(value=>({...value,...point}));}},
            onKeyDown:e=>{const delta={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]}[e.key];if(!delta)return;e.preventDefault();setFraming(value=>({...value,x:Math.max(0,Math.min(100,value.x+delta[0])),y:Math.max(0,Math.min(100,value.y+delta[1]))}));}},
            h('img',{src:source.url,alt:pick('切り抜き元','Crop source'),draggable:false,style:{display:'block',maxWidth:'100%',maxHeight:'28vh',width:'auto',height:'auto'}}),
            h('div',{'aria-hidden':true,style:{position:'absolute',left:`${crop.x}%`,top:`${crop.y}%`,width:`${crop.w}%`,height:`${crop.h}%`,outline:'2px solid white',boxShadow:'0 0 0 100vmax #0008',pointerEvents:'none'}})),
            h('label',{className:'studio-appearance-field'},h('span',null,pick('拡大','Zoom')),h('input',{type:'range',min:100,max:300,value:framing.zoom,disabled:cropping,onChange:e=>setFraming({...framing,zoom:Number(e.target.value)})}),h('output',null,`${framing.zoom}%`)),
            h('div',{className:'studio-appearance-actions'},h(Button,{type:'button',size:'sm',variant:'primary',disabled:cropping,onClick:()=>void saveCrop()},pick('この範囲を使う','Use crop')),h(Button,{type:'button',size:'sm',variant:'outline',disabled:cropping,onClick:()=>{fileRequest.current++;setSource(null);}},pick('取消','Cancel')))):null,
          cropError?h('p',{role:'alert'},cropError):null,
          h('p',null,'PNG / JPEG / WebP · 20 MiB・一辺8192px・40MP以下 · このブラウザーまたはアプリに保存'),
          select('背景の表示範囲',state.wallpaperScope,e=>controller.setPreferences({wallpaperScope:e.target.value}),[['conversation','会話画面'],['window','画面全体']]),
          h('label',{className:'studio-appearance-field'},h('span',null,'濃さ'),h('output',null,`${state.opacity}%`)),h('input',{type:'range',min:0,max:50,step:1,value:state.opacity,onChange:e=>controller.setPreferences({opacity:Number(e.target.value)}),'aria-label':'濃さ'}),
          h('div',{className:'studio-appearance-grid'},select('表示方法',state.wallpaperFit,e=>controller.setPreferences({wallpaperFit:e.target.value}),[['cover','全体に広げる'],['contain','画像全体'],['tile','タイル']]),select('位置',state.wallpaperPosition,e=>controller.setPreferences({wallpaperPosition:e.target.value}),[['center','中央'],['top','上'],['bottom','下']]))),
        card('ウィンドウの不透明度',windowState.desktop
          ?h(React.Fragment,null,h('p',null,pick('設定などのモーダルを開いている間は100%で表示します。','The window stays at 100% while a modal is open.')),h('label',{className:'studio-appearance-field'},h('span',null,'ウィンドウの不透明度'),h('output',null,`${windowDraft}%`)),h('input',{type:'range',min:30,max:100,step:1,value:windowDraft,disabled:!windowState.available||windowState.pending,onChange:e=>setWindowDraft(Number(e.target.value)),'aria-label':'ウィンドウの不透明度'}),h('div',{className:'studio-appearance-actions'},h(Button,{type:'button',size:'sm',variant:'outline',disabled:!windowState.available||windowState.pending,onClick:()=>void windowOpacity.setOpacity(windowDraft)},'適用'),h('span',{className:'studio-appearance-muted'},windowState.confirmed?`${t('windowApplied')} ${windowState.opacity}%`:'未設定')),windowState.error?h('p',{role:'alert',className:'studio-appearance-error'},windowState.error):null,!windowState.available?h(Button,{type:'button',size:'sm',variant:'outline',disabled:windowState.pending,onClick:()=>void windowOpacity.retry()},'もう一度確認'):null)
          :h('p',null,'ウィンドウの透過はDesktopアプリ版のみ利用できます。')),
        card('新規セッションの見出し',
          ...[['heroTitle','見出し',72],['heroBadge','バッジ',24]].map(([key,label,maxLength])=>h('label',{key,className:'studio-appearance-field'},h('span',null,label),h('input',{type:'text',maxLength,value:state[key]??defaults[key],onChange:e=>controller.setPreferences({[key]:e.target.value})}))),
          h(Button,{type:'button',size:'sm',variant:'outline',onClick:()=>controller.setPreferences({heroTitle:defaults.heroTitle,heroBadge:defaults.heroBadge})},'英語の既定値に戻す')),
        h('label',{className:'studio-appearance-toggle'},h('input',{type:'checkbox',checked:state.compactNavigation??false,onChange:e=>controller.setPreferences({compactNavigation:e.target.checked})}), '左ペインの追加メニューを折りたたむ'),
        settingsLauncherAvailable?h('label',{className:'studio-appearance-toggle'},h('input',{
          type:'checkbox',checked:state.settingsOnly,onChange:event=>controller.setPreferences({settingsOnly:event.target.checked}),
        }),h('span',null,'左下に設定だけを表示')):null,
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
      if(windowOpacity.snapshot().desktop)ctx.effect(()=>{
        const update=()=>windowOpacity.setModal([...document.querySelectorAll('[role="dialog"][aria-modal="true"],dialog[open]')].some(element=>element.getClientRects().length&&!element.closest('[hidden],[aria-hidden="true"]')));
        const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','aria-hidden','aria-modal']});update();
        return()=>observer.disconnect();
      });
      ctx.effect(()=>ctx.locale.register('studio.appearance','en',en));
      ctx.effect(()=>ctx.locale.register('studio.appearance','ja',ja));
      const conversation=ctx.locale.bind('conversation');
      const nativeCopy=()=>({title:conversation('hero.headline'),badge:conversation('hero.preview')});
      const navigationLabel=()=>ctx.locale.bind('sidebar')('panels.label');
      ctx.slots.inject('conversation.hero.frame',()=>ctx.slots.register({name:'conversation.hero.frame',id:'studio-new-session-heading',inject:()=>({controller,nativeCopy})},HeroTitle));
      ctx.slots.inject('sidebar.footer.action',()=>ctx.slots.register({name:'sidebar.footer.action',id:'studio-compact-navigation',locale:'studio.appearance',inject:()=>({controller,navigationLabel})},CompactNavigation));
      ctx.effect(()=>{const sync=event=>{if(event.key===KEY)controller.reloadPreferences();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);});
      // The shell owns access, the settings dialog and its keyboard shortcut.
      // A higher-priority occupant is installed only while the option is on.
      ctx.slots.inject(SETTINGS_LAUNCHER,()=>{
        let unregister;
        function sync(){
          if(controller.snapshot().settingsOnly){
            unregister??=ctx.slots.register({name:SETTINGS_LAUNCHER,priority:-10,locale:'studio.appearance'},SettingsLauncher);
          }else{
            unregister?.();
            unregister=undefined;
          }
        }
        const unsubscribe=controller.subscribe(sync);
        sync();
        return()=>{unsubscribe();unregister?.();};
      });
      ctx.slots.inject('settings.general.item',()=>ctx.slots.register({name:'settings.general.item',id:'studio-appearance',order:12,locale:'studio.appearance',inject:()=>({controller,windowOpacity,settingsLauncherAvailable:ctx.slots.spec(SETTINGS_LAUNCHER)?.kind==='single'})},Appearance));
    }
    return {inject:['slots','theme','locale'],apply,Appearance,SettingsLauncher,normalize,accentOverrides,contrastColor,validateImage,cropArea,createController,createWindowOpacityController,imageStore,en,ja,localizedText};
  },
});
