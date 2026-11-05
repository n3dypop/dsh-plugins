// Explicit first-time maintenance ledger provision; never clears an existing
// or partially provisioned ledger. This script does not enable a route.
import {realpath} from 'node:fs/promises';
import {resolve,isAbsolute,win32} from 'node:path';
import {openMaintenanceLedger} from '../apps/dsh-plugins/studio-host/maintenance-ledger.mjs';

try{
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--runtime-root'||!isAbsolute(args[1]))throw Error('Usage: node provision-maintenance-ledger.mjs --runtime-root <absolute-path>');
 const root=resolve(args[1]);if(win32.normalize(await realpath(root)).toLowerCase()!==win32.normalize(root).toLowerCase())throw Error('Runtime root is redirected');
 const ledger=await openMaintenanceLedger({root,provision:true});ledger.close();process.stdout.write('Maintenance ledger provisioned or already intact. The route remains disabled until trusted policy is configured.\n');
}catch(error){process.stderr.write('Maintenance ledger held: '+String(error.message)+'\n');process.exitCode=1;}
