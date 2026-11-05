import {open,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {UUID,TERMINAL,FORCE_GRACE_MS,restartMode,paths,fault,noLinks,atomicJson,readJson,readJournal,deletionSnapshot,releaseLock,publicOperation} from './restart-state.mjs';

export async function createRestartManager({root,adapter,clock=()=>Date.now(),id=randomUUID,wait=delay,writeJournal=atomicJson}={}){
  root=resolve(root);const previews=new Map(),pending=new Set(),disposal=new AbortController();let admitted=false,disposed=false,active=null,disposalWork=null,preparationUnknown=false;
  const now=()=>new Date(clock()).toISOString();
  const disposedError=()=>fault('プラグインが無効化されたため、DSHの再起動を取り消しました。');
  const checkOpen=()=>{if(disposed)throw disposedError();};
  const track=operation=>{const promise=operation();pending.add(promise);promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;};
  async function interruptible(run){
    checkOpen();let stop;
    const promise=Promise.resolve().then(()=>{checkOpen();return run();});
    try{return await Promise.race([promise,new Promise((_,reject)=>{stop=()=>reject(disposedError());disposal.signal.addEventListener('abort',stop,{once:true});if(disposal.signal.aborted)stop();})]);}
    finally{if(stop)disposal.signal.removeEventListener('abort',stop);}
  }
  async function persist(journal){await writeJournal(root,paths(root).journal,journal);}
  async function flush(mode){if(mode!=='force')return interruptible(()=>adapter.flush());let timer;try{return await interruptible(()=>Promise.race([adapter.flush(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fault('会話履歴の保存を期限内に確認できません。DSHは終了せず、再起動を保留します。')),8000);})]));}finally{clearTimeout(timer);}}
  async function snapshot(requestId){const journal=await readJournal(root);return {operation:publicOperation(requestId?journal.operations.find(o=>o.requestId===requestId):journal.operations.at(-1)),deletions:await deletionSnapshot(root),local:adapter.localState()};}
  async function preview(context,{mode:requested}={}){const mode=restartMode(requested);if(disposed||admitted)throw fault('DSHの再起動処理中です。');const journal=await readJournal(root);if(journal.operations.some(o=>!TERMINAL.has(o.state)||o.state==='unknown'))throw fault('前回の再起動結果が未確認です。保存済みの受付を確認してください。');const observation=await interruptible(()=>adapter.verify(context,{mode})),deletions=await deletionSnapshot(root);checkOpen();if(mode==='force'&&(!observation.revision||!observation.affected))throw fault('強制再起動の影響範囲を確認できません。');const previewId=id();for(const [key,value]of previews)if(value.expiresAt<clock())previews.delete(key);previews.set(previewId,{mode,epoch:observation.epoch,revision:observation.revision,affected:observation.affected,deletions,expiresAt:clock()+120000});return {mode,previewId,expiresAt:clock()+120000,deletions,local:observation.local,...(mode==='force'?{affected:observation.affected,revision:observation.revision}:{})};}
  async function restart(input,context){
    checkOpen();
    if(!UUID.test(input.requestId??'')||!UUID.test(input.previewId??''))throw fault('再起動の操作IDが不正です。',400);
    const mode=restartMode(input.mode);let journal=await readJournal(root);const existing=journal.operations.find(o=>o.requestId===input.requestId);if(existing){if(existing.previewId!==input.previewId||(existing.mode??'normal')!==mode)throw fault('同じ操作IDの内容は変更できません。');return {operation:publicOperation(existing),created:false};}
    if(disposed||admitted)throw fault('DSHの再起動処理中です。');const check=previews.get(input.previewId);if(!check||check.expiresAt<clock())throw fault('確認期限が切れました。再起動の対象をもう一度確認してください。');
    if(check.mode!==mode)throw fault('確認した再起動方式が異なります。対象をもう一度確認してください。');
    admitted=true;let file,freeze,operation,ownsLock=false,workerStarted=false;
    try{
      const lockPath=paths(root).lock;await noLinks(root,lockPath,{missing:true});await mkdir(join(root,'runtime'),{recursive:true});
      try{file=await open(lockPath,'wx',0o600);}catch{throw fault('別のサービス操作が実行中または結果不明です。完了を確認してから再起動してください。');}
      ownsLock=true;
      await file.writeFile(JSON.stringify({kind:'dsh-restart',requestId:input.requestId,ownerPid:adapter.pid}));await file.sync();
      checkOpen();
      journal=await readJournal(root);if(journal.operations.some(o=>!TERMINAL.has(o.state)||o.state==='unknown'))throw fault('前回の再起動結果が未確認です。');
      const observed=await interruptible(()=>adapter.verify(context,{mode})),deletions=await deletionSnapshot(root);checkOpen();if(JSON.stringify(observed.epoch)!==JSON.stringify(check.epoch)||deletions.revision!==check.deletions.revision||mode==='force'&&observed.revision!==check.revision)throw fault('DSH、未処理入力または削除予約が確認後に変わりました。再確認してください。');
      freeze=adapter.freeze({mode});
      operation={requestId:input.requestId,previewId:input.previewId,mode,state:'prepared',createdAt:now(),updatedAt:now(),detail:'再起動を準備しています。',deletionCount:deletions.count,deletionRevision:deletions.revision,epoch:observed.epoch,workerNonce:id(),...adapter.workerConfiguration?.(),...(mode==='force'?{affected:check.affected,impactRevision:check.revision,forceGraceMs:FORCE_GRACE_MS}:{})};
      if(mode==='force'){
        // The receipt precedes the confirmed, irreversible inbox cancellation.
        journal.operations.push(operation);await persist(journal);checkOpen();
        await adapter.cancelConfirmed(check.revision,freeze,()=>{operation.cancellationStarted=true;});operation.cancelledConfirmed=true;
        checkOpen();await flush(mode);await interruptible(()=>adapter.verify(context,{mode,quiescent:true}));checkOpen();operation.resourcesQuiescent=true;operation.flushConfirmed=true;
      }else{await flush(mode);await interruptible(()=>adapter.verify(context,{mode}));checkOpen();journal.operations.push(operation);}
      if(freeze.changed())throw fault('新しい入力を受け付けたため、再起動を中止しました。確認後の入力は保持しています。');await persist(journal);
      checkOpen();const worker=await adapter.spawnWorker(operation);workerStarted=true;operation.workerPid=worker.pid;operation.updatedAt=now();await persist(journal);checkOpen();
      const deadline=clock()+8000;let ready;
      while(clock()<deadline){checkOpen();ready=await readJson(root,paths(root).ready(input.requestId));checkOpen();if(ready)break;if(freeze.changed())throw fault('新しい入力を受け付けたため、再起動を中止しました。入力は保持しています。');await wait(100);}
      if(!ready||ready.requestId!==operation.requestId||ready.nonce!==operation.workerNonce||ready.pid!==operation.workerPid)throw Object.assign(Error('再起動補助プロセスの準備を確認できません。自動再実行しません。'),{uncertain:true});
      await flush(mode);if((await deletionSnapshot(root)).revision!==operation.deletionRevision||freeze.changed())throw fault('新しい入力または削除予約の変更があったため、再起動を中止しました。');
      operation.state='exiting';operation.detail='DSHの終了と再接続を待っています。';operation.updatedAt=now();await persist(journal);
      checkOpen();active={operation,freeze,context,exitDispatched:false,cancelling:null};await file.close();file=null;previews.delete(input.previewId);
      return {operation:publicOperation(operation),created:true};
    }catch(e){
      let uncertain=e.uncertain===true;
      if(operation){operation.state=uncertain?'unknown':'cancelled';operation.detail=(e.status?e.message:'再起動の準備を完了できませんでした。保存済みの受付を確認してください。')+(operation.cancelledConfirmed?' 確認済みの未処理入力の取消と会話の中断は実施済みです。':operation.cancellationStarted?' 確認済み入力の取消または会話の中断は開始済みです。実施範囲は会話履歴で確認してください。':'');operation.updatedAt=now();if(!journal.operations.some(o=>o.requestId===operation.requestId))journal.operations.push(operation);try{await persist(journal);}catch{uncertain||=workerStarted;}}
      // An already spawned worker must observe a definite cancellation before
      // the guards can reopen. A failed receipt write retains the exact lease.
      if(uncertain)preparationUnknown=true;
      try{if(!uncertain)freeze?.release();}finally{await file?.close();admitted=false;}
      if(ownsLock&&!uncertain)await releaseLock(root,input.requestId);
      if(uncertain)e.uncertain=true;throw e;
    }
  }
  async function cancelActive(entry,error){
    if(entry.exitDispatched)return {state:'exiting'};
    if(entry.cancelling)return entry.cancelling;
    entry.cancelling=(async()=>{
      const journal=await readJournal(root),saved=journal.operations.find(o=>o.requestId===entry.operation.requestId);
      if(!saved||saved.previewId!==entry.operation.previewId||saved.workerNonce!==entry.operation.workerNonce||saved.workerPid!==entry.operation.workerPid||!['prepared','exiting','cancelled'].includes(saved.state))throw Error('Restart cancellation ownership or result is unknown');
      saved.state='cancelled';saved.detail=error.message;saved.updatedAt=now();saved.cancelledBeforeExitDispatch=true;
      if(saved.cancelledConfirmed)saved.detail+=' 確認済みの入力の取消と会話の中断は実施済みです。';
      // The worker must see cancellation durably before admissions reopen.
      await persist(journal);entry.freeze.release();await releaseLock(root,saved.requestId);
      if(active===entry)active=null;admitted=false;return {state:'cancelled'};
    })();
    return entry.cancelling;
  }
  async function commitExit(requestId){
    if(!active||active.operation.requestId!==requestId||disposed)return;
    const entry=active,{operation,freeze,context}=entry;
    const mode=operation.mode??'normal';
    try{await interruptible(()=>adapter.verify(context,{mode,quiescent:mode==='force'}));await flush(mode);const queue=await deletionSnapshot(root);checkOpen();if(queue.revision!==operation.deletionRevision||freeze.changed()||mode!=='force'&&adapter.localState().running||adapter.localState().queued)throw fault('新しい入力を受け付けたため、再起動を中止しました。入力は保持しています。');
      if(mode==='force'){operation.exitArmedAt=now();operation.updatedAt=now();const journal=await readJournal(root),saved=journal.operations.find(o=>o.requestId===requestId);Object.assign(saved,operation);await persist(journal);if(freeze.changed()||adapter.localState().queued)throw fault('新しい入力を受け付けたため、再起動を中止しました。');}
      // No await between this final admission check and the native exit request.
      checkOpen();entry.exitDispatched=true;try{adapter.exit();}catch(error){entry.exitDispatched=false;throw error;}
    }catch(e){await cancelActive(entry,e);}
  }
  function dispose(){
    if(disposalWork)return disposalWork;
    disposed=true;previews.clear();disposal.abort();
    disposalWork=(async()=>{await Promise.allSettled([...pending]);if(active&&!active.exitDispatched)return cancelActive(active,disposedError());return {state:preparationUnknown?'unknown':active?'exiting':'disposed'};})().catch(()=>({state:'unknown'}));
    // Cordis may not await a disposer. Keep the cleanup owned and rejection-free.
    return disposalWork;
  }
  return {snapshot,preview,restart:(...args)=>track(()=>restart(...args)),commitExit:(...args)=>track(()=>commitExit(...args).catch(()=>({state:'unknown'}))),dispose};
}
