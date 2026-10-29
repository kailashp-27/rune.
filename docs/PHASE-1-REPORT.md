# Connect Four checkpoint integration

This milestone connects real trained PyTorch weights to browser neural PUCT and introduces measured release criteria. No neural checkpoint has been enabled in the playable app.

## Training experiment

Three CPU iterations, twelve self-play games per iteration, 32 simulations per move, 120 optimizer steps per iteration, four residual blocks and 32 channels. The final replay contained 1,382 augmented entries. Per-iteration times were approximately 29.2, 17.9, and 15.0 seconds. Checkpoints and raw metrics are retained locally in ignored `training/checkpoints/phase1/`.

The iteration-two checkpoint was selected by the initial arena. That arena reused empty-board openings, so its 100% score was weak evidence. Subsequent arena runs now use seeded paired short openings with swapped seats. Passing an arena alone does not activate a browser checkpoint.

## Actual strength measurements

The selected checkpoint was measured with neural PUCT at 64 simulations per move, seed 42, twenty paired openings and both seats (40 games per opponent):

| Opponent | Wins | Draws | Losses | Score |
| --- | ---: | ---: | ---: | ---: |
| Random | 39 | 0 | 1 | 97.5% |
| Tactical one-ply heuristic | 2 | 1 | 37 | 6.25% |
| Depth-four alpha-beta minimax | 1 | 1 | 38 | 3.75% |

Score counts draws as half a point. These are Python neural-search results without the browser's immediate-win/threat override, not a browser strength measurement or Elo estimate. This candidate fails the requirement to win every measured random game and score at least 55% against the heuristic. The activation command rejected it, leaving all manifest slots null. It needs substantially more training.

## Export and production-browser checks

- Model ID: `connect4-d426ee3b7db7e616`; 319,625-byte ONNX artifact.
- CPU ONNX vs PyTorch: 50 legal states, maximum absolute error `1.5497207641601562e-6`.
- Browser WASM vs PyTorch: the same 50 states, maximum absolute error `1.8402934074401855e-6`, below the `1e-4` threshold.
- Production browser neural search selected the forced winning move at column index zero, using 80 simulations.
- A deliberately missing model fell back to rollout search and still selected the forced winning move.
- Model session reuse, lazy WASM loading, legal-mask softmax, relative-value backup, and bounded fetches are implemented. Runtime assets are served from the same origin; no cross-origin isolation headers are required for this single-thread configuration.

Raw evidence: `training/reports/phase1-benchmark.json`, `training/reports/phase1-browser-parity.json`, and `docs/phase1-engine-check.png`. The model, metadata, and fixtures are in `web/public/models/`. Metadata binds the ONNX and checkpoint hashes. WASM runtime files are copied from the locked npm dependency during dev/build rather than checked in.

## Remaining before Phase 1 exit

Expand and optimize self-play, train a stronger checkpoint, measure browser latency on real phones, add a perfect-solver comparison, and pass the release gate. No public Netlify deployment or Terraform rule engine was added in this milestone.
