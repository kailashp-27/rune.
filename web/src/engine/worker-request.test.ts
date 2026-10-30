import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestMove,type WorkerPort} from './worker-request';

function fakeWorker(){
  const calls:{messages:unknown[];terminations:number}={messages:[],terminations:0};
  const worker:WorkerPort={onmessage:null,onerror:null,onmessageerror:null,postMessage(message:unknown){calls.messages.push(message);},terminate(){calls.terminations++;}};
  const reply=(data:unknown)=>worker.onmessage?.call(worker as Worker,{data} as MessageEvent);
  const crash=()=>worker.onerror?.call(worker as Worker,{message:'Worker module could not load'} as ErrorEvent);
  return{worker,calls,reply,crash};
}
test('worker load failure can retry the identical turn with a fresh worker',async()=>{
  const message={id:1,state:{player:-1,turn:1,board:[0,1]}};
  const first=fakeWorker();let reason='';
  requestMove(first.worker,message,{onReply:()=>assert.fail('Must not move'),onFailure:error=>{reason=error.message;}});
  first.crash();assert.match(reason,/could not load/);assert.equal(first.calls.terminations,1);assert.equal(message.state.turn,1);
  const second=fakeWorker();let action=-1;
  const done=new Promise<void>(resolve=>{requestMove(second.worker,{...message,id:2},{delayMs:0,onReply:r=>{action=r.action;resolve();},onFailure:assert.fail});});
  second.reply({id:1,action:8});assert.equal(action,-1);
  second.reply({id:2,action:3});await done;
  assert.equal(action,3);assert.equal(second.calls.terminations,0);assert.equal(message.state.turn,1);
});
test('cancelling a request ignores late replies and keeps the replacement intact',()=>{
  const old=fakeWorker();let replies=0;
  const job=requestMove(old.worker,{id:3},{onReply:()=>replies++,onFailure:assert.fail});
  assert.equal(job.cancel(),true);assert.equal(job.cancel(),false);old.reply({id:3,action:0});assert.equal(replies,0);assert.equal(old.calls.terminations,1);
});
test('a stuck worker times out rather than leaving the board thinking forever',async()=>{
  const stuck=fakeWorker();
  const error=await new Promise<Error>(resolve=>{requestMove(stuck.worker,{id:4},{delayMs:0,timeoutMs:1,onReply:()=>assert.fail('No reply expected'),onFailure:resolve});});
  assert.match(error.message,/timed out/);assert.equal(stuck.calls.terminations,1);
});
test('failed search and invalid move callback both release the worker',()=>{
  for(const kind of ['error','invalid']){
    const failed=fakeWorker();let reason='';
    requestMove(failed.worker,{id:5},{onReply:()=>{throw new Error('Illegal move');},onFailure:e=>{reason=e.message;}});
    failed.reply(kind==='error'?{id:5,error:'Search failed'}:{id:5,action:999});
    assert.match(reason,kind==='error'?/Search failed/:/Illegal move/);assert.equal(failed.calls.terminations,1);
  }
});
test('an already-computed move waits for the minimum presentation time',async()=>{const quick=fakeWorker();const started=performance.now();let delivered=false;const done=new Promise<void>(resolve=>{requestMove(quick.worker,{id:6},{minReplyMs:45,onReply:()=>{delivered=true;resolve();},onFailure:assert.fail});});quick.reply({id:6,action:0});assert.equal(delivered,false);await done;assert.ok(performance.now()-started>=40);});
test('undo during the presentation delay cancels the held move',()=>{const quick=fakeWorker();let delivered=false;const job=requestMove(quick.worker,{id:7},{minReplyMs:10000,onReply:()=>{delivered=true;},onFailure:assert.fail});quick.reply({id:7,action:0});job.cancel();assert.equal(delivered,false);assert.equal(quick.calls.terminations,1);});
