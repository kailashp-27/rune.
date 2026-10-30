import {MatchError} from './MatchError';
import {SearchInsights} from './SearchInsights';
import {useEffect,useState,type CSSProperties} from 'react';
import {ArrowUp,ArrowDown,Footprints,CircleHelp,Lightbulb,Undo2,RotateCcw} from 'lucide-react';
import * as rules from '../engine/terraform';
import type {Difficulty,Mode} from '../data';
import {useMatch} from './useMatch';

const createWorker=()=>new Worker(new URL('../workers/terraform.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,depth:{Easy:1,Medium:3,Hard:5}[difficulty],maxMs:{Easy:120,Medium:450,Hard:1200}[difficulty]});
const labels={move:'Move',raise:'Raise',lower:'Lower',swap:'Swap'};
export function TerrainBoard({state,kind='move',activeActions=[],hint=null,onCell,disabled=false,illustration=false}:{state:rules.State;kind?:rules.ActionKind;activeActions?:number[];hint?:number|null;onCell?:(cell:number)=>void;disabled?:boolean;illustration?:boolean}){
  const cells=new Set(activeActions.map(a=>rules.destination(state,a))),hintCell=hint===null?-1:rules.destination(state,hint);
  return <div className={`terrain-board ${illustration?'terrain-illustration':''}`} role={illustration?undefined:'group'} aria-label={illustration?undefined:'Terraform board'} aria-hidden={illustration||undefined}>
    {state.board.map((height,cell)=>{
      const unit=state.units[0]===cell?1:state.units[1]===cell?-1:0;
      const name=`${String.fromCharCode(65+cell%5)}${Math.floor(cell/5)+1}`;
      return <button key={cell} type="button" tabIndex={illustration?-1:undefined} className={`terrain-cell height-${height} ${unit===1?'occupied-gold':unit===-1?'occupied-purple':''} ${cells.has(cell)?'legal-cell':''} ${hintCell===cell?'terrain-hint':''}`} style={{'--terrain-height':height} as CSSProperties} onClick={()=>onCell?.(cell)} disabled={disabled||!cells.has(cell)} aria-label={`${labels[kind]} ${name}, height ${height}${unit===1?', Gold unit':unit===-1?', Purple unit':''}`}>
        <span className="tile-top"><span className="tile-height">{height}</span>{unit!==0&&<span className={`terrain-unit ${unit===1?'gold-unit':'purple-unit'}`}><i/></span>}{cells.has(cell)&&!unit&&<span className="cell-action">{kind==='move'?'·':kind==='raise'?'+':'−'}</span>}</span>
      </button>;
    })}
  </div>;
}

export function TerraformScreen({difficulty,mode,paused,muted,vibration,showSearch,onHelp}:{difficulty:Difficulty;mode:Mode;paused:boolean;muted:boolean;vibration:boolean;showSearch:boolean;onHelp:()=>void}){
  const {state,history,actionHistory,terminal,aiTurn,busy,hintPending,hint,reply,error,retry,play,undo,reset,requestHint}=useMatch({rules,createWorker,request,difficulty,mode,paused,muted,vibration});
  const [kind,setKind]=useState<rules.ActionKind>('move');
  useEffect(()=>{if(hint!==null)setKind(rules.actionKind(hint));},[hint]);
  const legal=rules.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);
  const playable=!busy&&!paused&&!aiTurn&&!terminal.done&&mode==='human';
  const actions=playable?legal.filter(a=>rules.actionKind(a)===kind):[];
  const status=error?'MOVE PAUSED':terminal.done?terminal.winner===0?'IT’S A DRAW!':terminal.winner===1?mode==='watch'?'GOLD WINS!':'YOU WIN!':'RUNE WINS!':busy?hintPending?'FINDING A HINT…':'RUNE IS THINKING…':mode==='watch'?'WATCH THEM PLAY':'YOUR TURN';
  return <section className="match-screen terraform-match">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{difficulty}</span><span>{mode==='watch'?'AI vs AI':'You vs Rune'}</span><button className="round-button small help-shortcut" onClick={onHelp} aria-label="How to play"><CircleHelp/></button></div>
    <div className={`turn-banner ${terminal.done?'match-ended':''}`} role="status">{status}</div>
    <div className="players"><span className={state.player===1&&!terminal.done?'player-active':''}><i className="gold"/>{mode==='watch'?'GOLD':'YOU'}</span><span className="move-count">TURN {state.turn+(terminal.done?0:1)} / 80</span><span className={state.player===-1&&!terminal.done?'player-active':''}><i className="purple"/>{mode==='watch'?'PURPLE':'RUNE'}</span></div>
    <div className="terrain-frame"><div className="terrain-columns" aria-hidden="true">{['A','B','C','D','E'].map(c=><span key={c}>{c}</span>)}</div><TerrainBoard state={state} kind={kind} activeActions={actions} hint={hint} disabled={!playable} onCell={cell=>{const action=actions.find(a=>rules.destination(state,a)===cell);if(action!==undefined)play(action);}}/><div className="terrain-key" aria-hidden="true"><span>LOW</span>{[0,1,2,3].map(h=><i key={h} className={`key-height-${h}`}>{h}</i>)}<span>SUMMIT</span></div></div>
    <div className="terrain-modes" aria-label="Choose action">{(['move','raise','lower'] as const).map(action=><button key={action} className={kind===action?'selected':''} onClick={()=>setKind(action)} disabled={!playable} aria-pressed={kind===action}>{action==='move'?<Footprints/>:action==='raise'?<ArrowUp/>:<ArrowDown/>}<span>{labels[action]}</span></button>)}</div>
    {playable&&legal.includes(250)&&<button className="chunky purple-button swap-climbers" onClick={()=>play(250)}>SWAP CLIMBERS</button>}
    {history.length>1&&state.units[0]===history[history.length-2].units[1]&&state.units[1]===history[history.length-2].units[0]&&<p className="hint-message" role="status">Climbers swapped. Your climber is still gold.</p>}
    {hint!==null&&!busy&&<p className="hint-message" role="status">Try {rules.describeAction(state,hint)} — it’s glowing.</p>}
    <div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length<2||mode==='watch'}><Undo2/><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={!playable}><Lightbulb/><span>HINT</span></button><button className="chunky purple-button" onClick={()=>{reset();setKind('move');}}><RotateCcw/><span>NEW GAME</span></button></div>
    {terminal.done&&<button className="chunky coral-button rematch" onClick={()=>{reset();setKind('move');}}>PLAY AGAIN</button>}
    {error&&<MatchError message={error} onRetry={retry}/>}
    {showSearch&&<details className="search-details" open><summary>Search & move history</summary><SearchInsights reply={reply} history={history} describe={rules.describeAction}/><p className="history">{actionHistory.map((action,i)=>`${i+1}. ${rules.describeAction(history[i],action)}`).join(' · ')||'No moves yet.'}</p></details>}
  </section>;
}
