"""Atomic checkpoints, including replay and random state for between-round resume."""
from pathlib import Path
import torch

def atomic_save(payload, path):
    path = Path(path)
    temporary = path.with_name(path.name + '.tmp')
    torch.save(payload, temporary)
    temporary.replace(path)

def run_state(champion, iteration, replay, rng, seed, arena_score, champion_iteration, game_id='connect4', rules_version='connect4-v1'):
    return {
        'format_version': 2,
        'game': game_id,
        'rules_version':rules_version,
        'config': champion.config,
        'state_dict': champion.state_dict(),
        'iteration': iteration,
        'champion_iteration': champion_iteration,
        'arena_score': arena_score,
        'promoted': False,  # latest.pt is resume state, not a release candidate.
        'seed': seed,
        'replay': list(replay),
        'python_rng_state': rng.getstate(),
        'torch_rng_state': torch.get_rng_state(),
        'cuda_rng_state': torch.cuda.get_rng_state_all() if torch.cuda.is_available() else [],
    }
