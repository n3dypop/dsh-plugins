// Durable stop admission candidate. Provisioning is explicit; a partial setup,
// missing peer marker, inconsistent rows or unsupported schema is held for
// maintenance. This is not yet connected to the running host.
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {UUID,noLinks,readJson} from './restart-state.mjs';

const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const validPrepared=record=>record&&Object.keys(record).sort().join(',')==='epoch,owner,requestId,sessionCount,sessionProofs,snapshotHash,state'&&UUID.test(record.requestId??'')&&record.state==='prepared'&&record.epoch&&Object.keys(record.epoch).sort().join(',')==='executable,pid,startTimeUtcTicks,url'&&Number.isSafeInteger(record.epoch.pid)&&record.epoch.pid>0&&typeof record.epoch.executable==='string'&&typeof record.epoch.url==='string'&&typeof record.epoch.startTimeUtcTicks==='string'&&record.owner&&Object.keys(record.owner).sort().join(',')==='fenceInfoHash,holderPid,holderTicks,nonceHash'&&/^[a-f0-9]{64}$/.test(record.owner.fenceInfoHash??'')&&/^[a-f0-9]{64}$/.test(record.owner.nonceHash??'')&&Number.isSafeInteger(record.owner.holderPid)&&record.owner.holderPid>0&&typeof record.owner.holderTicks==='string'&&/^\d+$/.test(record.owner.holderTicks)&&Array.isArray(record.sessionProofs)&&record.sessionProofs.every(proof=>proof&&Object.keys(proof).sort().join(',')==='eventsHash,idHash,sequence'&&/^[a-f0-9]{64}$/.test(proof.eventsHash??'')&&/^[a-f0-9]{64}$/.test(proof.idHash??'')&&Number.isSafeInteger(proof.sequence)&&proof.sequence>=0)&&record.sessionProofs.every((proof,i)=>i===0||record.sessionProofs[i-1].idHash<proof.idHash)&&/^[a-f0-9]{64}$/.test(record.snapshotHash??'')&&digest(record.sessionProofs)===record.snapshotHash&&record.sessionCount===record.sessionProofs.length;
const schema=["CREATE TABLE meta (generation TEXT NOT NULL, state_hash TEXT NOT NULL)","CREATE TABLE operations (request_id TEXT PRIMARY KEY NOT NULL, state TEXT NOT NULL, prepared TEXT)"];
const stat=async path=>{try{return await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
export async function openMaintenanceLedger({root,provision=false,readOnly=false}){
 if(readOnly&&provision)throw Error('Read-only maintenance inspection cannot provision');
 root=resolve(root);const dir=join(root,'data/host-manager'),dbPath=join(dir,'maintenance-stop.sqlite'),markerPath=join(root,'data/maintenance-stop-provision.json'),readyPath=join(root,'data/maintenance-stop-ready.json');
 await noLinks(root,dbPath,{missing:true});await noLinks(root,markerPath,{missing:true});await noLinks(root,readyPath,{missing:true});
 let marker=await readJson(root,markerPath),ready=await readJson(root,readyPath),file=await stat(dbPath);
 if(!marker&&!ready&&!file&&provision){
  await mkdir(dir,{recursive:true});await noLinks(root,dbPath,{missing:true});const generation=randomUUID(),first={version:1,generation,state:'provisioning'};
  const markerFile=await open(markerPath,'wx',0o600);try{await markerFile.writeFile(JSON.stringify(first));await markerFile.sync();}finally{await markerFile.close();}
  const newFile=await open(dbPath,'wx',0o600);await newFile.close();const init=new DatabaseSync(dbPath);
  try{init.exec('BEGIN IMMEDIATE');for(const sql of schema)init.exec(sql);init.prepare('INSERT INTO meta VALUES (?,?)').run(generation,digest([]));init.exec('COMMIT');}finally{init.close();}
  const readyFile=await open(readyPath,'wx',0o600);try{await readyFile.writeFile(JSON.stringify({version:1,generation,state:'ready'}));await readyFile.sync();}finally{await readyFile.close();}marker=await readJson(root,markerPath);ready=await readJson(root,readyPath);file=await stat(dbPath);
 }
 if(!marker||marker.version!==1||marker.state!=='provisioning'||!UUID.test(marker.generation??'')||ready?.version!==1||ready.state!=='ready'||ready.generation!==marker.generation||!file?.isFile())throw Error('Maintenance ledger provisioning is incomplete or missing');
 const identity=async path=>{const item=await lstat(path);if(!item.isFile()||item.isSymbolicLink()||item.nlink!==1)throw Error('Maintenance ledger file is linked or unavailable');return {dev:item.dev,ino:item.ino};};
 const files=[dbPath,markerPath,readyPath],identities=await Promise.all(files.map(identity));
 const checkSidecars=async()=>{for(const suffix of ['-journal','-wal','-shm'])if(await stat(dbPath+suffix))throw Error('Maintenance ledger sidecar requires inspection');};
 await checkSidecars();const db=new DatabaseSync(dbPath,{readOnly});db.exec('PRAGMA busy_timeout=3000');let closed=false;
 const check=()=>{
  const objects=db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();if(objects.length!==2||objects.some(row=>row.type!=='table'||!schema.includes(row.sql)))throw Error('Maintenance ledger schema differs');
  const meta=db.prepare('SELECT generation,state_hash FROM meta').all();if(meta.length!==1||meta[0].generation!==marker.generation)throw Error('Maintenance ledger generation differs');
  const rows=db.prepare('SELECT request_id,state,prepared FROM operations ORDER BY request_id').all();if(rows.some(row=>!UUID.test(row.request_id)||!['admitted','prepared'].includes(row.state)||(row.state==='admitted'&&row.prepared!==null)||(row.state==='prepared'&&typeof row.prepared!=='string'))||digest(rows)!==meta[0].state_hash)throw Error('Maintenance ledger contents differ');return rows;
 };
 const markerCheck=async()=>{if(closed)throw Error('Maintenance ledger is closed');for(let i=0;i<files.length;i++){await noLinks(root,files[i]);const currentIdentity=await identity(files[i]);if(currentIdentity.dev!==identities[i].dev||currentIdentity.ino!==identities[i].ino)throw Error('Maintenance ledger file identity changed');}await checkSidecars();const current=await readJson(root,markerPath),currentReady=await readJson(root,readyPath);if(JSON.stringify(current)!==JSON.stringify(marker)||JSON.stringify(currentReady)!==JSON.stringify(ready))throw Error('Maintenance ledger marker differs');};
 const transaction=async (fn,{write=false}={})=>{if(write&&readOnly)throw Error('Maintenance ledger is read-only');await markerCheck();db.exec(write?'BEGIN IMMEDIATE':'BEGIN');try{const rows=check(),result=fn(rows);if(write){const after=db.prepare('SELECT request_id,state,prepared FROM operations ORDER BY request_id').all();db.prepare('UPDATE meta SET state_hash=?').run(digest(after));}db.exec('COMMIT');return result;}catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}};
 try{await transaction(()=>{});}catch(error){db.close();throw error;}
 return Object.freeze({
  async admit(id){if(!UUID.test(id??''))throw Error('Invalid operation id');return transaction(rows=>{if(rows.length)throw Error('Maintenance evidence already exists; inspect it before further operations');db.prepare("INSERT INTO operations VALUES (?,'admitted',NULL)").run(id);},{write:true});},
  async savePrepared(record){if(!validPrepared(record))throw Error('Invalid prepared evidence');return transaction(rows=>{if(rows.length!==1||rows[0].request_id!==record.requestId||rows[0].state!=='admitted')throw Error('Maintenance admission differs');db.prepare("UPDATE operations SET state='prepared',prepared=? WHERE request_id=?").run(JSON.stringify(record),record.requestId);},{write:true});},
  async readPrepared(id){return transaction(rows=>{const row=rows.find(item=>item.request_id===id);if(!row||row.state!=='prepared')throw Error('Prepared evidence unavailable');const record=JSON.parse(row.prepared);if(record.requestId!==id||!validPrepared(record))throw Error('Prepared evidence differs');return record;});},
  async status(id){return transaction(rows=>{const row=rows.find(item=>item.request_id===id);if(!row)throw Error('Maintenance operation not found');return {requestId:id,state:row.state==='prepared'?'prepared':'started',guidance:'受付または停止準備の証拠です。正常終了は別途確認してください。'};});},
  close(){if(!closed){closed=true;db.close();}}
 });
}
