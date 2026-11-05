// Detached worker belonging to the host-control package; no media runtime path.
import {runRestartWorker} from './restart-worker.mjs';
const arg=name=>{const index=process.argv.indexOf(name);if(index<0||!process.argv[index+1])throw Error(name+' is required');return process.argv[index+1];};
try{const result=await runRestartWorker({root:arg('--root'),requestId:arg('--request')});if(result.state==='unknown')process.exitCode=1;}catch{process.exitCode=1;}
