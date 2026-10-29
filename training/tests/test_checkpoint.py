import importlib.util
import random
import tempfile
import unittest
import contextlib
import io
from unittest.mock import patch
from pathlib import Path

@unittest.skipUnless(importlib.util.find_spec('torch'), 'PyTorch is optional for rule-only CI')
class CheckpointTests(unittest.TestCase):
    def test_cross_game_resume_is_rejected(self):
        import torch
        from training.train import main
        from training.core.network import PolicyValueNet
        from training.core.checkpoint import atomic_save, run_state
        workspace=Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(prefix='rune-game-check-',dir=workspace) as directory:
            root=Path(directory).resolve();self.assertTrue(root.is_relative_to(workspace))
            path=root/'connect4.pt'
            atomic_save(run_state(PolicyValueNet(channels=8,blocks=1),1,[],random.Random(1),1,.6,1),path)
            errors=io.StringIO()
            with patch('sys.argv',['training.train','--game','terraform','--resume',str(path)]),contextlib.redirect_stderr(errors),self.assertRaises(SystemExit) as error:
                main()
            self.assertEqual(error.exception.code,2)
            self.assertIn('another game',errors.getvalue())

    def test_split_cli_run_matches_uninterrupted_training(self):
        import json
        import torch
        from training.train import main
        workspace = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(prefix='rune-resume-test-', dir=workspace) as directory:
            root = Path(directory).resolve()
            self.assertTrue(root.is_relative_to(workspace))
            continuous, split = root / 'continuous', root / 'split'
            budgets = ['--games','2','--simulations','4','--self-play-batch','2','--steps','1','--arena-games','2','--channels','8','--blocks','1']
            def run(args):
                with patch('sys.argv', ['training.train', *budgets, *args]), contextlib.redirect_stdout(io.StringIO()):
                    main()
            run(['--iterations','2','--seed','73','--output',str(continuous)])
            run(['--iterations','1','--seed','73','--output',str(split)])
            run(['--iterations','1','--resume',str(split/'latest.pt'),'--output',str(split)])
            want = torch.load(continuous/'latest.pt', weights_only=True)
            got = torch.load(split/'latest.pt', weights_only=True)
            self.assertEqual(got['seed'], 73)
            self.assertEqual(got['iteration'], 2)
            self.assertEqual(got['replay'], want['replay'])
            for key in want['state_dict']:
                torch.testing.assert_close(got['state_dict'][key], want['state_dict'][key], atol=0, rtol=0)
            want_candidate = torch.load(continuous/'candidate-0002.pt', weights_only=True)
            got_candidate = torch.load(split/'candidate-0002.pt', weights_only=True)
            for key in want_candidate['state_dict']:
                torch.testing.assert_close(got_candidate['state_dict'][key], want_candidate['state_dict'][key], atol=0, rtol=0)

    def test_resume_roundtrip_restores_weights_replay_and_random_state(self):
        import torch
        from training.core.network import PolicyValueNet
        from training.core.checkpoint import atomic_save, run_state
        from training.games import connect4 as game
        model = PolicyValueNet(channels=8, blocks=1)
        rng = random.Random(43)
        replay = [(game.encode(game.initialState()), [1/7]*7, 1)]
        state = run_state(model, 7, replay, rng, 43, .6, 6)
        expected_python = rng.random()
        expected_torch = torch.rand(3)
        workspace = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(prefix='rune-checkpoint-test-', dir=workspace) as directory:
            self.assertTrue(Path(directory).resolve().is_relative_to(workspace))
            path = Path(directory) / 'latest.pt'
            atomic_save(state, path)
            loaded = torch.load(path, weights_only=True)
            restored_rng = random.Random()
            restored_rng.setstate(loaded['python_rng_state'])
            self.assertEqual(restored_rng.random(), expected_python)
            torch.set_rng_state(loaded['torch_rng_state'])
            torch.testing.assert_close(torch.rand(3), expected_torch)
            self.assertEqual(loaded['replay'], replay)
            self.assertEqual(loaded['champion_iteration'], 6)
            self.assertFalse(loaded['promoted'])
            self.assertFalse(path.with_name(path.name + '.tmp').exists())
            for name, tensor in model.state_dict().items():
                torch.testing.assert_close(tensor, loaded['state_dict'][name])
