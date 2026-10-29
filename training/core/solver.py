"""Exact Connect Four negamax with a bounded work budget.

No heuristic leaf values: a budget exhaustion raises Unsolved instead of
pretending the partial result is perfect. Useful for independently scored
late-game positions; the opening may exceed a CPU budget.
"""
from training.games import connect4 as game

class Unsolved(RuntimeError):
    pass

def solve(state, max_nodes=500000):
    nodes=0;cache={}
    def visit(current, alpha, beta):
        nonlocal nodes
        nodes+=1
        if nodes>max_nodes:raise Unsolved('Exact solver node budget exhausted')
        end=game.isTerminal(current)
        if end['done']:return end['winner']*current['player']
        key=(tuple(current['board']),current['player'])
        if key in cache:return cache[key]
        original_alpha,original_beta=alpha,beta
        value=-2;exact=True
        actions=[a for a in [3,2,4,1,5,0,6] if game.legalMoves(current)[a]]
        for action in actions:
            score=-visit(game.applyMove(current,action),-beta,-alpha)
            value=max(value,score);alpha=max(alpha,value)
            if alpha>=beta:
                exact=False;break
        # Cut-off values are bounds, never cache them as exact scores.
        # Interior searches with a narrow window can also return bounds.
        if exact and original_alpha<value<original_beta:
            cache[key]=value
        return value
    end=game.isTerminal(state)
    if end['done']:return dict(value=end['winner']*state['player'],optimal_actions=[],nodes=0,solved=True)
    scores={}
    for action in [3,2,4,1,5,0,6]:
        if game.legalMoves(state)[action]:scores[action]=-visit(game.applyMove(state,action),-2,2)
    best=max(scores.values())
    return dict(value=best,optimal_actions=[a for a,value in scores.items() if value==best],nodes=nodes,solved=True)
