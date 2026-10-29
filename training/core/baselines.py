"""Deterministic tactical and alpha-beta opponents; no neural dependencies."""
from training.games import connect4 as game
ORDER = [3, 2, 4, 1, 5, 0, 6]

def actions(state):
    mask = game.legalMoves(state)
    return [a for a in ORDER if mask[a]]

def heuristic(state, player):
    board = state['board']
    value = sum(3 * board[r * 7 + 3] * player for r in range(6))
    for cells in game.WINDOWS:
        own = sum(board[i] == player for i in cells)
        opposing = sum(board[i] == -player for i in cells)
        if not opposing:
            value += (0, 1, 8, 40, 100000)[own]
        if not own:
            value -= (0, 1, 8, 45, 100000)[opposing]
    return value

def tactical(state):
    legal = actions(state)
    for a in legal:
        if game.isTerminal(game.applyMove(state, a))['winner'] == state['player']:
            return a
    safe = []
    for a in legal:
        next_state = game.applyMove(state, a)
        if not any(game.isTerminal(game.applyMove(next_state, b))['winner'] == next_state['player'] for b in actions(next_state)):
            safe.append(a)
    return max(safe or legal, key=lambda a: heuristic(game.applyMove(state, a), state['player']))

def minimax(state, depth=4):
    def negamax(current, remaining, alpha, beta):
        terminal = game.isTerminal(current)
        if terminal['done']:
            return terminal['winner'] * current['player'] * (1000000 + remaining)
        if not remaining:
            return heuristic(current, current['player'])
        best = -float('inf')
        for a in actions(current):
            score = -negamax(game.applyMove(current, a), remaining - 1, -beta, -alpha)
            best = max(best, score)
            alpha = max(alpha, best)
            if alpha >= beta:
                break
        return best
    return max(actions(state), key=lambda a: -negamax(game.applyMove(state, a), depth - 1, -float('inf'), float('inf')))
