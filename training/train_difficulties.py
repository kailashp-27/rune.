"""Distinct cumulative teacher checkpoints for difficulty: 8, 24, 64 games.

These are supervised seeds with measured game counts, not claimed AlphaZero
champions. Runtime strength also uses tiered search and policy sampling.
"""
import argparse
import json
import random
from pathlib import Path
import torch
from training.core.network import PolicyValueNet
from training.core.teachers import targets,choose
from training.core.transitions import initial,advance
from training.core.replay import pack,tensors
from training.core.checkpoint import atomic_save
from training.games.registry import GAMES

def train(game_id,output):
    folder=output/game_id;folder.mkdir(parents=True,exist_ok=True)
    if (folder/'hard.pt').exists():
        print(f'{game_id}: difficulty checkpoints already complete',flush=True);return
    game=GAMES[game_id];torch.manual_seed(891);data_rng=random.Random(891);learn_rng=random.Random(2381)
    model=PolicyValueNet(planes=game.INPUT_SHAPE[0],height=game.INPUT_SHAPE[1],width=game.INPUT_SHAPE[2],actions=game.ACTION_SIZE,channels=32,blocks=2)
    optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0001)
    replay=[];game_count=0;reports=[]
    for tier,budget,steps in [('Easy',8,200),('Medium',24,400),('Hard',64,800)]:
        while game_count<budget:
            state=initial(game,data_rng)
            while not game.isTerminal(state)['done']:
                policy,value=targets(game_id,state)
                for transformed,target in game.symmetries(state,policy):replay.append(pack(game.encode(transformed),target,value))
                random_game=game_count%3==0
                action=choose(game_id,state,data_rng,'random' if random_game or data_rng.random()<.35 else 'heuristic')
                state=advance(game,state,action,data_rng)
            game_count+=1
        model.train()
        for _ in range(steps):
            x,p,v=tensors(learn_rng.sample(replay,min(64,len(replay))),game.INPUT_SHAPE)
            logits,value=model(x);loss=-(p*logits.log_softmax(-1)).sum(-1).mean()+(value.flatten()-v).square().mean()
            if not torch.isfinite(loss):raise FloatingPointError('Non-finite tier training')
            optimizer.zero_grad();loss.backward();optimizer.step()
        model.eval()
        origin=dict(method='cumulative-heuristic-teacher',games=budget,steps=sum(r['steps'] for r in reports)+steps,tier=tier,seed=891)
        payload=dict(game=game_id,rules_version=game.RULES_VERSION,config=model.config,state_dict=model.state_dict(),training_origin=origin,promoted=False,iteration=len(reports)+1)
        atomic_save(payload,folder/f'{tier.lower()}.pt')
        reports.append(dict(tier=tier,games=budget,steps=steps,positions=len(replay),loss=loss.item()))
        print(json.dumps(dict(game=game_id,**reports[-1])),flush=True)
    (folder/'tiers.json').write_text(json.dumps(dict(game=game_id,rules_version=game.RULES_VERSION,tiers=reports),indent=2))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--game',choices=['all',*GAMES],default='all');parser.add_argument('--output',default='training/checkpoints/difficulty-20261030')
    args=parser.parse_args();torch.set_num_threads(2)
    for game_id in GAMES if args.game=='all' else [args.game]:train(game_id,Path(args.output))

if __name__=='__main__':main()
