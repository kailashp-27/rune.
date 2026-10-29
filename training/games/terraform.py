"""Terraform v0.1. Rules and action layout are in docs/TERRAFORM-RULES.md."""
ACTION_SIZE = 251
INPUT_SHAPE = (8, 5, 5)
RULES_VERSION = 'terraform-v0.1'
MOVE_CAP = 80
DIRECTIONS = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
NEIGHBORS = [[(r+dr)*5+c+dc if 0 <= r+dr < 5 and 0 <= c+dc < 5 else -1 for dr,dc in DIRECTIONS] for r in range(5) for c in range(5)]

def initialState():
    board = [0]*25
    for i in (7,11,13,17):
        board[i] = 1
    board[12] = 2
    return {'board':board, 'units':[20,4], 'player':1, 'turn':0}

def rawLegal(state):
    mask = [False]*ACTION_SIZE
    mask[250] = state['turn'] == 1
    origin = state['units'][0 if state['player'] == 1 else 1]
    for direction, cell in enumerate(NEIGHBORS[origin]):
        if cell < 0 or cell in state['units']:
            continue
        mask[origin*8+direction] = state['board'][cell] <= state['board'][origin]+1
        mask[200+cell] = state['board'][cell] < 3
        mask[225+cell] = state['board'][cell] > 0
    return mask

def isTerminal(state):
    for index, player in enumerate((1,-1)):
        if state['board'][state['units'][index]] == 3:
            return {'done':True,'winner':player}
    if state['turn'] >= MOVE_CAP:
        return {'done':True,'winner':0}
    if not any(rawLegal(state)):
        return {'done':True,'winner':-state['player']}
    return {'done':False,'winner':0}

def legalMoves(state):
    return [False]*ACTION_SIZE if isTerminal(state)['done'] else rawLegal(state)

def applyMove(state, action):
    if type(action) is not int or not 0 <= action < ACTION_SIZE or not legalMoves(state)[action]:
        raise ValueError('Illegal move')
    board, units = state['board'].copy(), state['units'].copy()
    if action == 250:
        units.reverse()
    elif action < 200:
        units[0 if state['player'] == 1 else 1] = NEIGHBORS[action//8][action%8]
    elif action < 225:
        board[action-200] += 1
    else:
        board[action-225] -= 1
    return {'board':board,'units':units,'player':-state['player'],'turn':state['turn']+1}

def encode(state):
    own = 0 if state['player'] == 1 else 1
    planes = [[float(h == level) for h in state['board']] for level in range(4)]
    planes += [[float(i == state['units'][own]) for i in range(25)], [float(i == state['units'][1-own]) for i in range(25)], [float(state['player'] == 1)]*25, [state['turn']/MOVE_CAP]*25]
    return [[plane[r*5:r*5+5] for r in range(5)] for plane in planes]

def transformCell(cell, symmetry):
    r,c = divmod(cell,5)
    if symmetry >= 4:
        c = 4-c
    for _ in range(symmetry%4):
        r,c = c,4-r
    return r*5+c

def transformAction(action, symmetry):
    if action == 250:
        return 250
    if action >= 200:
        base = 200 if action < 225 else 225
        return base+transformCell(action-base,symmetry)
    origin,direction = divmod(action,8)
    dr,dc = DIRECTIONS[direction]
    if symmetry >= 4:
        dc = -dc
    for _ in range(symmetry%4):
        dr,dc = dc,-dr
    return transformCell(origin,symmetry)*8+DIRECTIONS.index((dr,dc))

def symmetries(state, policy):
    result = []
    for symmetry in range(8):
        board, target = [0]*25, [0]*ACTION_SIZE
        for i,height in enumerate(state['board']):
            board[transformCell(i,symmetry)] = height
        for action,weight in enumerate(policy):
            target[transformAction(action,symmetry)] = weight
        transformed = {**state,'board':board,'units':[transformCell(i,symmetry) for i in state['units']]}
        result.append((transformed,target))
    return result
