"""Optional heuristic teacher for bootstrapping, not AlphaZero self-play targets.

All scores are relative to the current player. Chance games average every legal
outcome, with no access to the future live wave. Independent benchmarks still
determine strength; fitting this teacher is never a release qualification.
"""
import math
from training.games.registry import GAMES

SCALES = dict(connect4=100, terraform=180, tidal=120, pulse=300, fortress=300, mirror=200)

def evaluate(game_id, state):
    if game_id == 'connect4':
        from training.core.baselines import heuristic
        return heuristic(state, state['player'])
    if game_id == 'pulse':
        from training.pulse_evaluate import evaluate as pulse_evaluate
        return pulse_evaluate(state)
    if game_id == 'tidal':
        from training.tidal_evaluate import evaluate as tidal_evaluate
        return tidal_evaluate(state)
    if game_id == 'terraform':
        game = GAMES[game_id]
        index = 0 if state['player'] == 1 else 1
        def potential(cell):
            value = 0
            for target in game.NEIGHBORS[cell]:
                if target < 0 or target in state['units']:
                    continue
                height = state['board'][target]
                if height <= state['board'][cell]+1:
                    value += 450 if height == 3 else 4+height*4
                elif height == state['board'][cell]+2:
                    value += 3
            return state['board'][cell]*90+value-max(abs(cell//5-2), abs(cell%5-2))*3
        return potential(state['units'][index])-potential(state['units'][1-index])
    fortress = game_id == 'fortress'
    value = sum(owner*state['player']*((80 if fortress else 90)+(8 if fortress else 5)*(4-abs(cell//5-2)-abs(cell%5-2))) for cell, owner in enumerate(state['board']))
    if fortress:
        own = 0 if state['player'] == 1 else 1
        value += state['hold'][own]*140-state['hold'][1-own]*160
    return value

def action_scores(game_id, state, depth=1):
    game = GAMES[game_id]
    def value(current, remaining):
        end = game.isTerminal(current)
        if end['done']:
            return end['winner']*current['player']*100000
        if remaining == 0:
            return evaluate(game_id, current)
        return max(score(current, action, remaining) for action, ok in enumerate(game.legalMoves(current)) if ok)
    def score(current, action, remaining):
        outcomes = game.chanceOutcomes(current) if hasattr(game, 'chanceOutcomes') else [None]
        return sum(-value(game.applyMove(current, action, outcome) if outcome is not None else game.applyMove(current, action), remaining-1) for outcome in outcomes)/len(outcomes)
    return [(action, score(state, action, depth)) for action, ok in enumerate(game.legalMoves(state)) if ok]

def targets(game_id, state, depth=1):
    scores = action_scores(game_id, state, depth)
    maximum = max(score for _, score in scores)
    temperature = SCALES[game_id]/5
    weights = [(action, math.exp(max(-80, (score-maximum)/temperature))) for action, score in scores]
    total = sum(weight for _, weight in weights)
    policy = [0.0]*GAMES[game_id].ACTION_SIZE
    for action, weight in weights:
        policy[action] = weight/total
    return policy, math.tanh(maximum/SCALES[game_id])

def choose(game_id, state, rng, mode='heuristic', depth=1):
    game = GAMES[game_id]
    if mode == 'random':
        return rng.choice([action for action, ok in enumerate(game.legalMoves(state)) if ok])
    scores = action_scores(game_id, state, depth)
    maximum = max(score for _, score in scores)
    return rng.choice([action for action, score in scores if score == maximum])
