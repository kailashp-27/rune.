import {useState} from 'react';
import type {Game,Mode} from '../data';
import {readStatistics} from '../engine/statistics';
import {Dialog} from './Dialog';
import {GameArt} from './GameArt';

export function StatisticsDialog({game,initialMode,onClose}:{game:Game;initialMode:Mode;onClose:()=>void}){
  const [mode,setMode]=useState(initialMode);
  const stats=readStatistics(game.id,mode),total=stats.wins+stats.losses+stats.draws;
  const rows=[
    [mode==='friend'?'Gold wins':'Wins',stats.wins],
    [mode==='friend'?'Purple wins':'Losses',stats.losses],
    ['Draws',stats.draws],
    [mode==='friend'?'Gold win percentage':'Win percentage',`${total?Math.round(stats.wins/total*100):0}%`],
    [mode==='friend'?'Gold current streak':'Current streak',stats.currentStreak],
    [mode==='friend'?'Gold best streak':'Best streak',stats.bestStreak],
  ];
  return <Dialog title="Statistics" onClose={onClose} className="statistics-dialog">
    <div className={`statistics-icon card-${game.id}`} style={{background:game.background}}><GameArt kind={game.id}/></div>
    <p className="statistics-game">{game.name}</p>
    <div className="mode-picker" aria-label="Statistics mode"><button className={mode==='human'?'selected':''} aria-pressed={mode==='human'} onClick={()=>setMode('human')}>You vs Rune</button><button className={mode==='friend'?'selected':''} aria-pressed={mode==='friend'} onClick={()=>setMode('friend')}>Play vs. Friend</button></div>
    <dl className="statistics-panel">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="statistics-note">{mode==='friend'?'Two players on this device. Streaks are from Gold’s side.':'Completed games on this device. Draws end a winning streak.'}</p>
    <button className="chunky purple-button wide" onClick={onClose}>OK</button>
  </Dialog>;
}
