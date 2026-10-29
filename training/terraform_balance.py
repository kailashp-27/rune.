"""Seeded alpha-rule balance smoke test, not a solved-game advantage estimate."""
import argparse
import json
import random
import time
from pathlib import Path
from training.games import terraform as game

def evaluate(state):
    index=0 if state['player']==1 else 1
    def potential(cell):
        value=0
        for target in game.NEIGHBORS[cell]:
            if target<0 or target in state['units']:continue
            height=state['board'][target]
            if height<=state['board'][cell]+1:value+=450 if height==3 else 4+height*4
            elif height==state['board'][cell]+2:value+=3
        distance=max(abs(cell//5-2),abs(cell%5-2))
        return state['board'][cell]*90+value-distance*3
    return potential(state['units'][index])-potential(state['units'][1-index])

def heuristic_action(state,rng):
    choices=[]
    for action,legal in enumerate(game.legalMoves(state)):
        if not legal:continue
        next_state=game.applyMove(state,action)
        terminal=game.isTerminal(next_state)
        score=terminal['winner']*state['player']*100000 if terminal['done'] else -evaluate(next_state)
        if state['turn']==0:
            score=min(score,evaluate(game.applyMove(next_state,250)))
        choices.append((action,score))
    best=max(value for _,value in choices)
    return rng.choice([action for action,value in choices if value==best])

def audit(count,mode,seed):
    rng=random.Random(seed);counts={'gold_wins':0,'purple_wins':0,'draws':0};lengths=[]
    for _ in range(count):
        state=game.initialState()
        while not (terminal:=game.isTerminal(state))['done']:
            if mode=='random':action=rng.choice([a for a,ok in enumerate(game.legalMoves(state)) if ok])
            else:action=heuristic_action(state,rng)
            state=game.applyMove(state,action)
        counts['gold_wins' if terminal['winner']==1 else 'purple_wins' if terminal['winner']==-1 else 'draws']+=1
        lengths.append(state['turn'])
    decisive=counts['gold_wins']+counts['purple_wins']
    return {**counts,'games':count,'first_player_win_rate':counts['gold_wins']/count,'first_player_share_of_decisive':counts['gold_wins']/decisive if decisive else None,'average_length':sum(lengths)/count,'seed':seed}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--games',type=int,default=1000)
    parser.add_argument('--heuristic-games',type=int,default=200)
    parser.add_argument('--output',default='training/reports/terraform-balance.json')
    args=parser.parse_args()
    if min(args.games,args.heuristic_games)<1:parser.error('Game counts must be positive')
    started=time.perf_counter()
    result={'rules':game.RULES_VERSION,'random':audit(args.games,'random',42),'heuristic':audit(args.heuristic_games,'heuristic',43),'elapsed_seconds':time.perf_counter()-started,'scope':'Random and one-ply self-play with opening-swap awareness and random tie-breaking; not a proof of balance or browser opponent strength.'}
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

if __name__=='__main__':main()
