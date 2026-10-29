# Engine contract

> Current status (29 October 2026): all six games are playable. Terraform, Pulse and Fortress Medium now use qualified trained models; the other slots use search opponents. All original games support browser neural inference. See [current status](docs/PROJECT-STATUS.md) and [AI integration](docs/AI-INTEGRATION.md). Older milestones below remain historical.


Each game owns its fixed action space, immutable JSON state, legal mask, transition, terminal adjudication, current-player encoding, and allowed symmetries. Python and TypeScript contract declarations live in `training/core/game.py` and `web/src/engine/game.ts`.

## Connect Four

- State: 42 row-major cells, player `1 | -1`, turn count.
- Actions: columns 0–6; pieces fall to the greatest available row.
- Terminal winner is an absolute player ID, zero for draw. Terminal states expose an empty legal mask.
- Planes: own pieces, opposing pieces, normalized turn count. Shape: `[3, 6, 7]`. The turn plane is constant across cells. A side-to-move plane is unnecessary with relative ownership.
- Legal augmentation: identity and horizontal reflection; policy column indices reflect with the board.
- Cap: 42 moves, checked after four-in-a-row victory.
- Node values: relative to that node's current player. Backup changes sign on every edge; parent selection negates the child's average value.

## Runtime boundaries

React owns history and presentation. A module Web Worker receives state and a search budget, returning the selected column, normalized visit distribution, and rollout value. Changing state, difficulty, or mode terminates the old worker before creating another. Reset/unmount cancels pending work. Search checks its two-second deadline between simulations; a single rollout has at most 42 moves.

The Python reference loop uses neural priors and values. The browser selects either ONNX neural PUCT or center-biased tactical rollouts through `public/models/manifest.json`. All difficulty slots remain unassigned because the first trained candidate failed the strength gate. Neural inference uses a single-thread WASM backend in the game worker, lazy imports, a 5,000-state evaluation cache, relative ownership planes, and legal-mask softmax. Fetches are time bounded. Model/manifest failures fall back to rollout search. Technical status appears only inside optional search details.

The controller retains an idle worker and model session between moves; active requests are cancelled by terminating the worker when state is reset, paused, or exited. Request IDs prevent stale replies. Model URLs include a content hash and are cached immutably. Manifest and validation pointers are revalidated instead. The default and neural searches retain the same immediate-win/threat checks. Raw value estimates are not shown as calibrated probabilities or Elo.

## Original-game rule decisions still needed

| Game | Must resolve before implementation |
| --- | --- |
| Terraform | Playable v0.1 rules are in `docs/TERRAFORM-RULES.md`; opening balance and browser visual QA remain provisional |
| Tidal Lock | Playable v0.2 rules in `docs/TIDAL-RULES.md`; random locked row/column, no preview, place/nudge, 125 actions, 80-action cap; balance provisional |
| Pulse | Playable v0.1 rules in `docs/PULSE-RULES.md`: 5×5 simultaneous integer waves, emitter captures, territory scoring, 120-action cap; visual QA and pace playtesting pending |
| Fortress | Playable v0.1: rook rays, simultaneous line captures, three-own-turn center hold, 100-action cap; playtesting and neural training pending |
| Mirror Siege | Playable v0.1: ghosts block movement/capture rays through one reply, then expire; 100-action cap; training and playtesting pending |

Mirror Siege is now implemented with one-reply blocking ghosts, capture-only victory/cap scoring, and six input planes; see `docs/MIRROR-RULES.md`. Fortress now has playable v0.1 rules in `docs/FORTRESS-RULES.md`, 625 rook-move actions, six input planes, and eight symmetries. Terraform, Tidal Lock, and Pulse have playable alphas with search worker opponents. Card artwork is decorative and does not define legal positions.

## Terraform plug-in

Terraform uses `[8,5,5]` input planes and 251 actions, with an opening-only swap at index 250. Python and TypeScript replay and symmetry fixtures match. The app uses an independent bounded heuristic search worker; Terraform ONNX export is supported but browser neural inference is not connected. All three games share `useMatch` for request IDs, cancellation, sound/vibration, and history. The neural trainer selects a game through the registry and records game and rules version in checkpoints. Cache identity covers the full state so unit positions cannot collide on equal terrain grids. See `docs/TERRAFORM-ALPHA.md` for evidence and known limits.

## Tidal Lock plug-in

Tidal Lock uses `[6,5,5]` planes and 125 actions. The current wave is public state; the next wave is independently sampled among nine different rows/columns. No future wave or seed is passed to the AI. Pure transitions take an explicit chance outcome; separate helpers sample actual initial/live states. The browser uses bounded expectimax and Python uses PUCT action edges with sampled chance children. Left-right augmentation also reflects vertical wave columns. v0.1 model checkpoints are incompatible despite unchanged tensor dimensions and are rejected by rules-version checks. See `docs/TIDAL-RANDOM-WAVES.md`.

## Training limits of this initial implementation

The trainer interleaves self-play game coroutines in one process. Search yields leaf evaluation requests; the scheduler groups requests from up to `--self-play-batch` active games and sends them through a deduplicating neural evaluator. Independent per-game seeds preserve randomness across scheduler batch sizes. Inference float rounding across tensor batch sizes may still affect near-tied move choices. The evaluator's cache belongs to one immutable model; construct a fresh evaluator after changing weights.

`latest.pt` is atomically replaced after a completed round and stores champion weights, replay, iteration, and Python/PyTorch random state. It is resume-only and cannot pass the release gate. Each candidate starts a fresh optimizer each round by design. Resuming model-only older checkpoints resets replay; resuming a full latest checkpoint retains it. Multiprocessing, Elo, perfect-solver benchmarking, and in-round resume are still unimplemented.

Arena games swap seats over paired seeded short openings; the initial recorded CPU run preceded this arena improvement. A training-arena promotion is distinct from a browser release. Export marks every bundle as a candidate; `publish_model.py` requires matching checkpoint, CPU/browser parity, browser search/fallback checks, and strength evidence before assigning a difficulty slot. Browser parity is verified in the production build using `/engine-check.html`.
