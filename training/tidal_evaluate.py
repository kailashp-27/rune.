"""Reproducible Tidal Lock bot balance and checkpoint benchmarks."""
import argparse
import hashlib
import json
import random
from pathlib import Path
from training.games import tidal as game
from training.core.transitions import initial, advance


def evaluate(state):
    score=0
    for line in game.LINES:
        own=sum(state['board'][c]==state['player'] for c in line)
        opponent=sum(state['board'][c]==-state['player'] for c in line)
        if not opponent:score+=(0,2,12,90,10000)[own]
        if not own:score-=(0,2,12,90,10000)[opponent]
    return score


def choose(state, mode, rng):
    actions=[a for a,ok in enumerate(game.legalMoves(state)) if ok]
    if mode=='random':return rng.choice(actions)
    scores=[]
    for action in actions:
        values=[]
        for wave in game.chanceOutcomes(state):
            after=game.applyMove(state,action,wave);terminal=game.isTerminal(after)
            values.append(terminal['winner']*state['player']*100000 if terminal['done'] else -evaluate(after))
        scores.append(sum(values)/len(values))
    return rng.choice([a for a,score in zip(actions,scores) if score==max(scores)])


def balance(games,mode,seed):
    rng=random.Random(seed);counts={1:0,-1:0,0:0};turns=0;nudges=0
    for _ in range(games):
        state=initial(game,rng)
        while not (terminal:=game.isTerminal(state))['done']:
            action=choose(state,mode,rng);nudges+=action>=25;state=advance(game,state,action,rng)
        counts[terminal['winner']]+=1;turns+=state['turn']
    return dict(games=games,gold_wins=counts[1],purple_wins=counts[-1],draws=counts[0],gold_win_rate=counts[1]/games,average_length=turns/games,nudges=nudges,seed=seed)


def benchmark(path,games,simulations):
    import torch
    from training.core.contracts import checkpoint_game
    from training.core.network import PolicyValueNet,evaluator
    from training.core.mcts import search
    torch.set_num_threads(2)
    checkpoint=torch.load(path,map_location='cpu',weights_only=True)
    if checkpoint_game(checkpoint)[0]!='tidal':raise ValueError('A Tidal Lock checkpoint is required')
    model=PolicyValueNet(**checkpoint['config']).eval();model.load_state_dict(checkpoint['state_dict'])
    infer=evaluator(model,game,'cpu');results={}
    for opponent in ('random','heuristic'):
        counts={'wins':0,'losses':0,'draws':0};lengths=[]
        for index in range(games):
            rng=random.Random(1900+index//2);seat=1 if index%2==0 else -1;state=initial(game,rng)
            # Paired random opening avoids repeatedly testing one deterministic line.
            state=advance(game,state,choose(state,'random',rng),rng)
            wave_rng=random.Random(2900+index//2)
            while not (terminal:=game.isTerminal(state))['done']:
                if state['player']==seat:
                    policy=search(game,state,infer,simulations,rng=rng)
                    action=max(range(game.ACTION_SIZE),key=policy.__getitem__)
                else:action=choose(state,opponent,rng)
                state=advance(game,state,action,wave_rng)
            counts['draws' if terminal['winner']==0 else 'wins' if terminal['winner']==seat else 'losses']+=1
            lengths.append(state['turn'])
        results[opponent]={**counts,'games':games,'score':(counts['wins']+.5*counts['draws'])/games,'average_length':sum(lengths)/games}
    return dict(checkpoint_sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),simulations=simulations,games_per_opponent=games,opponents=results,scope='Neural PUCT, alternating seats with paired one-action random openings; no tactical override. Small local strength sample, not Elo or solved play.')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--checkpoint')
    parser.add_argument('--games',type=int,default=1000)
    parser.add_argument('--heuristic-games',type=int,default=200)
    parser.add_argument('--simulations',type=int,default=64)
    parser.add_argument('--output',default='training/reports/tidal-balance.json')
    args=parser.parse_args()
    if min(args.games,args.heuristic_games,args.simulations)<1:parser.error('Positive counts required')
    if args.checkpoint and args.games%2:parser.error('Benchmark games must be even')
    result={'rules':game.RULES_VERSION,'benchmark':benchmark(args.checkpoint,args.games,args.simulations)} if args.checkpoint else {'rules':game.RULES_VERSION,'random':balance(args.games,'random',42),'heuristic':balance(args.heuristic_games,'heuristic',43),'scope':'Random and one-ply self-play only; not a proof of balanced optimal play.'}
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))


if __name__=='__main__':main()
