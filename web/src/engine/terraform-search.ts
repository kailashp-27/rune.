import { applyMove, isTerminal, rawLegal, destination, actionKind, NEIGHBORS, type State } from './terraform';

export function evaluate(s:State):number {
  const index=s.player===1?0:1, own=s.units[index],opponent=s.units[1-index];
  const potential=(cell:number)=>{
    let value=0;
    for(const target of NEIGHBORS[cell])if(target>=0&&!s.units.includes(target)){
      const h=s.board[target];
      if(h<=s.board[cell]+1)value+=h===3?450:4+h*4;
      else if(h===s.board[cell]+2)value+=3;
    }
    const centerDistance=Math.max(Math.abs(Math.floor(cell/5)-2),Math.abs(cell%5-2));
    return s.board[cell]*90+value-centerDistance*3;
  };
  return potential(own)-potential(opponent);
}

export function searchTerraform(state:State,maxDepth=3,maxMs=450) {
  const started=performance.now(), deadline=started+maxMs;
  let nodes=0;
  const expired=Symbol('deadline');
  const actions=(s:State)=>rawLegal(s).flatMap((ok,a)=>ok?[a]:[]).sort((a,b)=>{
    const priority=(action:number)=>actionKind(action)==='move'?20+s.board[destination(s,action)]*20:actionKind(action)==='raise'?5:0;
    return priority(b)-priority(a);
  });
  function negamax(s:State,depth:number,alpha:number,beta:number):number {
    nodes++;if((nodes&63)===0&&performance.now()>deadline)throw expired;
    const terminal=isTerminal(s);
    if(terminal.done)return terminal.winner*s.player*(100000+depth);
    if(depth===0)return evaluate(s);
    let value=-Infinity;
    for(const action of actions(s)){
      value=Math.max(value,-negamax(applyMove(s,action),depth-1,-beta,-alpha));
      alpha=Math.max(alpha,value);if(alpha>=beta)break;
    }
    return value;
  }
  if(isTerminal(state).done)return{action:-1,depth:0,nodes:0,candidates:[],elapsedMs:0};
  const legal=actions(state);
  const win=legal.find(a=>isTerminal(applyMove(state,a)).winner===state.player);
  if(win!==undefined)return{action:win,depth:1,nodes:legal.length,candidates:[{action:win,score:100000}],elapsedMs:performance.now()-started};
  let bestAction=legal[0], completedDepth=0;
  let candidates=legal.map(action=>{const next=applyMove(state,action);let score=-evaluate(next);if(state.turn===0)score=Math.min(score,evaluate(applyMove(next,250)));return{action,score};}).sort((a,b)=>b.score-a.score);
  bestAction=candidates[0].action;
  for(let depth=1;depth<=maxDepth;depth++){
    if(performance.now()>deadline)break;
    const current:typeof candidates=[];
    try {
      for(const previous of candidates){
        if(performance.now()>deadline)throw expired;
        const next=applyMove(state,previous.action);
        let score=-negamax(next,depth-1,-Infinity,Infinity);
        if(depth===1&&state.turn===0)score=Math.min(score,evaluate(applyMove(next,250)));
        current.push({action:previous.action,score});
      }
      current.sort((a,b)=>b.score-a.score);
      candidates=current;bestAction=current[0].action;completedDepth=depth;
      if(current[0].score>=100000)break;
    } catch(error){if(error!==expired)throw error;break;}
  }
  return{action:bestAction,depth:completedDepth,nodes,candidates:candidates.slice(0,5),elapsedMs:performance.now()-started};
}
