"""Immutable Connect Four rules; JSON state matches the browser exactly."""
ACTION_SIZE = 7
INPUT_SHAPE = (3, 6, 7)
RULES_VERSION = 'connect4-v1'
WINDOWS = [tuple((r+i*dr)*7+c+i*dc for i in range(4))
           for r in range(6) for c in range(7)
           for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1))
           if r+3*dr < 6 and 0 <= c+3*dc < 7]

def initialState():
    return {"board": [0] * 42, "player": 1, "turn": 0}

def isTerminal(state):
    board = state['board']
    for cells in WINDOWS:
        if board[cells[0]] and all(board[i] == board[cells[0]] for i in cells):
            return {'done': True, 'winner': board[cells[0]]}
    return {'done': state['turn'] >= 42, 'winner': 0}

def legalMoves(state):
    done = isTerminal(state)['done']
    return [state['board'][c] == 0 and not done for c in range(7)]

def applyMove(state, action):
    if type(action) is not int or not 0 <= action < 7 or not legalMoves(state)[action]:
        raise ValueError('Illegal move')
    board = state['board'].copy()
    for r in range(5, -1, -1):
        if board[r * 7 + action] == 0:
            board[r * 7 + action] = state['player']
            break
    return {'board': board, 'player': -state['player'], 'turn': state['turn'] + 1}

def encode(state):
    planes = [[float(v == state['player']) for v in state['board']],
              [float(v == -state['player']) for v in state['board']],
              [state['turn'] / 42] * 42]
    return [[p[r * 7:r * 7 + 7] for r in range(6)] for p in planes]

def symmetries(state, policy):
    reflected = {**state, 'board': sum([state['board'][r*7:r*7+7][::-1] for r in range(6)], [])}
    return [(state, policy), (reflected, policy[::-1])]
