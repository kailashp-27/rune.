import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
interface Round {iteration:number;loss:number;arena_score:number;average_length:number;promoted:boolean}
interface Benchmark {games_per_opponent:number;opponents:Record<string,{wins:number;losses:number;draws:number;score:number}>}
interface Run {id:string;method:string;games:number;rounds:Round[];benchmark:Benchmark|null;teacher?:{games:number;steps:number}|null}
interface Game {id:string;name:string;rulesVersion:string;runs:Run[];releasedDifficulties:string[]}
interface Report {schemaVersion:number;games:Game[];scope:string}
export function TrainingProgress({onClose}:{onClose:()=>void}) {
  const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[gameId,setGameId]=useState('pulse'),[runId,setRunId]=useState('');
  useEffect(()=>{const controller=new AbortController();void fetch('/training.json',{signal:controller.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then((data:Report)=>{if(data.schemaVersion!==1||!Array.isArray(data.games))throw new Error();setReport(data);}).catch(()=>{if(!controller.signal.aborted)setError('Training history is unavailable. Please try again.');});return()=>controller.abort();},[]);
  const game=report?.games.find(g=>g.id===gameId),run=game?.runs.find(r=>r.id===runId)??game?.runs.at(-1),rounds=run?.rounds??[];
  const maximum=Math.max(1,...rounds.map(r=>r.loss));
  const points=(kind:'loss'|'arena_score')=>rounds.map((r,i)=>`${32+i*256/Math.max(1,rounds.length-1)},${132-(kind==='loss'?r.loss/maximum:r.arena_score)*108}`).join(' ');
  return <Dialog title="Rune’s training" onClose={onClose} className="full-page-dialog training-page">
    <p className="dialog-copy">See how Rune is learning.</p>
    <label className="progress-label" htmlFor="training-game">Game</label><select id="training-game" value={gameId} onChange={e=>{setGameId(e.target.value);setRunId('');}}>{report?.games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
    {!report&&!error&&<p role="status">Loading training history…</p>}{error&&<p role="alert">{error}</p>}
    {game&&<><p className="training-status">{game.releasedDifficulties.length?`Trained opponents: ${game.releasedDifficulties.join(', ')}`:'Playing with the search opponent'}</p><p className="training-note">{game.releasedDifficulties.length?'These checkpoints passed the release checks.':'Training is experimental. A checkpoint must pass independent checks before it plays in Rune.'}</p>
    {game.runs.length>1&&<><label className="progress-label" htmlFor="training-run">Experiment</label><select id="training-run" value={run?.id??''} onChange={e=>setRunId(e.target.value)}>{game.runs.map(r=><option key={r.id} value={r.id}>{r.id}</option>)}</select></>}
    {run?<><div className="training-totals"><div><strong>{run.games}</strong><span>SELF-PLAY GAMES</span></div><div><strong>{rounds.length}</strong><span>TRAINING ROUNDS</span></div></div><p className="training-note">{run.method}{run.teacher?` · ${run.teacher.games} teacher games · ${run.teacher.steps} teaching steps`:''}</p>
      {rounds.length>0&&<><figure className="training-chart"><figcaption>Learning loss <span>lower is better</span></figcaption><svg viewBox="0 0 320 158" role="img" aria-label={`Learning loss by round: ${rounds.map(r=>`${r.iteration}: ${r.loss.toFixed(2)}`).join('; ')}`}><path d="M32 20V132H298"/><polyline points={points('loss')} className="loss-line"/>{rounds.map((r,i)=><circle key={r.iteration} cx={32+i*256/Math.max(1,rounds.length-1)} cy={132-r.loss/maximum*108} r="4" className="loss-dot"/>)}<text x="32" y="153">ROUND {rounds[0].iteration}</text><text x="230" y="153">ROUND {rounds.at(-1)?.iteration}</text></svg></figure>
      <figure className="training-chart"><figcaption>Arena score <span>against the previous checkpoint</span></figcaption><svg viewBox="0 0 320 158" role="img" aria-label={`Arena score by round: ${rounds.map(r=>`${r.iteration}: ${Math.round(r.arena_score*100)} percent`).join('; ')}`}><path d="M32 20V132H298"/><path d="M32 72.6H298" className="gate-line"/><polyline points={points('arena_score')} className="arena-line"/>{rounds.map((r,i)=><circle key={r.iteration} cx={32+i*256/Math.max(1,rounds.length-1)} cy={132-r.arena_score*108} r="4" className="arena-dot"/>)}<text x="32" y="153">0% TO 100% · PROMOTION AT 55%</text></svg></figure></>}
      {run.benchmark?<div className="benchmark-results"><h3>Independent checks</h3><p>{run.benchmark.games_per_opponent} games per opponent · both seats</p>{Object.entries(run.benchmark.opponents).map(([opponent,result])=><div className="benchmark-row" key={opponent}><strong>{opponent==='random'?'Random moves':'One-move heuristic'}</strong><span>{result.wins}W · {result.draws}D · {result.losses}L</span><meter min={0} max={1} value={result.score} aria-label={`${opponent} score ${Math.round(result.score*100)} percent`}/></div>)}</div>:<p className="training-note">No independent benchmark recorded for this experiment yet.</p>}
    </>:<p className="training-note">Training history will appear after the first completed run.</p>}
    <p className="training-footnote">Scores include half a point for a draw. Arena promotion alone does not qualify a released model. Win probabilities and Elo will appear after they have been measured.</p></>}
  </Dialog>;
}
