window.__ModuleLoader__.load({id:'studio-sessions',factory(require){
  const {createElement:h,useState,useEffect,useRef,useSyncExternalStore}=require('react');
  const {createPortal}=require('react-dom');
  const {Button,Modal,MenuItemButton,IconClockOutlineRegular}=require('@deepseek-ai/dsh-client-ui-primitives');
  /* STUDIO_WORKSPACE_CLIENT */
  const PATH='/api/local-studio/sessions',KEY='studio-sessions.intent.v1';
  const isDesktop=()=>window.location?.protocol==='dsh-app:'&&window.location.host==='app';
  const en={title:'Session Library',search:'Title or session ID',scope:'Show',all:'All sessions',uncategorized:'Uncategorized',archived:'Archived',before:'Updated on or before',blank:'Empty only',refresh:'Refresh',select:'Select visible',clear:'Clear selection',review:'Review deletion',confirm:'Queue deletion',cancel:'Cancel reservation',retry:'Retry same reservation',selected:'selected',pending:'Deletion queued · next DSH start',deleted:'Deleted',blocked:'Not deleted · needs review',cancelled:'Cancelled',preview:'Confirm selected sessions',preserved:'Shared attachments, external inputs/outputs and models are preserved.',notice:'Selected history is deleted before DSH next starts, without archiving or restarting DSH. Changed or referenced history is protected.',busy:'Busy',dependent:'Referenced by another session',internal:'Internal subagent history',unavailable:'Not ready for deletion',queued:'Queued',empty:'No matching sessions',loading:'Loading…',reservation:'Deletion reservations',date:'Last updated'};
  const ja={title:'Session Library',search:'タイトル・ID',scope:'表示対象',all:'すべてのセッション',uncategorized:'未分類',archived:'アーカイブ済み',before:'更新日（この日まで）',blank:'空の会話のみ',refresh:'再読込',select:'表示中を選択',clear:'選択解除',review:'削除対象を確認',confirm:'削除を予約',cancel:'削除予約を取消',retry:'同じ予約を再試行',selected:'件を選択',pending:'削除予約済み · 次回DSH起動時',deleted:'削除済み',blocked:'未削除 · 要確認',cancelled:'取消済み',preview:'削除する会話を確認',preserved:'共有添付・外部の入力と成果物・モデルは保持します。',notice:'選んだ会話は次回DSH起動前に削除します。アーカイブや自動再起動はしません。更新された会話や、他の会話が参照する履歴は削除しません。',busy:'処理中',dependent:'他のセッションが参照中',internal:'サブエージェント内部履歴',unavailable:'削除準備ができていません',queued:'削除予約済み',empty:'該当する会話はありません',loading:'読込中…',reservation:'削除予約',date:'最終更新'};
  Object.assign(en,workspaceEn);Object.assign(ja,workspaceJa);
  Object.assign(en,{desktopNotice:'Quit Desktop from the Windows tray, then reopen it normally. You can cancel a reservation before it starts.',desktopPending:'Deletion queued · next Desktop start',desktopLegacyNotice:'This profile needs the offline deletion adapter. You can cancel the reservation until it is applied.',desktopLegacyPending:'Deletion queued · awaiting offline processing'});
  Object.assign(ja,{desktopNotice:'WindowsのトレイからDesktopを終了し、普段どおり起動すると削除予約を処理します。起動までは取り消せます。',desktopPending:'削除予約済み · 次回のDesktop起動時',desktopLegacyNotice:'このプロファイルではオフラインの予約処理が必要です。処理前なら取り消せます。',desktopLegacyPending:'削除予約済み · オフライン処理待ち'});
  Object.assign(en,{notice:'Restart the Web Host to apply deletion reservations. You can cancel a reservation before it starts.',scheduledMessage:'Deletion queued. You can cancel it before the next Web Host startup.',cancelledMessage:'Deletion reservation cancelled.'});
  Object.assign(ja,{notice:'Web版のDSHを終了して起動し直すと削除予約を処理します。起動までは取り消せます。',scheduledMessage:'削除を予約しました。Web版のDSHを次に起動するまで取り消せます。',cancelledMessage:'削除予約を取り消しました。'});
  Object.assign(en,{desktopScheduledMessage:'Deletion queued. You can cancel it before Desktop next starts.',desktopLegacyScheduledMessage:'Deletion queued. You can cancel it before offline processing.'});
  Object.assign(ja,{desktopScheduledMessage:'削除を予約しました。Desktopの次回起動まで取り消せます。',desktopLegacyScheduledMessage:'削除を予約しました。オフラインで処理するまで取り消せます。'});
  const text=key=>en[key]??key;
  Object.assign(en,{queuedOnly:'Deletion queued',hideQueued:'Hide queued deletions',showQueued:'Show queued deletions',includeQueued:'Include queued deletions',sidebarFilter:'Session deletion filter',dismiss:'Close',cancelBatch:'Cancel deletion for all sessions in this reservation'});
  Object.assign(ja,{queuedOnly:'削除予約済み',hideQueued:'削除予約済みを隠す',showQueued:'削除予約済みを表示',includeQueued:'削除予約済みを含める',sidebarFilter:'削除予約の表示',dismiss:'閉じる',cancelBatch:'この予約に含まれる全セッションの削除を取り消す'});
  Object.assign(en,{scheduleTitle:'Schedule session deletion?',scheduleExplanation:'This session will be deleted the next time this edition of DSH starts. You can cancel the reservation before then.',keepSession:'Keep session',cancelTitle:'Cancel scheduled deletion?',cancelExplanation:'The session will return to the session list.',goBack:'Go back',working:'Working…'});
  Object.assign(ja,{scheduleTitle:'このセッションの削除を予約しますか？',scheduleExplanation:'このセッションは、現在使っているDSHを次に起動したときに削除されます。それまでは予約を取り消せます。',keepSession:'セッションを残す',cancelTitle:'削除予約を取り消しますか？',cancelExplanation:'セッションは通常の一覧に戻ります。',goBack:'戻る',working:'処理中…'});
  en.batchExplanation='The selected sessions will be deleted the next time this edition of DSH starts. You can cancel the reservation before then.';
  ja.batchExplanation='選んだセッションは、現在使っているDSHを次に起動したときに削除されます。それまでは予約を取り消せます。';
  const css=`.studio-sessions{color:var(--dsw-alias-label-primary);font:inherit;min-width:0}.studio-sessions *{box-sizing:border-box}.sl-head,.sl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.sl-head h2{font-size:18px;margin:0}.sl-muted{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary)}.sl-filters{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:18px 0}.sl-filters label{display:grid;gap:5px;font-size:12px}.sl-filters input,.sl-filters select{min-width:0;width:100%;padding:9px 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit}.sl-check{display:flex!important;align-items:center;gap:8px}.sl-check input{width:auto}.sl-toolbar{justify-content:flex-start;margin:12px 0}.sl-list{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;overflow:hidden}.sl-row{display:flex;align-items:flex-start;gap:10px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}.sl-row:last-child{border:0}.sl-row input{margin-top:4px;accent-color:var(--dsw-alias-state-business-primary)}.sl-row-body{flex:1;min-width:0}.sl-row strong{font-size:13px;line-height:1.5;font-weight:600;display:block;overflow-wrap:anywhere}.sl-row small{font-size:10px;display:block;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.sl-badge{display:inline-block;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 7px;font-size:10px;white-space:nowrap;color:var(--dsw-alias-label-secondary)}.sl-notice,.sl-preview,.sl-receipt{margin:14px 0;padding:13px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);overflow-wrap:anywhere}.sl-preview h3,.sl-receipt h3{font-size:14px;margin:0 0 8px}.sl-preview ul{padding-left:20px;max-height:230px;overflow:auto;font-size:12px}.sl-preview li{margin:8px 0}.sl-preview small{display:block;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.sl-receipt-list{display:grid;gap:8px;margin-top:18px}.sl-receipt{margin:0}.sl-receipt summary{font-size:12px;cursor:pointer}.sl-danger{color:var(--dsw-alias-state-error-primary)!important}@media(max-width:600px){.sl-filters{grid-template-columns:minmax(0,1fr)}.sl-badge{white-space:normal}}`;
  function rowsFor(sessions,workspaces,library,{query='',scope='all',before='',blank=false,includeQueued=true}={}){
    const assigned=new Map((workspaces.items??[]).flatMap(w=>w.sessionIds.map(id=>[id,w.workspaceId]))),archived=new Set(workspaces.archivedSessionIds??[]),metadata=new Map((library?.sessions??[]).map(s=>[s.sessionId,s])),needle=query.trim().toLowerCase();
    return (sessions.ids??[]).map(id=>{const row=sessions.byId[id],values=row.projections?.values??row.projectionValues??sessions.projectionsBySession?.[id]?.values??{},meta=metadata.get(id);return {...row,sessionId:id,title:row.title??(typeof values.title==='string'?values.title:row.displayTitle??id),workspaceId:assigned.get(id)??null,archived:archived.has(id),meta};}).filter(row=>{if(scope==='queued'?!row.meta?.pending:!includeQueued&&row.meta?.pending)return false;if(scope==='uncategorized'&&(row.workspaceId||row.archived))return false;if(scope==='archived'&&!row.archived)return false;if(scope.startsWith('workspace:')&&row.workspaceId!==scope.slice(10))return false;if(blank&&!row.blank)return false;if(needle&&!`${row.title}\n${row.sessionId}`.toLowerCase().includes(needle))return false;if(before&&row.updatedAt>=new Date(before+'T00:00:00').getTime()+86400000)return false;return true;});
  }
  const reason=row=>row.running||row.meta?.busy?'busy':row.meta?.pending?'queued':row.origin==='subagent'||row.meta?.origin==='subagent'?'internal':row.meta?.dependencies?.length?'dependent':!row.meta?'unavailable':null;
  async function requestOptions(body,signal,{marker,proofKind,fetcher=fetch}){
    const options={credentials:'same-origin',cache:'no-store',signal};
    const headers=body?{'Content-Type':'application/json',[marker]:'1'}:{};
    if(body&&isDesktop()){
      try{
        const proofResponse=await fetcher('/api/local-studio/desktop-proof/'+proofKind,{...options,headers:{'X-Local-Studio-Proof-Request':'1'}});
        const value=await proofResponse.json();
        if(!proofResponse.ok||typeof value?.proof!=='string')throw Error('Desktop proof unavailable');
        headers['X-Local-Studio-Desktop-Proof']=value.proof;
      }catch{throw Object.assign(Error('Desktopの操作権限を確認できません。'),{definite:true});}
    }
    return {...options,method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})};
  }
  async function request(body,signal){
    const options=await requestOptions(body,signal,{marker:'X-Local-Studio-Sessions',proofKind:'sessions'});
    const response=await fetch(PATH,options);
    let value;try{value=await response.json();}catch{throw Error('セッション管理の応答を確認できません。');}if(!response.ok)throw Object.assign(Error(value.error??'セッション操作に失敗しました。'),{definite:response.status>=400&&response.status<500});return value;
  }
  const changedEvent='studio-sessions-reservations-changed';
  function createSidebarReservations(){
    let snapshot={value:null,target:null},sequence=0,disposed=false;
    const listeners=new Set(),emit=changes=>{if(disposed)return;snapshot={...snapshot,...changes};for(const callback of listeners)callback();};
    const refresh=async()=>{const ticket=++sequence;try{const value=await request(null,AbortSignal.timeout(10000));if(ticket===sequence)emit({value});}catch{/* Keep the last verified queue until a fresh read succeeds. */}};
    function open(target){emit({target});}
    return {snapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},refresh,open,dispose(){disposed=true;listeners.clear();}};
  }
  function ReservationDialog({owner,target,value,t}){
    const started=useRef(false);
    const [preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
    useEffect(()=>{
      if(target.requestId)return;
      const abort=new AbortController();
      void request({action:'preview',sessionIds:[target.sessionId]},abort.signal).then(setPreview).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
      return()=>abort.abort();
    },[target]);
    async function confirm(){
      if(started.current||(!preview&&!target.requestId))return;started.current=true;setBusy(true);
      const body=target.requestId?{action:'cancel',requestId:target.requestId}:{action:'schedule',previewId:preview.previewId,requestId:window.crypto.randomUUID()};
      try{await request(body,AbortSignal.timeout(20000));window.dispatchEvent(new Event(changedEvent));owner.open(null);}
      catch(e){setError(e.message);await owner.refresh();if(e.definite)started.current=false;}finally{setBusy(false);}
    }
    const cancelling=Boolean(target.requestId),close=()=>{if(!busy)owner.open(null);};
    return h(Modal,{open:true,title:t(cancelling?'cancelTitle':'scheduleTitle'),closeLabel:t('dismiss'),onClose:close,tone:cancelling?undefined:'warning',
      description:t(cancelling?'cancelExplanation':value?.startup?'scheduleExplanation':'desktopLegacyNotice'),
      footer:h('div',{className:'sl-dialog-actions'},
        h(Button,{type:'button',variant:'outline','data-modal-autofocus':true,disabled:busy,onClick:close},t(cancelling?'goBack':'keepSession')),
        h(Button,{type:'button',variant:cancelling?'primary':'outline',className:cancelling?undefined:'sl-danger',disabled:busy||started.current||!preview&&!cancelling,onClick:()=>void confirm()},t(busy?'working':cancelling?'cancel':'confirm')))},
      h('strong',{className:'sl-dialog-session'},target.displayTitle||target.sessionId),
      cancelling&&target.count>1?h('p',{className:'sl-muted'},`${t('cancelBatch')} (${target.count})`):null,
      !cancelling?h('p',{className:'sl-muted'},t(preview?'preserved':'loading')):null,
      error?h('p',{role:'alert',className:'sl-danger'},error):null);
  }
  const sidebarCss=`
    [data-sidebar-workspace-header]:has(>.sl-sidebar-queued){height:auto;min-height:var(--workspace-toolbar-height);flex-wrap:wrap;overflow:visible}
    .sl-sidebar-queued{flex:0 0 100%;min-width:0;padding:2px 4px 0;color:var(--dsw-alias-label-secondary);font-size:12px}
    .sl-sidebar-queued summary,.sl-sidebar-reservation{display:flex;align-items:center;gap:8px;min-height:26px;padding:3px 6px;border-radius:var(--dsw-radius-md,8px)}
    .sl-sidebar-queued summary{cursor:pointer}.sl-sidebar-queued summary::-webkit-details-marker{display:none}
    .sl-sidebar-queued summary:is(:hover,:focus-visible),.sl-sidebar-reservation:hover{background:var(--dsw-alias-interactive-bg-hover)}
    .sl-sidebar-queued summary span:last-child{margin-inline-start:auto;font-variant-numeric:tabular-nums}
    .sl-sidebar-reservation{justify-content:space-between;padding-inline-start:26px}.sl-sidebar-reservation>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sl-dialog-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.sl-dialog-session{overflow-wrap:anywhere}
    .sl-dialog-sessions{max-height:12rem;overflow:auto;padding-inline-start:20px;overflow-wrap:anywhere}
    .sl-filter-heading{padding:5px 8px;color:var(--dsw-alias-label-tertiary);font-size:11px;border-top:1px solid var(--dsw-alias-border-l1);margin-top:4px}
  `;
  function workspaceOptions(doc,nativeViewOptions){
    const header=doc.querySelector('[data-sidebar-workspace-header]');
    const label=nativeViewOptions();
    const trigger=[...(header?.querySelectorAll('button[aria-label]')??[])].find(button=>[label,'表示オプション','View options','视图选项'].includes(button.getAttribute('aria-label')));
    const anchor=trigger?.closest('[style*="anchor-name:"]')?.style.anchorName;
    const menu=anchor&&[...doc.querySelectorAll('[role="menu"][data-anchor-align]')].find(surface=>surface.style.positionAnchor===anchor);
    return {header,trigger,menu:menu?.querySelector(':scope > [role="presentation"]')??null};
  }
  function SidebarReservations({owner,sessions,nativeViewOptions,t=text}){
    const {value,target}=useSyncExternalStore(owner.subscribe,owner.snapshot,owner.snapshot);
    const list=useSyncExternalStore(fn=>sessions.list.subscribe(fn),()=>sessions.list.getSnapshot(),()=>sessions.list.getSnapshot());
    const [visible,setVisible]=useState(()=>{try{return window.localStorage.getItem('studio-sessions.sidebar-queued')!=='hidden';}catch{return true;}});
    const [seats,setSeats]=useState({});
    useEffect(()=>{
      const update=()=>{const next=workspaceOptions(document,nativeViewOptions);setSeats(old=>old.header===next.header&&old.trigger===next.trigger&&old.menu===next.menu?old:next);};
      const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});update();return()=>observer.disconnect();
    },[nativeViewOptions]);
    const queued=(value?.sessions??[]).filter(row=>row.pending&&/^[A-Za-z0-9_-]{1,220}$/.test(row.sessionId)&&list.byId?.[row.sessionId]);
    const hide=queued.map(({sessionId})=>`[data-slot="sidebar.workspaces"] [data-row-key="session:${sessionId}"]`).join(',');
    const changeVisibility=next=>{setVisible(next);try{window.localStorage.setItem('studio-sessions.sidebar-queued',next?'shown':'hidden');}catch{}};
    const filter=seats.menu?createPortal(h('div',null,h('div',{className:'sl-filter-heading'},t('queuedOnly')),
      ...[true,false].map(show=>h(MenuItemButton,{key:String(show),current:show===visible,onSelect:()=>{changeVisibility(show);seats.trigger?.click();}},t(show?'showQueued':'hideQueued')))),seats.menu):null;
    const category=seats.header&&queued.length&&visible?createPortal(h('div',{className:'sl-sidebar-queued'},
      h('details',null,h('summary',null,h(IconClockOutlineRegular,{size:15,'aria-hidden':true}),h('span',null,t('queuedOnly')),h('span',null,queued.length)),...queued.map(({sessionId})=>{
        const entry=list.byId[sessionId],displayTitle=entry.title??entry.projectionValues?.title??entry.displayTitle??sessionId;
        const pending=value.requests.find(r=>r.state==='pending'&&r.sessionIds.includes(sessionId));
        return h('div',{key:sessionId,className:'sl-sidebar-reservation'},h('span',{title:displayTitle},displayTitle),pending?h(Button,{type:'button',variant:'ghost',size:'sm',onClick:()=>owner.open({sessionId,displayTitle,requestId:pending.id,count:pending.sessionIds.length})},t('cancel')):null);
      }))),seats.header):null;
    return h('span',{style:{display:'contents'}},h('style',null,(hide?hide+'{display:none!important}':'')+sidebarCss+css),filter,category,target?h(ReservationDialog,{key:target.sessionId,owner,target,value,t}):null);
  }
  function Library({sessions,workspaces,workspaceController,renderSlot,t=text}){
    const list=useSyncExternalStore(fn=>sessions.list.subscribe(fn),()=>sessions.list.getSnapshot(),()=>sessions.list.getSnapshot()),groups=useSyncExternalStore(fn=>workspaces.list.subscribe(fn),()=>workspaces.list.getSnapshot(),()=>workspaces.list.getSnapshot());
    const [section,setSection]=useState('sessions'),desktop=isDesktop();
    const [library,setLibrary]=useState(null),[filters,setFilters]=useState({query:'',scope:'all',before:'',blank:false}),[selected,setSelected]=useState([]),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[uncertain,setUncertain]=useState(false),[intent,setIntent]=useState(()=>{try{return JSON.parse(window.sessionStorage.getItem(KEY)??'null');}catch{return null;}});
    const status=state=>t(state==='pending'?(library?.startup?(desktop?'desktopPending':'pending'):'desktopLegacyPending'):state);
    const lock=useRef(false),alive=useRef(true),read=useRef(null);const rows=rowsFor(list,groups,library,filters),selectedRows=rows.filter(r=>selected.includes(r.sessionId));
    const saveIntent=value=>{setIntent(value);try{value?window.sessionStorage.setItem(KEY,JSON.stringify(value)):window.sessionStorage.removeItem(KEY);}catch{}};
    async function refresh(){read.current?.abort();const abort=new AbortController();read.current=abort;try{const value=await request(null,AbortSignal.any([abort.signal,AbortSignal.timeout(20000)]));if(!alive.current||abort.signal.aborted)return;setLibrary(value);setError('');if(intent){const receipt=value.requests.find(r=>r.id===intent.requestId);if(receipt){saveIntent(null);setUncertain(false);setPreview(null);setSelected([]);}else setUncertain(true);}await sessions.refresh();}catch(e){if(alive.current&&!abort.signal.aborted)setError(e.message);}}
    useEffect(()=>{alive.current=true;void refresh();const update=()=>void refresh();window.addEventListener(changedEvent,update);return()=>{window.removeEventListener(changedEvent,update);alive.current=false;read.current?.abort();};},[]);
    const change=(key,value)=>{setFilters(old=>({...old,[key]:value}));setSelected([]);setPreview(null);setMessage('');};
    async function act(body){if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{const value=await request(body,AbortSignal.timeout(30000));if(!alive.current)return;if(body.action==='preview')setPreview({...value,titles:selectedRows.map(r=>({id:r.sessionId,title:r.title}))});else{saveIntent(null);setUncertain(false);setPreview(null);setSelected([]);const scheduled=library?.startup?(desktop?'desktopScheduledMessage':'scheduledMessage'):'desktopLegacyScheduledMessage';setMessage(t(body.action==='cancel'?'cancelledMessage':scheduled));window.dispatchEvent(new Event(changedEvent));}}catch(e){if(!alive.current)return;setError(e.message);if(body.action==='schedule'&&!e.definite)setUncertain(true);else if(body.action==='schedule')saveIntent(null);}finally{lock.current=false;if(alive.current)setBusy(false);}}
    const reserve=()=>{const body={action:'schedule',previewId:preview.previewId,requestId:window.crypto.randomUUID()};saveIntent(body);void act(body);};
    return h('section',{className:'studio-sessions','data-studio-sessions':true,'aria-label':'Session Library'},h('style',null,css+workspaceCss),h('header',{className:'sl-head'},h('h2',null,t('title')),h(Button,{type:'button',variant:'outline',size:'sm',disabled:busy,onClick:()=>void(section==='sessions'?refresh():workspaceController.refresh())},t('refresh'))),
      h('nav',{className:'sl-tabs','aria-label':'Session Library sections'},...['sessions','workspaces'].map(id=>h(Button,{key:id,type:'button',variant:section===id?'outline':'ghost',size:'sm','data-library-section':id,'aria-pressed':section===id,onClick:()=>setSection(id)},t(id)))),
      section==='workspaces'?h(WorkspacePanel,{controller:workspaceController,t,renderSlot}):null,
      h('div',{hidden:section!=='sessions','data-library-sessions':true},library?h('p',{className:'sl-muted'},t(library.startup?(desktop?'desktopNotice':'notice'):'desktopLegacyNotice')):null,h('p',{className:'sl-muted'},t('preserved')),
      h('div',{className:'sl-filters'},h('label',null,t('search'),h('input',{type:'search',value:filters.query,onChange:e=>change('query',e.target.value),'aria-label':t('search')})),h('label',null,t('scope'),h('select',{value:filters.scope,onChange:e=>change('scope',e.target.value),'aria-label':t('scope')},h('option',{value:'all'},t('all')),h('option',{value:'uncategorized'},t('uncategorized')),h('option',{value:'archived'},t('archived')),h('option',{value:'queued'},t('queuedOnly')),...groups.items.map(w=>h('option',{key:w.workspaceId,value:'workspace:'+w.workspaceId},w.title)))),h('label',null,t('before'),h('input',{type:'date',value:filters.before,onChange:e=>change('before',e.target.value)})),h('label',{className:'sl-check'},h('input',{type:'checkbox',checked:filters.blank,onChange:e=>change('blank',e.target.checked)}),t('blank')),filters.scope!=='queued'?h('label',{className:'sl-check'},h('input',{type:'checkbox',checked:filters.includeQueued!==false,onChange:e=>change('includeQueued',e.target.checked)}),t('includeQueued')):null),
      h('div',{className:'sl-toolbar'},h(Button,{type:'button',variant:'outline',size:'sm',disabled:busy||uncertain||!library,onClick:()=>{setSelected(rows.filter(r=>!reason(r)).map(r=>r.sessionId));setPreview(null);}},t('select')),h(Button,{type:'button',variant:'outline',size:'sm',disabled:busy,onClick:()=>{setSelected([]);setPreview(null);}},t('clear')),h('span',{className:'sl-muted'},`${selected.length} ${t('selected')}`),h(Button,{type:'button',variant:'outline',size:'sm',className:'sl-danger',disabled:busy||uncertain||!selectedRows.length,onClick:()=>void act({action:'preview',sessionIds:selectedRows.map(r=>r.sessionId)})},t('review'))),
      !library?h('p',{className:'sl-muted'},t('loading')):null,error?h('p',{className:'sl-notice',role:'alert'},error):null,message?h('p',{className:'sl-notice',role:'status'},message):null,
      uncertain?h('div',{className:'sl-notice',role:'status'},h('p',{className:'sl-muted'},'予約の受付が未確認です。再読込で確認し、自動再送はしません。'),intent?h(Button,{type:'button',variant:'outline',size:'sm',disabled:busy,onClick:()=>void act(intent)},t('retry')):null):null,
      preview?h(Modal,{open:true,title:`${t('preview')} (${preview.count})`,closeLabel:t('dismiss'),tone:'warning',
        description:t(library?.startup?'batchExplanation':'desktopLegacyNotice'),onClose:()=>{if(!busy)setPreview(null);},
        footer:h('div',{className:'sl-dialog-actions'},
          h(Button,{type:'button',variant:'outline','data-modal-autofocus':true,disabled:busy,onClick:()=>setPreview(null)},t('keepSession')),
          h(Button,{type:'button',variant:'outline',className:'sl-danger',disabled:busy||uncertain,onClick:reserve},t(busy?'working':'confirm')))},
        h('ul',{className:'sl-dialog-sessions'},...preview.titles.map(row=>h('li',{key:row.id},row.title))),
        h('p',{className:'sl-muted'},t('preserved')),error?h('p',{className:'sl-danger',role:'alert'},error):null):null,
      h('div',{className:'sl-list'},...rows.map(row=>h('label',{key:row.sessionId,className:'sl-row'},h('input',{type:'checkbox','aria-label':`Select ${row.sessionId}`,checked:selected.includes(row.sessionId),disabled:busy||uncertain||Boolean(reason(row)),onChange:e=>{setSelected(ids=>e.target.checked?[...ids,row.sessionId]:ids.filter(id=>id!==row.sessionId));setPreview(null);}}),h('span',{className:'sl-row-body'},h('strong',null,row.title),h('small',null,row.sessionId),h('small',null,`${t('date')} · ${new Date(row.updatedAt).toLocaleString()}`)),reason(row)?h('span',{className:'sl-badge'},t(reason(row))):null))),!rows.length?h('p',{className:'sl-muted'},t('empty')):null,
      library?.requests?.length?h('section',{className:'sl-receipt-list','aria-label':'Deletion reservations'},h('h3',null,t('reservation')),...library.requests.slice().reverse().map(r=>h('details',{key:r.id,className:'sl-receipt',open:r.state==='pending'},h('summary',null,`${status(r.state)} · ${r.count} · ${new Date(r.requestedAt).toLocaleString()}`),h('ul',{className:'sl-muted'},...r.results.map(s=>h('li',{key:s.sessionId},s.sessionId,s.error?h('span',null,' · '+s.error):null))),r.state==='pending'?h(Button,{type:'button',variant:'outline',size:'sm',disabled:busy||uncertain,onClick:()=>void act({action:'cancel',requestId:r.id})},t('cancel')):null))):null),
      typeof renderSlot==='function'?renderSlot('studio.sessions.sections',{activeSection:section}):null);
  }
  function apply(ctx){
    const workspaceController=createWorkspaceController(),owner=createSidebarReservations();
    ctx.effect(()=>()=>workspaceController.dispose());installWorkspacePresentation(ctx,workspaceController);
    ctx.effect(()=>ctx.locale.register('studio.sessions',{en,ja}));
    ctx.effect(()=>{if(typeof document==='undefined')return;window.addEventListener(changedEvent,owner.refresh);window.addEventListener('focus',owner.refresh);void owner.refresh();return()=>{window.removeEventListener(changedEvent,owner.refresh);window.removeEventListener('focus',owner.refresh);owner.dispose();};});
    const rowMenu='sidebar.workspaces.session.menu.item';
    ctx.slots.inject(rowMenu,()=>ctx.slots.register({name:rowMenu,id:'studio-session-queue-deletion',order:90,locale:'studio.sessions'},({sessionId,displayTitle,useMenuOpenState,t=text})=>{
      const [,close]=useMenuOpenState();
      const {value}=useSyncExternalStore(owner.subscribe,owner.snapshot,owner.snapshot);
      const pending=value?.requests?.find(r=>r.state==='pending'&&r.sessionIds.includes(sessionId));
      return h(MenuItemButton,{danger:!pending,onSelect:()=>{close(false);owner.open({sessionId,displayTitle,requestId:pending?.id,count:pending?.sessionIds.length});}},t(pending?'cancel':'confirm'));
    }));
    const nativeViewOptions=()=>ctx.locale.bind('workspace')('viewOptions.label');
    ctx.slots.inject('sidebar.footer.action',()=>ctx.slots.register({name:'sidebar.footer.action',id:'studio-session-reservation-panel',locale:'studio.sessions',inject:()=>({sessions:ctx.sessions,owner,nativeViewOptions})},SidebarReservations));
    ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'studio-sessions',order:35,label:()=>ctx.locale.bind('studio.sessions')('title'),locale:'studio.sessions',children:{'studio.sessions.workspace.fields':{kind:'list',scope:'root'},'studio.sessions.sections':{kind:'list',scope:'root'}},inject:()=>({sessions:ctx.sessions,workspaces:ctx.workspaces,workspaceController})},Library));
  }
  return {inject:['slots','locale','sessions','workspaces'],apply,Library,rowsFor,reason,request,en,ja,createWorkspaceController,workspaceStyleText,workspaceIconUrl,WorkspaceGlyph,WorkspacePanel,workspaceCatalog,installWorkspacePresentation};
}});
