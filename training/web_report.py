"""Publish measured training history, without checkpoints or invented ratings."""
import json
from pathlib import Path
from training.games.registry import GAMES

ROOT=Path(__file__).resolve().parents[1]
NAMES=dict(connect4='Connect Four',terraform='Terraform',tidal='Tidal Lock',pulse='Pulse',fortress='Fortress',mirror='Mirror Siege')
RUNS=[('connect4','phase1-batched','phase1-batched-training.json','phase1-batched-benchmark.json'),('terraform','terraform-pipeline',None,None),('terraform','terraform-teacher-v1',None,'terraform-teacher-benchmark.json'),('tidal','tidal-random-smoke','tidal-v02-training.json',None),('tidal','tidal-teacher-v1',None,'tidal-teacher-benchmark.json'),('pulse','pulse-alpha','pulse-alpha-training.json','pulse-alpha-benchmark.json'),('pulse','pulse-teacher-v1',None,'pulse-teacher-benchmark.json'),('fortress','fortress-alpha',None,'fortress-alpha-benchmark.json'),('mirror','mirror-alpha',None,'mirror-alpha-benchmark.json')]

def read(path):
    return json.loads(path.read_text()) if path.exists() else None

def main():
    games={key:dict(id=key,name=NAMES[key],rulesVersion=game.RULES_VERSION,runs=[],releasedDifficulties=[]) for key,game in GAMES.items()}
    manifest=read(ROOT/'web/public/models/manifest.json')
    for key,entry in games.items():
        entry['releasedDifficulties']=[level for level,model in manifest.get(key,{}).items() if model and model.get('status')=='promoted']
    for game_id,run,report_file,benchmark_file in RUNS:
        folder=ROOT/'training/checkpoints'/run
        metrics_file=folder/'metrics.jsonl'
        source=read(ROOT/'training/reports'/(report_file or f'{run}-training.json'))
        if metrics_file.exists():metrics=[json.loads(line) for line in metrics_file.read_text().splitlines() if line.strip()]
        elif source:metrics=source.get('metrics',source.get('rounds',[]))
        else:metrics=[]
        if not isinstance(metrics,list):metrics=[]
        bootstrap=read(folder/'bootstrap.json') or (source.get('teacher') if source else None)
        benchmark=read(ROOT/'training/reports'/benchmark_file) if benchmark_file else None
        if benchmark and 'benchmark' in benchmark:benchmark=benchmark['benchmark']
        if not metrics and not bootstrap:continue
        entry=dict(id=run,method=('Teacher seed + self-play' if metrics else 'Heuristic teacher seed') if bootstrap else 'Self-play',games=sum(row.get('self_play_games',0) for row in metrics),rounds=[{key:row[key] for key in ('iteration','loss','policy_loss','value_loss','arena_score','average_length','positions','promoted') if key in row} for row in metrics],benchmark=benchmark,teacher=bootstrap)
        games[game_id]['runs'].append(entry)
    output=dict(schemaVersion=1,games=list(games.values()),scope='Recorded local experiments. Arena score compares checkpoints within a run; independent benchmark score compares random/one-ply opponents. No measured Elo or calibrated win probabilities are available.')
    target=ROOT/'web/public/training.json';target.write_text(json.dumps(output,indent=2)+'\n')
    print(f'Published measured history for {len(games)} games')

if __name__=='__main__':main()
