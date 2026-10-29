import { CircleHelp, Lightbulb, RotateCcw, Undo2 } from 'lucide-react';
import * as rules from '../engine/connect4';
import { budgets, type Difficulty, type Mode } from '../data';
import { useMatch } from './useMatch';
const createWorker=()=>new Worker(new URL('../workers/ai.worker.ts',import.meta.url),{type:'module'});
const request=(state:rules.State,difficulty:Difficulty)=>({state,difficulty,simulations:budgets[difficulty]});
export function GameScreen({ difficulty, mode, muted, vibration, paused, showSearch, onHelp }: {
  difficulty: Difficulty; mode: Mode; muted: boolean; vibration: boolean; paused: boolean; showSearch: boolean; onHelp: () => void;
}) {
  const {state,history,terminal,aiTurn,busy,hintPending,hint,reply,error,play:move,reset,undo,requestHint}=useMatch({rules,createWorker,request,difficulty,mode,muted,vibration,paused});
  const legal=rules.legalMoves(state),winning=rules.winningCells(state),analysis=reply?.policy??null;
  const engineInfo=reply?.engine==='neural'?`Neural search · ${reply.modelId}`:reply?.fallbackReason?'Search baseline · model unavailable':'Search baseline';
  const status = terminal.done
    ? terminal.winner === 0 ? 'IT’S A DRAW!' : terminal.winner === 1 ? mode === 'watch' ? 'GOLD WINS!' : 'YOU WIN!' : 'RUNE WINS!'
    : busy ? hintPending ? 'FINDING A HINT…' : 'RUNE IS THINKING…' : mode === 'watch' ? 'WATCH THEM PLAY' : 'YOUR TURN';

  return <section className="match-screen">
    <div className="match-meta"><span className={`difficulty-tag tag-${difficulty.toLowerCase()}`}>{difficulty}</span><span>{mode === 'watch' ? 'AI vs AI' : 'You vs Rune'}</span><button className="round-button small help-shortcut" onClick={onHelp} aria-label="How to play"><CircleHelp size={25} /></button></div>
    <div className={`turn-banner ${terminal.done ? 'match-ended' : ''}`} role="status" aria-live="polite">{status}</div>
    <div className="players"><span className={state.player === 1 && !terminal.done ? 'player-active' : ''}><i className="gold" />{mode === 'watch' ? 'GOLD' : 'YOU'}</span><span className="move-count">MOVE {state.turn + (terminal.done ? 0 : 1)}</span><span className={state.player === -1 && !terminal.done ? 'player-active' : ''}><i className="purple" />{mode === 'watch' ? 'PURPLE' : 'RUNE'}</span></div>
    <div className="board-base"><div className="play-board" aria-label="Connect Four board">
      {Array.from({ length: 7 }, (_, c) => <button key={c} className={`play-column ${hint === c ? 'hint-column' : ''}`} aria-label={`Drop piece in column ${c + 1}`} disabled={paused || busy || aiTurn || !legal[c] || mode === 'watch'} onClick={() => move(c)}>
        <span className="column-arrow">▼</span>
        {Array.from({ length: 6 }, (_, r) => { const i = r * 7 + c; return <span key={r} className={`slot ${state.board[i] === 1 ? 'gold' : state.board[i] === -1 ? 'purple' : ''} ${winning.includes(i) ? 'winner' : ''}`} />; })}
      </button>)}
    </div></div>
    {hint !== null && !busy && <p className="hint-message" role="status">Try column {hint + 1} — it’s glowing on the board.</p>}
    <div className="match-actions"><button className="chunky purple-button" onClick={undo} disabled={history.length < 2 || mode === 'watch'}><Undo2 /><span>UNDO</span></button><button className="chunky purple-button" onClick={requestHint} disabled={paused || busy || aiTurn || terminal.done || mode === 'watch'}><Lightbulb /><span>HINT</span></button><button className="chunky purple-button" onClick={reset}><RotateCcw /><span>NEW GAME</span></button></div>
    {terminal.done && <button className="chunky coral-button rematch" onClick={reset}>PLAY AGAIN</button>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {showSearch && <details className="search-details" open><summary>Search & move history</summary><p>{engineInfo}</p><div className="policy-bars">{Array.from({ length: 7 }, (_, i) => <div key={i}><span style={{ height: `${Math.max(3, (analysis?.[i] ?? 0) * 100)}%` }} /><small>{i + 1}</small></div>)}</div><p>{analysis ? 'Search visits by column' : 'Search appears after Rune’s first move.'}</p><p className="history">{history.slice(1).map((s, i) => `${i + 1}. ${s.board.findIndex((value, j) => value !== history[i].board[j]) % 7 + 1}`).join(' · ') || 'No moves yet.'}</p></details>}
  </section>;
}
