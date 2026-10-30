"""Activate deliberately weaker tiers only after matching parity and ordering checks.

This is difficulty calibration, distinct from strongest-champion arena promotion.
Earlier bots are intentionally allowed to miss moves; the published evidence
records their actual checkpoints and paired-seat comparisons.
"""
import hashlib
import json
import math
from pathlib import Path

TIERS=('Easy','Medium','Hard')
def validate_game(entries,report):
    counts=[entries[tier].get('trainingGames',0) for tier in TIERS]
    if not 0<counts[0]<counts[1]<counts[2]:raise ValueError('Difficulty training game counts must increase')
    if len({entries[tier]['id'] for tier in TIERS})!=3:raise ValueError('Difficulty checkpoints must be different')
    for tier in TIERS:
        parity=report['parity'][tier]
        if report['models'][tier]['id']!=entries[tier]['id'] or parity.get('modelId')!=entries[tier]['id'] or parity.get('passed') is not True or parity.get('states')!=50 or not 0<=parity.get('maxError',math.inf)<=1e-4:raise ValueError('Missing matching browser parity for tier')
    required={('Hard','Easy'),('Medium','Easy'),('Hard','Medium')}
    if {(d['strong'],d['weak']) for d in report['duels']}!=required:raise ValueError('Missing paired difficulty comparisons')
    for duel in report['duels']:
        games=duel['games'];score=(duel['wins']+.5*duel['draws'])/games
        if games<12 or games%2 or sum(duel[key] for key in ('wins','losses','draws'))!=games or score<=.5 or abs(score-duel['score'])>1e-10:raise ValueError('Difficulty order was not demonstrated')

def main():
    root=Path('web/public/models');proposals=json.loads((root/'difficulty-candidates.json').read_text())['games']
    first=json.loads(Path('training/reports/difficulty-first-comparison.json').read_text())['games']
    reports={report['game']:report for report in first}
    for game in ('pulse','fortress'):
        reports[game]=json.loads(Path(f'training/reports/difficulty-{game}-comparison.json').read_text())['games'][0]
    manifest=dict(schemaVersion=1)
    for game,entries in proposals.items():
        report=reports[game];validate_game(entries,report);manifest[game]={}
        for tier,entry in entries.items():
            meta=json.loads((root/f'{entry["id"]}-meta.json').read_text())
            artifact=root/Path(entry['url']).name
            if hashlib.sha256(artifact.read_bytes()).hexdigest()!=meta['sha256'] or not meta['cpu_parity']['passed']:raise ValueError('Exported model does not match parity metadata')
            manifest[game][tier]={**entry,'status':'validated'}
    combined=dict(date='2026-10-30',games=list(reports.values()),scope='Three distinct checkpoints per game; increasing training game counts; 50-state parity per model; 12 paired-seat games for each of three tier pairings per game. Small local difficulty samples, not Elo or an optimal-play claim. Easy also explores and misses moves more often; every displayed AI turn waits at least one second.')
    Path('training/reports/difficulty-validation.json').write_text(json.dumps(combined,indent=2))
    (root/'difficulty-validation.json').write_text(json.dumps(combined,indent=2))
    (root/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print('Activated 18 distinct, parity-checked difficulty checkpoints')

if __name__=='__main__':main()
