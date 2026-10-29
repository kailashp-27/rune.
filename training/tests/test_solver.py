import unittest
from training.games import connect4 as game
from training.core.solver import solve, Unsolved

class ExactSolverTests(unittest.TestCase):
    def test_solver_proves_win_and_reports_budget_exhaustion(self):
        state=game.initialState()
        # Nearly full legal board, generated below from a fixed non-winning line.
        import random
        rng=random.Random(71)
        while state['turn']<36:
            legal=[a for a,ok in enumerate(game.legalMoves(state)) if ok and not game.isTerminal(game.applyMove(state,a))['done']]
            if not legal:state=game.initialState();continue
            state=game.applyMove(state,rng.choice(legal))
        result=solve(state)
        def exhaustive(current):
            end=game.isTerminal(current)
            if end['done']:return end['winner']*current['player']
            return max(-exhaustive(game.applyMove(current,a)) for a,ok in enumerate(game.legalMoves(current)) if ok)
        expected={a:-exhaustive(game.applyMove(state,a)) for a,ok in enumerate(game.legalMoves(state)) if ok}
        self.assertEqual(result['value'],max(expected.values()))
        self.assertEqual(set(result['optimal_actions']),{a for a,value in expected.items() if value==max(expected.values())})
        with self.assertRaises(Unsolved):solve(game.initialState(),max_nodes=1)
