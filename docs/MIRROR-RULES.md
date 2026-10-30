# Mirror Siege v0.2

A 5 by 5 rook-capture duel. Gold starts at A5, B5, D5, E5; Purple starts at A1, B1, D1, E1. Gold moves first. A rook slides any positive distance orthogonally through empty squares. Solid rooks and active ghosts block movement; no jumping.

A move leaves a ghost on its origin. The previous ghost remains during the reply and capture resolution, then expires; the replying rook leaves a fresh one-reply ghost. Ghosts cannot move or be captured, do not count as surviving rooks, and cannot close a capture. A ghost of either owner breaks a capture ray.

Moving beside a continuous line of enemy rooks with another friendly solid rook at its far end captures that line. All directions resolve from the same moved-board snapshot. Board edges and empty squares are not backstops.

## Closing the edge

After action 24 (12 moves per side), the outer sixteen squares seal permanently. All solid rooks and ghosts left there are removed, including friendly rooks. The inner nine squares remain. No subsequent move may land on or pass through a sealed square. Closure occurs after the 24th move and its sandwich captures; ghosts on sealed cells are then cleared. The countdown appears throughout play; the last four actions are highlighted.

This removes the safe corner-camping loop. If both armies are lost at closure, the result is a draw; if only one survives, it wins. Otherwise normal play continues on the inner board.

## Results and input contract

Eliminating the opponent wins; losing both armies draws. No legal move loses. At the 60-action cap, more solid rooks wins, equal armies draw. Ghosts do not count. Fortress's center-hold rule does not apply.

Action index is origin times 25 plus destination (625 entries). State remains board, ghosts, ghostTimers, player, turn, captured and lastAction; the sealing phase is derived from turn, never hidden state. Seven current-player input planes encode own/opponent rooks, own/opponent ghosts, ghost timers, turn/60, and the sealed-square mask. Eight square symmetries preserve transitions. Version v0.1 checkpoints are incompatible and cannot be selected.
