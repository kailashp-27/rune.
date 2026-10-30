import type {Game,Mode} from '../data';

export interface Statistics {wins:number;losses:number;draws:number;currentStreak:number;bestStreak:number}
interface SavedStatistics extends Statistics {finishedIds:string[]}
type StatsStorage=Pick<Storage,'getItem'|'setItem'>;
const session=new Map<string,string>();
const unavailable=new WeakSet<StatsStorage>();
const empty=():SavedStatistics=>({wins:0,losses:0,draws:0,currentStreak:0,bestStreak:0,finishedIds:[]});
function browserStorage():StatsStorage|null {try{return localStorage;}catch{return null;}}
const key=(game:Game['id'],mode:Mode)=>`rune.v1.statistics.${game}.${mode}`;

function load(game:Game['id'],mode:Mode,storage:StatsStorage|null):SavedStatistics {
  try{
    const name=key(game,mode);
    let raw:string|null;
    try{raw=storage&&!unavailable.has(storage)?storage.getItem(name):session.get(name)??null;}catch{if(storage)unavailable.add(storage);raw=session.get(name)??null;}
    const value=JSON.parse(raw??'null');
    if(!value||!['wins','losses','draws','currentStreak','bestStreak'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0)
      ||value.currentStreak>value.bestStreak||value.bestStreak>value.wins
      ||!Array.isArray(value.finishedIds)||!value.finishedIds.every((id:unknown)=>typeof id==='string'))return empty();
    return value;
  }catch{return empty();}
}

export function readStatistics(game:Game['id'],mode:Mode,storage:StatsStorage|null=browserStorage()):Statistics {
  const {wins,losses,draws,currentStreak,bestStreak}=load(game,mode,storage);
  return {wins,losses,draws,currentStreak,bestStreak};
}

/** Completed matches only. Friend results are recorded from Gold's perspective. */
export function recordResult(game:Game['id'],mode:Mode,matchId:string,winner:number,storage:StatsStorage|null=browserStorage()):void {
  if(![-1,0,1].includes(winner))throw new Error('Invalid result');
  const stats=load(game,mode,storage);
  if(stats.finishedIds.includes(matchId))return;
  if(winner===1){stats.wins++;stats.currentStreak++;stats.bestStreak=Math.max(stats.bestStreak,stats.currentStreak);}
  else{if(winner===-1)stats.losses++;else stats.draws++;stats.currentStreak=0;}
  stats.finishedIds=[...stats.finishedIds,matchId].slice(-300);
  const name=key(game,mode),raw=JSON.stringify(stats);
  session.set(name,raw);
  try{storage?.setItem(name,raw);}catch{if(storage)unavailable.add(storage);}
}
