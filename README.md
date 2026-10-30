# Rune

To run locally on Windows, double-click **Rune.cmd** in this folder, then open http://127.0.0.1:5173/. It prepares a stable build and keeps the local server running after its window closes, reusing it if already started. Server logs stay in the ignored `.rune-local` folder. Node.js and the existing web dependencies are required.

> Current status (30 October 2026): all six games use distinct 8/24/64-game Easy/Medium/Hard checkpoints, one-second AI presentation, previous-move feedback and result popups. Mirror Siege v0.2 seals the edge after 24 moves. See [current status](docs/PROJECT-STATUS.md) and [playability update](docs/PLAYABILITY-2026-10-30.md). Earlier milestones below are historical.


Rune now has six playable web alphas: Connect Four, Terraform, Tidal Lock, Pulse, Fortress, and Mirror Siege. See [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for what remains before release.

## Run the web app

```powershell
cd web
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` produces `web/dist` for Netlify. Connect this repository to Netlify; `netlify.toml` supplies the build, model caching, and SPA fallback. No hosting account is linked or deployment created yet.

## Current alpha

- Mobile-first collection with two-column illustrated game cards, favourites, a full-page menu and settings, and large touch controls.
- Game setup with Easy/Medium/Hard slider, human/AI match modes, and Play/help buttons. Rune has matches, not numbered progression levels.
- Five-step illustrated Connect Four tutorial, available from setup and the board; shown before the first match. Instructions live in the guide, while search details are optional in Settings.
- Play against Rune or a friend on the same device, request hints, undo, reset and view saved statistics for every game. Favourites appear first in the collection.
- Play Terraform's v0.1 prototype with a terrain board, Move/Raise/Lower controls, opening swap, eight-step guide, and heuristic worker opponent. Its opening balance remains provisional; see [docs/TERRAFORM-ALPHA.md](docs/TERRAFORM-ALPHA.md).
- Play Tidal Lock's v0.2 prototype with random horizontal/vertical water, no next-wave preview, Place/Nudge actions, eight lessons, hints, undo, and watch mode. Search and training account for chance; the old fixed-schedule checkpoint is incompatible. See [docs/TIDAL-RANDOM-WAVES.md](docs/TIDAL-RANDOM-WAVES.md).
- Play Pulse's v0.1 prototype with Build/Boost/Wait actions, integer wave collisions, emitter captures, countdowns, territory scoring, and eight illustrated lessons. Its worker/rule tests pass; visual browser QA is pending because the browser connection failed. See [docs/PULSE-ALPHA.md](docs/PULSE-ALPHA.md).
- Connect Four background-worker PUCT with center priors, tactical rollouts, and immediate-win/threat checks. Easy/Medium/Hard use 80/400/1200 simulations. A lazy ONNX/WASM evaluator is connected, but **no neural checkpoint is activated for play yet**: the first trained candidate failed strength requirements.
- Immutable Python/TypeScript rules: legal masks, terminal checks, current-player encoding, reflection augmentation, 42-move cap.
- Python reference pipeline with batched self-play inference: configurable residual policy/value network (default four blocks, 64 channels), root Dirichlet noise, first-ten-move temperature sampling, 200k-position rolling buffer, seeded paired-opening arena, 55% score promotion, checkpoint metrics/timing, cached evaluations, and versioned ONNX export with CPU/browser parity validation.

## Verify rules

From the repository root:

```powershell
python -m unittest discover -s training/tests
python -m training.generate_parity --games 2000
cd web
npm test
npm run build
```

The checked-in fixture contains 100 seeded games; CI regenerates 2,000 and checks every transition. Tests cover wins in all directions, illegal actions, immutability, perspective, symmetry, and search tactics.

## Train (separate environment)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r training/requirements.txt
python -m training.train --iterations 10 --games 64 --simulations 64 --self-play-batch 16
python -m training.export_onnx training/checkpoints/best.pt
```

`best.pt` exists after a challenger passes the arena. Candidate checkpoints are always saved. `latest.pt` atomically saves the current champion, replay, completed iteration, and Python/PyTorch random states. Resume between completed rounds with `--resume training/checkpoints/latest.pt`. The next candidate starts a fresh optimizer each round by design; interrupted work inside a round restarts from the previous completed round. Resuming an older model-only checkpoint still works, but starts with an empty replay. Export `best.pt` for release checks, not `latest.pt`, which is marked as resume-only. Metrics are written to `training/checkpoints/metrics.jsonl`. The first short CPU run is recorded in [docs/PHASE-1-REPORT.md](docs/PHASE-1-REPORT.md); the completed 512-game batched run, resume tests, and improved benchmark scores are in [docs/BATCHED-TRAINING.md](docs/BATCHED-TRAINING.md).

The batched scheduler interleaves independent games in one process, collecting one requested leaf per active game into a tensor batch. Per-game seeds make scheduling independent of the chosen batch size. The neural evaluator deduplicates requests, preserves response order, rejects non-finite outputs, and reports cache/batch timing statistics. To profile your machine:

```powershell
python -m training.profile_selfplay training/checkpoints/best.pt --games 16 --simulations 32 --batch-size 8
```

Connect Four export creates content-addressed model, metadata, and 50-state parity files in `web/public/models`, plus `validation.json` for the developer checker. It does not activate a difficulty slot. `npm run dev` and `npm run build` prepare the matching same-origin, single-threaded WASM runtime automatically. Open `/engine-check.html` and click **Run engine checks** to verify the exported candidate in a browser. This page is separate from the game's minimal mobile UI.

Measure strength and activate only a qualified checkpoint:

```powershell
python -m training.benchmark training/checkpoints/best.pt --games 40 --simulations 64
python -m training.publish_model training/checkpoints/best.pt web/public/models/connect4-HASH-meta.json training/reports/browser-parity.json training/reports/connect4-benchmark.json --difficulty Easy
```

Replace `HASH` with the actual export ID and save the checker JSON as the browser report. Activation checks checkpoint identity, arena score, CPU/browser parity, browser search/fallback results, 40 games per baseline, every measured random game won, and at least 55% score against the heuristic. The initial candidate is intentionally rejected. The app safely uses the rollout engine when no checkpoint is assigned or an asset fails. The current controller retains an idle worker/session between moves and terminates active work on reset, pause, or exit.

## Next milestones

1. Continue training, improve heuristic/minimax strength, add a perfect-solver benchmark, and qualify the first checkpoint for actual play. Batched inference, resumable replay, random/heuristic/minimax measurement, and CPU/browser ONNX parity are implemented; multiprocessing remains a future optimization.
2. Visually verify Terraform on phones, refine its opening balance, and train/benchmark a neural opponent once the prototype rules stabilize. The Python/TS plug-in and heuristic playable alpha are implemented.
3. Refine Tidal Lock balance and neural strength; visually verify and playtest Pulse's pace; playtest Fortress and define Mirror Siege ghost interactions.
4. Measure balance, train and gate models, add actual training curves and value estimates, then deploy through Netlify.

Mirror Siege is now playable; see its alpha report. Terraform, Tidal Lock, and Pulse are playable rules prototypes with search opponents; they do not imply established balance or measured Elo. Tidal Lock's historical v0.1 model is retained locally and rejected by current rules-version checks. Its current gameplay uses chance-aware heuristic search. Pulse's first training integration candidate failed promotion and is not activated.

Fortress is now playable with rook slides, sandwich captures, center-hold victory, and eight illustrated lessons; see [docs/FORTRESS-ALPHA.md](docs/FORTRESS-ALPHA.md). A fuller 64-game Pulse training run and independent benchmark are recorded in [docs/PULSE-TRAINING.md](docs/PULSE-TRAINING.md). The selected network failed independent strength checks and is not enabled.

Mirror Siege is now playable with one-reply blocking ghosts and an eight-step guide. See [docs/MIRROR-ALPHA.md](docs/MIRROR-ALPHA.md). Older milestone descriptions of unplayable previews below are historical; the current status is in PROJECT-STATUS.md.
