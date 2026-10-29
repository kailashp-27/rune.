# Tidal Lock random waves — v0.2

The fixed row schedule and next-wave preview have been removed following the user's feedback. Water now locks a horizontal row or vertical column. The opening line is random among all ten lines; after each action, one of the other nine is chosen with equal probability. Consecutive exact repeats are excluded, but no movement pattern or forced axis alternation exists. The choice is independent of the move and player.

Only the current wave is stored or shown. There are no dashed future-water cells, next-wave labels, or next-wave input planes. The revised illustrated guide explains the random water and vertical locks. The tide lock, Place/Nudge actions, four-in-a-row goal, and 80-action cap remain; definitive rules are in [TIDAL-RULES.md](TIDAL-RULES.md).

## Fairness and search

The AI receives the same current wave the player sees, without a future wave or RNG seed. Browser expectimax averages all nine possible outcomes at each chance step within its time budget. Python neural PUCT samples chance outcomes behind action edges and backs up expected action values. Self-play, arena, parity generation, and ONNX sample-state generation use the new sampling helpers. Seeded tests are reproducible without making live waves predictable to the AI.

Live wave draws are resolved before React state updaters, so replaying an updater cannot draw a different wave. Undo restores the board and the actual previous water line. Hints neither advance the water nor reserve a future result.

## Evidence

- 33 Python tests and 21 TypeScript tests pass. Coverage includes both flooded axes, independent wave selection, invalid chance outcomes, left-right reflection of vertical waves, stochastic backup signs, deterministic seeded self-play, batch/scalar equivalence, paired arena play, and rejection of v0.1 checkpoints.
- Python and TypeScript matched all 51,351 transitions from 2,000 seeded games, including legal masks and explicitly recorded chance outcomes. Thirty encoding/reflection fixtures cover all ten initial water lines.
- The production build and both original-game worker checks pass. The Tidal worker replays 40 states, recovers from malformed input, and completes a seeded random-wave match against a Python rule oracle. Report: `training/reports/tidal-v02-worker.json`.
- Browser checks at 390×844 confirm no preview, horizontal and vertical locks, placement → worker reply, two-tap nudge, and undo restoring the previous wave. The revised surprise lesson fits at 320×568. Screenshots: `docs/tidal-random-mobile.png` and `docs/tidal-random-tutorial.png`.
- A fresh two-round training integration run completed 16 games and generated 564 augmented positions. The small candidates scored 25% and 50% in four-game arenas, so neither was promoted. New CPU ONNX parity passed on 50 sampled legal states at maximum error 3.5762786865234375e-7. This is pipeline evidence, not model-strength evidence. Raw report: `training/reports/tidal-v02-training.json`.

The seeded balance check produced 505 Gold wins and 495 Purple wins over 1,000 random games, with 7,987 nudges. Chance-aware one-ply self-play produced 116 Gold wins and 84 Purple wins over 200 games. These measure those bots, not optimal-play balance. See `training/reports/tidal-v02-balance.json`.

## Checkpoint compatibility

The input remains `[6,5,5]`, but the former future-row plane now describes the current axis. State also includes the current wave, which is no longer derived from turn count. The rules version is therefore `tidal-v0.2`. Historical fixed-schedule v0.1 models cannot be resumed or exported against these rules. They are retained as historical artifacts, not activated. The app continues to use chance-aware heuristic search; a qualified new neural model and browser neural validation remain future work.
