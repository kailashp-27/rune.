import {MatchResult} from './MatchResult';
import {LastMove,latestMove} from './LastMove';
import {MatchError} from './MatchError';
import {SearchInsights} from './SearchInsights';
import {useState} from 'react';
import {Lightbulb,Undo2,RotateCcw} from 'lucide-react';
import * as rules from '../engine/mirror';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';
import {FortressBoard} from './FortressScreen';
const createWorker=()=>new Worker(new URL('../workers/mirror.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:3,Hard:5}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});

export function MirrorScreen({difficulty,mode,paused,muted,vibration,showSearch,onBack}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onBack:()=>void;}){
  const {state,history,actionHistory,terminal,resultReady,status,aiTurn,busy,hint,reply,error,retry,play,undo,reset,requestHint,clearHint}=useMatch({gameId:'mirror',rules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [selection,setSelection]=useState({turn:-1,cell:-1});
  const selected=hint!==null?Math.floor(hint/25):selection.turn===state.turn?selection.cell:-1;
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),playable=!busy&&!paused&&!aiTurn&&!terminal.done;
  const sources=playable?[...new Set(legal.map(a=>Math.floor(a/25)))]:[],targets=playable?legal.filter(a=>Math.floor(a/25)===selected).map(a=>a%25):[];
  const last=latestMove(history,actionHistory,mode);
  const lastText=last?`${mode==='friend'?(last.player===1?'Gold':'Purple'):'Rune'}: ${rules.describeAction(last.before,last.action)}`:null;
  const counts=[1,-1].map(p=>state.board.filter(owner=>owner===p).length);
  function restart(){reset();setSelection({turn:-1,cell:-1});}
  return <section className="match-screen fortress-match mirror-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{mode==='friend'?'2 PLAYERS':difficulty}</span><span>{mode==='friend'?'Play vs. Friend':'You vs Rune'}</span></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='friend'?'GOLD':'YOU'} · {counts[0]}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / {rules.MOVE_CAP}</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='friend'?'PURPLE':'RUNE'} · {counts[1]}</span></div>
    <div className={`siege-countdown ${state.turn>=rules.SEAL_TURN-4?'siege-urgent':''}`} role="status">{state.turn<rules.SEAL_TURN?`OUTER EDGE CLOSES IN ${rules.SEAL_TURN-state.turn} MOVES`:'OUTER EDGE SEALED'}</div><div className="fortress-frame mirror-frame"><div className="fortress-columns" aria-hidden="true">{['A','B','C','D','E'].map(c=><span key={c}>{c}</span>)}</div><FortressBoard blocked={state.board.flatMap((_,c)=>rules.sealed(state,c)?[c]:[])} center={false} ghosts={state.ghosts} state={state} targets={targets} sources={sources} selected={selected} hint={hint} onCell={cell=>{if(sources.includes(cell)){clearHint();setSelection({turn:state.turn,cell});}else if(targets.includes(cell))play(selected*25+cell);}}/></div>
    <div className="mirror-key"><span><i/>SOLID ROOK</span><span><i className="ghost-key"/>ONE-REPLY GHOST</span></div>
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)}.</p>}
    {state.turn===rules.SEAL_TURN&&<p className="fortress-capture-note" role="status">The outer edge closed. Rooks left there were lost.</p>}
    {state.turn!==rules.SEAL_TURN&&state.captured.length>0&&<p className="fortress-capture-note" role="status">{state.captured.length} {state.captured.length===1?'rook captured':'rooks captured'}</p>}
    <LastMove text={lastText}/><div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||terminal.done}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={restart}><RotateCcw/><span>NEW GAME</span></button></div>
    {resultReady&&!paused&&<MatchResult key={state.turn} winner={terminal.winner} mode={mode} onReplay={restart} onBack={onBack}/>}
    {resultReady&&<button className="chunky coral-button rematch" onClick={restart}>PLAY AGAIN</button>}
    {error&&<MatchError message={error} onRetry={retry}/>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
