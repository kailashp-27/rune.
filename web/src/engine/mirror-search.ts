import * as game from './mirror';
export function evaluate(s:game.State){let value=0;for(let c=0;c<25;c++)value+=s.board[c]*s.player*(90+5*(4-Math.abs(Math.floor(c/5)-2)-Math.abs(c%5-2)));return value;}
export function searchMirror(state:game.State,maxDepth=3,maxMs=450){
  const actions=game.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);if(!actions.length)throw new Error('No legal move');
  const deadline=performance.now()+Math.max(1,maxMs),timeout=new Error('Search deadline');let nodes=0;
  function rank(s:game.State){return game.legalMoves(s).flatMap((ok,a)=>ok?[{action:a,state:game.applyMove(s,a)}]:[]).sort((a,b)=>evaluate(a.state)-evaluate(b.state));}
  function visit(s:game.State,depth:number,alpha:number,beta:number):number{
    nodes++;if(performance.now()>=deadline)throw timeout;const end=game.isTerminal(s);if(end.done)return end.winner*s.player*100000;if(!depth)return evaluate(s);
    let best=-Infinity;for(const next of rank(s)){const score=-visit(next.state,depth-1,-beta,-alpha);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;}return best;
  }
  let candidates=actions.map(action=>{const next=game.applyMove(state,action),end=game.isTerminal(next);return{action,score:end.done?end.winner*state.player*100000:-evaluate(next)};}).sort((a,b)=>b.score-a.score),depth=0;
  if(candidates[0].score===100000)return{action:candidates[0].action,depth:1,nodes,candidates:candidates.slice(0,3)};
  for(let d=1;d<=maxDepth;d++){try{const next=candidates.map(({action})=>({action,score:-visit(game.applyMove(state,action),d-1,-Infinity,Infinity)})).sort((a,b)=>b.score-a.score);candidates=next;depth=d;}catch(error){if(error!==timeout)throw error;break;}}
  return{action:candidates[0].action,depth,nodes,candidates:candidates.slice(0,3)};
}
