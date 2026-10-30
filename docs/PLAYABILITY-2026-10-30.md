# Playability and difficulty update — 30 October 2026

The user requested corner-stall prevention, previous-move feedback, result popups, one-second AI turns, a difficulty slider and genuinely different checkpoints.

Mirror Siege now seals its outer ring after 24 actions (12 per side). Exposed solid rooks and ghosts are removed; sealed cells remain unavailable. A visible countdown warns both players, the final four actions are emphasized, and the tutorial explains the rule. Both armies lost at closure draws; one surviving army wins. Other games' rules are unchanged. Mirror's cap is 60 and its input gains a sealed-square plane; v0.1 models are rejected.

Every match uses a shared result dialog with Try Again, Back to Games and a close button for board inspection. The shared turn controller computes in a worker immediately, holds the reply until one second has elapsed, and cancels held replies on pause/undo/reset/difficulty change. Slow computations can take longer than one second; presentation time is identical across tiers.

All boards show the latest bot action. Terraform additionally marks Rune's affected tile and reports the old/new height for raise/lower. A real browser example was “Rune: lower C2 · height 1 → 0”. Pulse resolves its own wave step after the human move, pauses before the bot's next move, and then reports the bot action; both actions advance emitter countdowns.

Difficulty models are cumulative teacher checkpoints after 8, 24 and 64 games. These use actual generated game positions with heuristic policy/value targets; subsequent self-play experiments are separate. Easy also samples its policy and occasionally misses a move; Medium usually commits but still explores occasionally; Hard commits to search. Transformer-free small residual policy/value networks run locally in WASM. Older strongest-champion release gates remain separate from this deliberately weaker-tier calibration path.

The first calibration correctly rejected the older Pulse and Fortress Hard selections because they did not beat the new Medium model. Their later 64-game checkpoints passed the final comparisons. Terraform's earlier qualified 64-game checkpoint remains Hard. training/publish_difficulties.py rejects duplicate IDs, nonincreasing training counts, mismatched model parity, missing comparisons or a nonwinning stronger tier.

Final evidence: 18 models × 50 browser parity states; 12 paired-seat games × 3 pairings × 6 games (216 matches). Hard/Medium scores were 100% Connect Four, 87.5% Terraform, 83.3% Tidal Lock, 58.3% Pulse, 66.7% Fortress and 87.5% Mirror Siege. This is a small sample, not a statistical strength guarantee or Elo rating.

See training/reports/difficulty-validation.json, training/reports/difficulty-training-20261030.json and training/reports/playability-20261030.json. Old reports and model artifacts are retained as historical records and are not silently reused under changed rules.

## Setup slider correction

Following the user’s annotated clarification, difficulty is now chosen only on the game setup page. Its native range has a continuous 0–100 track (`step=any`); the thumb keeps its dragged position while selecting the nearest Easy/Medium/Hard checkpoint. Labels are landmarks, not toggle buttons. Every playing screen has a static difficulty badge and no help shortcut. The setup How to Play button and Settings guide remain available.

Production build passed. In the browser, the Tidal Lock slider held 37.5, dragged freely to 66.069, and selected Hard at 91.2 before entering a Hard match. All six playing screens were checked for the absence of a slider and help shortcut. Screenshot: setup-smooth-slider.png.
