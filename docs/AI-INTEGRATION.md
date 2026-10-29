# Browser AI and measured training

All six games share lazy single-thread ONNX inference and a versioned model contract. The five originals use a shared PUCT worker with actor-relative values, lazy transitions, full-state evaluation caching and independent chance sampling for Tidal Lock. Missing, obsolete or broken models fall back to the existing bounded search opponent.

## Enabled models (29 October 2026)

| Slot | Training | Random benchmark | One-ply heuristic benchmark |
| --- | --- | --- | --- |
| Terraform Medium, 32 simulations | Heuristic teacher seed | 40 wins / 40 | 16 wins, 14 draws / 40 (57.5% score) |
| Pulse Medium, 32 simulations | Heuristic teacher seed; later self-play experiments retained separately | 40 wins / 40 | 29 wins / 40 |
| Fortress Medium, 48 simulations | 32 self-play games, two rounds | 40 wins / 40 | 29 wins / 40 |

All three passed 50-state PyTorch/browser output parity, an immediate-win worker test and broken-model fallback. Pulse additionally beat its prior neural checkpoint in a separate 20-game paired arena with a 100% score. Fortress's selected self-play candidate scored 62.5% in its eight-game local arena. Benchmarks alternate seats with paired openings and separate live-chance/search random streams. Small local tests are not optimal-play strength or a real-phone performance guarantee. Other slots remain search opponents until they qualify.

The previous Pulse candidate selected Wait with 56.4% opening prior and won only 1/40 random games. More search did not resolve that behavior. The optional teacher seed learns a legal policy and a heuristic value from mixed random/heuristic games. This is supervised bootstrapping, not pure AlphaZero training. Self-play resumes with a fresh outcome-only replay; heuristic values never enter its replay buffer. Checkpoints retain this provenance.

## Reproduce

```
python -m training.bootstrap --game pulse --games 64 --steps 1200 --channels 32 --blocks 2 --output training/checkpoints/pulse-new
python -m training.train --resume training/checkpoints/pulse-new/latest.pt --iterations 3 --games 24 --simulations 64 --steps 200 --arena-games 12 --output training/checkpoints/pulse-new
python -m training.evaluate CHECKPOINT --games 40 --simulations 32 --output training/reports/BENCHMARK.json
python -m training.arena_gate CHECKPOINT PRIOR_CHAMPION --games 20 --simulations 32 --output training/reports/ARENA.json
python -m training.export_onnx CHECKPOINT
python -m training.browser_fixtures
```

Open `/engine-check.html`, choose the game and run the visible checks. Save its report. `training.publish_model` requires matching checkpoint digests, current rules, CPU/browser parity, search/fallback checks, an arena promotion, 40/40 measured random wins and at least 55% heuristic score. An independently recorded arena may qualify a teacher seed using `--arena-report`. The resulting manifest records the benchmarked simulation budget. Never activate a model by editing its status manually.

Replay is stored as compact float16 bytes and decoded to float32 for optimization. Legacy list-based checkpoints still load. Rule fixtures remain exact. This reduced the memory pressure that interrupted the first simultaneous Fortress/Mirror training attempt; completed runs use compact replay.

`training.web_report` generates the public training page from real metrics and benchmarks. The menu and Settings link to it. Search details show candidate scores or visit shares and the exact earlier position being evaluated. They do not label move preferences or raw model values as win probability. Calibrated probabilities and Elo remain future measurement work.

`training.solver_benchmark` adds a bounded exact Connect Four endgame solver. A budget exhaustion is explicitly unsolved. The current candidate chose an optimal W/D/L move in 40/40 positions with 34 actions already played. This is not a full-game benchmark against a perfect solver.
