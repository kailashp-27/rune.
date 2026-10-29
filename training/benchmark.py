"""Seeded, paired-opening matches. Reports evidence, never inferred Elo."""
import argparse
import hashlib
import json
import random
import time
from pathlib import Path
from training.games import connect4 as game
from training.core.baselines import actions, tactical, minimax
from training.core.mcts import search

def play_match(agent, opponent, opening, side):
    state = game.initialState()
    for action in opening:
        state = game.applyMove(state, action)
    turns = 0
    while not (result := game.isTerminal(state))['done']:
        action = (agent if state['player'] == side else opponent)(state)
        state = game.applyMove(state, action)
        turns += 1
    return result['winner'] * side, turns

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('checkpoint', nargs='?')
    parser.add_argument('--games', type=int, default=40)
    parser.add_argument('--simulations', type=int, default=64)
    parser.add_argument('--minimax-depth', type=int, default=4)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output', default='training/reports/connect4-benchmark.json')
    args = parser.parse_args()
    if args.games < 2 or args.games % 2 or min(args.simulations, args.minimax_depth) < 1:
        parser.error('Use an even game count >=2 and positive search budgets')
    if args.checkpoint:
        import torch
        from training.core.network import PolicyValueNet, evaluator
        torch.set_num_threads(2)
        checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
        model = PolicyValueNet(**checkpoint['config'])
        model.load_state_dict(checkpoint['state_dict'])
        evaluate = evaluator(model, game, 'cpu')
        fingerprint = hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest()
    else:
        evaluate = lambda state: ([1/7]*7, 0)
        fingerprint = None
    def agent(state):
        policy = search(game, state, evaluate, args.simulations)
        return max(actions(state), key=policy.__getitem__)
    started = time.perf_counter()
    opponents = {}
    rng = random.Random(args.seed)
    openings = []
    for _ in range(args.games // 2):
        state = game.initialState()
        opening = []
        for _ in range(rng.randrange(5)):
            action = rng.choice(actions(state))
            opening.append(action)
            state = game.applyMove(state, action)
        openings.append(opening)
    for name in ('random', 'heuristic', 'minimax'):
        counts = {'wins': 0, 'draws': 0, 'losses': 0, 'first_player_wins': 0, 'second_player_wins': 0}
        random_rng = random.Random(args.seed)
        opponent = (lambda s: random_rng.choice(actions(s))) if name == 'random' else tactical if name == 'heuristic' else lambda s: minimax(s, args.minimax_depth)
        length = 0
        for opening in openings:
            for side in (1, -1):
                outcome, turns = play_match(agent, opponent, opening, side)
                counts['wins' if outcome == 1 else 'losses' if outcome == -1 else 'draws'] += 1
                if outcome == 1:
                    counts['first_player_wins' if side == 1 else 'second_player_wins'] += 1
                length += turns
        opponents[name] = {**counts, 'score': (counts['wins'] + .5 * counts['draws']) / args.games, 'average_remaining_moves': length / args.games}
        print(name, json.dumps(opponents[name]), flush=True)
    result = {'checkpoint': str(args.checkpoint), 'checkpoint_sha256': fingerprint, 'games_per_opponent': args.games, 'simulations': args.simulations, 'minimax_depth': args.minimax_depth, 'seed': args.seed, 'paired_openings': openings, 'opponents': opponents, 'elapsed_seconds': time.perf_counter() - started, 'scope': 'Python neural PUCT, without browser tactical override; no perfect-solver benchmark'}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2))
    print(f'Report: {output}', flush=True)

if __name__ == '__main__':
    main()
