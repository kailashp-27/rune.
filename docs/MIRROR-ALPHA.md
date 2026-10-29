# Mirror Siege playable alpha

Mirror Siege is implemented, making all six Rune cards playable: Connect Four plus the five original games.

Implemented: rook selection and legal destinations, one-reply ghost rendering, blocked movement/capture rays, simultaneous sandwich captures, army counts, hints, undo, reset/rematch, optional history, watch mode, and eight illustrated lessons. The full-page menu and Settings/Vibration remain shared. No progression levels were added.

The live opponent uses a separate bounded iterative-deepening alpha-beta worker with Easy/Medium/Hard depth limits 1/3/5 and budgets 120/450/1200 ms. Only fully completed depth iterations replace the result. Python rules are registered with the shared neural trainer/export contract; no Mirror Siege neural model is trained or activated yet.

## Verification

- Production build and all 48 Python/34 TypeScript tests pass across the project. Dedicated ghost tests cover blocked destinations and intermediate cells, expiry after the reply, ghost-vs-sandwich interactions, no retrospective capture after expiry, real capture resolution, ghost exclusion from scoring, encoding, and all eight symmetries.
- All 198,803 transitions from 2,000 seeded games match Python/TypeScript exactly. Twelve shared encoding/symmetry fixtures include both ghost ownership and timer planes. The checked-in replay is a smaller 16-game set; CI regenerates the large replay.
- Production worker replay, request IDs, malformed-input recovery, and an oracle-checked 100-action draw pass. See `training/reports/mirror-worker.json`.
- Mobile browser checks confirm setup/help, solid-rook selection, human move → AI reply, the new ghost and old-ghost expiry, undo restoring the starting position, and a completed hint. The ghost/capture lesson fits at 320×568; the board was checked at 390×844 without horizontal overflow. Screenshot: `docs/mirror-mobile.png`. These are browser viewport checks rather than physical-device tests.

Random self-play over 1,000 seeded games produced 371 Gold wins, 420 Purple wins, and 209 draws, averaging 99.493 actions. This describes the random bots, not solved balance or browser strength. The high proportion of cap-length games needs playtesting. See `training/reports/mirror-balance.json` and [MIRROR-RULES.md](MIRROR-RULES.md).

The remaining project work is tracked in [PROJECT-STATUS.md](PROJECT-STATUS.md).
