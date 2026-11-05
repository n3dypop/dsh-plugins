// A new public Factory and ordinary image Slots; the stock Factory is retained.
window.__ModuleLoader__.load({
  id:'studio-image-viewer',
  factory(require){
    const {createElement:h,useState,useEffect,useRef,useCallback}=require('react');
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
    function ImageViewer({src,alt,dimensions={},labels={},onClose}){
      const stage=useRef(null),dialog=useRef(null),close=useRef(null),pointers=useRef(new Map()),gesture=useRef(null),backdrop=useRef(null);
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
            const controls=[...dialog.current.querySelectorAll('button:not([disabled]),[tabindex="0"]')],first=controls[0],last=controls.at(-1);
            if(e.shiftKey&&(document.activeElement===first||!dialog.current.contains(document.activeElement))){e.preventDefault();last?.focus();}
            else if(!e.shiftKey&&(document.activeElement===last||!dialog.current.contains(document.activeElement))){e.preventDefault();first?.focus();}return;
          }
          if(['+','=','Add','-','Subtract','0','1','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
            e.preventDefault();e.stopPropagation();backdrop.current.cancel();
            if(['+','=','Add'].includes(e.key))zoom(c.view.scale*1.25);
            else if(['-','Subtract'].includes(e.key))zoom(c.view.scale/1.25);
            else if(e.key==='1')zoom(1);
            else if(e.key==='0'||e.key==='Home')fit();
            else commit(boundedView({...c.view,x:c.view.x+({ArrowLeft:40,ArrowRight:-40}[e.key]??0),y:c.view.y+({ArrowUp:40,ArrowDown:-40}[e.key]??0),mode:'manual'},c.image,c.viewport));
          }
        };
        const wheel=e=>{e.preventDefault();const r=stage.current.getBoundingClientRect(),c=current.current,units=e.deltaMode===1?16:e.deltaMode===2?r.height:1;zoom(c.view.scale*Math.exp(-clamp(e.deltaY*units,-200,200)*.003),{x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2});};
        const el=stage.current;el.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key,true);
        return()=>{window.removeEventListener('keydown',key,true);el.removeEventListener('wheel',wheel);pointers.current.clear();backdrop.current.clear();if(document.body.style.overflow==='hidden')document.body.style.overflow=previousOverflow;if(restore?.isConnected)restore.focus();};
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
      return createPortal(h('div',{ref:dialog,className:'siv-dialog',role:'dialog','aria-modal':true,'aria-label':labels.dialog??'Image Viewer','aria-describedby':'siv-instructions','data-studio-image-viewer':true,onPointerDown:e=>{if(outer(e))pointerDown(e);},onPointerMove:e=>{if(outer(e))pointerMove(e);},onPointerUp:e=>{if(outer(e))pointerEnd(e,true);},onPointerCancel:e=>{if(outer(e))pointerEnd(e,false);}},h('style',null,css),
        h('header',{className:'siv-toolbar'},h('div',{className:'siv-title'},h('span',{className:'siv-title-mark','aria-hidden':true},h(IconFullscreenOutlineRegular,{size:18})),h('div',{className:'siv-title-text'},h('div',{className:'siv-name',title:alt},alt),h('div',{className:'siv-dimensions'},`${image.width} × ${image.height} px`))),h('div',{className:'siv-actions'},
          h('div',{className:'siv-toolgroup'},h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.zoomOut??'Zoom out','data-siv-action':'zoom-out',title:labels.zoomOut??'Zoom out',disabled:view.scale<=MIN,onClick:()=>zoom(current.current.view.scale/1.25)},h('span',{className:'siv-symbol','aria-hidden':true},'−')),
          h('output',{className:'siv-zoom','aria-label':labels.zoomLevel??dictionaries.en['image.zoomLevel'],'data-siv-zoom':true},`${Math.round(view.scale*1000)/10}%`),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.zoomIn??'Zoom in','data-siv-action':'zoom-in',title:labels.zoomIn??'Zoom in',disabled:view.scale>=MAX,onClick:()=>zoom(current.current.view.scale*1.25)},h('span',{className:'siv-symbol','aria-hidden':true},'+'))),
          h('div',{className:'siv-toolgroup'},h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.fit??'Fit image','data-siv-action':'fit',icon:h(IconFullscreenOutlineRegular,{size:16}),onClick:fit},labels.fit??'Fit'),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.actualSize??'Actual size','data-siv-action':'actual-size',onClick:()=>zoom(1)},labels.actualSize??'100%'),
          h(Button,{type:'button',size:'sm',variant:'toolbar','aria-label':labels.reset??'Reset view','data-siv-action':'reset',icon:h(IconRefreshOutlineRegular,{size:16}),onClick:fit},labels.reset??'Reset')),
          h(Button,{ref:close,type:'button',size:'sm',variant:'outline','aria-label':labels.close??'Close','data-siv-action':'close',icon:h(IconCloseOutlineRegular,{size:16}),onClick:onClose},labels.close??'Close'))),
        h('div',{ref:stage,className:'siv-stage',tabIndex:0,'aria-label':labels.panArea??dictionaries.en['image.panArea'],style:{cursor:dragging?'grabbing':view.scale>fitScale(image,viewport)?'grab':'default'},onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:e=>pointerEnd(e,true),onPointerCancel:e=>pointerEnd(e,false),onLostPointerCapture:e=>pointerEnd(e,false),onDoubleClick:e=>{const c=current.current;zoom(Math.abs(c.view.scale-1)<.01?fitScale(c.image,c.viewport):1,point(e));}},
          failed?h('p',{className:'siv-error',role:'alert'},labels.renderFailed??dictionaries.en['image.renderFailed']):null,
          h('img',{className:'siv-image',src,alt,draggable:false,style:{width:image.width,height:image.height,transform:`translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`,borderRadius:0},onLoad:e=>{const n=e.currentTarget;if(validSize(n.naturalWidth)&&validSize(n.naturalHeight)){setImage({width:n.naturalWidth,height:n.naturalHeight});setFailed(false);}},onError:()=>setFailed(true)})),
        h('footer',{className:'siv-footer'},h('span',{id:'siv-instructions'},labels.instructions??'Wheel / pinch: zoom · Drag / arrows: pan · 0: fit · 1: 100% · Esc / backdrop: close'))),document.body);
    }
    function GalleryImage({image,loadImage,variant,labels}){
      const attachment=image?.attachment,preview=image?.preview;
      const peek=()=>{try{return attachment?loadImage?.peek?.(attachment)??null:null;}catch{return null;}};
      const [loaded,setLoaded]=useState(()=>({attachment,loader:loadImage,url:peek()})),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[open,setOpen]=useState(false);
      const close=useCallback(()=>setOpen(false),[]);
      useEffect(()=>{if(!attachment)return;let live=true;setLoaded({attachment,loader:loadImage,url:peek()});setOpen(false);setError(false);Promise.resolve().then(()=>loadImage(attachment)).then(value=>{if(!live)return;if(typeof value!=='string'||!value)throw Error('Authorized image unavailable');setLoaded({attachment,loader:loadImage,url:value});}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[attachment,loadImage,attempt]);
      // A preview can only arrive as an explicit browser-owned source. No URL
      // argument, path, network fetch or independent attachment lookup is added.
      const localPreview=preview&&typeof preview.url==='string'&&/^(blob:|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(preview.url)?preview.url:null;
      const src=localPreview??(loaded?.attachment===attachment&&loaded?.loader===loadImage?loaded.url:null),label=image?.label??preview?.name??attachment?.name??labels.image;
      if(error)return h(Button,{type:'button',size:'sm',variant:'outline',onClick:()=>setAttempt(x=>x+1),'aria-label':labels.loadFailed},labels.loadFailed);
      return h('div',null,h(Button,{type:'button',variant:'outline',className:'siv-thumb',style:thumbnailSize(image,variant),title:src?labels.open:labels.loading,'aria-label':src?labels.openNamed(label):labels.loading,'aria-busy':!src||undefined,onClick:()=>{if(src)setOpen(true);}},src?h('img',{src,alt:label,draggable:false}):h('span',{className:'siv-loading'},labels.loading)),open&&src?h(ImageViewer,{src,alt:label,dimensions:attachment??preview,labels:labels.lightbox,onClose:close}):null);
    }
    function ImageContent(props){
      const images=Array.isArray(props.images)?props.images:[];if(!images.length)return null;
      const labels=labelsFor(props),variant=props.thumbnail?'thumbnail':props.compact||images.length>1?'tile':'single';
      return h('div',{className:'siv-gallery','data-align':props.align},h('style',null,css),...images.map((image,i)=>h(GalleryImage,{key:`${image?.attachment?.attachmentId??image?.preview?.url??'image'}:${i}`,image,loadImage:props.loadImage,variant,labels})));
    }
    const Adapter=props=>props.renderFactorySlot(FACTORY,{images:props.images,loadImage:props.loadImage,align:props.align,compact:props.compact,thumbnail:props.thumbnail});
    function apply(ctx){
      ctx.effect(()=>ctx.locale.register(LOCALE,dictionaries));
      ctx.slots.registerFactory({name:FACTORY,scope:'root',locale:LOCALE,children:{'studio.images.viewer.available':{kind:'single',scope:'root'}}},ImageContent);
      for(const name of ['conversation.chat.message.images','conversation.chat.user.images','conversation.trajectory.images','tool.call.images'])ctx.slots.inject(name,()=>ctx.slots.register({name,id:'studio-image-viewer',priority:-1000},Adapter));
    }
    return {inject:['slots','locale'],apply,FACTORY,LOCALE,dictionaries,MIN,MAX,ImageContent,GalleryImage,ImageViewer,Adapter,fitScale,boundedView,zoomView,imageContainsPoint,createBackdropGesture,thumbnailSize,labelsFor};
  },
});
