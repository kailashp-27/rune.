import type { ModelEntry, GameId } from './engine/model-runtime';
const button=document.querySelector<HTMLButtonElement>('#run')!;
const select=document.querySelector<HTMLSelectElement>('#game')!;
const status=document.querySelector<HTMLElement>('#status')!;
const report=document.querySelector<HTMLElement>('#report')!;
const workers={
  connect4:()=>new Worker(new URL('./workers/ai.worker.ts',import.meta.url),{type:'module'}),
  terraform:()=>new Worker(new URL('./workers/terraform.worker.ts',import.meta.url),{type:'module'}),
  tidal:()=>new Worker(new URL('./workers/tidal.worker.ts',import.meta.url),{type:'module'}),
  pulse:()=>new Worker(new URL('./workers/pulse.worker.ts',import.meta.url),{type:'module'}),
  fortress:()=>new Worker(new URL('./workers/fortress.worker.ts',import.meta.url),{type:'module'}),
  mirror:()=>new Worker(new URL('./workers/mirror.worker.ts',import.meta.url),{type:'module'}),
};
interface Reply {id:number;error?:string;validation?:object;engine?:string;action:number;simulations?:number;fallbackReason?:string}
button.onclick=async()=>{
  button.disabled=true;select.disabled=true;
  const game=select.value as GameId,worker=workers[game]();let id=0;
  const request=(data:object):Promise<Reply>=>new Promise((resolve,reject)=>{
    const requestId=++id,timeout=setTimeout(()=>reject(new Error('Engine check timed out')),60000);
    worker.onmessage=({data:result}:{data:Reply})=>{if(result.id===requestId){clearTimeout(timeout);result.error?reject(new Error(result.error)):resolve(result);}};
    worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Worker failed'));};worker.postMessage({...data,id:requestId});
  });
  try{
    status.textContent='Loading checkpoint and checking 50 states…';
    const [response,fixturesResponse]=await Promise.all([fetch('/models/'+(game==='connect4'?'validation':game+'-validation')+'.json',{cache:'no-cache'}),fetch('/engine-fixtures.json')]);
    if(!response.ok||!fixturesResponse.ok)throw new Error('Export a checkpoint and prepare browser fixtures first');
    const model=await response.json() as ModelEntry;
    const fixtures=await fixturesResponse.json() as Record<GameId,{state:object;winning_actions:number[];rulesVersion:string}>;
    const parity=(await request({type:'validate',model})).validation;
    status.textContent='Checking neural search and fallback…';
    const fixture=fixtures[game];
    const neural=await request({state:fixture.state,simulations:240,maxMs:8000,diagnosticModel:model});
    if(neural.engine!=='neural'||!fixture.winning_actions.includes(neural.action))throw new Error('Neural search did not take an immediate win');
    const fallback=await request({state:fixture.state,simulations:20,depth:2,maxMs:450,diagnosticModel:{...model,id:game+'-missing-model',url:'/models/does-not-exist.onnx'}});
    if(!['rollout','heuristic'].includes(fallback.engine??'')||!fixture.winning_actions.includes(fallback.action)||!fallback.fallbackReason)throw new Error('Model failure did not fall back safely');
    report.textContent=JSON.stringify({...parity,game,rulesVersion:fixture.rulesVersion,checkedAt:new Date().toISOString(),neuralSearch:{passed:true,action:neural.action,simulations:neural.simulations},fallback:{passed:true,engine:fallback.engine},runtime:'onnxruntime-web/wasm, single thread'},null,2);
    status.textContent='All engine checks passed.';
  }catch(error){status.textContent='Engine checks failed.';report.textContent=String(error);}
  finally{button.disabled=false;select.disabled=false;worker.terminate();}
};
