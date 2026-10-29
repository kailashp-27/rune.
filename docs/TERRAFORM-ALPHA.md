# Terraform playable alpha

The following training/export milestone and paired opening analysis are documented in [TERRAFORM-PIPELINE.md](TERRAFORM-PIPELINE.md). Terraform ONNX exports are now supported as local candidates; browser activation remains pending.

Terraform is Rune's second playable game. It follows the existing mobile layout: game card → difficulty/match setup → illustrated help → board. Settings remain in the full-page three-line menu, and no numbered progression levels were added.

## Implemented

- Immutable Python and TypeScript rules for the documented v0.1 prototype: terrain heights 0–3, one climber per player, move/raise/lower actions, opening swap, summit win, 80-action cap.
- 251 fixed actions, legal masks, eight input planes, and all eight square symmetries with policy remapping.
- Five-by-five terrain board, visible height numbers, animated height changes, Gold/Purple climbers, legal-cell highlights, Move/Raise/Lower controls, hint, undo, reset, and AI-vs-AI.
- Eight illustrated help steps, including the swap choice. Tutorial dismissal is saved separately per game.
- Worker-based iterative-deepening alpha-beta opponent. Easy/Medium/Hard request depths 1/3/5 with 120/450/1200 ms budgets. Only completed search iterations replace the current best move; an immediate winning move is taken directly.
- A shared React match controller now handles worker request IDs, cancellation, history, sound, vibration, and hints for both playable games.
- The shared neural trainer supports `--game terraform`, derives input/action dimensions from the game, and rejects cross-game or incompatible rules-version resumes. Cache keys include full state, including unit positions.

## Verification

- Production build and TypeScript compilation passed.
- 24 Python tests and 15 TypeScript tests passed locally.
- All 153,902 transitions from 2,000 seeded Python games matched in TypeScript. The JSONL fixtures store legal-action indices as a sparse representation of the full mask. Encoding and all eight policy/state symmetries also match shared fixtures.
- The actual built Terraform worker processed 40 replay requests, echoed request IDs, recovered after invalid input, and finished a 14-turn game with Python checking transitions and terminal adjudication. See `training/reports/terraform-worker.json`.
- A two-game batched training smoke run completed with `[8,5,5]` inputs and 251 outputs, generating 1,280 augmented entries. Its arena score was 50%; it was not promoted.

## Verification limits and balance

Browser control failed to initialize with a kernel-assets path error, including after a runtime reset. **The rendered phone layout and React interactions have not been visually/browser verified in this milestone.** The worker test uses Node worker_threads and a Python rule oracle; it is not a substitute for browser/UI QA. The local Vite preview is available for review.

Balance is also provisional. The initial no-swap heuristic test won 200/200 games as Gold. The pie rule changed the result to 54 Gold wins, 136 Purple wins, and ten draws across 200 heuristic games. In 1,000 random games, 874 were draws. See `docs/TERRAFORM-RULES.md` and `training/reports/terraform-balance.json`. The prototype needs further opening analysis and playtesting before competitive release or substantial neural training. No Terraform ONNX model is enabled, and no calibrated win-probability or Elo claims are made.

## Commands

```powershell
python -m training.generate_parity --game terraform --games 2000
python -m training.terraform_balance --games 1000 --heuristic-games 200
python -m training.train --game terraform --games 8 --simulations 16 --self-play-batch 4 --iterations 1 --output training/checkpoints/terraform-alpha
cd web
npm test
npm run build
npm run test:workers
```

For local development, `npm run dev` serves the game picker. Pick Terraform and open its help before the first match.
