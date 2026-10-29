// Exercise the production worker bundle's message boundary without a browser UI.
import assert from 'node:assert/strict';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
const root=fileURLToPath(new URL('../',import.meta.url));
const gameId=process.argv.includes('--game')?process.argv[process.argv.indexOf('--game')+1]:'terraform';
assert.ok(['terraform','tidal','pulse','fortress','mirror'].includes(gameId),'Unsupported worker game');
const assets=await readdir(resolve(root,'dist/assets'));
const bundle=assets.find(name=>new RegExp('^'+gameId+'\\.worker-.*\\.js$').test(name));
assert.ok(bundle,'Build Rune before checking its worker');
const url=pathToFileURL(resolve(root,'dist/assets',bundle)).href;
const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:value=>parentPort.postMessage(value)};const ready=import(${JSON.stringify(url)});parentPort.on('message',async data=>{await ready;self.onmessage({data});});`,{eval:true});
const oracle=spawn('python',['-u','-c',`import json,sys,random\nrng=random.Random(912)\nfrom training.games import ${gameId} as game\nfor line in sys.stdin:\n data=json.loads(line)\n state=game.sampleMove(data['state'],data['action'],rng) if hasattr(game,'sampleMove') else game.applyMove(data['state'],data['action'])\n print(json.dumps({'state':state,'terminal':game.isTerminal(state),'legal_actions':[a for a,ok in enumerate(game.legalMoves(state)) if ok]}),flush=True)`],{cwd:resolve(root,'..'),stdio:['pipe','pipe','inherit']});
const oracleLines=createInterface({input:oracle.stdout})[Symbol.asyncIterator]();
async function advance(state,action){oracle.stdin.write(JSON.stringify({state,action})+'\n');let timer;try{const line=await Promise.race([oracleLines.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Rule oracle timed out')),5000);})]);assert.equal(line.done,false);return JSON.parse(line.value);}finally{clearTimeout(timer);}}
let id=0;
function request(data){return new Promise((resolve,reject)=>{
  const current=++id;
  const cleanup=()=>{clearTimeout(timer);worker.off('message',message);worker.off('error',error);};
  const message=result=>{cleanup();try{assert.equal(result.id,current);resolve(result);}catch(err){reject(err);}};
  const error=err=>{cleanup();reject(err);};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Worker response timed out'));},5000);
  worker.on('message',message);worker.once('error',error);worker.postMessage({...data,id:current});
});}
try{
  const fixtures=(await readFile(resolve(root,'../parity/'+gameId+'.jsonl'),'utf8')).trim().split('\n').slice(0,40).map(line=>JSON.parse(line));
  for(const fixture of fixtures){const result=await request({state:fixture.state,depth:2,maxMs:60});assert.equal(result.error,undefined);assert.ok(fixture.legal_actions.includes(result.action));}
  const invalid=await request({state:null,depth:1,maxMs:20});assert.ok(invalid.error);
  const valid=await request({state:fixtures[0].state,depth:2,maxMs:60});assert.equal(valid.error,undefined);assert.ok(fixtures[0].legal_actions.includes(valid.action));
  let position={state:fixtures[0].state,terminal:{done:false,winner:0},legal_actions:fixtures[0].legal_actions};
  while(!position.terminal.done){const result=await request({state:position.state,depth:2,maxMs:80});assert.equal(result.error,undefined);assert.ok(position.legal_actions.includes(result.action));position=await advance(position.state,result.action);assert.ok(position.state.turn<=(gameId==='pulse'?120:(gameId==='fortress'||gameId==='mirror')?100:80));}
  const report={game:gameId,passed:true,productionBundle:bundle,fixtureRequests:fixtures.length,requestIdsVerified:id,errorRecovery:true,completedGame:{turns:position.state.turn,winner:position.terminal.winner},scope:'Node worker_threads shim plus Python rule oracle for production worker messaging; not browser or visual QA'};
  if(process.argv.includes('--output'))await writeFile(resolve(process.argv[process.argv.indexOf('--output')+1]),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await worker.terminate();oracle.stdin.end();oracle.kill();}
