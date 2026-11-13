// Maintenance stop coordinator. It is intentionally not registered as an HTTP
// route until the installation supplies the authenticated owner, persistence,
// and complete JSONL enumeration implementations. These dependencies are
// trusted product code, never values supplied by a request.
import {createHash} from 'node:crypto';
import {UUID} from './restart-state.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digestString=value=>createHash('sha256').update(value,'utf8').digest('hex');
const hex=/^[a-f0-9]{64}$/;
const validOwner=value=>value&&Object.keys(value).sort().join(',')==='fenceInfoHash,holderPid,holderTicks,nonceHash'&&hex.test(value.fenceInfoHash??'')&&hex.test(value.nonceHash??'')&&Number.isSafeInteger(value.holderPid)&&value.holderPid>0&&typeof value.holderTicks==='string'&&/^\d+$/.test(value.holderTicks);
function sessionSnapshot(value){
  if(!value||value.complete!==true||value.running!==0||value.queued!==0||!Array.isArray(value.sessions))throw Error('Session catalog or quiescence is unconfirmed');
  const ids=new Set(), proofs=[];
  for(const row of value.sessions){
    if(!row||Object.keys(row).sort().join(',')!=='id,persistedHash,sequence'||typeof row.id!=='string'||!row.id||ids.has(row.id)||!Number.isSafeInteger(row.sequence)||row.sequence<0||!hex.test(row.persistedHash??''))throw Error('Invalid session snapshot');
    ids.add(row.id);proofs.push({idHash:digestString(row.id),sequence:row.sequence,eventsHash:row.persistedHash});
  }
  proofs.sort((a,b)=>a.idHash.localeCompare(b.idHash));
  if(new Set(proofs.map(p=>p.idHash)).size!==proofs.length)throw Error('Ambiguous session snapshot');
  return {sessionCount:proofs.length,sessionProofs:proofs,snapshotHash:hash(proofs)};
}
function validEpoch(e){return e&&Number.isSafeInteger(e.pid)&&e.pid>0&&typeof e.startTimeUtcTicks==='string'&&/^\d+$/.test(e.startTimeUtcTicks)&&typeof e.executable==='string'&&e.executable.length>0&&typeof e.url==='string'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(e.url);}
function equalEpoch(a,b){return validEpoch(a)&&validEpoch(b)&&a.pid===b.pid&&a.startTimeUtcTicks===b.startTimeUtcTicks&&a.executable===b.executable&&a.url===b.url;}

export function createMaintenanceStop({adapter,owner,ledger,readSessions,requireSynchronousOwner=false}){
  if(!adapter||['verify','freeze','flush','exit'].some(k=>typeof adapter[k]!=='function')||!owner||typeof owner.verify!=='function'||!ledger||['admit','savePrepared','readPrepared'].some(k=>typeof ledger[k]!=='function')||typeof readSessions!=='function')throw TypeError('Maintenance stop dependencies are incomplete');
  if(typeof requireSynchronousOwner!=='boolean'||requireSynchronousOwner&&typeof owner.verifySync!=='function')throw TypeError('Synchronous owner verification is unavailable');
  let active=false;
  return Object.freeze({async prepare(requestId,context){
    if(!UUID.test(requestId??'')||!context||typeof context.cookie!=='string'||!context.cookie)throw Error('Invalid maintenance request');
    if(active)throw Error('A maintenance operation is already active');
    active=true;let freeze,exitAttempted=false;
    try{
      // admit must be durable, exclusive and retain unknown admissions. Owner
      // verification must pin the same Host and both maintenance locks.
      const ownership=await owner.verify();if(!validOwner(ownership))throw Error('Maintenance owner is unconfirmed');
      await ledger.admit(requestId);
      const first=await adapter.verify(context,{mode:'normal'});if(!validEpoch(first?.epoch))throw Error('Host epoch is unconfirmed');
      freeze=adapter.freeze({mode:'normal'});await adapter.flush();
      const second=await adapter.verify(context,{mode:'normal'}),saved=sessionSnapshot(await readSessions(context));
      if(!equalEpoch(first.epoch,second?.epoch)||freeze.changed())throw Error('Host or inputs changed while preparing');
      const record={requestId,state:'prepared',epoch:second.epoch,owner:ownership,...saved};let settled=false;
      return Object.freeze({async requestExit(){
        if(settled)throw Error('Maintenance operation already resolved');settled=true;
        try{
          await adapter.flush();let current=await adapter.verify(context,{mode:'normal'}),sessions=sessionSnapshot(await readSessions(context));
          if(!equalEpoch(record.epoch,current?.epoch)||hash(sessions)!==hash(saved)||freeze.changed())throw Error('Host or inputs changed before stop');
          await ledger.savePrepared(record);
          if(hash(await ledger.readPrepared(requestId))!==hash(record))throw Error('Durable stop intent differs');
          await adapter.flush();current=await adapter.verify(context,{mode:'normal'});sessions=sessionSnapshot(await readSessions(context));
          if(!equalEpoch(record.epoch,current?.epoch)||hash(sessions)!==hash(saved)||freeze.changed())throw Error('Host or inputs changed after stop intent');
          if(hash(await owner.verify())!==hash(ownership)||freeze.changed())throw Error('Maintenance owner or inputs changed before stop');
          // verify includes the configured external-resource policy. Run it
          // after the last owner await, then synchronously check the freeze and
          // request exit. Non-cooperating external processes can still start
          // work after this observation; recheck before stopping Controller.
          current=await adapter.verify(context,{mode:'normal'});
          if(!equalEpoch(record.epoch,current?.epoch)||freeze.changed())throw Error('Host or inputs changed after stop intent');
          // Bootstrap can require an independently implemented synchronous
          // owner check; an absent, asynchronous, or uncertain result refuses.
          if(requireSynchronousOwner&&(owner.verifySync(ownership)!==true||freeze.changed()))throw Error('Maintenance owner or inputs changed before stop');
          // A request is not proof that the process subsequently exited cleanly.
          exitAttempted=true;adapter.exit();return {requestId,state:'exit-requested'};
        }finally{if(!exitAttempted){freeze.release();active=false;}}
      },release(){if(!settled){settled=true;freeze.release();active=false;}}});
    }catch(error){if(freeze&&!exitAttempted)freeze.release();active=false;throw error;}
  }});
}
