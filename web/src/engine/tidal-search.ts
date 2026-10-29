import * as game from './tidal';
export function evaluate(state:game.State){
  let score=0;
  for(const line of game.lines){
    let own=0,opponent=0;
    for(const c of line){own+=Number(state.board[c]===state.player);opponent+=Number(state.board[c]===-state.player);}
    if(!opponent)score+=[0,2,12,90,10000][own];
    if(!own)score-=[0,2,12,90,10000][opponent];
  }return score;
}
export function searchTidal(state:game.State,maxDepth=3,maxMs=450){
  const actions=game.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);
  if(!actions.length)throw new Error('No legal move');
  const deadline=performance.now()+Math.max(1,maxMs);let nodes=0;
  const timeout=new Error('Search deadline');
  function visit(s:game.State,depth:number):number{
    nodes++;if(performance.now()>=deadline)throw timeout;
    const terminal=game.isTerminal(s);
    if(terminal.done)return terminal.winner*s.player*100000;
    if(depth===0)return evaluate(s);
    return Math.max(...game.legalMoves(s).flatMap((ok,a)=>ok?[actionScore(s,a,depth)]:[]));
  }
  function actionScore(s:game.State,action:number,depth:number){
    const waves=game.chanceOutcomes(s);
    return waves.reduce((sum,wave)=>sum-visit(game.applyMove(s,action,wave),depth-1),0)/waves.length;
  }
  // Only a completed line is a guaranteed win, independently of future water.
  const immediate=actions.find(a=>{const next=game.applyMove(state,a,game.chanceOutcomes(state)[0]);return game.lines.some(line=>line.every(c=>next.board[c]===state.player));});
  if(immediate!==undefined)return{action:immediate,depth:1,nodes,candidates:[{action:immediate,score:100000}],engine:'heuristic'};
  let candidates=actions.map(action=>({action,score:-evaluate(game.applyMove(state,action,game.chanceOutcomes(state)[0]))})).sort((a,b)=>b.score-a.score),depth=0;
  for(let d=1;d<=maxDepth;d++){
    try{
      const next=candidates.map(({action})=>({action,score:actionScore(state,action,d)})).sort((a,b)=>b.score-a.score);
      candidates=next;depth=d;
    }catch(error){if(error!==timeout)throw error;break;}
  }
  return{action:candidates[0].action,depth,nodes,candidates:candidates.slice(0,3),engine:'heuristic'};
}
