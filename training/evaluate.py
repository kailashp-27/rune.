"""Independent paired-seat checkpoint benchmark for every registered game."""
import argparse
import hashlib
import json
import random
from pathlib import Path
from training.core.transitions import initial, advance
from training.core.teachers import choose

def benchmark(path, games=40, simulations=64, seed=7241):
    import torch
    from training.core.contracts import checkpoint_game
    from training.core.network import PolicyValueNet, evaluator
    from training.core.mcts import search
    if games < 2 or games % 2 or simulations < 2:
        raise ValueError('Use an even game count >= 2 and at least two simulations')
    torch.set_num_threads(2)
    checkpoint = torch.load(path, map_location='cpu', weights_only=True)
    game_id, game = checkpoint_game(checkpoint)
    model = PolicyValueNet(**checkpoint['config']); model.load_state_dict(checkpoint['state_dict'])
    infer = evaluator(model, game, 'cpu'); opponents = {}
    for opponent in ('random', 'heuristic'):
        results = dict(wins=0, losses=0, draws=0); turns = 0; seats = {}
        for index in range(games):
            opening_rng = random.Random(seed+index//2); seat = 1 if index%2 == 0 else -1
            state = initial(game, opening_rng)
            for _ in range(2):
                if game.isTerminal(state)['done']: break
                state = advance(game, state, choose(game_id, state, opening_rng, 'random'), opening_rng)
            # Separate live chance draws from search and opponent random streams.
            wave_rng = random.Random(seed+10000+index//2)
            search_rng = random.Random(seed+20000+index//2)
            opponent_rng = random.Random(seed+30000+index//2)
            while not (end := game.isTerminal(state))['done']:
                if state['player'] == seat:
                    policy = search(game, state, infer, simulations, rng=search_rng)
                    maximum = max(policy)
                    action = search_rng.choice([a for a, p in enumerate(policy) if p == maximum])
                else:
                    action = choose(game_id, state, opponent_rng, opponent)
                state = advance(game, state, action, wave_rng)
            result = 'draws' if not end['winner'] else 'wins' if end['winner'] == seat else 'losses'
            results[result] += 1; turns += state['turn']
            seat_results = seats.setdefault(str(seat), dict(wins=0, losses=0, draws=0)); seat_results[result] += 1
        opponents[opponent] = {**results, 'score':(results['wins']+.5*results['draws'])/games, 'average_length':turns/games, 'seats':seats}
        print(json.dumps(dict(opponent=opponent, **opponents[opponent])), flush=True)
    return dict(game=game_id, rules_version=game.RULES_VERSION, checkpoint_sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(), games_per_opponent=games, simulations=simulations, seed=seed, opponents=opponents, scope='Neural PUCT only; random and one-ply heuristic opponents; alternating paired seats, paired two-action random openings, independent chance/search RNG. Not Elo, optimal-play strength, or real-device validation.')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('checkpoint');parser.add_argument('--games',type=int,default=40);parser.add_argument('--simulations',type=int,default=64);parser.add_argument('--seed',type=int,default=7241);parser.add_argument('--output',required=True)
    args=parser.parse_args();report=benchmark(args.checkpoint,args.games,args.simulations,args.seed)
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

if __name__=='__main__': main()
