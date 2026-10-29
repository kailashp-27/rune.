# Fortress v0.1 alpha rules

The supplied plan called for rook movement, sandwich captures, and a center-hold counter. This is the explicit prototype specification used by both engines.

- Board: 5×5, row-major cells 0–24. Gold starts at A5/B5/D5/E5 and Purple at A1/B1/D1/E1. Gold goes first. Each side starts with four rooks.
- Move one own rook any positive distance orthogonally to an empty square. Every piece blocks sliding. No jumps, diagonal movement, direct replacement captures, or pass actions.
- After moving, inspect each of the four rays from the destination. A contiguous enemy line immediately next to the moved rook is captured if another friendly rook closes its far end. The entire line is removed. All four directions are evaluated before removals; multiple captures can occur together. Board edges, empty cells, the vacated origin, and an unoccupied center are not friendly backstops.
- Center: C3/cell 12. Finishing one of your turns with your rook there adds one hold mark, including the turn entering the center. Moving a different rook can add a mark while the center rook stays put. Opponent turns do not increment your marks. Losing or leaving the center clears your count immediately.
- Win by reaching three consecutive own-turn-ending hold marks or capturing all opposing rooks. A player with no legal move loses. After 100 actions, more surviving rooks wins and equal armies draw. Elimination and completed center hold take priority over the cap; cap scoring takes priority over immobility at that final adjudication. There is no separate repetition rule.
- State: `board`, absolute-player `hold` counters `[Gold,Purple]`, player, turn, sorted last `captured` cells, and `lastAction`. Capture and last-action fields support presentation; they do not change future move legality.
- Fixed 625 actions: `origin * 25 + destination`. Terminal masks are all false. Orthogonal rays are precomputed in Python and TypeScript.
- Input `[6,5,5]`: own pieces, opposing pieces, own hold/3, opposing hold/3, center marker, and turn/100. Both hold planes are constant over the board and use the current player's perspective.
- All eight square symmetries transform board cells, both endpoints of the action, capture metadata, and policy indices. Hold counters stay attached to their player IDs.

These are alpha rules and need human playtesting. Random-game balance does not establish optimal-play balance.
