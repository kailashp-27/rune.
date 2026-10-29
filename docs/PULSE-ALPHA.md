# Pulse playable alpha

A subsequent 64-game training run and independent benchmark are documented in [PULSE-TRAINING.md](PULSE-TRAINING.md). Its selected checkpoint remains unqualified for app activation.

Pulse is Rune's fourth playable game. It follows the existing mobile flow: illustrated game card, named difficulty, Play/help controls, then the board. The full-page three-line menu and Settings/Vibration remain shared. No numbered progression levels were added; emitter **power** is an in-match mechanic.

The plan did not include a complete Pulse rulebook. This version uses explicit prototype rules in [PULSE-RULES.md](PULSE-RULES.md): build and boost emitters, resolve simultaneous integer waves, capture territory and emitters, then score at a 120-action cap unless emitter elimination ends the match first.

## Implemented

- Five-by-five board with strength-dependent glow, emitter power, firing countdowns, and source-coloured ripple animations sized by burst strength. Reduced-motion preferences are respected.
- Build, Boost, Wait, legal-cell highlights, hints, undo, reset/rematch, optional move history/search details, and AI-vs-AI.
- Territory percentage bar showing Gold, Purple, and unclaimed shares of the full board; this is not a win-probability estimate.
- Eight illustrated lessons covering building, charging, boosting, propagation, simultaneous collisions, captures, and scoring.
- A separate worker using iterative-deepening alpha-beta search with Easy/Medium/Hard maximum depths 1/3/5 and budgets 120/450/1200 ms. Only completed depth iterations replace the result; terminal wins are recognized immediately. Budgets are cooperative search deadlines rather than hard real-time guarantees.
- Immutable Python and TypeScript rules, pure `step(state)`, 51 fixed actions, `[7,5,5]` current-player network inputs, all eight policy/state symmetries, and shared trainer/export registration.

## Verification completed

- Production TypeScript/Vite build passed; Pulse emits its own worker bundle.
- All 38 Python tests and 26 TypeScript tests passed across Rune. Pulse tests cover legal construction, power limits, immutability, countdown timing, fading fields, core persistence, friendly maximum strength, opposing subtraction/ties, capture timing, simultaneous pre-capture firing, terminal/cap scoring, encoding, and symmetry.
- All **238,792** transitions from 2,000 seeded games matched Python/TypeScript exactly, including legal masks and next-state animation metadata. Sixteen shared encoding fixtures include all eight transforms. The checked-in replay is a smaller 16-game set; the large JSONL file is ignored locally and regenerated in CI.
- The actual production Pulse worker processed 40 replay states, preserved 162 request IDs, recovered after malformed input, and completed a 120-action game (Purple win) with Python checking transitions and the final result. Report: `training/reports/pulse-worker.json`.
- A four-game neural training integration run completed using 16 simulations, four interleaved games, 20 optimizer steps, a 16-channel/two-block network, and a four-game arena. It generated 3,000 augmented entries, averaged 93.75 actions, and scored 0% in its arena. The candidate was not promoted. This checks the pipeline, not playing strength.
- ONNX export of that candidate passed 50-state CPU parity at maximum absolute error 1.1920928955078125e-7. Model `pulse-831e578a6681c619` is 62,851 bytes. Local artifacts are ignored under `training/checkpoints/pulse-smoke` and `training/exports/pulse-smoke`; raw evidence is `training/reports/pulse-training.json`.

**Visual/browser interaction verification remains pending.** The browser-control transport failed repeatedly, including after a runtime reset. No Pulse screen was successfully inspected or screenshot captured. The worker test uses Node worker_threads and a Python rule oracle; it is not browser/UI QA. The code compiles and is available in the local preview for review.

## Balance and remaining limits

Before training, the seeded random audit produced 490 Gold wins, 463 Purple wins, and 47 draws across 1,000 games. The one-ply audit produced 96 Gold wins, 93 Purple wins, and 11 draws across 200 games. The random first-player result was below the plan's 65% intervention threshold, so a pie rule was not introduced. These tests describe those bots, not optimal-play balance or browser search strength.

Most audited games reached the cap: average lengths were 119.372 actions for random and 114.8 for one-ply play. Human playtesting should assess pace and whether the alpha needs a different victory target or shorter cap before locking its rules.

No neural Pulse model is activated, browser neural inference/parity is not connected, and no Elo or trained difficulty strength is claimed. Gameplay uses the bounded search opponent. Netlify deployment is still unconfigured at the account/repository level.

## Commands

```powershell
python -m training.generate_parity --game pulse --games 2000 --output parity/pulse-full.jsonl
python -m training.pulse_evaluate
python -m training.train --game pulse --iterations 1 --games 4 --simulations 16 --self-play-batch 4 --steps 20 --arena-games 4 --channels 16 --blocks 2 --output training/checkpoints/pulse-new-run
python -m training.export_onnx training/checkpoints/pulse-new-run/candidate-0001.pt --directory training/exports/pulse-new-run
cd web
npm test
npm run build
npm run test:workers
```

Use an unused output directory for a fresh training run, or explicitly resume an existing `latest.pt`. For future substantial Pulse training, increase the simulation budget after the prototype and gameplay pace stabilize.
