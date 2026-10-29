import copy
import unittest
from training.publish_model import validate_release

class ReleaseTests(unittest.TestCase):
    def test_release_requires_matching_parity_and_strength(self):
        metadata = {'model': {'id':'m'}, 'checkpoint_sha256':'digest', 'promoted':True, 'arena_score':.6, 'cpu_parity':{'passed':True, 'states':50, 'max_error':1e-6}}
        browser = {'modelId':'m', 'states':50, 'passed':True, 'maxError':1e-6, 'neuralSearch':{'passed':True}, 'fallback':{'passed':True}}
        benchmark = {'checkpoint_sha256':'digest', 'games_per_opponent':40, 'opponents':{'random':{'wins':40}, 'heuristic':{'score':.6}}}
        self.assertTrue(validate_release(metadata, browser, benchmark, 'digest'))
        with self.assertRaisesRegex(ValueError, 'must match'):
            validate_release({**metadata, 'game': 'terraform', 'rules_version': 'terraform-v0.1'}, browser, benchmark, 'digest')
        original = {**metadata, 'game':'terraform', 'rules_version':'terraform-v0.1'}
        self.assertTrue(validate_release(original, {**browser,'game':'terraform','rulesVersion':'terraform-v0.1'}, {**benchmark,'game':'terraform','rules_version':'terraform-v0.1'}, 'digest'))
        for field, value in [('modelId','other'), ('maxError',float('nan')), ('states',49)]:
            wrong = {**browser, field:value}
            with self.assertRaises(ValueError):
                validate_release(metadata, wrong, benchmark, 'digest')
        weak = copy.deepcopy(benchmark)
        weak['opponents']['random']['wins'] = 39
        with self.assertRaises(ValueError):
            validate_release(metadata, browser, weak, 'digest')

    def test_teacher_seed_requires_independent_digest_bound_arena(self):
        metadata={'game':'pulse','rules_version':'pulse-v0.1','model':{'id':'pulse-test'},'checkpoint_sha256':'digest','promoted':False,'arena_score':0,'cpu_parity':{'passed':True,'states':50,'max_error':1e-6}}
        browser={'game':'pulse','rulesVersion':'pulse-v0.1','modelId':'pulse-test','states':50,'passed':True,'maxError':1e-6,'neuralSearch':{'passed':True},'fallback':{'passed':True}}
        benchmark={'game':'pulse','rules_version':'pulse-v0.1','checkpoint_sha256':'digest','games_per_opponent':40,'opponents':{'random':{'wins':40},'heuristic':{'score':.725}}}
        arena={'game':'pulse','rules_version':'pulse-v0.1','challenger_sha256':'digest','champion_sha256':'old','games':20,'score':1,'promoted':True}
        with self.assertRaisesRegex(ValueError,'arena gate'):validate_release(metadata,browser,benchmark,'digest')
        self.assertTrue(validate_release(metadata,browser,benchmark,'digest',arena))
        with self.assertRaisesRegex(ValueError,'matching checkpoint'):validate_release(metadata,browser,benchmark,'digest',{**arena,'challenger_sha256':'other'})
