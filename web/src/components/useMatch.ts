import {useEffect,useRef,useState} from 'react';
import type {Difficulty,Mode} from '../data';
import {vibrate} from '../haptics';

interface TurnState{player:1|-1;turn:number}
interface Rules<S>{initialState:()=>S;applyMove:(s:S,a:number)=>S;isTerminal:(s:S)=>{done:boolean;winner:number};legalMoves:(s:S)=>boolean[]}
export interface SearchReply{action:number;id:number;error?:string;policy?:number[];value?:number;simulations?:number;engine?:string;modelId?:string|null;fallbackReason?:string;evaluatedPlayer?:number;evaluatedTurn?:number;candidates?:{action:number;score:number;probability?:number;visits?:number}[];depth?:number;nodes?:number}
interface Options<S>{rules:Rules<S>;createWorker:()=>Worker;request:(s:S,d:Difficulty)=>object;difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean}

export function useMatch<S extends TurnState>({rules,createWorker,request,difficulty,mode,paused,muted,vibration}:Options<S>){
  const [timeline,setTimeline]=useState<{states:S[];actions:number[]}>(()=>({states:[rules.initialState()],actions:[]}));
  const history=timeline.states,actionHistory=timeline.actions;
  const [busy,setBusy]=useState(false),[hintPending,setHintPending]=useState(false);
  const [hint,setHint]=useState<number|null>(null),[reply,setReply]=useState<SearchReply|null>(null),[error,setError]=useState('');
  const workerRef=useRef<Worker|null>(null),requestRef=useRef(0);
  const state=history[history.length-1],terminal=rules.isTerminal(state);
  const aiTurn=!terminal.done&&(state.player===-1||mode==='watch');
  useEffect(()=>()=>{workerRef.current?.terminate();workerRef.current=null;},[]);
  useEffect(()=>{
    if(paused||terminal.done||(!aiTurn&&!hintPending)){setBusy(false);return;}
    let active=true,completed=false;const id=++requestRef.current;
    const worker=workerRef.current??createWorker();workerRef.current=worker;setBusy(true);setError('');
    worker.onmessage=({data}:{data:SearchReply})=>{
      if(!active||data.id!==id)return;completed=true;setBusy(false);
      if(data.error){setError('Rune needs a fresh start. Tap New game to try again.');setHintPending(false);return;}
      if(!rules.legalMoves(state)[data.action]){setError('The search returned an invalid move. Start a new game.');setHintPending(false);return;}
      setReply(data);
      if(!aiTurn){setHint(data.action);setHintPending(false);}
      else {
        // Resolve live randomness once, outside React's replayable state updater.
        const nextState=rules.applyMove(state,data.action);
        setTimeline(previous=>previous.states.at(-1)===state?{states:[...previous.states,nextState],actions:[...previous.actions,data.action]}:previous);
      }
    };
    worker.onerror=()=>{if(!active)return;setBusy(false);setHintPending(false);setError('Rune needs a fresh start. Tap New game to try again.');worker.terminate();workerRef.current=null;};
    const timer=setTimeout(()=>worker.postMessage({...request(state,difficulty),id}),mode==='watch'?550:150);
    return()=>{active=false;clearTimeout(timer);if(!completed){worker.terminate();if(workerRef.current===worker)workerRef.current=null;}};
  },[state,aiTurn,terminal.done,difficulty,mode,paused,hintPending,rules,createWorker,request]);
  useEffect(()=>{
    if(muted||state.turn===0)return;
    try{const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(state.player===1?330:440,ctx.currentTime);gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.start();osc.stop(ctx.currentTime+.12);osc.onended=()=>{if(ctx.state!=='closed')void ctx.close();};return()=>{if(ctx.state!=='closed')void ctx.close();};}catch{}
  },[state,muted]);
  function play(action:number){if(paused||busy||aiTurn||terminal.done||mode==='watch'||!rules.legalMoves(state)[action])return;vibrate(vibration);setHint(null);setHintPending(false);const nextState=rules.applyMove(state,action);setTimeline(h=>h.states.at(-1)===state?{states:[...h.states,nextState],actions:[...h.actions,action]}:h);}
  function reset(){setTimeline({states:[rules.initialState()],actions:[]});setReply(null);setHint(null);setHintPending(false);setBusy(false);setError('');}
  function undo(){setTimeline(h=>{const length=Math.max(1,h.states.length-(state.player===1?2:1));return{states:h.states.slice(0,length),actions:h.actions.slice(0,length-1)};});setHint(null);setHintPending(false);setBusy(false);setReply(null);setError('');}
  function requestHint(){if(paused||busy||aiTurn||terminal.done||mode==='watch')return;setHint(null);setHintPending(true);}
  const clearHint=()=>setHint(null);
  return{state,history,actionHistory,terminal,aiTurn,busy,hintPending,hint,reply,error,play,reset,undo,requestHint,clearHint};
}
