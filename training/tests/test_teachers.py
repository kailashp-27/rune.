import random
import unittest
from training.core.teachers import targets, choose
from training.core.transitions import initial, advance
from training.games.registry import GAMES

class TeacherTests(unittest.TestCase):
    def test_current_player_targets_are_legal_and_finite_for_all_games(self):
        for game_id, game in GAMES.items():
            with self.subTest(game=game_id):
                rng=random.Random(7);state=initial(game,rng)
                for _ in range(3):
                    policy,value=targets(game_id,state)
                    self.assertAlmostEqual(sum(policy),1)
                    self.assertTrue(-1<=value<=1)
                    self.assertTrue(all(p>=0 and (ok or p==0) for p,ok in zip(policy,game.legalMoves(state))))
                    state=advance(game,state,choose(game_id,state,rng),rng)

    def test_immediate_win_gets_policy_and_value_from_actor_perspective(self):
        game=GAMES['connect4'];state=game.initialState()
        for action in [0,1,0,1,0,2]:state=game.applyMove(state,action)
        policy,value=targets('connect4',state)
        self.assertEqual(max(range(7),key=policy.__getitem__),0)
        self.assertGreater(policy[0],.99)
        self.assertEqual(value,1)
