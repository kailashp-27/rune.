import {useId,useState} from 'react';
import {difficulties,type Difficulty} from '../data';
export function DifficultySlider({value,onChange}:{value:Difficulty;onChange:(value:Difficulty)=>void}){
  const id=useId();
  const [position,setPosition]=useState({level:value,percent:difficulties.indexOf(value)*50});
  // Keep the thumb wherever it was dragged, including between tier landmarks.
  const percent=position.level===value?position.percent:difficulties.indexOf(value)*50;
  return <div className={`level-slider difficulty-${value.toLowerCase()}`}>
    <label className="sr-only" htmlFor={id}>Difficulty</label>
    <input id={id} className="difficulty-slider" type="range" min={0} max={100} step="any" value={percent} aria-valuetext={value} onChange={e=>{
      const next=Number(e.target.value);
      const level=difficulties[Math.min(2,Math.round(next/50))];
      setPosition({level,percent:next});
      onChange(level);
    }}/>
    <div className="difficulty-labels" aria-hidden="true">{difficulties.map(level=><span key={level} className={level===value?'selected':''}>{level}</span>)}</div>
  </div>;
}
