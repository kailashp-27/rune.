import {MatchResult} from './MatchResult';
import {LastMove,latestMove} from './LastMove';
import {MatchError} from './MatchError';
import {SearchInsights} from './SearchInsights';
import {useState,type CSSProperties} from 'react';
import {Lightbulb,Undo2,RotateCcw,Plus,Zap,Hourglass} from 'lucide-react';
import * as rules from '../engine/pulse';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';

const createWorker=()=>new Worker(new URL('../workers/pulse.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:3,Hard:5}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});

export function PulseBoard({state,actions=[],hint=null,onCell,illustration=false}:{state:rules.State;actions?:number[];hint?:number|null;onCell?:(cell:number)=>void;illustration?:boolean}){
  return <div className={`pulse-board ${illustration?'pulse-illustration':''}`} role={illustration?undefined:'group'} aria-label={illustration?undefined:'Pulse board'} aria-hidden={illustration||undefined}>
    {state.board.map((owner,c)=>{
      const active=actions.includes(c)||actions.includes(c+25),power=state.level[c];
      return <button type="button" key={c} tabIndex={illustration?-1:undefined} disabled={illustration||!active} onClick={()=>onCell?.(c)} className={`pulse-cell ${owner===1?'pulse-gold':owner===-1?'pulse-purple':''} ${active?'pulse-legal':''} ${hint!==null&&hint<50&&hint%25===c?'pulse-hint':''}`} style={{'--charge':state.strength[c]} as CSSProperties} aria-label={`${rules.cellName(c)}, ${owner===1?'Gold':owner===-1?'Purple':'neutral'}${power?` emitter, power ${power}, fires in ${state.cooldown[c]} actions`:`, strength ${state.strength[c]}`} `}>
        {power>0?<span className={`pulse-emitter emitter-power-${power}`}><i/><strong>{power}</strong><span className="pulse-timer">{state.cooldown[c]}</span></span>:<span className="pulse-field">{state.strength[c]||'·'}</span>}
        {active&&power===0&&<Plus className="pulse-build-mark" size={18}/>}
        {state.bursts[c]!==0&&<span key={`${state.turn}-${c}`} className={`pulse-ripple ${state.bursts[c]>0?'ripple-gold':'ripple-purple'}`} style={{'--burst-scale':Math.abs(state.bursts[c])*2-1} as CSSProperties} aria-hidden="true"/>}
      </button>;
    })}
  </div>;
}

export function PulseScreen({difficulty,mode,paused,muted,vibration,showSearch,onBack}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onBack:()=>void;}){
  const {state,history,actionHistory,terminal,resultReady,status,aiTurn,busy,hint,reply,error,retry,play,undo,reset,requestHint,clearHint}=useMatch({gameId:'pulse',rules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [selected,setSelected]=useState<'build'|'boost'>('build');
  const kind=hint!==null&&hint<50?hint<25?'build':'boost':selected;
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),playable=!busy&&!paused&&!aiTurn&&!terminal.done;
  const actions=playable?legal.filter(a=>kind==='build'?a<25:a>=25&&a<50):[];
  const [gold,purple]=rules.territory(state);
  const last=latestMove(history,actionHistory,mode);
  const lastText=last?`${mode==='friend'?(last.player===1?'Gold':'Purple'):'Rune'}: ${rules.describeAction(last.before,last.action)}`:null;
  function restart(){reset();setSelected('build');}
  return <section className="match-screen pulse-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{mode==='friend'?'2 PLAYERS':difficulty}</span><span>{mode==='friend'?'Play vs. Friend':'You vs Rune'}</span></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='friend'?'GOLD':'YOU'}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / {rules.MOVE_CAP}</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='friend'?'PURPLE':'RUNE'}</span></div>
    <div className="pulse-frame"><div className="pulse-frame-heading"><Zap size={19}/><span>CONTROL THE FIELD</span><span className="pulse-live-dot"/></div><PulseBoard state={state} actions={actions} hint={hint} onCell={cell=>play(kind==='build'?cell:25+cell)}/><div className="pulse-board-key"><span><i className="pulse-key-emitter"/>EMITTER</span><span><i className="pulse-key-timer">3</i>COUNTDOWN</span></div></div>
    <div className="territory-panel" role="img" aria-label={`Territory: Gold ${gold*4} percent, Purple ${purple*4} percent, neutral ${(25-gold-purple)*4} percent`}><div className="territory-labels"><span>{mode==='friend'?'GOLD':'YOU'} · {gold*4}%</span><span>TERRITORY</span><span>{mode==='friend'?'PURPLE':'RUNE'} · {purple*4}%</span></div><div className="territory-track"><span style={{width:`${gold*4}%`}}/><i style={{width:`${(25-gold-purple)*4}%`}}/><span style={{width:`${purple*4}%`}}/></div></div>
    <div className="terrain-modes pulse-modes" aria-label="Choose action">{(['build','boost'] as const).map(action=><button key={action} className={kind===action?'selected':''} aria-pressed={kind===action} disabled={!playable} onClick={()=>{clearHint();setSelected(action);}}>{action==='build'?<Plus/>:<Zap/>}<span>{action==='build'?'Build':'Boost'}</span></button>)}<button onClick={()=>play(50)} disabled={!playable} className={hint===50?'wait-hint':''}><Hourglass/><span>Wait</span></button></div>
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)}.</p>}
    <LastMove text={lastText}/><div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||terminal.done}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={restart}><RotateCcw/><span>NEW GAME</span></button></div>
    {resultReady&&!paused&&<MatchResult key={state.turn} winner={terminal.winner} mode={mode} onReplay={restart} onBack={onBack}/>}
    {resultReady&&<button className="chunky coral-button rematch" onClick={restart}>PLAY AGAIN</button>}
    {error&&<MatchError message={error} onRetry={retry}/>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
