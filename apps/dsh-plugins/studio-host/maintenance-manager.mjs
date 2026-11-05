// Assembly boundary for a trusted installation policy. No route is registered
// unless the policy supplies these dependencies and the pre-provisioned ledger
// and DSH build are verified; client requests cannot select any dependency.
import {createBackendIdentityVerifier} from './maintenance-backend-identity.mjs';
import {createJsonlSessionReader} from './maintenance-jsonl.mjs';
import {openMaintenanceLedger} from './maintenance-ledger.mjs';
import {createMaintenanceStop} from './maintenance-stop.mjs';

export async function createMaintenanceManager({ctx,root,port,adapter,policy}){
 if(!policy||typeof policy.runtimeDirectory!=='string'||typeof policy.sessionRoot!=='string'||!policy.owner||typeof policy.owner.verify!=='function')throw TypeError('Trusted maintenance policy is unavailable');
 const verifyBackend=createBackendIdentityVerifier({ctx,runtimeDirectory:policy.runtimeDirectory,sessionRoot:policy.sessionRoot});
 const readSessions=createJsonlSessionReader({ctx,runtimeDirectory:policy.runtimeDirectory,port,verifyBackend});
 const ledger=await openMaintenanceLedger({root});
 try{const stop=createMaintenanceStop({adapter,owner:policy.owner,ledger,readSessions});return Object.freeze({prepare:stop.prepare,status:id=>ledger.status(id),dispose:()=>ledger.close()});}catch(error){ledger.close();throw error;}
}
