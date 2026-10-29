"""Known winning positions for the browser worker boundary, checked by Python."""
import json
from pathlib import Path
from training.games.registry import GAMES

def main():
    fixtures={}
    for game_id,game in GAMES.items():
        state=game.initialState()
        if game_id=='connect4':
            for action in [0,1,0,1,0,2]:state=game.applyMove(state,action)
        elif game_id=='terraform':
            state['board'][20]=2;state['board'][15]=3
        elif game_id=='tidal':
            for cell in [20,21,22]:state['board'][cell]=1
            for cell in [0,1]:state['board'][cell]=-1
        elif game_id=='pulse':
            for key in ('board','strength','level','cooldown'):state[key]=[0]*25
            for cell,owner,level in [(11,1,3),(12,-1,1)]:
                state['board'][cell]=owner;state['strength'][cell]=2;state['level'][cell]=level;state['cooldown'][cell]=1
        else:
            state['board']=[0]*25
            for cell,owner in [(10,1),(12,-1),(13,1)]:state['board'][cell]=owner
        legal=[a for a,ok in enumerate(game.legalMoves(state)) if ok]
        wins=[]
        for action in legal:
            outcomes=game.chanceOutcomes(state) if hasattr(game,'chanceOutcomes') else [None]
            if all(game.isTerminal(game.applyMove(state,action,outcome) if outcome is not None else game.applyMove(state,action))=={'done':True,'winner':state['player']} for outcome in outcomes):wins.append(action)
        if not wins:raise ValueError(f'Missing immediate win for {game_id}')
        fixtures[game_id]=dict(state=state,winning_actions=wins,legal_actions=legal,rulesVersion=game.RULES_VERSION)
    Path('web/public/engine-fixtures.json').write_text(json.dumps(fixtures,indent=2)+'\n')
    print('Verified six browser tactical fixtures')

if __name__=='__main__':main()
