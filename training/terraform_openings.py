"""Paired opening diagnostics; measures these bots, not game-theoretic balance."""
import argparse
import json
import random
from pathlib import Path
from training.games import terraform as game
from training.terraform_balance import heuristic_action


def play(opening, swap, seed):
    rng = random.Random(seed)
    state = game.applyMove(game.initialState(), opening)
    if swap:
        state = game.applyMove(state, 250)
    else:
        # Decline the pie rule, choosing among the best normal actions.
        choices = [a for a, ok in enumerate(game.legalMoves(state)) if ok and a != 250]
        from training.terraform_balance import evaluate
        scores = [-evaluate(game.applyMove(state, a)) for a in choices]
        best = max(scores)
        action = rng.choice([a for a, score in zip(choices, scores) if score == best])
        state = game.applyMove(state, action)
    while not (terminal := game.isTerminal(state))['done']:
        state = game.applyMove(state, heuristic_action(state, rng))
    return terminal['winner'], state['turn']


def audit(games, seed):
    rows = []
    for opening, legal in enumerate(game.legalMoves(game.initialState())):
        if not legal:
            continue
        branches = {}
        for swap in (False, True):
            wins = draws = losses = length = 0
            for index in range(games):
                winner, turns = play(opening, swap, seed + index)
                wins += winner == 1
                losses += winner == -1
                draws += winner == 0
                length += turns
            branches['swap' if swap else 'keep'] = dict(gold_wins=wins, purple_wins=losses,
                draws=draws, games=games, gold_score=(wins + .5 * draws) / games,
                average_length=length / games)
        # Purple chooses the branch least favorable to Gold under this bot.
        rows.append(dict(action=opening, **branches,
            gold_score_with_best_response=min(branch['gold_score'] for branch in branches.values())))
    return dict(rules=game.RULES_VERSION, seed=seed, games_per_branch=games, openings=rows,
        total_games=len(rows)*games*2,
        scope='Forced legal Gold openings, paired seeds, forced keep/swap, then one-ply heuristic self-play. Scores describe this bot only; they do not establish optimal play or justify a rules change.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--games', type=int, default=50)
    parser.add_argument('--seed', type=int, default=731)
    parser.add_argument('--output', default='training/reports/terraform-openings.json')
    args = parser.parse_args()
    if args.games < 1:
        parser.error('Games per branch must be positive')
    result = audit(args.games, args.seed)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
