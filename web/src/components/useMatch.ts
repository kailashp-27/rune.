import {useEffect,useRef,useState} from 'react';
import type {Difficulty,Game,Mode} from '../data';
import {recordResult} from '../engine/statistics';
import {vibrate} from '../haptics';
import {requestMove} from '../engine/worker-request';

interface TurnState{player:1|-1;turn:number}
interface Rules<S>{initialState:()=>S;applyMove:(s:S,a:number)=>S;isTerminal:(s:S)=>{done:boolean;winner:number};legalMoves:(s:S)=>boolean[]}
export interface SearchReply{action:number;id:number;error?:string;policy?:number[];value?:number;simulations?:number;engine?:string;modelId?:string|null;fallbackReason?:string;evaluatedPlayer?:number;evaluatedTurn?:number;candidates?:{action:number;score:number;probability?:number;visits?:number}[];depth?:number;nodes?:number}
interface Options<S>{gameId:Game['id'];rules:Rules<S>;createWorker:()=>Worker;request:(s:S,d:Difficulty)=>object;difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean}

export function useMatch<S extends TurnState>({gameId,rules,createWorker,request,difficulty,mode,paused,muted,vibration}:Options<S>){
  const [timeline,setTimeline]=useState<{id:string;states:S[];actions:number[]}>(()=>({id:crypto.randomUUID(),states:[rules.initialState()],actions:[]}));
  const history=timeline.states,actionHistory=timeline.actions;
  const [busy,setBusy]=useState(false),[hintPending,setHintPending]=useState(false);
  const [hint,setHint]=useState<number|null>(null),[reply,setReply]=useState<SearchReply|null>(null),[error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const workerRef=useRef<Worker|null>(null),requestRef=useRef(0);
  const state=history[history.length-1],terminal=rules.isTerminal(state);
  const aiTurn=!terminal.done&&mode==='human'&&state.player===-1;
  const [settledState,setSettledState]=useState<S|null>(null);
  const resultReady=terminal.done&&settledState===state;
  useEffect(()=>{
    if(!terminal.done)return;
    recordResult(gameId,mode,timeline.id,terminal.winner);
    const timer=setTimeout(()=>setSettledState(state),1000);
    return()=>clearTimeout(timer);
  },[gameId,mode,timeline.id,terminal.done,terminal.winner,state]);
  useEffect(()=>()=>{workerRef.current?.terminate();workerRef.current=null;},[]);
  useEffect(()=>{
    if(paused||terminal.done||(!aiTurn&&!hintPending)){setBusy(false);return;}
    const id=++requestRef.current;
    let worker:Worker;
    const failed=(reason:Error)=>{console.error('Rune AI request failed:',reason.message);setBusy(false);setError('Rune couldn’t finish this move. Try again.');workerRef.current=null;};
    setBusy(true);setError('');
    try{worker=workerRef.current??createWorker();workerRef.current=worker;}
    catch(error){failed(error instanceof Error?error:new Error(String(error)));return;}
    const job=requestMove<SearchReply>(worker,{...request(state,difficulty),id},{delayMs:0,minReplyMs:aiTurn?1000:0,onFailure:failed,onReply:data=>{
      if(!rules.legalMoves(state)[data.action])throw new Error('The AI returned an invalid move.');
      setBusy(false);
      setReply(data);
      if(!aiTurn){setHint(data.action);setHintPending(false);}
      else {
        // Resolve live randomness once, outside React's replayable state updater.
        const nextState=rules.applyMove(state,data.action);
        setTimeline(previous=>previous.states.at(-1)===state?{...previous,states:[...previous.states,nextState],actions:[...previous.actions,data.action]}:previous);
      }
    }});
    return()=>{if(job.cancel()&&workerRef.current===worker)workerRef.current=null;};
  },[state,aiTurn,terminal.done,difficulty,mode,paused,hintPending,rules,createWorker,request,attempt]);
  useEffect(()=>{
    if(muted||state.turn===0)return;
    try{const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(state.player===1?330:440,ctx.currentTime);gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.start();osc.stop(ctx.currentTime+.12);osc.onended=()=>{if(ctx.state!=='closed')void ctx.close();};return()=>{if(ctx.state!=='closed')void ctx.close();};}catch{}
  },[state,muted]);
  function play(action:number){if(paused||busy||aiTurn||terminal.done||!rules.legalMoves(state)[action])return;vibrate(vibration);setHint(null);setHintPending(false);const nextState=rules.applyMove(state,action);setTimeline(h=>h.states.at(-1)===state?{...h,states:[...h.states,nextState],actions:[...h.actions,action]}:h);}
  function reset(){setTimeline({id:crypto.randomUUID(),states:[rules.initialState()],actions:[]});setReply(null);setHint(null);setHintPending(false);setBusy(false);setError('');}
  function undo(){if(terminal.done||paused)return;setTimeline(h=>{const length=Math.max(1,h.states.length-(mode==='friend'?1:state.player===1?2:1));return{...h,states:h.states.slice(0,length),actions:h.actions.slice(0,length-1)};});setHint(null);setHintPending(false);setBusy(false);setReply(null);setError('');}
  function requestHint(){if(paused||busy||aiTurn||terminal.done)return;setHint(null);setHintPending(true);}
  function retry(){if(paused||busy||terminal.done)return;setError('');setAttempt(value=>value+1);}
  const clearHint=()=>setHint(null);
  const status=error?'MOVE PAUSED':terminal.done?!resultReady?'BATTLE COMPLETE':terminal.winner===0?'IT’S A DRAW!':mode==='friend'?terminal.winner===1?'GOLD WINS!':'PURPLE WINS!':terminal.winner===1?'YOU WIN!':'RUNE WINS!':busy?hintPending?'FINDING A HINT…':'RUNE IS THINKING…':mode==='friend'?state.player===1?'GOLD’S TURN':'PURPLE’S TURN':'YOUR TURN';
  return{state,history,actionHistory,terminal,resultReady,status,aiTurn,busy,hintPending,hint,reply,error,play,reset,undo,requestHint,retry,clearHint};
}
