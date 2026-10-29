import random
import unittest
from training.games import terraform as g

class TerraformTests(unittest.TestCase):
    def test_pie_rule_changes_ownership_once(self):
        state=g.applyMove(g.initialState(),20*8+2)
        self.assertTrue(g.legalMoves(state)[250])
        swapped=g.applyMove(state,250)
        self.assertEqual(swapped['units'],list(reversed(state['units'])))
        self.assertEqual(swapped['board'],state['board'])
        self.assertEqual((swapped['player'],swapped['turn']),(1,2))
        self.assertFalse(g.legalMoves(swapped)[250])
        self.assertEqual(state['units'],[16,4])

    def test_start_and_immutable_actions(self):
        state=g.initialState()
        self.assertEqual(len(g.legalMoves(state)),251)
        self.assertEqual(state['units'],[20,4])
        next_state=g.applyMove(state,20*8+2)
        self.assertEqual(next_state['units'],[16,4])
        self.assertEqual(state,g.initialState())
        self.assertEqual(next_state['player'],-1)

    def test_climb_occupancy_and_terrain_limits(self):
        state={'board':[0]*25,'units':[12,13],'player':1,'turn':0}
        state['board'][7]=2
        mask=g.legalMoves(state)
        self.assertFalse(mask[12*8+1])
        self.assertFalse(mask[12*8+4])
        self.assertFalse(mask[200+12]);self.assertFalse(mask[200+13])
        self.assertFalse(mask[225+6]);self.assertTrue(mask[225+7])
        state['board'][7]=3
        self.assertFalse(g.legalMoves(state)[207])
        self.assertEqual(g.applyMove(state,232)['board'][7],2)
        for a in (-1,251,1.5,True):
            with self.assertRaises(ValueError):g.applyMove(state,a)

    def test_win_cap_and_no_legal_action(self):
        state={'board':[0]*25,'units':[12,4],'player':1,'turn':79}
        state['board'][12]=2;state['board'][7]=3
        won=g.applyMove(state,12*8+1)
        self.assertEqual(g.isTerminal(won),{'done':True,'winner':1})
        self.assertFalse(any(g.legalMoves(won)))
        state=g.initialState();state['turn']=80
        self.assertEqual(g.isTerminal(state),{'done':True,'winner':0})
        # A corner unit cannot climb height-3 neighbours from height zero,
        # but lowering those unoccupied cells remains a legal action.
        state={'board':[3]*25,'units':[0,24],'player':1,'turn':0}
        state['board'][0]=0;state['board'][24]=0
        self.assertFalse(g.isTerminal(state)['done'])

    def test_eight_symmetries_commute_with_actions(self):
        rng=random.Random(3);state=g.initialState()
        for _ in range(30):
            if g.isTerminal(state)['done']:break
            policy=list(range(251))
            action=rng.choice([a for a,ok in enumerate(g.legalMoves(state)) if ok])
            next_state=g.applyMove(state,action)
            for symmetry,(transformed,target) in enumerate(g.symmetries(state,policy)):
                mapped=g.transformAction(action,symmetry)
                self.assertEqual(target[mapped],policy[action])
                self.assertTrue(g.legalMoves(transformed)[mapped])
                self.assertEqual(g.applyMove(transformed,mapped),g.symmetries(next_state,policy)[symmetry][0])
                self.assertEqual(sorted(g.transformAction(a,symmetry) for a in range(251)),list(range(251)))
            state=next_state

    def test_perspective_planes(self):
        state=g.initialState();state['player']=-1
        planes=g.encode(state)
        self.assertEqual((len(planes),len(planes[0]),len(planes[0][0])),(8,5,5))
        self.assertEqual(planes[4][0][4],1)
        self.assertEqual(planes[5][4][0],1)
