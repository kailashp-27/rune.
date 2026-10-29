"""Generate reproducible Python-to-TypeScript rule fixtures."""
import argparse
import json
import random
from pathlib import Path
from training.games import connect4 as game
from training.games.registry import GAMES
from training.core.transitions import initial, advance

def generate(games=2000, seed=42):
    rng = random.Random(seed)
    fixtures = []
    for _ in range(games):
        state = game.initialState()
        while not game.isTerminal(state)['done']:
            mask = game.legalMoves(state)
            action = rng.choice([a for a, ok in enumerate(mask) if ok])
            next_state = game.applyMove(state, action)
            fixtures.append({'state': state, 'action': action, 'next_state': next_state,
                             'legal_mask': mask, 'terminal': game.isTerminal(next_state)})
            state = next_state
    return fixtures

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--games', type=int, default=2000)
    parser.add_argument('--output')
    parser.add_argument('--game',choices=list(GAMES),default='connect4')
    args = parser.parse_args()
    if args.game != 'connect4':
        rng=random.Random(42);count=0
        output=Path(args.output or f'parity/{args.game}.jsonl')
        rules=GAMES[args.game]
        with output.open('w') as stream:
            for _ in range(args.games):
                state=initial(rules,rng)
                while not rules.isTerminal(state)['done']:
                    actions=[a for a,ok in enumerate(rules.legalMoves(state)) if ok]
                    action=rng.choice(actions)
                    next_state=advance(rules,state,action,rng)
                    stream.write(json.dumps({'state':state,'action':action,'next_state':next_state,'legal_actions':actions,'terminal':rules.isTerminal(next_state)},separators=(',',':'))+'\n')
                    state=next_state;count+=1
        print(f'Generated {count} {args.game} transitions from {args.games} games')
        raise SystemExit(0)
    fixtures = generate(args.games)
    Path(args.output or 'parity/connect4.json').write_text(json.dumps(fixtures, separators=(',', ':')))
    print(f'Generated {len(fixtures)} transitions from {args.games} games')
