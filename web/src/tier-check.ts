import * as connect4 from './engine/connect4';
import * as terraform from './engine/terraform';
import * as tidal from './engine/tidal';
import * as pulse from './engine/pulse';
import * as fortress from './engine/fortress';
import * as mirror from './engine/mirror';
import {seededRandom,type Level} from './engine/difficulty';
import type {ModelEntry,GameId} from './engine/model-runtime';

const makeWorker={
  connect4:()=>new Worker(new URL('./workers/ai.worker.ts',import.meta.url),{type:'module'}),
  terraform:()=>new Worker(new URL('./workers/terraform.worker.ts',import.meta.url),{type:'module'}),
  tidal:()=>new Worker(new URL('./workers/tidal.worker.ts',import.meta.url),{type:'module'}),
  pulse:()=>new Worker(new URL('./workers/pulse.worker.ts',import.meta.url),{type:'module'}),
  fortress:()=>new Worker(new URL('./workers/fortress.worker.ts',import.meta.url),{type:'module'}),
  mirror:()=>new Worker(new URL('./workers/mirror.worker.ts',import.meta.url),{type:'module'}),
};
interface State{player:1|-1;turn:number}
interface Rules<S extends State>{initialState():S;legalMoves(s:S):boolean[];applyMove(s:S,a:number,outcome?:number):S;isTerminal(s:S):{done:boolean;winner:number};chanceOutcomes?(s:S):number[]}
interface Reply{id:number;error?:string;engine?:string;modelId?:string;action:number;validation?:unknown}
let nextId=0;
async function request(worker:Worker,data:object):Promise<Reply>{return new Promise((resolve,reject)=>{
  const id=++nextId,timer=setTimeout(()=>reject(new Error('Tier worker timed out')),60000);
  worker.onmessage=({data:reply}:{data:Reply})=>{if(reply.id!==id)return;clearTimeout(timer);reply.error?reject(new Error(reply.error)):resolve(reply);};
  worker.onerror=event=>{clearTimeout(timer);reject(new Error(event.message||'Tier worker failed'));};worker.postMessage({...data,id});
});}
const status=document.querySelector<HTMLElement>('#tier-status')!,output=document.querySelector<HTMLElement>('#tier-report')!,button=document.querySelector<HTMLButtonElement>('#tiers')!;
const results:unknown[]=[];
async function run<S extends State>(id:GameId,rules:Rules<S>,entries:Record<Level,ModelEntry>){
  const workers={Easy:makeWorker[id](),Medium:makeWorker[id](),Hard:makeWorker[id]()};
  const parity:Record<string,unknown>={},duels=[];
  try{
    for(const tier of ['Easy','Medium','Hard'] as Level[]){status.textContent=`${id}: checking ${tier} on 50 states…`;parity[tier]=(await request(workers[tier],{type:'validate',model:entries[tier]})).validation;}
    for(const [strong,weak] of [['Hard','Easy'],['Medium','Easy'],['Hard','Medium']] as [Level,Level][]){
      let wins=0,losses=0,draws=0;const games=12;
      for(let index=0;index<games;index++){
        status.textContent=`${id}: ${strong} vs ${weak}, game ${index+1}/${games}`;
        const rng=seededRandom(3911+index-index%2),seat=index%2===0?1:-1;
        let state=rules.initialState();
        const advance=(s:S,a:number)=>{const outcomes=rules.chanceOutcomes?.(s);return rules.applyMove(s,a,outcomes?outcomes[Math.floor(rng()*outcomes.length)]:undefined);};
        for(let opening=0;opening<2&&!rules.isTerminal(state).done;opening++){const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);state=advance(state,legal[Math.floor(rng()*legal.length)]);}
        while(!rules.isTerminal(state).done){
          const tier=state.player===seat?strong:weak,entry=entries[tier];
          const reply=await request(workers[tier],{state,difficulty:tier,diagnosticModel:entry,applyDifficulty:true,simulations:entry.simulations,maxMs:10000,seed:1091+index-index%2+state.turn*127});
          if(reply.engine!=='neural'||reply.modelId!==entry.id||!rules.legalMoves(state)[reply.action])throw new Error(`${id} ${tier}: trained model did not return a legal move`);
          state=advance(state,reply.action);
          if(state.turn>120)throw new Error('Move cap exceeded');
        }
        const winner=rules.isTerminal(state).winner;
        if(!winner)draws++;else if(winner===seat)wins++;else losses++;
      }
      duels.push({strong,weak,games,wins,losses,draws,score:(wins+draws*.5)/games});
      output.textContent=JSON.stringify({completed:results,current:{game:id,parity,duels}},null,2);
    }
    const ordered=duels.every(duel=>duel.score>.5);
    results.push({game:id,models:entries,parity,duels,ordered});output.textContent=JSON.stringify({games:results},null,2);
  }finally{Object.values(workers).forEach(worker=>worker.terminate());}
}
button.onclick=async()=>{
  button.disabled=true;results.length=0;
  try{
    const response=await fetch('/models/difficulty-candidates.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Stage difficulty candidates first');
    const candidates=await response.json() as {games:Record<GameId,Record<Level,ModelEntry>>};
    const selected=document.querySelector<HTMLSelectElement>('#tier-game')!.value;
    if(selected==='all'||selected==='connect4')await run('connect4',connect4,candidates.games.connect4);
    if(selected==='all'||selected==='terraform')await run('terraform',terraform,candidates.games.terraform);
    if(selected==='all'||selected==='tidal')await run('tidal',{...tidal,applyMove:(s,a,w)=>tidal.applyMove(s,a,w!)},candidates.games.tidal);
    if(selected==='all'||selected==='pulse')await run('pulse',pulse,candidates.games.pulse);
    if(selected==='all'||selected==='fortress')await run('fortress',fortress,candidates.games.fortress);
    if(selected==='all'||selected==='mirror')await run('mirror',mirror,candidates.games.mirror);
    status.textContent='Difficulty checks complete.';
  }catch(error){status.textContent='Difficulty checks failed.';output.textContent=String(error)+'\n'+output.textContent;}
  finally{button.disabled=false;}
};
