"""Export tier proposals without activating them before browser validation."""
import json
import subprocess
import sys
from pathlib import Path

def main():
    root=Path('web/public/models');manifest=json.loads((root/'manifest.json').read_text());proposals={}
    retained={game:manifest[game].get('Hard') or manifest[game].get('Medium') for game in ('terraform',)}
    for game in ('connect4','terraform','tidal','pulse','fortress','mirror'):
        proposals[game]={}
        for tier,games,sims in [('Easy',8,8),('Medium',24,40),('Hard',64,128)]:
            if tier=='Hard' and retained.get(game):
                entry={**retained[game]};games=32 if game=='fortress' else 64
            else:
                checkpoint=Path('training/checkpoints/difficulty-20261030')/game/f'{tier.lower()}.pt'
                result=subprocess.run([sys.executable,'-m','training.export_onnx',str(checkpoint),'--directory',str(root)],capture_output=True,text=True)
                if result.returncode:raise RuntimeError(result.stderr)
                entry=json.loads((root/('validation.json' if game=='connect4' else f'{game}-validation.json')).read_text())
            proposals[game][tier]={**entry,'status':'candidate','trainingGames':games,'tier':tier,'simulations':sims}
            print(f'{game} {tier}: {entry["id"]}, {games} training games',flush=True)
    (root/'difficulty-candidates.json').write_text(json.dumps(dict(schemaVersion=1,games=proposals),indent=2))

if __name__=='__main__':main()
