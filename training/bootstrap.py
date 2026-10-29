"""Fit an optional teacher seed, then resume train.py for genuine self-play.

Teacher value targets are heuristic estimates, explicitly recorded as such.
No arena promotion or production manifest activation is granted by this tool.
"""
import argparse
import json
import random
import time
from pathlib import Path
import torch
from training.core.network import PolicyValueNet
from training.core.teachers import targets, choose
from training.core.transitions import initial, advance
from training.core.checkpoint import atomic_save, run_state
from training.games.registry import GAMES

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', choices=list(GAMES), required=True)
    parser.add_argument('--games', type=int, default=64)
    parser.add_argument('--steps', type=int, default=1000)
    parser.add_argument('--depth', type=int, default=1)
    parser.add_argument('--channels', type=int, default=32)
    parser.add_argument('--blocks', type=int, default=2)
    parser.add_argument('--seed', type=int, default=610)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if min(args.games, args.steps, args.depth, args.channels, args.blocks) < 1:
        parser.error('Positive budgets required')
    output = Path(args.output)
    if (output/'latest.pt').exists():
        parser.error('Choose a new output directory; existing runs are preserved')
    output.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2); torch.manual_seed(args.seed)
    rng = random.Random(args.seed); game = GAMES[args.game]; started = time.perf_counter()
    data = []; states = []; lengths = []
    for index in range(args.games):
        state = initial(game, rng)
        while not game.isTerminal(state)['done']:
            # Keep alternate positions to limit redundant eight-fold expansion.
            if state['turn'] % 2 == index % 2:
                policy, value = targets(args.game, state, args.depth)
                states.append((state, policy, value))
            action = choose(args.game, state, rng, 'random' if rng.random() < .35 else 'heuristic', args.depth)
            state = advance(game, state, action, rng)
        lengths.append(state['turn'])
        if (index+1) % 8 == 0:
            print(json.dumps(dict(phase='teacher-data', game=args.game, games=index+1, positions=len(states))), flush=True)
    rng.shuffle(states)
    split = max(1, int(len(states)*.9))
    # Split original positions before augmentation; no transformed validation leaks.
    for state, policy, value in states[:split]:
        for transformed, target in game.symmetries(state, policy):
            data.append((game.encode(transformed), target, value))
    held = [(game.encode(s), p, v) for s, p, v in states[split:]]
    model = PolicyValueNet(planes=game.INPUT_SHAPE[0], height=game.INPUT_SHAPE[1], width=game.INPUT_SHAPE[2], actions=game.ACTION_SIZE, channels=args.channels, blocks=args.blocks)
    optimizer = torch.optim.AdamW(model.parameters(), lr=.001, weight_decay=.0001)
    model.train()
    for step in range(args.steps):
        x, policy, value = zip(*rng.sample(data, min(64, len(data))))
        logits, predicted = model(torch.tensor(x, dtype=torch.float32))
        policy_loss = -(torch.tensor(policy)*logits.log_softmax(-1)).sum(-1).mean()
        value_loss = (predicted.flatten()-torch.tensor(value)).square().mean()
        loss = policy_loss+value_loss
        if not torch.isfinite(loss):
            raise FloatingPointError('Non-finite teacher training loss')
        optimizer.zero_grad(); loss.backward(); optimizer.step()
    model.eval()
    metrics = dict(game=args.game, rules_version=game.RULES_VERSION, method='heuristic-teacher-bootstrap', teacher_depth=args.depth, seed=args.seed, games=args.games, positions=len(data), steps=args.steps, loss=loss.item(), average_length=sum(lengths)/len(lengths), elapsed_seconds=time.perf_counter()-started, qualified=False)
    if held:
        with torch.inference_mode():
            batch=held[:256]; x,p,v=zip(*batch);logits,predicted=model(torch.tensor(x,dtype=torch.float32))
            metrics['held_value_mse']=(predicted.flatten()-torch.tensor(v)).square().mean().item()
            metrics['held_policy_loss']=-(torch.tensor(p)*logits.log_softmax(-1)).sum(-1).mean().item()
    payload = run_state(model, 0, [], rng, args.seed, 0, 0, args.game, game.RULES_VERSION)
    payload['training_origin'] = metrics
    # Don't mix heuristic values into the subsequent self-play outcome replay.
    atomic_save(payload, output/'latest.pt')
    (output/'bootstrap.json').write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics), flush=True)

if __name__ == '__main__':
    main()
