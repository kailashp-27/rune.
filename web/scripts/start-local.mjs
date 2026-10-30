// Start independently of this terminal; closing the launcher leaves Rune running.
import {spawn} from 'node:child_process';
import {mkdir,open,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url));
const logs=fileURLToPath(new URL('../../.rune-local/',import.meta.url));
const url='http://127.0.0.1:5173/';
async function running(){
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(2000)});
    const body=await response.text();
    if(response.ok&&body.includes('Rune')&&(body.includes('/src/main.tsx')||body.includes('/assets/app-')))return true;
    throw new Error('Port 5173 is already serving another app. Close that app before starting Rune.');
  }catch(error){
    if(error.message?.startsWith('Port 5173'))throw error;
    return false;
  }
}
async function main(){
  if(await running()){console.log(`Rune is already running: ${url}`);return;}
  // Prepare the same-origin runtime before starting the hidden server.
  await import('./prepare-ort.mjs');
  console.log('Preparing Rune. This may take a few seconds…');
  async function run(args){
    await new Promise((resolve,reject)=>{
      const build=spawn(process.execPath,args,{cwd:web,windowsHide:true,stdio:'inherit'});
      build.once('error',reject);
      build.once('exit',code=>code===0?resolve():reject(new Error('Rune could not build. Please check the messages above.')));
    });
  }
  await run([join(web,'node_modules/typescript/bin/tsc'),'-b']);
  await run([join(web,'node_modules/vite/bin/vite.js'),'build']);
  await mkdir(logs,{recursive:true});
  const out=await open(join(logs,'server.log'),'a'),err=await open(join(logs,'server-error.log'),'a');
  const child=spawn(process.execPath,[join(web,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','5173','--strictPort'],{cwd:web,detached:true,windowsHide:true,stdio:['ignore',out.fd,err.fd]});
  let startupError;
  child.on('error',error=>{startupError=error;});
  child.unref();await out.close();await err.close();
  for(let attempt=0;attempt<30;attempt++){
    if(startupError)throw startupError;
    if(child.exitCode!==null)throw new Error('Rune could not start. See .rune-local/server-error.log.');
    if(await running()){
      await writeFile(join(logs,'server.json'),JSON.stringify({pid:child.pid,url},null,2));
      console.log(`Rune is ready: ${url}`);
      console.log('You can close this window. Double-click Rune.cmd to start it again later.');
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error('Rune is taking too long to start. See .rune-local/server-error.log.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
