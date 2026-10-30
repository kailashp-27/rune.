"""Mirror Siege v0.2: one-reply ghosts, outer edge seals after 24 actions."""
from training.games.fortress import RAYS, transformCell, transformAction
ACTION_SIZE=625
INPUT_SHAPE=(7,5,5)
RULES_VERSION='mirror-v0.2'
MOVE_CAP=60
SEAL_TURN=24
RIM=[c for c in range(25) if c//5 in (0,4) or c%5 in (0,4)]

def sealed(state,cell):return state['turn']>=SEAL_TURN and cell in RIM


def initialState():
    board=[0]*25
    for c in (20,21,23,24):board[c]=1
    for c in (0,1,3,4):board[c]=-1
    return dict(board=board,ghosts=[0]*25,ghostTimers=[0]*25,player=1,turn=0,captured=[],lastAction=None)


def rawLegal(state):
    mask=[False]*ACTION_SIZE
    for origin,owner in enumerate(state['board']):
        if owner!=state['player']:continue
        for ray in RAYS[origin]:
            for target in ray:
                if sealed(state,target) or state['board'][target] or state['ghostTimers'][target]>0:break
                mask[origin*25+target]=True
    return mask


def isTerminal(state):
    counts=[state['board'].count(p) for p in (1,-1)]
    if not all(counts):return dict(done=True,winner=1 if counts[0] else -1 if counts[1] else 0)
    if state['turn']>=MOVE_CAP:return dict(done=True,winner=1 if counts[0]>counts[1] else -1 if counts[1]>counts[0] else 0)
    if not any(rawLegal(state)):return dict(done=True,winner=-state['player'])
    return dict(done=False,winner=0)


def legalMoves(state):
    return [False]*ACTION_SIZE if isTerminal(state)['done'] else rawLegal(state)


def applyMove(state,action):
    if type(action) is not int or not 0<=action<ACTION_SIZE or not legalMoves(state)[action]:raise ValueError('Illegal move')
    origin,target=divmod(action,25);board=state['board'].copy();board[origin]=0;board[target]=state['player'];captured=[]
    for ray in RAYS[target]:
        enemies=[]
        for cell in ray:
            if state['ghostTimers'][cell]>0:break
            if board[cell]==-state['player']:enemies.append(cell)
            else:
                if board[cell]==state['player']:captured.extend(enemies)
                break
    for cell in captured:board[cell]=0
    ghosts=[0]*25;timers=[0]*25;ghosts[origin]=state['player'];timers[origin]=1
    if state['turn']+1>=SEAL_TURN:
        for cell in RIM:
            if board[cell]:captured.append(cell)
            board[cell]=0;ghosts[cell]=0;timers[cell]=0
    return dict(board=board,ghosts=ghosts,ghostTimers=timers,player=-state['player'],turn=state['turn']+1,captured=sorted(captured),lastAction=action)


def encode(state):
    values=[[float(p==state['player']) for p in state['board']],[float(p==-state['player']) for p in state['board']],
            [float(state['ghosts'][c]==state['player'] and state['ghostTimers'][c]>0) for c in range(25)],
            [float(state['ghosts'][c]==-state['player'] and state['ghostTimers'][c]>0) for c in range(25)],state['ghostTimers'],[state['turn']/MOVE_CAP]*25,[float(sealed(state,c)) for c in range(25)]]
    return [[plane[r*5:r*5+5] for r in range(5)] for plane in values]


def symmetries(state,policy):
    result=[]
    for t in range(8):
        target={**state};mapped=[0]*ACTION_SIZE
        for key in ('board','ghosts','ghostTimers'):
            target[key]=[0]*25
            for c,v in enumerate(state[key]):target[key][transformCell(c,t)]=v
        for a,p in enumerate(policy):mapped[transformAction(a,t)]=p
        target['captured']=sorted(transformCell(c,t) for c in state['captured'])
        target['lastAction']=None if state['lastAction'] is None else transformAction(state['lastAction'],t)
        result.append((target,mapped))
    return result
