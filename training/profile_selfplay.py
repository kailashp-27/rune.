"""Compare scalar and batched self-play on the same checkpoint and per-game seeds."""
import argparse
import hashlib
import json
import random
import time
from pathlib import Path
import torch
from training.core.network import PolicyValueNet, BatchedEvaluator
from training.core.mcts import self_play, batched_self_play
from training.games import connect4 as game

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('checkpoint')
    parser.add_argument('--games', type=int, default=16)
    parser.add_argument('--simulations', type=int, default=32)
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--seed', type=int, default=73)
    parser.add_argument('--output', default='training/reports/selfplay-profile.json')
    args = parser.parse_args()
    if min(args.games, args.simulations, args.batch_size) < 1:
        parser.error('Budgets must be positive')
    torch.set_num_threads(2)
    checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
    model = PolicyValueNet(**checkpoint['config'])
    model.load_state_dict(checkpoint['state_dict'])
    BatchedEvaluator(model, game, 'cpu').evaluate_many([game.initialState()])
    report = {'checkpoint_sha256': hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest(), 'games':args.games, 'simulations':args.simulations, 'batch_size':args.batch_size, 'seed':args.seed, 'threads':2, 'results':{}}
    for mode in ('scalar', 'batched'):
        evaluate = BatchedEvaluator(model, game, 'cpu')
        started = time.perf_counter()
        if mode == 'scalar':
            games = [self_play(game, evaluate, args.simulations, random.Random(args.seed+i)) for i in range(args.games)]
        else:
            games = batched_self_play(game, evaluate.evaluate_many, args.games, args.simulations, args.batch_size, args.seed)
        elapsed = time.perf_counter() - started
        positions = sum(map(len, games))
        report['results'][mode] = {'seconds':elapsed, 'positions':positions, 'positions_per_second':positions/elapsed, 'inference':evaluate.stats}
        print(mode, json.dumps(report['results'][mode]), flush=True)
    report['wall_time_speedup'] = report['results']['scalar']['seconds'] / report['results']['batched']['seconds']
    report['note'] = 'CPU reference measurement; float rounding across tensor batch sizes may change near-tied search choices. No playing-strength claim.'
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
