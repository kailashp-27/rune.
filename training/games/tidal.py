"""Tidal Lock alpha with public current wave and independent random future waves."""
ACTION_SIZE = 125
INPUT_SHAPE = (6, 5, 5)
RULES_VERSION = 'tidal-v0.2'
MOVE_CAP = 80
DIRECTIONS = ((-1, 0), (0, 1), (1, 0), (0, -1))
LINES = []
for row in range(5):
    for col in range(5):
        for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
            if 0 <= row + 3*dr < 5 and 0 <= col + 3*dc < 5:
                LINES.append([(row+i*dr)*5+col+i*dc for i in range(4)])


def initialState(wave=0):
    return {'board': [0]*25, 'player': 1, 'turn': 0, 'wave': wave}


def sampleInitial(rng):
    return initialState(rng.randrange(10))


def chanceOutcomes(state):
    """Nine equally likely waves: rows 0–4, columns 5–9, excluding current."""
    return [wave for wave in range(10) if wave != state['wave']]


def wet(state, cell):
    return (cell//5 if state['wave'] < 5 else cell%5) == state['wave'] % 5


def sampleMove(state, action, rng):
    return applyMove(state, action, rng.choice(chanceOutcomes(state)))


def destination(action):
    if action < 25:
        return action
    origin, direction = divmod(action-25, 4)
    dr, dc = DIRECTIONS[direction]
    row, col = origin//5+dr, origin%5+dc
    return row*5+col if 0 <= row < 5 and 0 <= col < 5 else -1


def rawLegal(state):
    mask = [False]*ACTION_SIZE
    for cell, piece in enumerate(state['board']):
        if wet(state, cell):
            continue
        if piece == 0:
            mask[cell] = True
        if piece == state['player']:
            for direction in range(4):
                action = 25+cell*4+direction
                target = destination(action)
                mask[action] = target >= 0 and not wet(state, target) and state['board'][target] == 0
    return mask


def isTerminal(state):
    for line in LINES:
        owner = state['board'][line[0]]
        if owner and all(state['board'][cell] == owner for cell in line):
            return {'done': True, 'winner': owner}
    if state['turn'] >= MOVE_CAP:
        return {'done': True, 'winner': 0}
    if not any(rawLegal(state)):
        return {'done': True, 'winner': -state['player']}
    return {'done': False, 'winner': 0}


def legalMoves(state):
    return [False]*ACTION_SIZE if isTerminal(state)['done'] else rawLegal(state)


def applyMove(state, action, wave):
    if type(action) is not int or not 0 <= action < ACTION_SIZE or not legalMoves(state)[action]:
        raise ValueError('Illegal move')
    if type(wave) is not int or wave not in chanceOutcomes(state):
        raise ValueError('Invalid next wave')
    board = state['board'].copy()
    if action >= 25:
        board[(action-25)//4] = 0
    board[destination(action)] = state['player']
    return {'board': board, 'player': -state['player'], 'turn': state['turn']+1, 'wave': wave}


def encode(state):
    values = [
        [float(piece == state['player']) for piece in state['board']],
        [float(piece == -state['player']) for piece in state['board']],
        [float(wet(state, cell)) for cell in range(25)],
        [float(state['wave'] >= 5)]*25,
        [float(state['turn'] % 2)]*25,
        [state['turn']/MOVE_CAP]*25,
    ]
    return [[plane[row*5:row*5+5] for row in range(5)] for plane in values]


def flipCell(cell):
    return cell//5*5+4-cell%5


def flipAction(action):
    if action < 25:
        return flipCell(action)
    origin, direction = divmod(action-25, 4)
    return 25+flipCell(origin)*4+(0, 3, 2, 1)[direction]


def symmetries(state, policy):
    board, flipped = [0]*25, [0]*ACTION_SIZE
    for cell, piece in enumerate(state['board']):
        board[flipCell(cell)] = piece
    for action, weight in enumerate(policy):
        flipped[flipAction(action)] = weight
    wave = state['wave'] if state['wave'] < 5 else 14-state['wave']
    return [(state, policy), ({**state, 'board': board, 'wave': wave}, flipped)]
