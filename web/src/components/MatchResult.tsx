import {useState} from 'react';
import {Trophy,Handshake} from 'lucide-react';
import {Dialog} from './Dialog';
import type {Mode} from '../data';
export function MatchResult({winner,mode,onReplay,onBack}:{winner:number;mode:Mode;onReplay:()=>void;onBack:()=>void}){
  const [open,setOpen]=useState(true);
  if(!open)return null;
  const title=winner===0?'It’s a draw!':mode==='watch'?winner===1?'Gold wins!':'Purple wins!':winner===1?'You win!':'Rune wins!';
  return <Dialog title={title} onClose={()=>setOpen(false)} className="result-dialog"><div className={`result-medal ${winner===0?'result-draw':''}`}>{winner===0?<Handshake size={64}/>:<Trophy size={64}/>}</div><p className="dialog-copy">{winner===0?'An evenly matched battle. Ready for another?':winner===1&&mode==='human'?'Well played. Your next challenge is waiting.':'A good battle. Ready for a rematch?'}</p><button className="chunky coral-button wide" onClick={onReplay}>TRY AGAIN</button><button className="chunky purple-button wide" onClick={onBack}>BACK TO GAMES</button></Dialog>;
}
