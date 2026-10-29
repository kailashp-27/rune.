# Terraform v0.1 — playable alpha rules

These are explicit prototype decisions for the incomplete game brief, not a claim that the original rules were already finalized. Rule changes require a new version and regenerated parity fixtures.

- Board: 5 × 5, row-major indices 0–24, heights 0–3. The symmetric starting hill has height two at 12 and height one at 7, 11, 13, 17; all other cells are zero.
- One unit each: Gold (`1`) at 20, Purple (`-1`) at 4. Gold acts first. Both units may stand on equal heights but never share a cell.
- Each turn is **one** move, raise, lower, or the opening-only swap described below. A move is to one of eight adjacent cells, cannot enter the opposing unit's cell, and can climb at most one height. Descending any number of heights is allowed.
- Pie rule: after Gold's first action, Purple may spend its turn swapping the two unit assignments. The board stays unchanged; unit colours/ownership swap, and Gold acts next. Swap is offered only on turn count one. Players retain their Gold/Purple identities.
- Raise/lower affects one adjacent cell, including diagonals. Neither unit's occupied cell may be edited. Heights stay within 0–3. Terrain edits do not include a movement action.
- Win by moving onto height three. Occupied cells cannot be raised, so an edit cannot directly give either unit a win. A player with no legal action loses. At 80 actions, a non-winning position is a draw; reaching height three on action 80 wins. No separate repetition rule in v0.
- Flat 251-action scheme: moves `origin * 8 + direction` (0–199); raises `200 + cell` (200–224); lowers `225 + cell` (225–249); swap climbers (250). Direction order is NW, N, NE, W, E, SW, S, SE. Off-board/unused origins remain masked. Swap is invariant under symmetry.
- Input `[8,5,5]`: four absolute height one-hot planes, own unit, opposing unit, absolute Gold-to-move flag, turn/80. Unit ownership is always relative to the current player.
- All eight square symmetries transform terrain, both unit positions, movement origins/directions, raise/lower destinations, and policy indices. Absolute player identities and turn counts do not change.

The first opponent uses a bounded heuristic tree search in a Web Worker. It is not a trained AlphaZero model; no win-probability bar or Elo claim is shown. Random-play and heuristic-play balance measurements must be reported before training or calling the rules balanced.

## Measured balance and remaining work

The initial version without a swap produced 200 Gold wins in 200 greedy self-play games. The pie rule was added after that result. With the swap rule, 1,000 random games produced 67 Gold wins, 59 Purple wins, and 874 draws; 200 opening-swap-aware heuristic games produced 54 Gold wins, 136 Purple wins, and 10 draws. Random play is very draw-heavy and heuristic play still favors the second player. These alpha rules are **not established as balanced**, and the measurements are not a solved-game result. Further opening playtests and balancing are needed before substantial neural training or a competitive release.

The two-game neural smoke run verifies the plug-in dimensions and shared training loop; it does not establish playing strength. The app's Terraform opponent remains heuristic.
