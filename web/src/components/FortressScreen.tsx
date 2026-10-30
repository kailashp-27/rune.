import {MatchResult} from './MatchResult';
import {LastMove,latestMove} from './LastMove';
import {MatchError} from './MatchError';
import {SearchInsights} from './SearchInsights';
import {useState} from 'react';
import {Lightbulb,Undo2,RotateCcw,Crown} from 'lucide-react';
import * as rules from '../engine/fortress';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';
const createWorker=()=>new Worker(new URL('../workers/fortress.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:3,Hard:5}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});

export function FortressBoard({state,targets=[],sources=[],selected=-1,hint=null,onCell,illustration=false,ghosts,center=true,blocked=[]}:{state:Pick<rules.State,'board'|'captured'|'turn'|'lastAction'>;targets?:number[];sources?:number[];selected?:number;hint?:number|null;onCell?:(c:number)=>void;illustration?:boolean;ghosts?:number[];center?:boolean;blocked?:number[]}){
  return <div className={`fortress-board ${ghosts?'mirror-board':''} ${illustration?'fortress-illustration':''}`} role={illustration?undefined:'group'} aria-label={illustration?undefined:ghosts?'Mirror Siege board':'Fortress board'} aria-hidden={illustration||undefined}>{state.board.map((piece,c)=>{
    const ghost=ghosts?.[c]??0,owner=piece||ghost;
    const active=!blocked.includes(c)&&(sources.includes(c)||targets.includes(c));
    return <button key={c} type="button" disabled={illustration||!active} tabIndex={illustration?-1:undefined} onClick={()=>onCell?.(c)} className={`fortress-cell ${(Math.floor(c/5)+c%5)%2?'dark-square':''} ${center&&c===12?'fortress-center':''} ${sources.includes(c)?'fortress-source':''} ${targets.includes(c)?'fortress-target':''} ${selected===c?'fortress-selected':''} ${hint!==null&&hint%25===c?'fortress-hint':''} ${state.lastAction!==null&&state.lastAction%25===c?'fortress-last':''} ${blocked.includes(c)?'mirror-sealed':''}`} aria-label={`${rules.cellName(c)}, ${blocked.includes(c)?'sealed edge, unavailable':owner===1?'Gold':owner===-1?'Purple':'empty'}${owner?(ghost?' ghost, expires after this reply':' rook'):''}${center&&c===12?', center':''}${selected===c?', selected':''}`} aria-pressed={sources.includes(c)?selected===c:undefined}>
      {center&&c===12&&<Crown className="fortress-center-mark" size={23}/>}
      {owner!==0&&<svg className={`fortress-piece ${owner===1?'fortress-gold':'fortress-purple'} ${ghost?'mirror-ghost':''}`} viewBox="0 0 36 42" aria-hidden="true"><path d="M5 5h7v7h5V5h7v7h5V5h5v14l-5 4 2 12h3v5H3v-5h4l2-12-4-4z" fill="currentColor" stroke="#4b3448" strokeWidth="2" strokeLinejoin="round"/><path d="M12 27h13M11 32h15" stroke="#4b3448" strokeWidth="2" opacity=".35"/></svg>}
      {!owner&&targets.includes(c)&&<span className="fortress-destination"/>}
      {state.captured.includes(c)&&<span key={`${state.turn}-${c}`} className="fortress-capture" aria-hidden="true"/>}
    </button>;
  })}</div>;
}

export function FortressScreen({difficulty,mode,paused,muted,vibration,showSearch,onBack}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onBack:()=>void;}){
  const {state,history,actionHistory,terminal,resultReady,status,aiTurn,busy,hint,reply,error,retry,play,undo,reset,requestHint,clearHint}=useMatch({gameId:'fortress',rules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [selection,setSelection]=useState({turn:-1,cell:-1});
  const selected=hint!==null?Math.floor(hint/25):selection.turn===state.turn?selection.cell:-1;
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),playable=!busy&&!paused&&!aiTurn&&!terminal.done;
  const sources=playable?[...new Set(legal.map(a=>Math.floor(a/25)))]:[],targets=playable?legal.filter(a=>Math.floor(a/25)===selected).map(a=>a%25):[];
  const last=latestMove(history,actionHistory,mode);
  const lastText=last?`${mode==='friend'?(last.player===1?'Gold':'Purple'):'Rune'}: ${rules.describeAction(last.before,last.action)}`:null;
  const counts=[1,-1].map(p=>state.board.filter(owner=>owner===p).length);
  function restart(){reset();setSelection({turn:-1,cell:-1});}
  return <section className="match-screen fortress-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{mode==='friend'?'2 PLAYERS':difficulty}</span><span>{mode==='friend'?'Play vs. Friend':'You vs Rune'}</span></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='friend'?'GOLD':'YOU'} · {counts[0]}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / 100</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='friend'?'PURPLE':'RUNE'} · {counts[1]}</span></div>
    <div className="fortress-frame"><div className="fortress-columns" aria-hidden="true">{['A','B','C','D','E'].map(c=><span key={c}>{c}</span>)}</div><FortressBoard state={state} targets={targets} sources={sources} selected={selected} hint={hint} onCell={cell=>{if(sources.includes(cell)){clearHint();setSelection({turn:state.turn,cell});}else if(targets.includes(cell))play(selected*25+cell);}}/></div>
    <div className="center-hold" role="img" aria-label={`Center hold: Gold ${state.hold[0]} of 3, Purple ${state.hold[1]} of 3`}><div><span className="hold-gold">{mode==='friend'?'GOLD':'YOU'}</span><span className="hold-dots">{[0,1,2].map(i=><i key={i} className={i<state.hold[0]?'filled-gold':''}/>)}</span></div><span className="center-label"><Crown size={19}/>CENTER HOLD</span><div><span className="hold-purple">{mode==='friend'?'PURPLE':'RUNE'}</span><span className="hold-dots">{[0,1,2].map(i=><i key={i} className={i<state.hold[1]?'filled-purple':''}/>)}</span></div></div>
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)}.</p>}
    {state.captured.length>0&&<p className="fortress-capture-note" role="status">{state.captured.length} {state.captured.length===1?'rook captured':'rooks captured'}</p>}
    <LastMove text={lastText}/><div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||terminal.done}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={restart}><RotateCcw/><span>NEW GAME</span></button></div>
    {resultReady&&!paused&&<MatchResult key={state.turn} winner={terminal.winner} mode={mode} onReplay={restart} onBack={onBack}/>}
    {resultReady&&<button className="chunky coral-button rematch" onClick={restart}>PLAY AGAIN</button>}
    {error&&<MatchError message={error} onRetry={retry}/>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
