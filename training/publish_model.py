"""Activate a locally validated checkpoint only after explicit release evidence passes."""
import argparse
import hashlib
import json
from pathlib import Path
from training.games.registry import GAMES

def validate_release(metadata, browser, benchmark, checkpoint_digest, arena=None):
    game_id = metadata.get('game', 'connect4')
    if game_id not in GAMES or metadata.get('rules_version', 'connect4-v1') != GAMES[game_id].RULES_VERSION:
        raise ValueError('Unknown game or incompatible rules version')
    if game_id != 'connect4' and (browser.get('game') != game_id or browser.get('rulesVersion') != GAMES[game_id].RULES_VERSION or benchmark.get('game') != game_id or benchmark.get('rules_version') != GAMES[game_id].RULES_VERSION):
        raise ValueError('Browser and benchmark must match the game and rules version')
    model_id = metadata['model']['id']
    score = metadata.get('arena_score', 0)
    promoted = metadata.get('promoted')
    if arena is not None:
        if arena.get('challenger_sha256') != checkpoint_digest or arena.get('game') != game_id or arena.get('rules_version') != GAMES[game_id].RULES_VERSION or not arena.get('champion_sha256') or arena.get('games',0)<20 or arena['games']%2:
            raise ValueError('Arena report is missing a matching checkpoint, rules, or paired sample')
        score,promoted=arena.get('score',0),arena.get('promoted')
    if not promoted or not isinstance(score,(int,float)) or not .55 <= score <= 1:
        raise ValueError('Checkpoint did not pass the arena gate')
    if not metadata.get('cpu_parity', {}).get('passed') or metadata['cpu_parity'].get('states') != 50 or not 0 <= metadata['cpu_parity'].get('max_error', float('inf')) <= 1e-4:
        raise ValueError('CPU parity did not pass')
    if browser.get('modelId') != model_id or browser.get('states') != 50 or browser.get('passed') is not True:
        raise ValueError('Browser parity is missing or belongs to another model')
    error = browser.get('maxError', float('inf'))
    if not isinstance(error, (int, float)) or not 0 <= error <= 1e-4:
        raise ValueError('Browser parity tolerance failed')
    if not browser.get('neuralSearch', {}).get('passed') or not browser.get('fallback', {}).get('passed'):
        raise ValueError('Browser search/fallback checks did not pass')
    if benchmark.get('checkpoint_sha256') != checkpoint_digest or metadata.get('checkpoint_sha256') != checkpoint_digest:
        raise ValueError('Benchmark belongs to another checkpoint')
    if benchmark.get('games_per_opponent', 0) < 40:
        raise ValueError('At least 40 games per opponent are required')
    opponents = benchmark.get('opponents', {})
    random_result = opponents.get('random', {})
    if random_result.get('wins') != benchmark['games_per_opponent']:
        raise ValueError('Checkpoint must win every measured random-opponent game')
    if opponents.get('heuristic', {}).get('score', 0) < .55:
        raise ValueError('Checkpoint must score at least 55% against the heuristic')
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('checkpoint')
    parser.add_argument('metadata')
    parser.add_argument('browser_report')
    parser.add_argument('benchmark')
    parser.add_argument('--difficulty', choices=['Easy', 'Medium', 'Hard'], required=True)
    parser.add_argument('--manifest', default='web/public/models/manifest.json')
    parser.add_argument('--arena-report')
    args = parser.parse_args()
    read = lambda path: json.loads(Path(path).read_text())
    metadata, browser, benchmark = map(read, [args.metadata, args.browser_report, args.benchmark])
    digest = hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest()
    try:
        validate_release(metadata, browser, benchmark, digest, read(args.arena_report) if args.arena_report else None)
    except (ValueError, KeyError, TypeError) as error:
        parser.error(str(error))
    model_file = Path(args.metadata).parent / Path(metadata['model']['url']).name
    if hashlib.sha256(model_file.read_bytes()).hexdigest() != metadata['sha256']:
        raise ValueError('Exported model digest mismatch')
    manifest_file = Path(args.manifest)
    manifest = read(manifest_file)
    game_id = metadata.get('game', 'connect4')
    manifest.setdefault(game_id, {})[args.difficulty] = {**metadata['model'], 'game': game_id, 'rulesVersion': GAMES[game_id].RULES_VERSION, 'simulations': benchmark.get('simulations',100), 'status': 'promoted'}
    manifest_file.write_text(json.dumps(manifest, indent=2))
    print(f"Activated {metadata['model']['id']} for {args.difficulty}")

if __name__ == '__main__':
    main()
