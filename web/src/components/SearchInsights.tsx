import type { SearchReply } from './useMatch';

export function SearchInsights<S extends {turn:number}>({reply,history,describe}:{reply:SearchReply|null;history:S[];describe:(state:S,action:number)=>string}) {
  const evaluated=history.find(state=>state.turn===reply?.evaluatedTurn);
  const candidates=reply?.policy?reply.policy.map((probability,action)=>({action,probability})).filter(c=>c.probability>0).sort((a,b)=>b.probability-a.probability).slice(0,3):reply?.candidates?.map(c=>({action:c.action,probability:undefined,score:c.score}));
  return <div className="search-insights">
    <p>{reply?reply.engine==='neural'?`Trained model · ${reply.modelId}`:reply.fallbackReason?'Search opponent · model unavailable':'Search opponent':'Analysis appears after a hint or Rune’s move.'}</p>
    {reply&&<p>{reply.engine==='neural'?`${reply.simulations??0} simulations`:`Depth ${reply.depth??0} · ${reply.nodes??0} positions`}{reply.evaluatedTurn!==undefined?` · before move ${reply.evaluatedTurn+1}`:''}</p>}
    {evaluated&&candidates?.length?<><p className="analysis-caption">{reply?.policy?'Search visits · these are move preferences':'Top moves · search scores'}</p><ol className="candidate-moves">{candidates.map(c=><li key={c.action}><span>{describe(evaluated,c.action)}</span><strong>{c.probability!==undefined?`${Math.round(c.probability*100)}%`:'score' in c?Math.round(c.score??0):''}</strong>{c.probability!==undefined&&<meter min={0} max={1} value={c.probability} aria-label={`Search visits for ${describe(evaluated,c.action)}`}/>}</li>)}</ol></>:null}
    {reply?.engine==='neural'&&Number.isFinite(reply.value)&&<p>Model value {reply.value!.toFixed(2)} for {reply.evaluatedPlayer===1?'Gold':'Purple'} at that position. Uncalibrated estimate.</p>}
  </div>;
}
