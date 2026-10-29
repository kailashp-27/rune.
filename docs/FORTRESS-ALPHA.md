# Fortress playable alpha

Fortress is Rune's fifth playable game; Mirror Siege remains a preview. Its prototype decisions are in [FORTRESS-RULES.md](FORTRESS-RULES.md).

Implemented: rook selection and highlighted sliding destinations; multi-piece/multi-direction sandwich captures; center-hold marks; army counts; capture effects; hint, undo, rematch, move history, and watch mode; eight illustrated lessons. The existing named difficulties, full-page menu, and Settings/Vibration are retained, with no progression levels.

The live opponent uses a dedicated bounded iterative-deepening alpha-beta worker. Easy/Medium/Hard request depths 1/3/5 with 120/450/1200 ms budgets. Python rules are registered with the shared trainer and versioned model contract. No Fortress neural model is trained or activated in this milestone.

Verification:

- Production build, 43 Python tests, and 30 TypeScript tests pass across Rune. Coverage includes rook blockers, diagonal/jump rejection, simultaneous captures, empty/edge non-captures, owner-turn-only center counting, resets, elimination, cap scoring, policy/metadata symmetries, and search legality.
- All 93,119 transitions from 2,000 seeded games match across Python and TypeScript. Twelve encoding/state fixtures cover all eight transforms. CI regenerates the large replay; the smaller checked-in replay covers 16 games.
- The production worker replayed 40 states, preserved request IDs, recovered after malformed input, and completed an 11-action Gold win with a Python oracle checking every transition. See `training/reports/fortress-worker.json`.
- Mobile browser checks verified setup/tutorial, rook selection, human move → AI response, undo, and hints. The hold lesson was inspected at 320×568 and the board at 390×844. Screenshot: `docs/fortress-mobile.png`. These are desktop viewport checks, not physical-device testing.

Random-bot balance evidence is saved separately in `training/reports/fortress-balance.json`. It does not measure the browser search opponent or establish competitive balance. Longer training, stronger baseline testing, and human playtesting remain future work. No Elo or calibrated win probability is claimed.
