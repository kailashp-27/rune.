"""Pulse alpha: simultaneous integer waves and emitter territory. See docs/PULSE-RULES.md."""
ACTION_SIZE = 51
INPUT_SHAPE = (7, 5, 5)
RULES_VERSION = 'pulse-v0.1'
MOVE_CAP = 120
NEIGHBORS = [[rr*5+cc for rr,cc in ((r-1,c),(r,c+1),(r+1,c),(r,c-1)) if 0<=rr<5 and 0<=cc<5] for r in range(5) for c in range(5)]
WAVES = [[[(target,level+1-abs(source//5-target//5)-abs(source%5-target%5)) for target in range(25) if abs(source//5-target//5)+abs(source%5-target%5)<=level] for level in range(4)] for source in range(25)]


def initialState():
    board,strength,level,cooldown=[0]*25,[0]*25,[0]*25,[0]*25
    for cell,owner in ((20,1),(4,-1)):
        board[cell]=owner;strength[cell]=2;level[cell]=1;cooldown[cell]=1
    return dict(board=board,strength=strength,level=level,cooldown=cooldown,bursts=[0]*25,player=1,turn=0)


def territory(state):
    return [sum(owner==player for owner in state['board']) for player in (1,-1)]


def isTerminal(state):
    emitters=[sum(owner==p and state['level'][cell]>0 for cell,owner in enumerate(state['board'])) for p in (1,-1)]
    if not all(emitters):
        return {'done':True,'winner':1 if emitters[0] else -1 if emitters[1] else 0}
    if state['turn']>=MOVE_CAP:
        gold,purple=territory(state)
        return {'done':True,'winner':1 if gold>purple else -1 if purple>gold else 0}
    return {'done':False,'winner':0}


def legalMoves(state):
    mask=[False]*ACTION_SIZE
    if isTerminal(state)['done']:return mask
    for cell,owner in enumerate(state['board']):
        mask[cell]=state['level'][cell]==0 and (owner==state['player'] or owner==0 and any(state['board'][n]==state['player'] for n in NEIGHBORS[cell]))
        mask[25+cell]=owner==state['player'] and 0<state['level'][cell]<3
    mask[50]=True
    return mask


def step(state):
    """Resolve every firing source from one snapshot, then settle all cells together."""
    incoming=[[0]*25,[0]*25];cooldown=[0]*25;bursts=[0]*25
    for cell,owner in enumerate(state['board']):
        if not owner:continue
        side=0 if owner==1 else 1
        incoming[side][cell]=max(incoming[side][cell],state['strength'][cell]-1,1 if state['level'][cell] else 0)
        if state['level'][cell]:
            cooldown[cell]=state['cooldown'][cell]-1
            if cooldown[cell]<=0:
                cooldown[cell]=3;bursts[cell]=owner*(state['level'][cell]+1)
                for target,power in WAVES[cell][state['level'][cell]]:
                    incoming[side][target]=max(incoming[side][target],power)
    board,strength,level=[0]*25,[0]*25,state['level'].copy()
    for cell in range(25):
        difference=incoming[0][cell]-incoming[1][cell]
        board[cell]=1 if difference>0 else -1 if difference<0 else 0
        strength[cell]=abs(difference)
        if board[cell]==0:level[cell]=0;cooldown[cell]=0
        elif level[cell] and board[cell]!=state['board'][cell]:cooldown[cell]=3
    return {**state,'board':board,'strength':strength,'level':level,'cooldown':cooldown,'bursts':bursts}


def applyMove(state,action):
    if type(action) is not int or not 0<=action<ACTION_SIZE or not legalMoves(state)[action]:raise ValueError('Illegal move')
    modified={**state,**{key:state[key].copy() for key in ('board','strength','level','cooldown','bursts')}}
    if action<25:
        modified['board'][action]=state['player'];modified['strength'][action]=2
        modified['level'][action]=1;modified['cooldown'][action]=2
    elif action<50:
        cell=action-25;modified['level'][cell]+=1
        modified['strength'][cell]=max(modified['strength'][cell],modified['level'][cell]+1)
        modified['cooldown'][cell]=1
    result=step(modified)
    return {**result,'player':-state['player'],'turn':state['turn']+1}


def encode(state):
    values=[[float(owner==state['player']) for owner in state['board']],
            [float(owner==-state['player']) for owner in state['board']],
            [power/4 for power in state['strength']],
            [state['level'][c]/3 if state['board'][c]==state['player'] else 0 for c in range(25)],
            [state['level'][c]/3 if state['board'][c]==-state['player'] else 0 for c in range(25)],
            [timer/3 for timer in state['cooldown']],[state['turn']/MOVE_CAP]*25]
    return [[plane[r*5:r*5+5] for r in range(5)] for plane in values]


def transformCell(cell,transform):
    r,c=divmod(cell,5)
    if transform>=4:c=4-c
    for _ in range(transform%4):r,c=c,4-r
    return r*5+c


def transformAction(action,transform):
    return action if action==50 else (25 if action>=25 else 0)+transformCell(action%25,transform)


def symmetries(state,policy):
    result=[]
    for transform in range(8):
        target={**state}
        for key in ('board','strength','level','cooldown','bursts'):
            target[key]=[0]*25
            for cell,value in enumerate(state[key]):target[key][transformCell(cell,transform)]=value
        transformed=[0]*ACTION_SIZE
        for action,value in enumerate(policy):transformed[transformAction(action,transform)]=value
        result.append((target,transformed))
    return result
