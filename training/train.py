"""AlphaZero reference training with batched neural self-play."""
import argparse
import copy
import json
import random
import time
import math
from collections import deque
from pathlib import Path
import torch
from training.core.network import PolicyValueNet, evaluator
from training.core.mcts import batched_self_play, arena
from training.core.checkpoint import atomic_save, run_state
from training.core.replay import compact, pack, tensors
from training.games.registry import GAMES

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--iterations', type=int, default=10)
    parser.add_argument('--games', type=int, default=10)
    parser.add_argument('--simulations', type=int, default=50)
    parser.add_argument('--steps', type=int, default=100)
    parser.add_argument('--arena-games', type=int, default=20)
    parser.add_argument('--seed', type=int)
    parser.add_argument('--output', default='training/checkpoints')
    parser.add_argument('--resume')
    parser.add_argument('--threads', type=int, default=2)
    parser.add_argument('--channels', type=int, default=64)
    parser.add_argument('--blocks', type=int, default=4)
    parser.add_argument('--self-play-batch', type=int, default=8)
    parser.add_argument('--game', choices=list(GAMES))
    args = parser.parse_args()
    if min(args.iterations, args.games, args.simulations, args.steps, args.threads, args.channels, args.blocks, args.self_play_batch) < 1 or args.arena_games < 2 or args.arena_games % 2:
        parser.error('Positive budgets and an even arena-games >= 2 are required')
    torch.set_num_threads(args.threads)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    checkpoint = torch.load(args.resume, map_location=device, weights_only=True) if args.resume else None
    game_id = args.game or (checkpoint.get('game','connect4') if checkpoint else 'connect4')
    if checkpoint and checkpoint.get('game','connect4') != game_id:
        parser.error('Checkpoint belongs to another game')
    game = GAMES[game_id]
    if checkpoint and checkpoint.get('rules_version','connect4-v1') != game.RULES_VERSION:
        parser.error('Checkpoint rules version does not match this game')
    args.seed = args.seed if args.seed is not None else checkpoint.get('seed', 42) if checkpoint else 42
    rng = random.Random(args.seed)
    torch.manual_seed(args.seed)
    planes,height,width = game.INPUT_SHAPE
    if checkpoint and tuple(checkpoint['config'][key] for key in ('planes','height','width','actions')) != (planes,height,width,game.ACTION_SIZE):
        parser.error('Checkpoint input/action dimensions do not match this game')
    champion = PolicyValueNet(**checkpoint['config']) if checkpoint else PolicyValueNet(planes=planes,height=height,width=width,actions=game.ACTION_SIZE,channels=args.channels,blocks=args.blocks)
    champion.to(device)
    if checkpoint:
        champion.load_state_dict(checkpoint['state_dict'])
    replay = deque((compact(entry) for entry in checkpoint.get('replay', [])) if checkpoint else [], maxlen=200_000)
    if checkpoint:
        checkpoint.pop('replay', None)
    if checkpoint and 'python_rng_state' in checkpoint and args.seed == checkpoint.get('seed', args.seed):
        rng.setstate(checkpoint['python_rng_state'])
        torch.set_rng_state(checkpoint['torch_rng_state'].cpu())
        if torch.cuda.is_available() and checkpoint.get('cuda_rng_state'):
            torch.cuda.set_rng_state_all([state.cpu() for state in checkpoint['cuda_rng_state']])
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    if (output / 'latest.pt').exists() and not args.resume:
        parser.error('Output already has a run: resume latest.pt or use a new directory')
    start_iteration = checkpoint.get('iteration', 0) if checkpoint else 0
    champion_iteration = checkpoint.get('champion_iteration', start_iteration) if checkpoint else 0
    champion_score = checkpoint.get('arena_score', 0) if checkpoint else 0
    for iteration in range(start_iteration + 1, start_iteration + args.iterations + 1):
        started = time.perf_counter()
        evaluate_champion = evaluator(champion, game, device)
        from training.core.transitions import initial
        opening_policy, opening_value = evaluate_champion(initial(game, random.Random(args.seed)))
        lengths = []
        generated = batched_self_play(game, evaluate_champion.evaluate_many, args.games, args.simulations, args.self_play_batch, seed=args.seed + iteration * 100000)
        generated_at = time.perf_counter()
        for positions in generated:
            lengths.append(len(positions))
            for state, policy, outcome in positions:
                for transformed, target in game.symmetries(state, policy):
                    replay.append(pack(game.encode(transformed), target, outcome))
        candidate = copy.deepcopy(champion).train()
        optimizer = torch.optim.AdamW(candidate.parameters(), lr=.001, weight_decay=.0001)
        training_positions = list(replay)
        for _ in range(args.steps):
            batch = rng.sample(training_positions, min(64, len(training_positions)))
            x, policy, outcome = tensors(batch, game.INPUT_SHAPE, device)
            logits, value = candidate(x)
            policy_loss = -(policy * logits.log_softmax(-1)).sum(-1).mean()
            value_loss = (value.flatten() - outcome).square().mean()
            loss = policy_loss + value_loss
            if not torch.isfinite(loss):
                raise FloatingPointError('Training loss is non-finite; previous checkpoint is preserved')
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        score = arena(game, evaluator(candidate, game, device), evaluator(champion, game, device), args.arena_games, args.simulations, seed=args.seed + iteration)
        promoted = score >= .55
        payload = {'game':game_id, 'rules_version':game.RULES_VERSION, 'config': candidate.config, 'state_dict': candidate.state_dict(), 'iteration': iteration, 'arena_score': score, 'arena_games': args.arena_games, 'arena_seed': args.seed + iteration, 'promoted': promoted, 'seed': args.seed, 'training_simulations': args.simulations}
        if checkpoint and checkpoint.get('training_origin'):
            payload['training_origin'] = checkpoint['training_origin']
        atomic_save(payload, output / f'candidate-{iteration:04d}.pt')
        if promoted:
            champion = candidate
            champion_iteration, champion_score = iteration, score
            atomic_save(payload, output / 'best.pt')
        resume_state = run_state(champion, iteration, replay, rng, args.seed, champion_score, champion_iteration, game_id, game.RULES_VERSION)
        if checkpoint and checkpoint.get('training_origin'):
            resume_state['training_origin'] = checkpoint['training_origin']
        atomic_save(resume_state, output / 'latest.pt')
        metrics = dict(iteration=iteration, loss=loss.item(), policy_loss=policy_loss.item(), value_loss=value_loss.item(), arena_score=score, promoted=promoted, positions=len(replay), average_length=sum(lengths)/len(lengths), elapsed_seconds=time.perf_counter()-started, self_play_seconds=generated_at-started, self_play_games=args.games, self_play_batch=args.self_play_batch, inference=evaluate_champion.stats.copy())
        metrics['opening'] = dict(value=opening_value, policy_entropy=-sum(p*math.log(p) for p in opening_policy if p>0), top_action=max(range(game.ACTION_SIZE),key=opening_policy.__getitem__), top_probability=max(opening_policy))
        with (output / 'metrics.jsonl').open('a') as f:
            f.write(json.dumps(metrics) + '\n')
        print(json.dumps(metrics), flush=True)

if __name__ == '__main__':
    main()
