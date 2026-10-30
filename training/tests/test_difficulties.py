import copy
import unittest
from training.publish_difficulties import validate_game

class DifficultyTests(unittest.TestCase):
    def sample(self):
        entries={tier:dict(id=tier,trainingGames=count) for tier,count in [('Easy',8),('Medium',24),('Hard',64)]}
        report=dict(models=copy.deepcopy(entries),parity={tier:dict(modelId=tier,passed=True,states=50,maxError=1e-6) for tier in entries},duels=[dict(strong=a,weak=b,games=12,wins=8,losses=4,draws=0,score=8/12) for a,b in [('Hard','Easy'),('Medium','Easy'),('Hard','Medium')]])
        return entries,report
    def test_rejects_same_model_or_nonincreasing_training(self):
        entries,report=self.sample();validate_game(entries,report)
        entries['Easy']['id']='Hard'
        with self.assertRaisesRegex(ValueError,'different'):validate_game(entries,report)
        entries,report=self.sample();entries['Medium']['trainingGames']=64
        with self.assertRaisesRegex(ValueError,'counts'):validate_game(entries,report)
    def test_rejects_wrong_parity_and_unproven_strength(self):
        entries,report=self.sample();report['parity']['Hard']['modelId']='old-hard'
        with self.assertRaisesRegex(ValueError,'parity'):validate_game(entries,report)
        entries,report=self.sample();report['duels'][0].update(wins=6,losses=6,score=.5)
        with self.assertRaisesRegex(ValueError,'order'):validate_game(entries,report)
