# Batched self-play milestone

The next training milestone replaces per-position scalar inference during self-play with a single-process scheduler that batches leaves from independent games. No game UI or unfinished original-game rules were changed.

## Measured CPU profile

Using the previous checkpoint, 16 games, 32 simulations, two CPU threads, and eight active games per batch:

| Metric | Scalar | Batched |
| --- | ---: | ---: |
| Wall time | 7.254 s | 3.816 s |
| Generated positions | 247 | 247 |
| Positions per second | 34.05 | 64.73 |
| Unique neural evaluations | 3,537 | 3,537 |
| Neural forward calls | 3,537 | 1,157 |

This measurement showed a **1.90× speedup** on this CPU. It is not a GPU or universal speed claim. Requests are deduplicated within batches and cached across moves. Per-game seeds isolate RNG from completion order; floating-point changes across tensor batch sizes can still change near-tied search choices.

Raw profile: `training/reports/phase1-batched-profile.json`.

## Resume behavior

- Atomic `candidate-NNNN.pt` and `best.pt` saves preserve model snapshots.
- `latest.pt` records the current champion, completed iteration, replay buffer, Python RNG, PyTorch RNG, and CUDA RNG where available. It is deliberately marked as resume-only, so it cannot pass the release gate.
- Resume uses the saved seed unless explicitly overridden, keeps prior replay, and continues iteration numbering. Each candidate uses a fresh optimizer per round by design. Work interrupted inside a round restarts at the preceding completed checkpoint.
- The neural evaluator is immutable with respect to model weights; each new champion/candidate gets its own cache.
- Non-finite inference or training loss stops the run before writing another completed checkpoint.

The end-to-end smoke resume retained the first round's 84 augmented replay entries, advanced to iteration two, and finished with 162 entries. A separate integration test compares two uninterrupted rounds with one round followed by a restart: replay, champion weights, and the second candidate's weights match exactly. It also verifies that a saved non-default seed is used when `--seed` is omitted on resume.

## Larger experiment

The completed experiment resumed the earlier model-only checkpoint and ran eight new rounds (iterations 3–10), 64 games per round, 64 simulations per move, batches of up to 16 active games, 300 optimizer steps per round, and 20 paired-opening arena games per gate.

- 512 self-play games; 18,118 augmented replay entries.
- Six arena promotions; iteration ten was selected, scoring 65% against the preceding champion.
- About 653.8 seconds for all rounds, including 316.5 seconds of self-play, on this CPU. These timings include normal local process contention and are not a hardware benchmark.
- Raw per-round metrics: `training/reports/phase1-batched-training.json`.

The selected model was measured using the same 40 paired-opening games per opponent and 64 simulations as the previous checkpoint:

| Opponent | New wins/draws/losses | Previous score | New score |
| --- | --- | ---: | ---: |
| Random | 39 / 0 / 1 | 97.5% | 97.5% |
| Tactical heuristic | 12 / 3 / 25 | 6.25% | 33.75% |
| Depth-four minimax | 6 / 2 / 32 | 3.75% | 17.5% |

Draws count as half a point. These measurements use Python neural PUCT without the browser's tactical override. They show progress against the stronger opponents, but the model still fails both release-strength requirements: every measured random game won and at least 55% score against the heuristic. No difficulty slot was activated.

The new 319,625-byte ONNX candidate is `connect4-fdc4326ddece562d`. CPU parity passed on 50 legal states with maximum absolute error `1.8477439880371094e-6`. The candidate stays in local ignored `training/exports/phase1-batched/`; it was not copied into the playable app or checked in a browser because it did not qualify on strength.

Raw benchmark: `training/reports/phase1-batched-benchmark.json`. Combined runtime, training, export, and release-decision evidence: `training/reports/phase1-batched-summary.json`.

## Validation

Tests compare scheduled games to independently driven games with identical seeds, check batch output order/deduplication and cache eviction, compare scalar and tensor-batch evaluations, reject non-finite outputs, and round-trip checkpoint weights, replay, and random states. A dedicated CI job installs CPU PyTorch so these neural tests run alongside the lightweight rule-only job.

All 16 Python tests and nine TypeScript tests passed locally. The new CI job is configured but was not run remotely in this session. This milestone was tested on CPU; CUDA resume state is implemented but not hardware-tested. Multiprocessing, GPU throughput, a perfect solver, and a release-qualified checkpoint remain future work.
