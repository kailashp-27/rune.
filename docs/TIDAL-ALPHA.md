# Tidal Lock v0.1 historical alpha and first training run

**Superseded:** the current game uses random horizontal/vertical waves without a preview. See [TIDAL-RANDOM-WAVES.md](TIDAL-RANDOM-WAVES.md). The rules, model, measurements, and screenshots below describe v0.1 and must not be treated as current-model validation.

Tidal Lock is Rune's third playable game. Its v0.1 prototype rules are defined in [TIDAL-RULES.md](TIDAL-RULES.md). The mobile app keeps the named difficulty slider, large Play/help controls, full-page three-line menu, and Vibration in Settings. No numbered progression levels were introduced.

## Playable features

- A 5×5 board with Gold/Purple stones, animated water lock, and a dashed preview of the next locked row.
- Place and two-tap Nudge controls, highlighted legal destinations, winning-line highlights, hints, undo, rematch, move history, and AI-vs-AI.
- Eight illustrated lessons, including flooded endpoints, orthogonal nudging, victory, and the action cap. Guide dismissal is saved independently from the other games.
- A dedicated worker using iterative-deepening alpha-beta search, immediate-win detection, and Easy/Medium/Hard depth budgets 1/3/5 with 120/450/1200 ms limits. Only completed depth iterations replace the current result. Deadline enforcement is cooperative within search, not a hard real-time guarantee.
- Matching immutable Python/TypeScript rules, 125 fixed actions, six current-player input planes, and left-right policy augmentation.

## Training completed

Four CPU rounds generated 96 self-play games and 2,712 augmented replay entries. Configuration: three residual blocks, 32 channels, 48 simulations per move, eight interleaved games, and 80 optimizer steps per round. Each 20-game arena used paired openings and alternating seats.

| Round | Loss | Arena score | Promoted to local champion |
| --- | --- | --- | --- |
| 1 | 3.884 | 55% | Yes |
| 2 | 3.745 | 55% | Yes |
| 3 | 3.550 | 70% | Yes |
| 4 | 3.396 | 65% | Yes |

The selected checkpoint is `training/checkpoints/tidal-alpha/best.pt`; resumable state is `latest.pt` in the same directory. These are local ignored artifacts. A local arena promotion is distinct from release strength.

Independent neural PUCT testing used 64 simulations per move, alternating seats, paired one-action random openings, and 40 games per opponent:

| Opponent | Wins | Draws | Losses | Score |
| --- | --- | --- | --- | --- |
| Random | 39 | 0 | 1 | 97.5% |
| One-ply heuristic | 2 | 0 | 38 | 5% |

**The trained candidate is not enabled in the app.** It fails the project's intended independent strength standard. Gameplay uses the bounded heuristic search described above. More self-play, baseline analysis, and balance work are needed; no Elo or calibrated win probability is claimed.

ONNX export produced `tidal-af7c308008701c71`, 266,889 bytes. CPU ONNX Runtime matched PyTorch across 50 legal states with maximum absolute error 6.67572021484375e-6. Exported assets are in ignored `training/exports/tidal-alpha`. Tidal browser neural inference, browser neural parity, and difficulty activation are not implemented. The existing Connect Four publisher rejects non-Connect-Four models.

Raw evidence: `training/reports/tidal-training.json`, `tidal-benchmark.json`, `tidal-balance.json`, and `tidal-worker.json`.

## Balance and verification

Before training, 1,000 random games yielded 565 Gold wins and 435 Purple wins; 8,317 nudges were exercised. The 200-game one-ply self-play test yielded 163 Gold wins and 37 Purple wins. These describe the tested bots, not optimal play. The heuristic first-player bias remains a material alpha limitation. No pie rule was added without further analysis.

- 30 Python tests and 20 TypeScript tests pass across the project. Tests cover all winning-line directions, locked sources/destinations, occupancy, wrong-owner nudges, edge wrapping, immutability, cap adjudication, reflection, and search legality.
- All 52,333 transitions from 2,000 seeded Python games matched TypeScript exactly, including full legal masks. Sixteen shared state/encoding/reflection fixtures also matched.
- The built Tidal worker processed 40 fixture requests, preserved request IDs, recovered after malformed input, and completed an 11-action game with a Python rule oracle.
- Browser checks at 390×844 verified setup, tutorial, placement → AI reply, tide advancement, two-tap nudging, hints, mode switching after a hint, undo, full-page Menu/Settings, and the Vibration control. AI-vs-AI completed an 11-action Gold win with no captured browser errors. At 320×568 the nudge lesson and navigation fit, with no horizontal page overflow. These are desktop browser viewport checks, not physical-device testing.
- Production TypeScript/Vite build passed. Screenshots: `docs/tidal-mobile.png` and `docs/tidal-tutorial.png`.

## Reproduce or resume

```powershell
python -m training.generate_parity --game tidal --games 2000 --output parity/tidal-full.jsonl
python -m training.tidal_evaluate
python -m training.train --game tidal --resume training/checkpoints/tidal-alpha/latest.pt --iterations 4 --games 24 --simulations 48 --self-play-batch 8 --steps 80 --arena-games 20 --output training/checkpoints/tidal-alpha
python -m training.tidal_evaluate --checkpoint training/checkpoints/tidal-alpha/best.pt --games 40 --simulations 64 --output training/reports/tidal-benchmark.json
python -m training.export_onnx training/checkpoints/tidal-alpha/best.pt --directory training/exports/tidal-alpha
```

Python training/export requires `training/requirements.txt`. For a fresh run, omit `--resume`, choose an unused output directory, and optionally set channels/blocks. The recorded model uses `--channels 32 --blocks 3`. Use `npm test`, `npm run build`, and `npm run test:workers` from `web` for the web checks.
