import unittest
from training.core.baselines import tactical, minimax
from training.games import connect4 as game

class BaselineTests(unittest.TestCase):
    def test_win_and_block(self):
        for moves in ([0,1,0,1,0,2], [0,1,0,1,0]):
            state = game.initialState()
            for action in moves:
                state = game.applyMove(state, action)
            self.assertEqual(tactical(state), 0)
            self.assertEqual(minimax(state, 3), 0)
