// A new public Factory and ordinary image Slots; the stock Factory is retained.
window.__ModuleLoader__.load({
  id:'studio-image-viewer',
  factory(require){
    const {createElement:h,useState,useEffect,useRef,useCallback,useId}=require('react');
    const {createPortal}=require('react-dom');
    const {Button,IconCloseOutlineRegular,IconRefreshOutlineRegular,IconFullscreenOutlineRegular}=require('@deepseek-ai/dsh-client-ui-primitives');
    const FACTORY='studio.images.content',LOCALE='studio.image-viewer',MIN=.01,MAX=16;
    const dictionaries={
      en:{'image.label':'Image','image.openOriginal':'Open image','image.openNamed':'{label} — Open image','image.loading':'Loading image…','image.loadFailed':'Reload image','image.preview':'Image Viewer','image.closePreview':'Close','image.zoomIn':'Zoom in','image.zoomOut':'Zoom out','image.fit':'Fit','image.actualSize':'Actual size','image.resetView':'Reset view','image.zoomLevel':'Zoom level','image.panArea':'Image pan and zoom area','image.renderFailed':'Could not display the image. Close the viewer and check that the saved image can be opened.','image.instructions':'Wheel / pinch: zoom · Drag / arrows: pan · 0: fit · 1: 100% · Esc / backdrop: close'},
      ja:{'image.label':'画像','image.openOriginal':'画像を拡大','image.openNamed':'{label} — 画像を拡大','image.loading':'画像を読み込み中…','image.loadFailed':'画像を再読み込み','image.preview':'画像ビューアー','image.closePreview':'閉じる','image.zoomIn':'拡大','image.zoomOut':'縮小','image.fit':'画面に合わせる','image.actualSize':'原寸','image.resetView':'表示をリセット','image.zoomLevel':'拡大率','image.panArea':'画像の移動・拡大縮小エリア','image.renderFailed':'画像を表示できません。閉じて、保存済み画像の読み込みを確認してください。','image.instructions':'ホイール／ピンチで拡大縮小・ドラッグ／矢印キーで移動・0で画面に合わせる・1で原寸・Escまたは余白クリックで閉じる'},
    };
    const css=`
      .siv-gallery{display:flex;flex-wrap:wrap;gap:10px;max-width:100%}.siv-gallery[data-align=end]{justify-content:flex-end;align-self:flex-end}.siv-thumb{padding:0!important;overflow:hidden;display:grid!important;place-items:center;flex:0 0 auto;max-width:100%;cursor:zoom-in;border-radius:var(--dsw-radius-lg,12px)!important;background:var(--dsw-alias-interactive-bg-hover)!important}.siv-thumb img{display:block;width:100%;height:100%;object-fit:contain}.siv-loading{font-size:12px;color:var(--dsw-alias-label-secondary);padding:8px;overflow-wrap:anywhere}
      .siv-dialog{position:fixed;inset:var(--dsh-frame-chrome-top,0px) 0 0;z-index:1200;isolation:isolate;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.8));backdrop-filter:var(--dsw-mask-blur);font-family:var(--dsw-font-family,inherit)}.siv-toolbar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l2);flex-shrink:0;flex-wrap:wrap;box-shadow:0 2px 12px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}.siv-title{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.siv-title-mark{display:grid;place-items:center;width:34px;height:34px;flex:none;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-business-primary)}.siv-title-text{min-width:0}.siv-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600}.siv-dimensions{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;margin-top:2px}.siv-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.siv-toolgroup{display:flex;align-items:center;gap:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:11px;padding:3px;background:var(--dsw-alias-bg-layer-2)}.siv-toolgroup button{min-width:28px}.siv-symbol{display:inline-grid;place-items:center;font-size:18px;width:16px;line-height:16px;font-weight:400}.siv-zoom{min-width:56px;text-align:center;font-size:12px;font-variant-numeric:tabular-nums}.siv-stage{position:relative;flex:1;min-height:0;margin:16px;overflow:hidden;touch-action:none;outline-offset:2px;user-select:none}.siv-stage:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary)}.siv-image{position:absolute;left:50%;top:50%;transform-origin:center;display:block;max-width:none!important;max-height:none!important;border-radius:0!important;border:0!important;box-shadow:none!important;background:none!important;user-select:none;pointer-events:none}.siv-footer{padding:0 16px 12px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-primary)}.siv-error{position:absolute;inset:0;display:grid;place-items:center;color:var(--dsw-alias-label-primary);font-size:14px;text-align:center;padding:20px}@media(max-width:520px){.siv-toolbar{padding:8px;gap:8px}.siv-title{flex-basis:100%}.siv-name{font-size:12px}.siv-actions{justify-content:center;width:100%;gap:5px}.siv-toolgroup{padding:2px;gap:0}.siv-stage{margin:8px}.siv-footer{padding:0 8px 8px;font-size:10px}}`;
    Object.assign(dictionaries.en,{compare:'Compare',before:'Before',after:'After',chooseBefore:'Choose an older image',chooseFile:'Choose a file',pinBefore:'Use as Before',pinnedBefore:'Set as Before',endCompare:'End comparison',compareError:'Could not open the older image.',compareMode:'Comparison mode',sideBySide:'Side by side',wipe:'Slider',divider:'Position of comparison divider'});
    Object.assign(dictionaries.ja,{compare:'新旧比較',before:'変更前',after:'変更後',chooseBefore:'比較元の画像を選ぶ',chooseFile:'ファイルから選ぶ',pinBefore:'変更前に指定',pinnedBefore:'変更前に指定済み',endCompare:'比較を終了',compareError:'比較元の画像を開けませんでした。',compareMode:'比較モード',sideBySide:'並べて比較',wipe:'スライダー比較',divider:'比較の境界位置'});
    const compareCss=`
      .siv-dialog{background:rgba(10,12,15,.85);backdrop-filter:grayscale(.8) blur(5px)}
      .siv-toolbar{margin:12px 14px 0;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,14px);background:var(--dsw-alias-bg-layer-2);box-shadow:0 5px 20px #0005}
      .siv-toolgroup{background:var(--dsw-alias-bg-layer-1)}
      .siv-footer,.siv-error{color:#f4f4f6}
      .siv-comparison{flex:1;min-height:0;margin:12px 14px 14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .siv-comparison figure{margin:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border:1px solid #fff3;border-radius:10px;background:#17191d;color:#f4f4f6}
      .siv-comparison img{display:block;width:100%;height:100%;min-height:0;object-fit:contain}
      .siv-comparison figcaption{overflow-wrap:anywhere;font-size:12px;padding:8px 12px;background:#24262b}
      .siv-compare-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;color:#f4f4f6}
      .siv-compare-controls select{max-width:14rem;padding:5px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
      .siv-wipe{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto}
      .siv-wipe figure{grid-template-rows:auto minmax(0,1fr)}
      .siv-wipe figcaption{display:flex;justify-content:space-between;gap:10px}
      .siv-wipe-stage{position:relative;overflow:hidden;min-height:0;touch-action:pan-y}
      .siv-wipe-stage img{position:absolute;inset:0}
      .siv-wipe-line{position:absolute;inset-block:0;width:2px;background:#fff;box-shadow:0 0 4px #000;pointer-events:none}
      .siv-compare-modes{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;margin:0;padding:2px 0 2px 10px;min-width:0;border:0;border-inline-start:1px solid var(--dsw-alias-border-l2)}
      .siv-compare-modes label{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer}
      .siv-compare-modes label:has(:checked){font-weight:600}
      .siv-compare-modes label:has(:disabled){color:var(--dsw-alias-label-tertiary);cursor:default}
      .siv-compare-modes input{margin:0;accent-color:var(--dsw-alias-state-business-primary)}
      .siv-wipe-range{width:100%;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
      @media(max-width:600px){.siv-toolbar{margin:8px 8px 0}.siv-comparison:not(.siv-wipe){grid-template-columns:1fr;grid-template-rows:repeat(2,minmax(0,1fr));gap:6px;margin:8px}}
    `;
    const validSize=n=>Number.isFinite(n)&&n>0&&n<=100000;
    const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
    function fitScale(image,viewport){return validSize(image.width)&&validSize(image.height)&&validSize(viewport.width)&&validSize(viewport.height)?clamp(Math.min(1,viewport.width/image.width,viewport.height/image.height),MIN,MAX):1;}
    function boundedView(view,image,viewport){
      const scale=Number.isFinite(view.scale)?clamp(view.scale,MIN,MAX):1;
      const x=Math.max(0,(image.width*scale-viewport.width)/2),y=Math.max(0,(image.height*scale-viewport.height)/2);
      return {scale,x:Number.isFinite(view.x)?clamp(view.x,-x,x):0,y:Number.isFinite(view.y)?clamp(view.y,-y,y):0,mode:view.mode==='fit'?'fit':'manual'};
    }
    function zoomView(view,nextScale,anchor,image,viewport){
      const scale=clamp(nextScale,MIN,MAX),factor=scale/view.scale;
      return boundedView({scale,x:anchor.x-(anchor.x-view.x)*factor,y:anchor.y-(anchor.y-view.y)*factor,mode:'manual'},image,viewport);
    }
    function imageContainsPoint(point,view,image,viewport){return Math.abs(point.x)<=viewport.width/2&&Math.abs(point.y)<=viewport.height/2&&Math.abs(point.x-view.x)<=image.width*view.scale/2&&Math.abs(point.y-view.y)<=image.height*view.scale/2;}
    function createBackdropGesture(){
      const active=new Set();let tap=null;
      return {
        start(id,point,onImage){tap=active.size===0&&!onImage?{id,point}:null;active.add(id);},
        move(id,point){if(tap?.id===id&&Math.hypot(point.x-tap.point.x,point.y-tap.point.y)>6)tap=null;},
        finish(id,point,onImage,released){const dismiss=active.has(id)&&active.size===1&&released&&tap?.id===id&&!onImage&&Math.hypot(point.x-tap.point.x,point.y-tap.point.y)<=6;active.delete(id);tap=null;return Boolean(dismiss);},
        cancel(){tap=null;},clear(){active.clear();tap=null;},
      };
    }
    const thumbnailSize=(source,variant)=>{
      if(variant==='tile')return {width:64,height:64};if(variant==='thumbnail')return {width:48,height:48};
      const d=source.attachment??source.preview??{},w=validSize(d.width)?d.width:240,v=validSize(d.height)?d.height:240,scale=Math.min(1,240/w,240/v);
      return {width:Math.max(1,Math.round(w*scale)),height:Math.max(1,Math.round(v*scale))};
    };
    function translated(props,key,fallback,params){try{const value=typeof props.t==='function'?props.t(key,params):null;return typeof value==='string'&&value&&value!==key?value:fallback;}catch{return fallback;}}
    function labelsFor(props){return props.labels??{image:translated(props,'image.label','Image'),open:translated(props,'image.openOriginal','Open image'),openNamed:label=>translated(props,'image.openNamed',`${label} — Open image`,{label}),loading:translated(props,'image.loading','Loading image…'),loadFailed:translated(props,'image.loadFailed','Reload image'),lightbox:{dialog:translated(props,'image.preview','Image Viewer'),close:translated(props,'image.closePreview','Close'),zoomIn:translated(props,'image.zoomIn','Zoom in'),zoomOut:translated(props,'image.zoomOut','Zoom out'),fit:translated(props,'image.fit',null),actualSize:translated(props,'image.actualSize',null),reset:translated(props,'image.resetView',null),zoomLevel:translated(props,'image.zoomLevel',dictionaries.en['image.zoomLevel']),panArea:translated(props,'image.panArea',dictionaries.en['image.panArea']),renderFailed:translated(props,'image.renderFailed',dictionaries.en['image.renderFailed']),instructions:translated(props,'image.instructions',dictionaries.en['image.instructions'])}};}
    const previewUrl=image=>typeof image?.preview?.url==='string'&&/^(blob:|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(image.preview.url)?image.preview.url:null;
    const pinnedByLoader=new WeakMap();
    let pinnedSession=null;
    function ImageViewer({src,alt,dimensions={},labels={},onClose,alternatives=[],loadImage,attachment,sessionId}){
      labels={...dictionaries.en,...labels};
      const stage=useRef(null),dialog=useRef(null),close=useRef(null),pointers=useRef(new Map()),gesture=useRef(null),backdrop=useRef(null);
      const filePicker=useRef(null),compareRequest=useRef(0),ownedUrl=useRef(null);
      const [comparing,setComparing]=useState(false),[baseline,setBaseline]=useState(null),[compareError,setCompareError]=useState(false);
      const modeName=useId();
      const [compareMode,setCompareMode]=useState('side'),[divider,setDivider]=useState(50);
      const [pinned,setPinned]=useState(()=>sessionId?(pinnedSession?.sessionId===sessionId?pinnedSession.item:null):pinnedByLoader.get(loadImage));
      const compareState=useRef(false);compareState.current=comparing;
      function pinBefore(){
        const item={attachment,label:alt};
        if(sessionId)pinnedSession={sessionId,item};
        else pinnedByLoader.set(loadImage,item);
        setPinned(item);
      }
      const pinnedOther=pinned&&pinned.attachment.attachmentId!==attachment?.attachmentId?pinned:null;
      const clearComparison=()=>{compareRequest.current++;if(ownedUrl.current)URL.revokeObjectURL(ownedUrl.current);ownedUrl.current=null;};
      useEffect(()=>()=>{clearComparison();},[]);
      async function compareWith(image,file){
        clearComparison();const generation=compareRequest.current;setBaseline(null);setCompareError(false);
        try{
          if(file&&(!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)||file.size>32*1024**2))throw Error('Invalid comparison image');
          const url=file?(ownedUrl.current=URL.createObjectURL(file)):previewUrl(image)??await loadImage(image.attachment);
          if(generation!==compareRequest.current)return;
          if(typeof url!=='string'||!url||url===src)throw Error('Comparison image unavailable');
          setBaseline({url,label:file?.name??image.label??image.attachment?.name??image.preview?.name});
        }catch{if(generation===compareRequest.current)setCompareError(true);}
      }
      if(!backdrop.current)backdrop.current=createBackdropGesture();
      const [image,setImage]=useState({width:validSize(dimensions.width)?dimensions.width:1,height:validSize(dimensions.height)?dimensions.height:1});
      const [viewport,setViewport]=useState({width:1,height:1});
      const [view,setView]=useState({scale:1,x:0,y:0,mode:'fit'}),[failed,setFailed]=useState(false),[dragging,setDragging]=useState(false);
      const current=useRef({image,viewport,view});current.current={image,viewport,view};
      const commit=value=>{current.current.view=value;setView(value);};
      const fit=()=>{backdrop.current.cancel();const c=current.current;commit({scale:fitScale(c.image,c.viewport),x:0,y:0,mode:'fit'});};
      const zoom=(scale,anchor={x:0,y:0})=>{backdrop.current.cancel();const c=current.current;commit(zoomView(c.view,scale,anchor,c.image,c.viewport));};
      useEffect(()=>{
        const el=stage.current;if(!el)return;
        const measure=()=>{const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)setViewport({width:r.width,height:r.height});};measure();
        const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;observer?.observe(el);window.addEventListener('resize',measure);
        return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
      },[]);
      useEffect(()=>{const c=current.current;commit(c.view.mode==='fit'?{scale:fitScale(c.image,c.viewport),x:0,y:0,mode:'fit'}:boundedView(c.view,c.image,c.viewport));},[image.width,image.height,viewport.width,viewport.height]);
      useEffect(()=>{
        const restore=document.activeElement instanceof HTMLElement?document.activeElement:null,previousOverflow=document.body.style.overflow;
        document.body.style.overflow='hidden';close.current?.focus();
        const key=e=>{
          const c=current.current;
          if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return;}
          if(e.key==='Tab'){
            const controls=[...dialog.current.querySelectorAll('button:not([disabled]),select:not([disabled]),input[type="range"]:not([disabled]),input[type="radio"]:checked:not([disabled]),[tabindex="0"]')].filter(el=>!el.closest('[hidden]')),first=controls[0],last=controls.at(-1);
            if(e.shiftKey&&(document.activeElement===first||!dialog.current.contains(document.activeElement))){e.preventDefault();last?.focus();}
            else if(!e.shiftKey&&(document.activeElement===last||!dialog.current.contains(document.activeElement))){e.preventDefault();first?.focus();}return;
          }
          if(!compareState.current&&['+','=','Add','-','Subtract','0','1','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
            e.preventDefault();e.stopPropagation();backdrop.current.cancel();
            if(['+','=','Add'].includes(e.key))zoom(c.view.scale*1.25);
            else if(['-','Subtract'].includes(e.key))zoom(c.view.scale/1.25);
            else if(e.key==='1')zoom(1);
            else if(e.key==='0'||e.key==='Home')fit();
            else commit(boundedView({...c.view,x:c.view.x+({ArrowLeft:40,ArrowRight:-40}[e.key]??0),y:c.view.y+({ArrowUp:40,ArrowDown:-40}[e.key]??0),mode:'manual'},c.image,c.viewport));
          }
        };
        const wheel=e=>{e.preventDefault();const r=stage.current.getBoundingClientRect(),c=current.current,units=e.deltaMode===1?16:e.deltaMode===2?r.height:1;zoom(c.view.scale*Math.exp(-clamp(e.deltaY*units,-200,200)*.003),{x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2});};
        const el=stage.current;el?.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key,true);
        return()=>{window.removeEventListener('keydown',key,true);el?.removeEventListener('wheel',wheel);pointers.current.clear();backdrop.current.clear();if(document.body.style.overflow==='hidden')document.body.style.overflow=previousOverflow;if(restore?.isConnected)restore.focus();};
      },[onClose]);
      const point=e=>{const r=stage.current.getBoundingClientRect();return{x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2};};
      const begin=()=>{const p=[...pointers.current.values()],c=current.current;if(p.length===1)gesture.current={type:'pan',point:p[0],view:{...c.view}};else if(p.length>=2)gesture.current={type:'pinch',mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),view:{...c.view}};else gesture.current=null;};
      const pointerDown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();const p=point(e),c=current.current;backdrop.current.start(e.pointerId,p,imageContainsPoint(p,c.view,c.image,c.viewport));pointers.current.set(e.pointerId,p);stage.current.setPointerCapture?.(e.pointerId);setDragging(true);begin();};
      const pointerMove=e=>{
        if(!pointers.current.has(e.pointerId))return;const position=point(e);backdrop.current.move(e.pointerId,position);pointers.current.set(e.pointerId,position);const g=gesture.current,c=current.current,p=[...pointers.current.values()];if(!g)return;
        if(g.type==='pinch'&&p.length>=2&&g.distance>0){const mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},scale=clamp(g.view.scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/g.distance,MIN,MAX),factor=scale/g.view.scale;commit(boundedView({scale,x:mid.x-(g.mid.x-g.view.x)*factor,y:mid.y-(g.mid.y-g.view.y)*factor,mode:'manual'},c.image,c.viewport));}
        else if(g.type==='pan'&&p.length===1)commit(boundedView({...g.view,x:g.view.x+p[0].x-g.point.x,y:g.view.y+p[0].y-g.point.y,mode:'manual'},c.image,c.viewport));
      };
      const pointerEnd=(e,released)=>{const p=point(e),c=current.current,dismiss=backdrop.current.finish(e.pointerId,p,imageContainsPoint(p,c.view,c.image,c.viewport),released);pointers.current.delete(e.pointerId);setDragging(pointers.current.size>0);begin();if(dismiss)onClose();};
      const outer=e=>e.target===e.currentTarget||Boolean(e.target?.closest?.('.siv-footer'));
      return createPortal(h('div',{ref:dialog,className:'siv-dialog',role:'dialog','aria-modal':true,'aria-label':labels.dialog??'Image Viewer','aria-describedby':'siv-instructions','data-studio-image-viewer':true,onPointerDown:e=>{if(!comparing&&outer(e))pointerDown(e);},onPointerMove:e=>{if(!comparing&&outer(e))pointerMove(e);},onPointerUp:e=>{if(!comparing&&outer(e))pointerEnd(e,true);},onPointerCancel:e=>{if(!comparing&&outer(e))pointerEnd(e,false);}},h('style',null,css+compareCss),
        h('header',{className:'siv-toolbar'},h('div',{className:'siv-title'},h('span',{className:'siv-title-mark','aria-hidden':true},h(IconFullscreenOutlineRegular,{size:18})),h('div',{className:'siv-title-text'},h('div',{className:'siv-name',title:alt},alt),h('div',{className:'siv-dimensions'},`${image.width} × ${image.height} px`))),h('div',{className:'siv-actions'},
          !comparing?h('div',{className:'siv-toolgroup'},h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.zoomOut??'Zoom out','data-siv-action':'zoom-out',title:labels.zoomOut??'Zoom out',disabled:view.scale<=MIN,onClick:()=>zoom(current.current.view.scale/1.25)},h('span',{className:'siv-symbol','aria-hidden':true},'−')),
          h('output',{className:'siv-zoom','aria-label':labels.zoomLevel??dictionaries.en['image.zoomLevel'],'data-siv-zoom':true},`${Math.round(view.scale*1000)/10}%`),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.zoomIn??'Zoom in','data-siv-action':'zoom-in',title:labels.zoomIn??'Zoom in',disabled:view.scale>=MAX,onClick:()=>zoom(current.current.view.scale*1.25)},h('span',{className:'siv-symbol','aria-hidden':true},'+'))):null,
          !comparing?h('div',{className:'siv-toolgroup'},h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.fit??'Fit image','data-siv-action':'fit',icon:h(IconFullscreenOutlineRegular,{size:16}),onClick:fit},labels.fit??'Fit'),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.actualSize??'Actual size','data-siv-action':'actual-size',onClick:()=>zoom(1)},labels.actualSize??'100%'),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.reset??'Reset view','data-siv-action':'reset',icon:h(IconRefreshOutlineRegular,{size:16}),onClick:fit},labels.reset??'Reset')):null,
          !comparing&&attachment?.attachmentId&&typeof loadImage==='function'?h(Button,{type:'button',size:'sm',variant:'outline','aria-pressed':pinned?.attachment?.attachmentId===attachment.attachmentId,onClick:pinBefore},pinned?.attachment?.attachmentId===attachment.attachmentId?labels.pinnedBefore:labels.pinBefore):null,
          h(Button,{type:'button',size:'sm',variant:'outline','aria-pressed':comparing,onClick:()=>{if(comparing){clearComparison();setBaseline(null);setCompareError(false);}else if(pinnedOther)void compareWith(pinnedOther);setComparing(!comparing);}},comparing?labels.endCompare:labels.compare),
          h(Button,{ref:close,type:'button',size:'sm',variant:'outline','aria-label':labels.close??'Close','data-siv-action':'close',icon:h(IconCloseOutlineRegular,{size:16}),onClick:onClose},labels.close??'Close'))),
        comparing?h('div',{className:'siv-compare-controls'},
          alternatives.length?h('select',{'aria-label':labels.chooseBefore,defaultValue:'',onChange:e=>{if(e.target.value)void compareWith(alternatives[Number(e.target.value)-1]);}},h('option',{value:'',disabled:true},labels.chooseBefore),...alternatives.map((item,i)=>h('option',{key:i,value:i+1},item.label??item.attachment?.name??item.preview?.name??`${labels.before} ${i+1}`))):null,
          h('input',{ref:filePicker,hidden:true,type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',onChange:e=>{const file=e.target.files?.[0];e.target.value='';if(file)void compareWith(null,file);}}),
          h(Button,{type:'button',size:'sm',variant:'outline',onClick:()=>filePicker.current?.click()},labels.chooseFile),
          h('fieldset',{className:'siv-compare-modes','aria-label':labels.compareMode},
            ...[['side',labels.sideBySide],['wipe',labels.wipe]].map(([mode,label])=>
              h('label',{key:mode},
                h('input',{type:'radio',name:modeName,value:mode,checked:(baseline?compareMode:'side')===mode,disabled:mode==='wipe'&&!baseline,onChange:()=>setCompareMode(mode)}),label))),
          compareError?h('span',{role:'alert'},labels.compareError):null) : null,
        comparing&&(compareMode==='wipe'&&baseline
          ?h('div',{className:'siv-comparison siv-wipe'},
            h('figure',null,h('figcaption',null,h('span',null,`${labels.before} · ${baseline.label??''}`),h('span',null,`${labels.after} · ${alt}`)),
              h('div',{className:'siv-wipe-stage'},h('img',{src,alt,draggable:false}),
                h('img',{src:baseline.url,alt:baseline.label??labels.before,draggable:false,onError:()=>setCompareError(true),style:{clipPath:`inset(0 ${100-divider}% 0 0)`}}),
                h('span',{className:'siv-wipe-line','aria-hidden':true,style:{left:`${divider}%`}}))),
            h('input',{type:'range',className:'siv-wipe-range',min:0,max:100,value:divider,'aria-label':labels.divider,onChange:e=>setDivider(Number(e.target.value))}))
          :h('div',{className:'siv-comparison'},h('figure',null,h('figcaption',null,[labels.before,baseline?.label].filter(Boolean).join(' · ')),baseline?h('img',{src:baseline.url,alt:baseline.label??labels.before,onError:()=>setCompareError(true)}):null),h('figure',null,h('figcaption',null,`${labels.after} · ${alt}`),h('img',{src,alt})))),
        h('div',{ref:stage,className:'siv-stage',hidden:comparing,tabIndex:comparing?-1:0,'aria-label':labels.panArea??dictionaries.en['image.panArea'],style:{display:comparing?'none':undefined,cursor:dragging?'grabbing':view.scale>fitScale(image,viewport)?'grab':'default'},onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:e=>pointerEnd(e,true),onPointerCancel:e=>pointerEnd(e,false),onLostPointerCapture:e=>pointerEnd(e,false),onDoubleClick:e=>{const c=current.current;zoom(Math.abs(c.view.scale-1)<.01?fitScale(c.image,c.viewport):1,point(e));}},
          failed?h('p',{className:'siv-error',role:'alert'},labels.renderFailed??dictionaries.en['image.renderFailed']):null,
          h('img',{className:'siv-image',src,alt,draggable:false,style:{width:image.width,height:image.height,transform:`translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`,borderRadius:0},onLoad:e=>{const n=e.currentTarget;if(validSize(n.naturalWidth)&&validSize(n.naturalHeight)){setImage({width:n.naturalWidth,height:n.naturalHeight});setFailed(false);}},onError:()=>setFailed(true)})),
        h('footer',{className:'siv-footer',hidden:comparing},h('span',{id:'siv-instructions'},labels.instructions??dictionaries.en['image.instructions']))),document.body);
    }
    function GalleryImage({image,loadImage,variant,labels,alternatives,sessionId}){
      const attachment=image?.attachment,preview=image?.preview;
      // A preview must be an explicit browser-owned source.
      const localPreview=previewUrl(image);
      const peek=()=>{try{return attachment?loadImage?.peek?.(attachment)??null:null;}catch{return null;}};
      const [loaded,setLoaded]=useState(()=>({attachment,loader:loadImage,url:localPreview?null:peek()})),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[open,setOpen]=useState(false);
      const close=useCallback(()=>setOpen(false),[]);
      useEffect(()=>{
        let live=true;
        setOpen(false);setError(false);
        if(localPreview||!attachment)return;
        setLoaded({attachment,loader:loadImage,url:peek()});
        Promise.resolve().then(()=>loadImage(attachment)).then(value=>{
          if(!live)return;
          if(typeof value!=='string'||!value)throw Error('Authorized image unavailable');
          setLoaded({attachment,loader:loadImage,url:value});
        }).catch(()=>{if(live)setError(true);});
        return()=>{live=false;};
      },[localPreview,attachment,loadImage,attempt]);
      const src=localPreview??(loaded?.attachment===attachment&&loaded?.loader===loadImage?loaded.url:null),label=image?.label??preview?.name??attachment?.name??labels.image;
      if(error&&!src)return h(Button,{type:'button',size:'sm',variant:'outline',onClick:()=>setAttempt(x=>x+1),'aria-label':labels.loadFailed},labels.loadFailed);
      return h('div',null,h(Button,{type:'button',variant:'outline',className:'siv-thumb',style:thumbnailSize(image,variant),title:src?labels.open:labels.loading,'aria-label':src?labels.openNamed(label):labels.loading,'aria-busy':!src||undefined,onClick:()=>{if(src)setOpen(true);}},src?h('img',{src,alt:label,draggable:false}):h('span',{className:'siv-loading'},labels.loading)),open&&src?h(ImageViewer,{src,alt:label,dimensions:attachment??preview,labels:labels.lightbox,onClose:close,alternatives,loadImage,attachment,sessionId}):null);
    }
    function ImageContent(props){
      const images=Array.isArray(props.images)?props.images:[];if(!images.length)return null;
      const labels=labelsFor(props),variant=props.thumbnail?'thumbnail':props.compact||images.length>1?'tile':'single';
      const comparison=Object.fromEntries(['compare','before','after','chooseBefore','chooseFile','pinBefore','pinnedBefore','endCompare','compareError','compareMode','sideBySide','wipe','divider'].map(key=>[key,translated(props,key,dictionaries.en[key])]));
      return h('div',{className:'siv-gallery','data-align':props.align},h('style',null,css),...images.map((image,i)=>h(GalleryImage,{key:`${image?.attachment?.attachmentId??image?.preview?.url??'image'}:${i}`,image,loadImage:props.loadImage,variant,sessionId:props.comparisonSession,labels:{...labels,lightbox:{...comparison,...labels.lightbox}},alternatives:images.filter((other,j)=>j!==i&&(other?.attachment||previewUrl(other)))})));
    }
    const Adapter=props=>props.renderFactorySlot(FACTORY,{images:props.images,loadImage:props.loadImage,align:props.align,compact:props.compact,thumbnail:props.thumbnail,comparisonSession:props.comparisonSession});
    function apply(ctx){
      ctx.effect(()=>ctx.locale.register(LOCALE,dictionaries));
      ctx.slots.registerFactory({name:FACTORY,scope:'root',locale:LOCALE,children:{'studio.images.viewer.available':{kind:'single',scope:'root'}}},ImageContent);
      for(const name of ['conversation.chat.message.images','conversation.chat.user.images','conversation.trajectory.images','tool.call.images'])ctx.slots.inject(name,()=>ctx.slots.register({name,id:'studio-image-viewer',priority:-1000,inject:sessionId=>({comparisonSession:sessionId})},Adapter));
    }
    return {inject:['slots','locale'],apply,FACTORY,LOCALE,dictionaries,MIN,MAX,ImageContent,GalleryImage,ImageViewer,Adapter,fitScale,boundedView,zoomView,imageContainsPoint,createBackdropGesture,thumbnailSize,labelsFor};
  },
});
