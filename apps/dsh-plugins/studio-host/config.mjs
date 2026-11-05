import {isAbsolute,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const fail=message=>{throw new TypeError('DSH host configuration: '+message);};
const text=value=>typeof value==='string'&&value.length>0&&!/[\u0000-\u001f]/.test(value);
export function hostConfiguration(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('an explicit configuration object is required');
  const allowed=new Set(['runtimeRoot','nodeExecutable','port','launcher','workerPath','policyModule','requirePolicy']);
  if(Object.keys(input).some(key=>!allowed.has(key)))fail('unknown field');
  const absolute=(value,label)=>{if(!text(value)||!isAbsolute(value))fail(label+' must be an absolute local path');return resolve(value);};
  const runtimeRoot=absolute(input.runtimeRoot,'runtimeRoot'),nodeExecutable=absolute(input.nodeExecutable??process.execPath,'nodeExecutable');
  const port=input.port??3080;if(!Number.isInteger(port)||port<1024||port>65535)fail('port must be 1024..65535');
  const launcher=input.launcher;
  if(!launcher||typeof launcher!=='object'||Array.isArray(launcher)||Object.keys(launcher).some(key=>!['executable','args','cwd','env'].includes(key))||!text(launcher.executable)||!Array.isArray(launcher.args)||launcher.args.some(value=>typeof value!=='string'||/[\u0000-\u001f]/.test(value)))fail('launcher requires executable, args and an absolute cwd');
  if(launcher.env!==undefined&&(!launcher.env||typeof launcher.env!=='object'||Array.isArray(launcher.env)||Object.entries(launcher.env).some(([key,value])=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)||typeof value!=='string'||/[\u0000-\u001f]/.test(value))))fail('launcher.env must contain plain environment strings');
  const launch={executable:launcher.executable,args:[...launcher.args],cwd:absolute(launcher.cwd,'launcher.cwd'),...(launcher.env?{env:{...launcher.env}}:{})};
  const workerPath=absolute(input.workerPath??fileURLToPath(new URL('./restart-cli.mjs',import.meta.url)),'workerPath');
  const requirePolicy=input.requirePolicy??false;if(typeof requirePolicy!=='boolean')fail('requirePolicy must be boolean');
  const policyModule=input.policyModule==null?null:absolute(input.policyModule,'policyModule');
  if(requirePolicy&&!policyModule)fail('this deployment requires policyModule');
  return {runtimeRoot,nodeExecutable,port,launcher:launch,workerPath,requirePolicy,policyModule};
}

// Standard Schema V1 keeps validation independent of a second Cordis instance.
export const Config={ '~standard':{version:1,vendor:'n3dypop/dsh-plugins',validate(value){try{return {value:hostConfiguration(value)};}catch(error){return {issues:[{message:error.message}]};}}} };
