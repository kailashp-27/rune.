# Mirror Siege v0.1 alpha rules

The supplied plan defined temporary ghosts but not their complete interaction with captures. These explicit prototype choices are shared by Python and TypeScript.

- A 5×5 board starts with Gold rooks at A5/B5/D5/E5 and Purple rooks at A1/B1/D1/E1. Gold goes first.
- Slide one own solid rook any positive distance orthogonally to an empty, ghost-free square. Solid rooks and active ghosts of either colour block the whole ray. No diagonal moves, jumps, direct replacement captures, or pass actions.
- After moving, inspect all four rays from its destination. Capture a contiguous enemy solid-rook line only when another friendly solid rook brackets its far end. Resolve all directions together. Ghosts of either colour break the line; they cannot be captured or act as friendly backstops. Empty squares and edges do not close a capture.
- Old ghosts stay active during movement and capture resolution. Only afterward do their one-reply timers expire. Do not re-evaluate captures after expiry.
- Finally, create a new ghost of the moving player on the vacated origin, with timer one. It persists throughout the next opponent reply. At normal turn boundaries there is at most one active ghost. Ghosts cannot move, be captured, count as surviving rooks, or share a cell with a solid piece.
- Win by capturing all enemy solid rooks. A player with no legal move loses. After 100 actions, more solid rooks wins and equal armies draw. Elimination precedes the cap; cap scoring precedes immobility at that final adjudication. The center has no special hold rule. No separate repetition rule is implemented.
- State: `board`, `ghosts` owner IDs, `ghostTimers` (0/1), player, turn, sorted `captured` metadata, and `lastAction`.
- Fixed 625 actions: `origin * 25 + destination`. Precomputed rook rays are shared with Fortress; terminal masks are all false.
- Input `[6,5,5]`: own solid rooks, opposing solid rooks, own active ghosts, opposing active ghosts, ghost timers, turn/100. Ownership planes use the current player's perspective.
- All eight square symmetries map both endpoints, board/ghost/timer arrays, capture metadata, last action, and policy indices.

These remain alpha rules, not a final competitive design. Long games and draw frequency need human playtesting.
