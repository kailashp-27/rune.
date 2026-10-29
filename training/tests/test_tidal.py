import random
import unittest
from training.games import tidal as game
from training.core.mcts import search, self_play, batched_self_play, arena


class TidalTests(unittest.TestCase):
    def test_wave_candidates_and_encoding(self):
        for wave in range(10):
            state=game.initialState(wave)
            self.assertEqual(len(game.chanceOutcomes(state)),9)
            self.assertNotIn(wave,game.chanceOutcomes(state))
            self.assertEqual(sum(game.legalMoves(state)),20)
            self.assertEqual(sum(game.wet(state,c) for c in range(25)),5)
        state=game.applyMove(game.initialState(),12,7)
        encoded=game.encode(state)
        self.assertEqual((len(encoded),len(encoded[0]),len(encoded[0][0])),(6,5,5))
        self.assertEqual(encoded[1][2][2],1)
        self.assertEqual(encoded[0][2][2],0)
        self.assertEqual(encoded[2][0],[0,0,1,0,0])
        self.assertEqual(encoded[3][0],[1]*5)
        self.assertEqual(encoded[4][0],[1]*5)

    def test_nudge_endpoints_ownership_and_immutability(self):
        state=game.initialState()
        state['board'][5]=1;state['board'][6]=-1;state['board'][0]=1
        mask=game.legalMoves(state)
        for action in [25,45,46,48,49,50,51,52]:self.assertFalse(mask[action])
        moved=game.applyMove(state,47,7)
        self.assertEqual(moved['board'][5],0);self.assertEqual(moved['board'][10],1)
        self.assertEqual(state['board'][5],1);self.assertEqual(moved['wave'],7)
        vertical=game.initialState(7);vertical['board'][11]=1;vertical['board'][12]=1
        self.assertFalse(game.legalMoves(vertical)[25+11*4+1])
        self.assertFalse(any(game.legalMoves(vertical)[25+12*4:25+12*4+4]))
        for action in (-1,125,True,1.5):
            with self.assertRaises(ValueError):game.applyMove(state,action,7)
        for wave in (0,10,-1,True,2.5):
            with self.assertRaises(ValueError):game.applyMove(state,47,wave)

    def test_wave_draw_is_independent_of_chosen_action(self):
        for seed in range(50):
            state=game.initialState(0)
            left=game.sampleMove(state,6,random.Random(seed))
            right=game.sampleMove(state,13,random.Random(seed))
            self.assertEqual(left['wave'],right['wave'])

    def test_wins_water_lines_cap_and_no_moves(self):
        for line in game.LINES:
            state=game.initialState(7)
            for cell in line:state['board'][cell]=-1
            self.assertEqual(game.isTerminal(state),{'done':True,'winner':-1})
            self.assertFalse(any(game.legalMoves(state)))
        state=game.initialState();state['turn']=80
        self.assertEqual(game.isTerminal(state),{'done':True,'winner':0})
        state['board'][:4]=[1]*4
        self.assertEqual(game.isTerminal(state)['winner'],1)
        state={'board':[1,1,-1,-1,1,-1,-1,1,1,-1,1,1,-1,-1,1,-1,-1,1,1,-1,1,1,-1,-1,1],'player':1,'turn':20,'wave':8}
        self.assertEqual(game.isTerminal(state),{'done':True,'winner':-1})

    def test_reflection_maps_actions_and_both_wave_axes(self):
        self.assertEqual(sorted(game.flipAction(a) for a in range(125)),list(range(125)))
        rng=random.Random(12);state=game.sampleInitial(rng);policy=list(range(125))
        for _ in range(20):
            if game.isTerminal(state)['done']:state=game.sampleInitial(rng)
            reflected=game.symmetries(state,policy)[1][0]
            for a,legal in enumerate(game.legalMoves(state)):
                self.assertEqual(legal,game.legalMoves(reflected)[game.flipAction(a)])
                if legal:
                    for wave in game.chanceOutcomes(state):
                        mapped=wave if wave<5 else 14-wave
                        self.assertEqual(game.applyMove(reflected,game.flipAction(a),mapped),game.symmetries(game.applyMove(state,a,wave),policy)[1][0])
            action=rng.choice([a for a,ok in enumerate(game.legalMoves(state)) if ok])
            state=game.sampleMove(state,action,rng)

    def test_stochastic_search_and_batched_games_are_reproducible(self):
        evaluate=lambda state: ([1/125]*125,0)
        state=game.initialState()
        self.assertEqual(search(game,state,evaluate,20,rng=random.Random(1)),search(game,state,evaluate,20,rng=random.Random(1)))
        expected=[self_play(game,evaluate,4,random.Random(81+i)) for i in range(4)]
        actual=batched_self_play(game,lambda states:[evaluate(s) for s in states],4,4,2,81)
        self.assertEqual(actual,expected)
        self.assertEqual(arena(game,evaluate,evaluate,games=4,simulations=4,seed=43),.5)

    def test_chance_backup_prefers_certain_win_over_lottery(self):
        class TinyChance:
            ACTION_SIZE=2
            chanceOutcomes=staticmethod(lambda state:[1,2])
            legalMoves=staticmethod(lambda state:[True,True])
            applyMove=staticmethod(lambda state,action,wave:dict(player=-1,turn=1,wave=wave,winner=1 if action==0 or wave==1 else -1))
            isTerminal=staticmethod(lambda state:dict(done=state['turn']==1,winner=state.get('winner',0)))
        policy=search(TinyChance,dict(player=1,turn=0,wave=0),lambda state:([.5,.5],0),400,rng=random.Random(4))
        self.assertGreater(policy[0],.9)
