"""Fortress alpha: rook movement, custodial captures and a three-own-turn center hold."""
ACTION_SIZE=625
INPUT_SHAPE=(6,5,5)
RULES_VERSION='fortress-v0.1'
MOVE_CAP=100
RAYS=[[[rr*5+cc for distance in range(1,5) if 0<=(rr:=r+dr*distance)<5 and 0<=(cc:=c+dc*distance)<5] for dr,dc in ((-1,0),(0,1),(1,0),(0,-1))] for r in range(5) for c in range(5)]


def initialState():
    board=[0]*25
    for cell in (20,21,23,24):board[cell]=1
    for cell in (0,1,3,4):board[cell]=-1
    return dict(board=board,hold=[0,0],player=1,turn=0,captured=[],lastAction=None)


def rawLegal(state):
    mask=[False]*ACTION_SIZE
    for origin,owner in enumerate(state['board']):
        if owner!=state['player']:continue
        for ray in RAYS[origin]:
            for target in ray:
                if state['board'][target]:break
                mask[origin*25+target]=True
    return mask


def isTerminal(state):
    counts=[state['board'].count(p) for p in (1,-1)]
    if not all(counts):return dict(done=True,winner=1 if counts[0] else -1 if counts[1] else 0)
    for index,player in enumerate((1,-1)):
        if state['hold'][index]>=3 and state['board'][12]==player:return dict(done=True,winner=player)
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
            if board[cell]==-state['player']:enemies.append(cell)
            else:
                if board[cell]==state['player']:captured.extend(enemies)
                break
    for cell in captured:board[cell]=0
    hold=state['hold'].copy();index=0 if state['player']==1 else 1
    for i,owner in enumerate((1,-1)):
        if board[12]!=owner:hold[i]=0
    if board[12]==state['player']:hold[index]+=1
    return dict(board=board,hold=hold,player=-state['player'],turn=state['turn']+1,captured=sorted(captured),lastAction=action)


def encode(state):
    index=0 if state['player']==1 else 1
    values=[[float(p==state['player']) for p in state['board']],[float(p==-state['player']) for p in state['board']],
            [state['hold'][index]/3]*25,[state['hold'][1-index]/3]*25,[float(c==12) for c in range(25)],[state['turn']/MOVE_CAP]*25]
    return [[plane[r*5:r*5+5] for r in range(5)] for plane in values]


def transformCell(cell,transform):
    r,c=divmod(cell,5)
    if transform>=4:c=4-c
    for _ in range(transform%4):r,c=c,4-r
    return r*5+c


def transformAction(action,transform):
    origin,target=divmod(action,25)
    return transformCell(origin,transform)*25+transformCell(target,transform)


def symmetries(state,policy):
    result=[]
    for transform in range(8):
        board=[0]*25;target=[0]*ACTION_SIZE
        for cell,owner in enumerate(state['board']):board[transformCell(cell,transform)]=owner
        for action,value in enumerate(policy):target[transformAction(action,transform)]=value
        result.append(({**state,'board':board,'hold':state['hold'].copy(),'captured':sorted(transformCell(c,transform) for c in state['captured']),'lastAction':None if state['lastAction'] is None else transformAction(state['lastAction'],transform)},target))
    return result
