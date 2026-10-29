"""Seeded Pulse prototype balance audit; not a solved-game strength estimate."""
import argparse
import json
import random
import hashlib
from pathlib import Path
from training.games import pulse as game


def evaluate(state):
    return sum(owner*state['player']*(20+state['strength'][c]*3+state['level'][c]*18+(45 if state['level'][c] else 0)) for c,owner in enumerate(state['board']))


def choose(state,mode,rng):
    actions=[a for a,ok in enumerate(game.legalMoves(state)) if ok]
    if mode=='random':return rng.choice(actions)
    scores=[]
    for action in actions:
        next_state=game.applyMove(state,action);terminal=game.isTerminal(next_state)
        scores.append(terminal['winner']*state['player']*100000 if terminal['done'] else -evaluate(next_state))
    best=max(scores)
    return rng.choice([a for a,score in zip(actions,scores) if score==best])


def audit(count,mode,seed):
    rng=random.Random(seed);results={1:0,-1:0,0:0};length=0
    for _ in range(count):
        state=game.initialState()
        while not (terminal:=game.isTerminal(state))['done']:
            state=game.applyMove(state,choose(state,mode,rng))
        results[terminal['winner']]+=1;length+=state['turn']
    return dict(games=count,gold_wins=results[1],purple_wins=results[-1],draws=results[0],first_player_win_rate=results[1]/count,average_length=length/count,seed=seed)


def benchmark(path,games,simulations):
    import torch
    from training.core.contracts import checkpoint_game
    from training.core.network import PolicyValueNet,evaluator
    from training.core.mcts import search
    torch.set_num_threads(2)
    checkpoint=torch.load(path,map_location='cpu',weights_only=True)
    if checkpoint_game(checkpoint)[0]!='pulse':raise ValueError('A Pulse checkpoint is required')
    model=PolicyValueNet(**checkpoint['config']).eval();model.load_state_dict(checkpoint['state_dict']);infer=evaluator(model,game,'cpu');opponents={}
    for opponent in ('random','heuristic'):
        results={'wins':0,'draws':0,'losses':0};turns=0
        for index in range(games):
            rng=random.Random(2600+index//2);seat=1 if index%2==0 else -1;state=game.initialState()
            for _ in range(2):state=game.applyMove(state,choose(state,'random',rng))
            while not (terminal:=game.isTerminal(state))['done']:
                if state['player']==seat:
                    policy=search(game,state,infer,simulations,rng=rng);action=max(range(game.ACTION_SIZE),key=policy.__getitem__)
                else:action=choose(state,opponent,rng)
                state=game.applyMove(state,action)
            results['draws' if terminal['winner']==0 else 'wins' if terminal['winner']==seat else 'losses']+=1;turns+=state['turn']
        opponents[opponent]={**results,'score':(results['wins']+.5*results['draws'])/games,'average_length':turns/games}
    return dict(checkpoint_sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),games_per_opponent=games,simulations=simulations,opponents=opponents,scope='Neural PUCT without a tactical override, alternating seats with paired two-action random openings. Not Elo or optimal-play strength.')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--games',type=int,default=1000)
    parser.add_argument('--heuristic-games',type=int,default=200)
    parser.add_argument('--output',default='training/reports/pulse-balance.json')
    parser.add_argument('--checkpoint')
    parser.add_argument('--simulations',type=int,default=32)
    args=parser.parse_args()
    if min(args.games,args.heuristic_games,args.simulations)<1:parser.error('Positive game counts required')
    if args.checkpoint and args.games%2:parser.error('Benchmark games must be even')
    report=dict(rules=game.RULES_VERSION,benchmark=benchmark(args.checkpoint,args.games,args.simulations)) if args.checkpoint else dict(rules=game.RULES_VERSION,random=audit(args.games,'random',42),heuristic=audit(args.heuristic_games,'heuristic',43),scope='Random and one-ply self-play only; not optimal-play balance or measured browser search strength.')
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))


if __name__=='__main__':main()
