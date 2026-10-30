import random
import unittest
from training.games import mirror as g

class MirrorTests(unittest.TestCase):
    def position(self,pieces,ghosts=None):
        s=g.initialState();s['board']=[0]*25
        for c,p in pieces.items():s['board'][c]=p
        for c,p in (ghosts or {}).items():s['ghosts'][c]=p;s['ghostTimers'][c]=1
        return s

    def test_ghost_blocks_movement_until_after_the_reply(self):
        s=g.initialState();n=g.applyMove(s,21*25+11)
        self.assertEqual(s,g.initialState());self.assertEqual(n['ghosts'][21],1);self.assertEqual(n['ghostTimers'][21],1)
        n=g.applyMove(n,1*25+6)
        self.assertEqual(n['ghostTimers'][21],0);self.assertEqual(n['ghosts'][1],-1)
        s=self.position({20:1,4:-1},{15:-1})
        self.assertFalse(g.legalMoves(s)[20*25+15]);self.assertFalse(g.legalMoves(s)[20*25+10])
        for action in (-1,625,True,1.5):
            with self.assertRaises(ValueError):g.applyMove(s,action)

    def test_ghosts_cannot_complete_or_be_part_of_a_sandwich(self):
        for owner in (1,-1):
            s=self.position({10:1,12:-1,4:-1},{13:owner})
            n=g.applyMove(s,10*25+11);self.assertEqual(n['captured'],[]);self.assertEqual(n['board'][12],-1)
            self.assertEqual(n['ghostTimers'][13],0)
        s=self.position({10:1,13:-1,14:1,4:-1},{12:-1})
        self.assertEqual(g.applyMove(s,10*25+11)['captured'],[])

    def test_real_captures_and_ghost_expiry_do_not_retroactively_capture(self):
        s=self.position({10:1,12:-1,13:1,4:-1})
        n=g.applyMove(s,10*25+11);self.assertEqual(n['captured'],[12]);self.assertEqual(n['ghosts'][10],1)
        s=self.position({10:1,13:-1,14:1,4:-1},{12:1})
        n=g.applyMove(s,10*25+11);self.assertEqual(n['board'][13],-1);self.assertEqual(n['ghostTimers'][12],0)

    def test_ghosts_do_not_count_for_victory_and_no_center_hold(self):
        s=self.position({12:1,4:-1},{20:1});s['turn']=100
        self.assertEqual(g.isTerminal(s),{'done':True,'winner':0})
        s=self.position({12:1},{4:-1});self.assertEqual(g.isTerminal(s)['winner'],1)
        s=self.position({12:1,4:-1});s['player']=-1;s['ghosts'][20]=1;s['ghostTimers'][20]=1
        planes=g.encode(s);self.assertEqual(len(planes),7);self.assertEqual(planes[3][4][0],1)

    def test_full_symmetry_preserves_ghost_timers_and_transitions(self):
        rng=random.Random(23);s=g.initialState();policy=list(range(625))
        for _ in range(10):
            if g.isTerminal(s)['done']:s=g.initialState()
            actions=[a for a,ok in enumerate(g.legalMoves(s)) if ok]
            for t,(transformed,_) in enumerate(g.symmetries(s,policy)):
                for a in actions:self.assertEqual(g.applyMove(transformed,g.transformAction(a,t)),g.symmetries(g.applyMove(s,a),policy)[t][0])
            s=g.applyMove(s,rng.choice(actions))

    def test_outer_ring_closes_after_equal_turns_and_prevents_corner_camping(self):
        s=self.position({0:-1,1:-1,11:1,24:1});s['player']=-1;s['turn']=23
        n=g.applyMove(s,1*25+6)
        self.assertEqual(n['turn'],24)
        self.assertTrue(all(n['board'][c]==0 and n['ghostTimers'][c]==0 for c in g.RIM))
        self.assertEqual(n['board'][6],-1);self.assertEqual(n['board'][11],1)
        for action,legal in enumerate(g.legalMoves(n)):
            if legal:self.assertNotIn(action%25,g.RIM)
        self.assertTrue(all(g.encode(n)[6][c//5][c%5]==1 for c in g.RIM))
