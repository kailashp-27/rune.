import unittest
from training.games import connect4 as g

class RuleTests(unittest.TestCase):
    def play(self, actions):
        state = g.initialState()
        for a in actions:
            state = g.applyMove(state, a)
        return state

    def test_vertical_and_horizontal(self):
        for moves in ([0,1,0,1,0,1,0], [0,0,1,1,2,2,3]):
            state = self.play(moves)
            self.assertEqual(g.isTerminal(state), {'done': True, 'winner': 1})
            self.assertFalse(any(g.legalMoves(state)))

    def test_both_diagonals(self):
        state = self.play([0,1,1,2,4,2,2,3,4,3,5,3,3])
        self.assertEqual(g.isTerminal(state)['winner'], 1)
        reflected = g.symmetries(state, [1/7]*7)[1][0]
        self.assertEqual(g.isTerminal(reflected)['winner'], 1)

    def test_illegal_and_immutable(self):
        state = g.initialState()
        g.applyMove(state, 3)
        self.assertEqual(state, g.initialState())
        full_column = self.play([0]*6)
        for action in (0, -1, 7, 1.5, True):
            with self.assertRaises(ValueError):
                g.applyMove(full_column, action)

    def test_perspective_and_symmetry(self):
        state = g.applyMove(g.initialState(), 0)
        self.assertEqual(g.encode(state)[1][5][0], 1)
        mirrored, policy = g.symmetries(state, list(range(7)))[1]
        self.assertEqual(mirrored['board'][41], 1)
        self.assertEqual(policy, list(reversed(range(7))))

    def test_move_cap(self):
        self.assertEqual(g.isTerminal({'board': [0]*42, 'turn': 42, 'player': 1}), {'done':True,'winner':0})

if __name__ == '__main__':
    unittest.main()
