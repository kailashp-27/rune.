import random
import unittest
from training.core.mcts import search, self_play, arena
from training.games import connect4 as game

class SearchTests(unittest.TestCase):
    def test_identical_agents_score_half_in_paired_arena(self):
        uniform = lambda s: ([1/7]*7, 0)
        self.assertEqual(arena(game, uniform, uniform, games=10, simulations=4, seed=43), .5)

    def test_policy_and_terminal_value(self):
        state = game.initialState()
        for action in [0,1,0,1,0,2]:
            state = game.applyMove(state, action)
        policy = search(game, state, lambda s: ([1/7]*7, 0), simulations=150)
        self.assertAlmostEqual(sum(policy), 1)
        self.assertEqual(max(range(7), key=policy.__getitem__), 0)

    def test_self_play_outcomes_match_player(self):
        positions = self_play(game, lambda s: ([1/7]*7, 0), simulations=4, rng=random.Random(5))
        self.assertLessEqual(len(positions), 42)
        self.assertGreater(len(positions), 6)
        self.assertTrue(all(outcome in (-1, 0, 1) for _, _, outcome in positions))
        for (_, _, first), (_, _, second) in zip(positions, positions[1:]):
            self.assertEqual(first, -second)
