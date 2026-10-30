import {ArrowRight} from 'lucide-react';
import type {Mode} from '../data';
export function latestMove<S extends {player:1|-1}>(history:S[],actions:number[],mode:Mode){
  for(let i=actions.length-1;i>=0;i--)if(mode==='watch'||history[i].player===-1)return{before:history[i],after:history[i+1],action:actions[i],player:history[i].player};
  return null;
}
export function LastMove({text}:{text:string|null}){return text?<div className="last-move" role="status"><ArrowRight size={18}/><span>{text}</span></div>:null;}
