import {SearchInsights} from './SearchInsights';
import {useState} from 'react';
import {CircleHelp,Lightbulb,Undo2,RotateCcw,Crown} from 'lucide-react';
import * as rules from '../engine/fortress';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';
const createWorker=()=>new Worker(new URL('../workers/fortress.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:3,Hard:5}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});

export function FortressBoard({state,targets=[],sources=[],selected=-1,hint=null,onCell,illustration=false,ghosts,center=true}:{state:Pick<rules.State,'board'|'captured'|'turn'|'lastAction'>;targets?:number[];sources?:number[];selected?:number;hint?:number|null;onCell?:(c:number)=>void;illustration?:boolean;ghosts?:number[];center?:boolean}){
  return <div className={`fortress-board ${ghosts?'mirror-board':''} ${illustration?'fortress-illustration':''}`} role={illustration?undefined:'group'} aria-label={illustration?undefined:ghosts?'Mirror Siege board':'Fortress board'} aria-hidden={illustration||undefined}>{state.board.map((piece,c)=>{
    const ghost=ghosts?.[c]??0,owner=piece||ghost;
    const active=sources.includes(c)||targets.includes(c);
    return <button key={c} type="button" disabled={illustration||!active} tabIndex={illustration?-1:undefined} onClick={()=>onCell?.(c)} className={`fortress-cell ${(Math.floor(c/5)+c%5)%2?'dark-square':''} ${center&&c===12?'fortress-center':''} ${sources.includes(c)?'fortress-source':''} ${targets.includes(c)?'fortress-target':''} ${selected===c?'fortress-selected':''} ${hint!==null&&hint%25===c?'fortress-hint':''} ${state.lastAction!==null&&state.lastAction%25===c?'fortress-last':''}`} aria-label={`${rules.cellName(c)}, ${owner===1?'Gold':owner===-1?'Purple':'empty'}${owner?(ghost?' ghost, expires after this reply':' rook'):''}${center&&c===12?', center':''}${selected===c?', selected':''}`} aria-pressed={sources.includes(c)?selected===c:undefined}>
      {center&&c===12&&<Crown className="fortress-center-mark" size={23}/>}
      {owner!==0&&<svg className={`fortress-piece ${owner===1?'fortress-gold':'fortress-purple'} ${ghost?'mirror-ghost':''}`} viewBox="0 0 36 42" aria-hidden="true"><path d="M5 5h7v7h5V5h7v7h5V5h5v14l-5 4 2 12h3v5H3v-5h4l2-12-4-4z" fill="currentColor" stroke="#4b3448" strokeWidth="2" strokeLinejoin="round"/><path d="M12 27h13M11 32h15" stroke="#4b3448" strokeWidth="2" opacity=".35"/></svg>}
      {!owner&&targets.includes(c)&&<span className="fortress-destination"/>}
      {state.captured.includes(c)&&<span key={`${state.turn}-${c}`} className="fortress-capture" aria-hidden="true"/>}
    </button>;
  })}</div>;
}

export function FortressScreen({difficulty,mode,paused,muted,vibration,showSearch,onHelp}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onHelp:()=>void}){
  const {state,history,actionHistory,terminal,aiTurn,busy,hintPending,hint,reply,error,play,undo,reset,requestHint,clearHint}=useMatch({rules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [selection,setSelection]=useState({turn:-1,cell:-1});
  const selected=hint!==null?Math.floor(hint/25):selection.turn===state.turn?selection.cell:-1;
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),playable=!busy&&!paused&&!aiTurn&&!terminal.done&&mode==='human';
  const sources=playable?[...new Set(legal.map(a=>Math.floor(a/25)))]:[],targets=playable?legal.filter(a=>Math.floor(a/25)===selected).map(a=>a%25):[];
  const status=terminal.done?terminal.winner===0?'IT’S A DRAW!':terminal.winner===1?mode==='watch'?'GOLD WINS!':'YOU WIN!':mode==='watch'?'PURPLE WINS!':'RUNE WINS!':busy?hintPending?'FINDING A HINT…':'RUNE IS THINKING…':mode==='watch'?'WATCH THE SIEGE':'YOUR TURN';
  const counts=[1,-1].map(p=>state.board.filter(owner=>owner===p).length);
  function restart(){reset();setSelection({turn:-1,cell:-1});}
  return <section className="match-screen fortress-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{difficulty}</span><span>{mode==='watch'?'AI vs AI':'You vs Rune'}</span><button className="round-button small help-shortcut" onClick={onHelp} aria-label="How to play"><CircleHelp/></button></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='watch'?'GOLD':'YOU'} · {counts[0]}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / 100</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='watch'?'PURPLE':'RUNE'} · {counts[1]}</span></div>
    <div className="fortress-frame"><div className="fortress-columns" aria-hidden="true">{['A','B','C','D','E'].map(c=><span key={c}>{c}</span>)}</div><FortressBoard state={state} targets={targets} sources={sources} selected={selected} hint={hint} onCell={cell=>{if(sources.includes(cell)){clearHint();setSelection({turn:state.turn,cell});}else if(targets.includes(cell))play(selected*25+cell);}}/></div>
    <div className="center-hold" role="img" aria-label={`Center hold: Gold ${state.hold[0]} of 3, Purple ${state.hold[1]} of 3`}><div><span className="hold-gold">{mode==='watch'?'GOLD':'YOU'}</span><span className="hold-dots">{[0,1,2].map(i=><i key={i} className={i<state.hold[0]?'filled-gold':''}/>)}</span></div><span className="center-label"><Crown size={19}/>CENTER HOLD</span><div><span className="hold-purple">{mode==='watch'?'PURPLE':'RUNE'}</span><span className="hold-dots">{[0,1,2].map(i=><i key={i} className={i<state.hold[1]?'filled-purple':''}/>)}</span></div></div>
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)}.</p>}
    {state.captured.length>0&&<p className="fortress-capture-note" role="status">{state.captured.length} {state.captured.length===1?'rook captured':'rooks captured'}</p>}
    <div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||mode==='watch'}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={restart}><RotateCcw/><span>NEW GAME</span></button></div>
    {terminal.done&&<button className="chunky coral-button rematch" onClick={restart}>PLAY AGAIN</button>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
