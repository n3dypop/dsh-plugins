import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createBackendIdentityVerifier} from '../apps/dsh-plugins/studio-host/maintenance-backend-identity.mjs';
test('matching labels and version without the pinned active implementation cannot authorize maintenance',async t=>{
 const root=await mkdtemp(join(tmpdir(),'backend-candidate-'));t.after(()=>rm(root,{recursive:true,force:true}));await writeFile(join(root,'package.json'),'{}');for(const name of ['dsh-session-persistence-jsonl','dsh-agent-loop']){const dir=join(root,'node_modules/@deepseek-ai',name);await mkdir(dir,{recursive:true});await writeFile(join(dir,'package.json'),JSON.stringify({name,version:'0.2.2-rc.1',main:'index.js'}));await writeFile(join(dir,'index.js'),'module.exports={}');}
 class JsonlSessionPersistence{constructor(){this.name='session-persistence-jsonl';this.root=root;}list(){}open(){}flush(){}}
 class ReactLoopInbox{append(){}remove(){}splice(){}}
 class ReactLoopAgent{constructor(){this.inbox=new ReactLoopInbox();}runMaintenance(){}cancel(){}}
 const ctx={sessionPersistence:new JsonlSessionPersistence(),agents:{list:()=>[new ReactLoopAgent()]}};const verify=createBackendIdentityVerifier({ctx,runtimeDirectory:root,sessionRoot:root});assert.equal(await verify(),false);
});
