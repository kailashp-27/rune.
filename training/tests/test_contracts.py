import unittest
from training.core.contracts import checkpoint_game


class ContractTests(unittest.TestCase):
    def test_legacy_and_terraform_contracts(self):
        legacy = {'config': dict(planes=3, height=6, width=7, actions=7)}
        self.assertEqual(checkpoint_game(legacy)[0], 'connect4')
        terraform = {'game': 'terraform', 'rules_version': 'terraform-v0.1',
                     'config': dict(planes=8, height=5, width=5, actions=251)}
        self.assertEqual(checkpoint_game(terraform)[0], 'terraform')
        tidal = {'game': 'tidal', 'rules_version': 'tidal-v0.2',
                 'config': dict(planes=6, height=5, width=5, actions=125)}
        self.assertEqual(checkpoint_game(tidal)[0], 'tidal')
        pulse = {'game': 'pulse', 'rules_version': 'pulse-v0.1',
                 'config': dict(planes=7, height=5, width=5, actions=51)}
        self.assertEqual(checkpoint_game(pulse)[0], 'pulse')
        with self.assertRaisesRegex(ValueError, 'rules version'):
            checkpoint_game({**tidal, 'rules_version': 'tidal-v0.1'})
        for invalid in ({**terraform, 'rules_version': 'terraform-v0'},
                        {**terraform, 'game': 'missing'},
                        {**terraform, 'config': legacy['config']}):
            with self.assertRaises(ValueError):
                checkpoint_game(invalid)
