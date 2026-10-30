import {MatchResult} from './MatchResult';
import {LastMove,latestMove} from './LastMove';
import {MatchError} from './MatchError';
import {SearchInsights} from './SearchInsights';
import {useState} from 'react';
import {Lightbulb,Undo2,RotateCcw,Plus,Move,Waves} from 'lucide-react';
import * as rules from '../engine/tidal';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';

const createWorker=()=>new Worker(new URL('../workers/tidal.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:2,Hard:3}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});
const liveRules={...rules,initialState:rules.sampleInitial,applyMove:rules.sampleMove};

export function TidalBoard({state,targets=[],sources=[],selected=-1,hint=null,onCell,illustration=false}:{state:rules.State;targets?:number[];sources?:number[];selected?:number;hint?:number|null;onCell?:(cell:number)=>void;illustration?:boolean}){
  const winning=rules.lines.find(line=>state.board[line[0]]!==0&&line.every(c=>state.board[c]===state.board[line[0]]))??[];
  return <div className={`tidal-board ${illustration?'tidal-illustration':''}`} role={illustration?undefined:'group'} aria-label={illustration?undefined:'Tidal Lock board'} aria-hidden={illustration||undefined}>
    {state.board.map((piece,cell)=>{
      const flooded=rules.wet(state,cell),active=targets.includes(cell)||sources.includes(cell);
      return <button type="button" key={cell} tabIndex={illustration?-1:undefined} disabled={illustration||!active} onClick={()=>onCell?.(cell)} className={`tidal-cell ${flooded?'underwater':''} ${targets.includes(cell)?'tidal-target':''} ${sources.includes(cell)?'tidal-source':''} ${selected===cell?'tidal-selected':''} ${winning.includes(cell)?'tidal-winning':''} ${hint!==null&&rules.destination(hint)===cell?'tidal-hint':''}`} aria-label={`${rules.cellName(cell)}, ${piece===1?'Gold stone':piece===-1?'Purple stone':'empty'}${flooded?', locked by water':''}${selected===cell?', selected':''}${winning.includes(cell)?', winning line':''}`} aria-pressed={sources.includes(cell)?selected===cell:undefined}>
        {piece!==0?<span className={`tidal-stone ${piece===1?'gold-stone':'purple-stone'}`}/>:targets.includes(cell)?<span className="tidal-target-dot"/>:<span className="tidal-empty-dot"/>}
        {flooded&&<span className={`tidal-wave ${state.wave>=5?'vertical-wave':''}`} aria-hidden="true">≈</span>}
      </button>;
    })}
  </div>;
}

export function TidalScreen({difficulty,mode,paused,muted,vibration,showSearch,onBack}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onBack:()=>void;}){
  const {state,history,actionHistory,terminal,aiTurn,busy,hintPending,hint,reply,error,retry,play,undo,reset,requestHint,clearHint}=useMatch({rules:liveRules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [choice,setChoice]=useState<{turn:number;kind:'place'|'nudge';source:number}>({turn:0,kind:'place',source:-1});
  const current=choice.turn===state.turn?choice:{turn:state.turn,kind:'place' as const,source:-1};
  const kind=hint===null?current.kind:hint<25?'place':'nudge',source=kind==='place'?-1:hint!==null?rules.origin(hint):current.source;
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),playable=!busy&&!paused&&!aiTurn&&!terminal.done&&mode==='human';
  const actions=playable?legal.filter(a=>kind==='place'?a<25:a>=25&&rules.origin(a)===source):[];
  const sources=playable&&kind==='nudge'?[...new Set(legal.filter(a=>a>=25).map(rules.origin))]:[];
  const last=latestMove(history,actionHistory,mode);
  const lastText=last?`${mode==='watch'?(last.player===1?'Gold':'Purple'):'Rune'}: ${rules.describeAction(last.before,last.action)}`:null;
  const status=error?'MOVE PAUSED':terminal.done?terminal.winner===0?'IT’S A DRAW!':terminal.winner===1?mode==='watch'?'GOLD WINS!':'YOU WIN!':mode==='watch'?'PURPLE WINS!':'RUNE WINS!':busy?hintPending?'FINDING A HINT…':'RUNE IS THINKING…':mode==='watch'?'WATCH THE TIDE':'YOUR TURN';
  function restart(){reset();setChoice({turn:0,kind:'place',source:-1});}
  return <section className="match-screen tidal-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{difficulty}</span><span>{mode==='watch'?'AI vs AI':'You vs Rune'}</span></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='watch'?'GOLD':'YOU'}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / 80</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='watch'?'PURPLE':'RUNE'}</span></div>
    <div className="tidal-frame"><div className="tide-indicator" role="status"><Waves size={22}/><span>WATER · {rules.waveLabel(state)}</span></div><TidalBoard state={state} targets={actions.map(rules.destination)} sources={sources} selected={source} hint={hint} onCell={cell=>{if(sources.includes(cell)){clearHint();setChoice({turn:state.turn,kind:'nudge',source:cell});return;}const action=actions.find(a=>rules.destination(a)===cell);if(action!==undefined)play(action);}}/><div className="tidal-board-key"><span><i className="water-key"/>LOCKED</span><strong>CONNECT 4</strong></div></div>
    <div className="terrain-modes tidal-modes" aria-label="Choose action">{(['place','nudge'] as const).map(action=><button key={action} className={kind===action?'selected':''} disabled={!playable} aria-pressed={kind===action} onClick={()=>{clearHint();setChoice({turn:state.turn,kind:action,source:-1});}}>{action==='place'?<Plus/>:<Move/>}<span>{action==='place'?'Place':'Nudge'}</span></button>)}</div>
    {playable&&kind==='nudge'&&source<0&&<p className="hint-message" role="status">Choose a glowing gold stone.</p>}
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)}.</p>}
    <LastMove text={lastText}/><div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||mode==='watch'}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={restart}><RotateCcw/><span>NEW GAME</span></button></div>
    {terminal.done&&<MatchResult key={state.turn} winner={terminal.winner} mode={mode} onReplay={restart} onBack={onBack}/>}
    {terminal.done&&<button className="chunky coral-button rematch" onClick={restart}>PLAY AGAIN</button>}
    {error&&<MatchError message={error} onRetry={retry}/>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
