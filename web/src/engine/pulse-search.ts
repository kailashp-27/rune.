import * as game from './pulse';
export const evaluate=(state:game.State)=>state.board.reduce((sum,owner,c)=>sum+owner*state.player*(20+state.strength[c]*3+state.level[c]*18+(state.level[c]?45:0)),0);
export function searchPulse(state:game.State,maxDepth=3,maxMs=450){
  const actions=game.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);
  if(!actions.length)throw new Error('No legal move');
  const deadline=performance.now()+Math.max(1,maxMs),timeout=new Error('Search deadline');let nodes=0;
  function ordered(s:game.State){return game.legalMoves(s).flatMap((ok,a)=>ok?[{action:a,state:game.applyMove(s,a)}]:[]).sort((a,b)=>evaluate(a.state)-evaluate(b.state));}
  function visit(s:game.State,depth:number,alpha:number,beta:number):number{
    nodes++;if(performance.now()>=deadline)throw timeout;
    const terminal=game.isTerminal(s);if(terminal.done)return terminal.winner*s.player*100000;
    if(!depth)return evaluate(s);
    let best=-Infinity;
    for(const next of ordered(s)){const score=-visit(next.state,depth-1,-beta,-alpha);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;}
    return best;
  }
  let candidates=actions.map(action=>{const next=game.applyMove(state,action),terminal=game.isTerminal(next);return{action,score:terminal.done?terminal.winner*state.player*100000:-evaluate(next)};}).sort((a,b)=>b.score-a.score),depth=0;
  if(candidates[0].score===100000)return{action:candidates[0].action,depth:1,nodes,candidates:candidates.slice(0,3)};
  for(let d=1;d<=maxDepth;d++){
    try{const next=candidates.map(({action})=>({action,score:-visit(game.applyMove(state,action),d-1,-Infinity,Infinity)})).sort((a,b)=>b.score-a.score);candidates=next;depth=d;}
    catch(error){if(error!==timeout)throw error;break;}
  }
  return{action:candidates[0].action,depth,nodes,candidates:candidates.slice(0,3)};
}
