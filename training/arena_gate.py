"""Compare immutable checkpoint files and bind arena evidence to their digests."""
import argparse
import hashlib
import json
from pathlib import Path
import torch
from training.core.contracts import checkpoint_game
from training.core.network import PolicyValueNet,evaluator
from training.core.mcts import arena

def main():
    parser=argparse.ArgumentParser();parser.add_argument('challenger');parser.add_argument('champion');parser.add_argument('--games',type=int,default=20);parser.add_argument('--simulations',type=int,default=32);parser.add_argument('--output',required=True)
    args=parser.parse_args();torch.set_num_threads(2)
    def load(path):
        checkpoint=torch.load(path,map_location='cpu',weights_only=True);game_id,game=checkpoint_game(checkpoint)
        model=PolicyValueNet(**checkpoint['config']);model.load_state_dict(checkpoint['state_dict'])
        return game_id,game,evaluator(model,game,'cpu')
    game_id,game,challenger=load(args.challenger);other,_,champion=load(args.champion)
    if other!=game_id:parser.error('Arena checkpoints must belong to the same game')
    score=arena(game,challenger,champion,games=args.games,simulations=args.simulations,seed=8191)
    report=dict(game=game_id,rules_version=game.RULES_VERSION,challenger_sha256=hashlib.sha256(Path(args.challenger).read_bytes()).hexdigest(),champion_sha256=hashlib.sha256(Path(args.champion).read_bytes()).hexdigest(),games=args.games,simulations=args.simulations,seed=8191,score=score,promoted=score>=.55,scope='Paired openings, alternating seats. Challenger and champion evaluated with neural PUCT at identical budgets.')
    Path(args.output).write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

if __name__=='__main__':main()
