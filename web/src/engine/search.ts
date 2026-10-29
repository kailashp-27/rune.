import {applyMove,isTerminal,legalMoves,type State} from './connect4';
type Node = {state:State; children:Map<number,Node>; visits:number; value:number; prior:number};
const create=(state:State,prior=1):Node=>({state,children:new Map(),visits:0,value:0,prior});
// Untrained PUCT baseline: center-biased priors and random rollouts. Values are from side-to-move.
export function search(state:State,simulations:number,maxMs=2000) {
 const result=isTerminal(state);
 if(result.done) return {action:-1,policy:Array(7).fill(0),value:result.winner*state.player};
 const deadline=performance.now()+maxMs;
 const root=create(state);
 for(let sim=0;sim<simulations;sim++) {
  if(sim>1 && performance.now()>deadline) break;
  let node=root; const path=[node];
  while(node.children.size && !isTerminal(node.state).done) {
   let best=-Infinity, next=node;
   for(const child of node.children.values()) {const score=-(child.value/(child.visits||1))+1.5*child.prior*Math.sqrt(node.visits+1)/(1+child.visits);if(score>best){best=score;next=child;}}
   node=next;path.push(node);
  }
  let terminal=isTerminal(node.state); let value=0;
  if(terminal.done) value=terminal.winner*node.state.player;
  else {
   const moves=legalMoves(node.state).flatMap((ok,a)=>ok?[a]:[]); const weights=moves.map(a=>4-Math.abs(3-a)); const total=weights.reduce((a,b)=>a+b,0);
   moves.forEach((a,i)=>node.children.set(a,create(applyMove(node.state,a),weights[i]/total)));
   let rollout=node.state;
   while(!(terminal=isTerminal(rollout)).done){const actions=legalMoves(rollout).flatMap((ok,a)=>ok?[a]:[]);const win=actions.find(a=>isTerminal(applyMove(rollout,a)).winner===rollout.player);rollout=applyMove(rollout,win??actions[Math.floor(Math.random()*actions.length)]);}
   value=terminal.winner*node.state.player;
  }
  for(let i=path.length-1;i>=0;i--){path[i].visits++;path[i].value+=value;value=-value;}
 }
 const visits=Array(7).fill(0); for(const [a,n] of root.children) visits[a]=n.visits;
 // Always take an immediate win; don't overlook an immediate opponent threat.
 const legal=legalMoves(state).flatMap((ok,a)=>ok?[a]:[]);
 const win=legal.find(a=>isTerminal(applyMove(state,a)).winner===state.player);
 const safe=legal.filter(a=>{const next=applyMove(state,a);return !legalMoves(next).some((ok,b)=>ok&&isTerminal(applyMove(next,b)).winner===next.player);});
 const candidates=safe.length?safe:legal;
 const action=win??candidates.reduce((best,a)=>visits[a]>visits[best]?a:best,candidates[0]);
 return {action,policy:visits.map(n=>n/Math.max(1,visits.reduce((a,b)=>a+b,0))),value:root.value/Math.max(1,root.visits)};
}
