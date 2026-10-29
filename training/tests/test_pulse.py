import random
import unittest
from training.games import pulse as game


class PulseTests(unittest.TestCase):
    def test_initial_actions_boost_build_wait_and_immutability(self):
        state=game.initialState();original=game.initialState()
        self.assertEqual([a for a,ok in enumerate(game.legalMoves(state)) if ok],[15,21,45,50])
        built=game.applyMove(state,15)
        self.assertEqual(state,original)
        self.assertEqual(built['level'][15],1);self.assertEqual(built['cooldown'][15],1)
        self.assertEqual(built['bursts'][20],2);self.assertEqual(built['bursts'][4],-2)
        boosted=game.applyMove(state,45)
        self.assertEqual(boosted['level'][20],2);self.assertEqual(boosted['bursts'][20],3)
        self.assertEqual(boosted['cooldown'][20],3)
        for action in (-1,51,True,1.5,4,29,12):
            with self.assertRaises(ValueError):game.applyMove(state,action)

    def test_simultaneous_equal_waves_cancel_and_friendly_waves_use_max(self):
        state=game.initialState()
        for key in ('board','strength','level','cooldown'):state[key]=[0]*25
        for cell,owner in ((10,1),(14,-1)):
            state['board'][cell]=owner;state['level'][cell]=3;state['strength'][cell]=2;state['cooldown'][cell]=1
        result=game.step(state)
        self.assertEqual(result['board'][12],0);self.assertEqual(result['strength'][12],0)
        self.assertEqual(result['board'][11],1);self.assertEqual(result['strength'][11],2)
        self.assertEqual(result['bursts'][10],4);self.assertEqual(result['bursts'][14],-4)
        state['board'][14]=1
        result=game.step(state)
        self.assertEqual(result['strength'][12],2)  # max(2,2), not sum

    def test_capture_preserves_power_and_fired_wave_precedes_capture(self):
        state=game.initialState()
        for key in ('board','strength','level','cooldown'):state[key]=[0]*25
        state['board'][11]=1;state['level'][11]=3;state['strength'][11]=2;state['cooldown'][11]=1
        state['board'][12]=-1;state['level'][12]=1;state['strength'][12]=2;state['cooldown'][12]=1
        result=game.step(state)
        self.assertEqual(result['board'][12],1);self.assertEqual(result['level'][12],1)
        self.assertEqual(result['cooldown'][12],3);self.assertEqual(result['bursts'][12],-2)
        self.assertEqual(game.isTerminal(result),{'done':True,'winner':1})
        state['level'][11]=2
        result=game.step(state)
        self.assertEqual(result['board'][12],0);self.assertEqual(result['level'][12],0);self.assertEqual(result['cooldown'][12],0)

    def test_decay_core_floor_cap_and_encoding(self):
        state=game.initialState();state['cooldown']=[3 if value else 0 for value in state['level']]
        state['board'][12]=1;state['strength'][12]=1
        result=game.step(state)
        self.assertEqual(result['board'][12],0);self.assertEqual(result['strength'][20],1)
        state['turn']=120;self.assertEqual(game.isTerminal(state),{'done':True,'winner':1})
        self.assertFalse(any(game.legalMoves(state)))
        state=game.initialState();state['turn']=120
        self.assertEqual(game.isTerminal(state),{'done':True,'winner':0})
        state['player']=-1;planes=game.encode(state)
        self.assertEqual((len(planes),len(planes[0]),len(planes[0][0])),(7,5,5))
        self.assertEqual(planes[0][0][4],1);self.assertEqual(planes[4][4][0],1/3)

    def test_all_symmetries_commute_with_step_and_actions(self):
        rng=random.Random(91);state=game.initialState();policy=list(range(51))
        for _ in range(20):
            if game.isTerminal(state)['done']:state=game.initialState()
            for t,(transformed,_) in enumerate(game.symmetries(state,policy)):
                self.assertEqual(game.step(transformed),game.symmetries(game.step(state),policy)[t][0])
                self.assertEqual(sorted(game.transformAction(a,t) for a in range(51)),list(range(51)))
                for a,legal in enumerate(game.legalMoves(state)):
                    self.assertEqual(legal,game.legalMoves(transformed)[game.transformAction(a,t)])
                    if legal:self.assertEqual(game.applyMove(transformed,game.transformAction(a,t)),game.symmetries(game.applyMove(state,a),policy)[t][0])
            state=game.applyMove(state,rng.choice([a for a,ok in enumerate(game.legalMoves(state)) if ok]))
