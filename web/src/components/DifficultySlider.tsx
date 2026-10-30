import {useId} from 'react';
import {difficulties,type Difficulty} from '../data';
export function DifficultySlider({value,onChange,compact=false}:{value:Difficulty;onChange:(value:Difficulty)=>void;compact?:boolean}){
  const id=useId();
  return <div className={`level-slider ${compact?'level-slider-compact':''} difficulty-${value.toLowerCase()}`}><label className="sr-only" htmlFor={id}>Difficulty</label><input id={id} className="difficulty-slider" type="range" min={0} max={2} step={1} value={difficulties.indexOf(value)} aria-valuetext={value} onChange={e=>onChange(difficulties[Number(e.target.value)])}/><div className="difficulty-labels">{difficulties.map(level=><button key={level} className={level===value?'selected':''} aria-pressed={level===value} onClick={()=>onChange(level)}>{level}</button>)}</div></div>;
}
