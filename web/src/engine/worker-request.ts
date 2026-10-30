export interface MoveReply { id:number; action:number; error?:string }
export type WorkerPort=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;

/** One cancellable turn. A failed worker is discarded; a successful one is reused. */
export function requestMove<T extends MoveReply>(worker:WorkerPort,message:{id:number},options:{
  onReply:(reply:T)=>void;onFailure:(reason:Error)=>void;delayMs?:number;timeoutMs?:number;minReplyMs?:number;
}) {
  let finished=false;
  let deadline:ReturnType<typeof setTimeout>|undefined;
  let send:ReturnType<typeof setTimeout>|undefined;
  let presentation:ReturnType<typeof setTimeout>|undefined;
  const started=performance.now();
  const clear=()=>{clearTimeout(send);clearTimeout(deadline);clearTimeout(presentation);};
  const fail=(reason:unknown)=>{
    if(finished)return;
    finished=true;clear();worker.terminate();
    options.onFailure(reason instanceof Error?reason:new Error(String(reason)));
  };
  worker.onmessage=({data}:MessageEvent<T>)=>{
    if(finished||data?.id!==message.id)return;
    if(data.error){fail(new Error(data.error));return;}
    clearTimeout(deadline);
    const deliver=()=>{if(finished)return;try{options.onReply(data);finished=true;clear();}catch(error){fail(error);}};
    const remaining=Math.max(0,(options.minReplyMs??0)-(performance.now()-started));
    if(remaining)presentation=setTimeout(deliver,remaining);else deliver();
  };
  worker.onerror=event=>fail(new Error(event.message||'The AI worker could not load.'));
  worker.onmessageerror=()=>fail(new Error('The AI reply could not be read.'));
  send=setTimeout(()=>{
    if(finished)return;
    deadline=setTimeout(()=>fail(new Error('The AI request timed out.')),options.timeoutMs??30000);
    try{worker.postMessage(message);}catch(error){fail(error);}
  },options.delayMs??150);
  return {cancel(){if(finished)return false;finished=true;clear();worker.terminate();return true;}};
}
