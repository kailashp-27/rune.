import importlib.util
import random
import unittest
from training.games import connect4 as game
from training.core.mcts import batched_self_play, self_play

class SchedulerTests(unittest.TestCase):
    def test_interleaving_preserves_seeded_games_and_result_order(self):
        evaluate = lambda state: ([1/7]*7, 0)
        expected = [self_play(game, evaluate, simulations=8, rng=random.Random(71+i)) for i in range(7)]
        sizes = []
        def evaluate_many(states):
            sizes.append(len(states))
            return [evaluate(state) for state in states]
        actual = batched_self_play(game, evaluate_many, games=7, simulations=8, batch_size=3, seed=71)
        self.assertEqual(actual, expected)
        self.assertEqual(max(sizes), 3)

    def test_bad_budgets_and_wrong_evaluator_batch_fail(self):
        with self.assertRaises(ValueError):
            batched_self_play(game, lambda states: [], games=1, batch_size=0)
        with self.assertRaises(ValueError):
            batched_self_play(game, lambda states: [], games=2, batch_size=2)

@unittest.skipUnless(importlib.util.find_spec('torch'), 'PyTorch is optional for rule-only CI')
class NeuralBatchTests(unittest.TestCase):
    def test_game_cache_distinguishes_unit_positions(self):
        import torch
        from training.core.network import PolicyValueNet, BatchedEvaluator
        from training.games import terraform
        model=PolicyValueNet(planes=8,height=5,width=5,actions=251,channels=8,blocks=1)
        first=terraform.initialState()
        second={**first,'units':[21,4]}
        evaluate=BatchedEvaluator(model,terraform,'cpu')
        result=evaluate.evaluate_many([first,second])
        self.assertEqual(evaluate.stats['evaluated_positions'],2)
        self.assertEqual(len(result[0][0]),251)

    def test_nonfinite_model_outputs_are_rejected(self):
        import torch
        from training.core.network import PolicyValueNet, BatchedEvaluator
        model = PolicyValueNet(channels=8, blocks=1)
        with torch.no_grad():
            model.policy[-1].weight.fill_(float('nan'))
        with self.assertRaises(FloatingPointError):
            BatchedEvaluator(model, game, 'cpu')(game.initialState())

    def test_batch_matches_scalar_and_deduplicates_requests(self):
        import torch
        from training.core.network import PolicyValueNet, BatchedEvaluator
        torch.set_num_threads(2)
        torch.manual_seed(4)
        model = PolicyValueNet(channels=8, blocks=1)
        states = [game.initialState(), game.applyMove(game.initialState(), 2)]
        scalar = BatchedEvaluator(model, game, 'cpu')
        expected = [scalar(state) for state in states]
        batch = BatchedEvaluator(model, game, 'cpu', capacity=1)
        actual = batch.evaluate_many([states[0], states[1], states[0]])
        for got, want in zip(actual, [expected[0], expected[1], expected[0]]):
            torch.testing.assert_close(torch.tensor(got[0]), torch.tensor(want[0]), atol=1e-6, rtol=1e-5)
            self.assertAlmostEqual(got[1], want[1], places=6)
        self.assertEqual(batch.stats['evaluated_positions'], 2)
        self.assertEqual(batch.stats['forward_calls'], 1)
        self.assertEqual(actual[0], actual[2])
        batch(states[1])
        self.assertEqual(batch.stats['forward_calls'], 1)
