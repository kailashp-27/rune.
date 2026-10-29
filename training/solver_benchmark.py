"""Compare a Connect Four checkpoint to exact, bounded late-game solutions."""
import argparse
import hashlib
import json
import random
from pathlib import Path
import torch
from training.games import connect4 as game
from training.core.solver import solve, Unsolved
from training.core.contracts import checkpoint_game
from training.core.network import PolicyValueNet,evaluator
from training.core.mcts import search

def main():
    parser=argparse.ArgumentParser();parser.add_argument('checkpoint');parser.add_argument('--states',type=int,default=40);parser.add_argument('--simulations',type=int,default=128);parser.add_argument('--max-nodes',type=int,default=500000);parser.add_argument('--output',required=True)
    args=parser.parse_args()
    if min(args.states,args.simulations,args.max_nodes)<1:parser.error('Positive budgets required')
    torch.set_num_threads(2);checkpoint=torch.load(args.checkpoint,map_location='cpu',weights_only=True)
    if checkpoint_game(checkpoint)[0]!='connect4':parser.error('Connect Four checkpoint required')
    model=PolicyValueNet(**checkpoint['config']);model.load_state_dict(checkpoint['state_dict']);infer=evaluator(model,game,'cpu')
    rng=random.Random(925);samples=[];seen=set();attempts=0;skipped=0
    while len(samples)<args.states and attempts<args.states*100:
        attempts+=1;state=game.initialState()
        while state['turn']<34:
            legal=[a for a,ok in enumerate(game.legalMoves(state)) if ok and not game.isTerminal(game.applyMove(state,a))['done']]
            if not legal:break
            state=game.applyMove(state,rng.choice(legal))
        key=tuple(state['board'])
        if state['turn']<34 or key in seen:continue
        seen.add(key)
        try:result=solve(state,args.max_nodes)
        except Unsolved:skipped+=1;continue
        policy=search(game,state,infer,args.simulations,rng=rng);action=max(range(7),key=policy.__getitem__)
        samples.append(dict(state=state,action=action,correct=action in result['optimal_actions'],**result))
    report=dict(game='connect4',checkpoint_sha256=hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest(),states=len(samples),requested_states=args.states,skipped_unsolved=skipped,optimal_choices=sum(s['correct'] for s in samples),samples=samples,scope='Exact late-game W/D/L only (34 actions played). Unsolved positions excluded and counted. Not a full-game match against a perfect opponent.')
    Path(args.output).write_text(json.dumps(report,indent=2));print(json.dumps({key:value for key,value in report.items() if key!='samples'}))

if __name__=='__main__':main()
