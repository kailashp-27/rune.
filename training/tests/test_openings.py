import unittest
from training.terraform_openings import audit
from training.games import terraform


class OpeningTests(unittest.TestCase):
    def test_every_legal_opening_has_both_paired_branches(self):
        report = audit(2, 731)
        actions = [a for a, legal in enumerate(terraform.legalMoves(terraform.initialState())) if legal]
        self.assertEqual([row['action'] for row in report['openings']], actions)
        self.assertEqual(report['total_games'], len(actions) * 4)
        for row in report['openings']:
            scores = []
            for branch in ('keep', 'swap'):
                result = row[branch]
                self.assertEqual(result['gold_wins'] + result['purple_wins'] + result['draws'], 2)
                self.assertLessEqual(result['average_length'], terraform.MOVE_CAP)
                scores.append(result['gold_score'])
            self.assertEqual(row['gold_score_with_best_response'], min(scores))
