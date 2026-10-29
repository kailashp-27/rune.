import random
import unittest
from training.games import fortress as g


class FortressTests(unittest.TestCase):
    def position(self,pieces,player=1,hold=None):
        s=g.initialState();s['board']=[0]*25;s['player']=player;s['hold']=hold or [0,0]
        for c,p in pieces.items():s['board'][c]=p
        return s

    def test_rook_rays_do_not_jump_or_move_diagonally(self):
        s=g.initialState();mask=g.legalMoves(s)
        self.assertTrue(mask[21*25+11]);self.assertFalse(mask[20*25+22]);self.assertFalse(mask[20*25+16]);self.assertFalse(mask[4*25+9])
        self.assertEqual(sum(s['board']),0)
        for a in (-1,625,True,1.5,20*25+22):
            with self.assertRaises(ValueError):g.applyMove(s,a)

    def test_multi_piece_and_multi_direction_capture_are_simultaneous(self):
        s=self.position({0:1,10:1,13:-1,14:1,17:-1,22:1,7:-1,2:1,24:-1})
        # Slide 10 -> 12, bracketing 7,13,17 in three directions.
        n=g.applyMove(s,10*25+12)
        self.assertEqual(n['captured'],[7,13,17]);self.assertEqual(s['board'][13],-1)
        s=self.position({20:1,11:-1,12:-1,13:-1,14:1,4:-1})
        n=g.applyMove(s,20*25+10);self.assertEqual(n['captured'],[11,12,13])
        self.assertEqual(n['hold'],[0,0])

    def test_edges_empty_center_and_vacated_origin_are_not_backstops(self):
        s=self.position({10:1,13:-1,14:-1,0:-1})
        self.assertEqual(g.applyMove(s,10*25+12)['captured'],[])
        s=self.position({20:1,11:-1,4:-1})
        self.assertEqual(g.applyMove(s,20*25+10)['captured'],[])  # empty center

    def test_center_counter_only_ticks_on_owners_turn_and_resets(self):
        s=self.position({10:1,20:1,4:-1,0:-1})
        n=g.applyMove(s,10*25+12);self.assertEqual(n['hold'],[1,0])
        n=g.applyMove(n,4*25+9);self.assertEqual(n['hold'],[1,0])
        n=g.applyMove(n,20*25+21);self.assertEqual(n['hold'],[2,0])
        n=g.applyMove(n,9*25+4);n=g.applyMove(n,21*25+20)
        self.assertEqual(g.isTerminal(n),{'done':True,'winner':1});self.assertFalse(any(g.legalMoves(n)))
        s=self.position({12:1,20:1,0:-1},hold=[2,0]);n=g.applyMove(s,12*25+13);self.assertEqual(n['hold'],[0,0])
        s=self.position({12:-1,13:1,21:1,0:-1},hold=[0,2]);n=g.applyMove(s,21*25+11)
        self.assertIn(12,n['captured']);self.assertEqual(n['hold'],[0,0])

    def test_cap_elimination_perspective_and_full_symmetry(self):
        s=self.position({10:1,12:-1,13:1});n=g.applyMove(s,10*25+11);self.assertEqual(g.isTerminal(n)['winner'],1)
        s=g.initialState();s['turn']=100;self.assertEqual(g.isTerminal(s),{'done':True,'winner':0})
        rng=random.Random(32);s=g.initialState();policy=list(range(g.ACTION_SIZE))
        for _ in range(12):
            if g.isTerminal(s)['done']:s=g.initialState()
            actions=[a for a,ok in enumerate(g.legalMoves(s)) if ok]
            for t,(transformed,_) in enumerate(g.symmetries(s,policy)):
                for a in actions:self.assertEqual(g.applyMove(transformed,g.transformAction(a,t)),g.symmetries(g.applyMove(s,a),policy)[t][0])
            s=g.applyMove(s,rng.choice(actions))
        s['player']=-1;s['hold']=[0,2];planes=g.encode(s)
        self.assertEqual(len(planes),6);self.assertEqual(planes[2][0][0],2/3)
