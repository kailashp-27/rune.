## Mirror Siege: all six games playable

> Current status (29 October 2026): all six games are playable. Terraform, Pulse and Fortress Medium now use qualified trained models; the other slots use search opponents. All original games support browser neural inference. See [current status](docs/PROJECT-STATUS.md) and [AI integration](docs/AI-INTEGRATION.md). Older milestones below remain historical.


Production build and all 48 Python/34 TypeScript tests pass. Mirror Siege matches 198,803 Python/TS transitions from 2,000 games; its production worker replays states, recovers from errors, and completes a 100-action oracle-checked draw. Mobile browser checks verify help at 320×568, a solid move and AI reply, the one-reply ghost lifecycle, undo and hints, and a 390×844 board without horizontal overflow. Screenshot: `docs/mirror-mobile.png`. See `docs/MIRROR-ALPHA.md` and `docs/PROJECT-STATUS.md` for remaining work; older preview descriptions below are historical.

## Fortress and Pulse training milestone

Fortress production build and all 43 Python/30 TypeScript tests pass, including 93,119 shared transitions. Production worker error recovery and a full 11-action oracle-checked game pass. Mobile browser checks cover setup/help, selection, human move/AI response, undo and hint; see `docs/FORTRESS-ALPHA.md`.

Pulse completed 64 self-play games and generated 60,104 replay entries. The local arena promoted round four at 56.25%, but the independent benchmark achieved only 1/40 random wins and 0/40 heuristic wins. The network stays disabled. CPU ONNX parity passed on 50 states at max error 1.1920928955078125e-6. See `docs/PULSE-TRAINING.md`.

## Pulse alpha — current

Pulse's production build, 38 Python tests, and 26 TypeScript tests pass. All 238,792 transitions from 2,000 seeded games match Python/TypeScript rules. The production Pulse worker replays 40 states, preserves request IDs, recovers from malformed input, and finishes a 120-action oracle-checked game. A four-game neural training/export check completed; the candidate failed promotion and remains disabled. See `docs/PULSE-ALPHA.md` for raw evidence and limits.

Visual browser verification is pending: the browser-control transport failed repeatedly, including after reset. No Pulse screenshot or browser interaction was verified. Existing screenshots for the other games are not Pulse evidence. The local preview is available for review.

## Tidal Lock random waves — current v0.2

The current game replaces the fixed schedule with random horizontal rows and vertical columns. No next-wave preview or future-wave input is present. Both players and the AI receive only the current water line. See `docs/TIDAL-RANDOM-WAVES.md` for the definitive current evidence; older fixed-schedule sections below are historical.

Production build, 33 Python tests, and 21 TypeScript tests pass. All 51,351 transitions from 2,000 seeded random-wave games match Python/TypeScript rules. Chance-aware search and sampled neural self-play are covered, including RNG-independent move choice, backup signs, seeded reproducibility, batched play, and rejection of old checkpoint rules. New training/export smoke evidence and 1,200 random/heuristic balance games are saved under `training/reports/tidal-v02-*.json`.

At 390×844, browser checks confirm horizontal/vertical locks, no preview, placement and AI response, two-tap nudge, and undo restoring the actual previous wave. The revised guide fits at 320×568. Connect Four and Terraform each still process a human move and AI reply after the shared controller change. Screenshots: `docs/tidal-random-mobile.png` and `docs/tidal-random-tutorial.png`.

# Initial alpha verification — October 26, 2026

## Terraform alpha

The production build passed, as did 24 Python and 15 TypeScript tests. All 153,902 Terraform transitions from 2,000 seeded games matched across languages, including the opening swap, and shared encoding/symmetry fixtures passed. The built worker processed fixture requests, recovered from invalid input, and completed a 14-turn game checked by the Python rules. A two-game neural pipeline smoke run completed without promotion.

Browser control could not initialize because of a kernel-assets path error. Terraform's new visual layout, mobile interaction, and the shared controller refactor were therefore **not browser-verified**; the worker harness is a Node-based integration check only. The balance audit also shows remaining second-player advantage under the heuristic test. See `docs/TERRAFORM-ALPHA.md` for the full scope and limitations.

## Batched self-play and larger training run

All 16 Python and nine TypeScript tests passed locally. Scheduler tests preserve seeded independent games; neural tests compare tensor-batch and scalar outputs, deduplication/cache eviction, and non-finite rejection. Checkpoint tests restore weights/replay/RNG and compare uninterrupted training with a split CLI run, including a non-default saved seed.

The measured 16-game CPU profile improved from 7.254 to 3.816 seconds (1.90×). A completed 512-game run produced 18,118 replay entries. The new checkpoint improved heuristic score from 6.25% to 33.75% and depth-four minimax score from 3.75% to 17.5%, with random wins still 39/40. It therefore remains disabled. New CPU ONNX parity passed on 50 states at max error `1.8477439880371094e-6`; new candidate browser parity was not run because strength did not qualify. See `docs/BATCHED-TRAINING.md` and `training/reports/phase1-batched-summary.json` for evidence. No mobile UI or active model manifest changes were needed.

## Checkpoint integration milestone

See `docs/PHASE-1-REPORT.md` for the current model and benchmark evidence. Production-browser ONNX parity passed on 50 states (max absolute error `1.8402934074401855e-6`), neural search took a forced win, and model failure fell back to rollout search. The initial candidate failed strength requirements and was rejected by the activation command; all playable model slots remain unassigned. Ten Python tests and nine TypeScript tests passed, including 42,745 generated rule transitions. Production gameplay also resumed an AI move after menu cancellation and processed a subsequent hint request. These checks supersede the initial engine notes below that describe ONNX integration as unimplemented.

## Full-page menu revision

- Header settings shortcut removed; settings moved into the three-line menu. Game screens retain a menu beside the title and Back button.
- At 390 × 844, the menu and settings cover the entire viewport. Menu lists All games, Settings, and About Rune; no favourites entry.
- Vibration switch changed from off to on, remained on after browser reload, and was restored to off after the check. Haptic calls are guarded for missing APIs and hardware. Physical vibration was not tested on this desktop.
- Production build passed. Screenshots: `docs/rune-mobile-menu.png` and `docs/rune-mobile-settings.png`.

## Mobile UI revision — October 26, 2026

The current UI replaces the initial desktop collection with the supplied mobile reference direction. Checked in browser viewports at 390 × 844 and 320 × 568:

- Two-column illustrated collection, game setup, named difficulty slider, large Play/help buttons. No numbered level labels.
- Five illustrated tutorial steps; previous/next/dot navigation, disabled end controls, OK dismissal, and focus restoration. At 320 × 568 the card and navigation fit without clipping.
- Human move → Web Worker → legal AI response; displayed move count advanced to three. Hint highlighted a column, undo restored move one.
- Settings opened/dismissed without losing the match; optional search exposed the original move history. Hidden by default.
- Favourite filtering and persistence after reload. Test changes were cleared afterward.
- Production TypeScript/Vite build and all five TypeScript rule/search tests passed after the revision.

Screenshots: `docs/rune-mobile-home.png`, `docs/rune-mobile-setup.png`, `docs/rune-mobile-tutorial.png`, and `docs/rune-mobile-match.png`. These are browser viewport checks, not native-device testing. Original games remain unplayable previews. The training and deployment limitations below remain applicable.

## Initial engine checks

Story: open the collection, enter Connect Four, drop a piece, run search in a Web Worker, and render a legal AI response without blocking navigation.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Production compilation | Pass | TypeScript check and Vite build; worker emitted as a separate 2.18 kB asset |
| Python rules/search | Pass | Seven unit tests, including diagonal wins, immutable transitions, perspective, illegal actions, backup and self-play outcomes |
| Cross-language rules | Pass | All 42,745 transitions from 2,000 seeded games matched in TypeScript |
| Browser tactics | Pass | Immediate wins, immediate-threat blocking, legal normalized search distributions |
| Human → worker → board | Pass | Browser move history advanced from `1. 4` to `1. 4 · 2. 4`, returned control to the human, and displayed search visits |
| Undo | Pass | Restored the opening board and disabled further undo |
| AI vs AI | Pass | Completed a 23-move game; rendered `Gold wins.` and stopped play |
| Collection filter | Pass | Quick-play filter removed the three longer-game previews |
| Original-game preview | Pass | Terraform dialog explicitly reports development status and links to the working Connect Four game |
| Training reference | Smoke pass | One self-play game, one optimizer step, two arena games; loss 2.9517, 52 augmented positions, gate score 0.5, no promotion |

The training smoke run establishes executable plumbing, not playing strength. No random/minimax/perfect-solver strength benchmark has run. Neural browser inference, ONNX runtime parity, and full training remain unverified and unconnected. ONNX/ONNX Runtime are not installed in this environment. Netlify configuration is present; no deployment has been made. Layout was visually inspected in the desktop browser; mobile breakpoints have not been device-tested.
# Tidal Lock alpha — October 28, 2026

Tidal Lock is playable and a four-round, 96-game neural training run is complete. See `docs/TIDAL-ALPHA.md` for full evidence and limitations. Thirty Python and twenty TypeScript tests pass, including 52,333 Python/TS transitions and shared encoding/reflection fixtures. Production worker replay, malformed-input recovery, and a complete oracle-checked match pass. Browser checks cover mobile setup/tutorial, Place/Nudge, worker replies, hints, undo, menu/settings, and an 11-action AI-vs-AI victory. The tutorial fits at 320×568 without horizontal overflow. Screenshots are `docs/tidal-mobile.png` and `docs/tidal-tutorial.png`.

The trained candidate achieved 39/40 random wins but only 2/40 heuristic wins. It remains disabled; the app uses heuristic search. CPU ONNX parity passed on 50 states at max error 6.67572021484375e-6. Tidal browser neural inference/parity and established game balance remain pending. The heuristic self-play test showed 81.5% first-player wins. This section supersedes older references to Tidal Lock as an unplayable preview.
