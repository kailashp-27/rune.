# Tidal Lock v0.2 alpha rules

This revision follows the user's feedback: remove the fixed tide order and next-wave preview, and allow vertical water as well as horizontal water. It supersedes v0.1.

- The 5x5 board starts empty. Gold goes first, Purple follows. Connect four stones horizontally, vertically, or diagonally to win. Underwater stones still count.
- Each turn, either place one stone on an empty dry square, or nudge one of your own stones one square north/east/south/west onto an empty dry square. Both endpoints must be dry. There are no diagonal nudges, pushes, jumps, captures, or moving an opponent's stone.
- Water locks one complete row or column. It does not move or remove stones. The starting line is uniformly random among five rows and five columns.
- After every action, the next water line is chosen uniformly among the other nine lines. The exact same line cannot repeat immediately. There is no fixed sequence, no move-driven selection, no forced axis alternation, and no preview.
- The future draw is independent of the chosen action, player, and board. Both players and the AI see only the current line. The AI considers possible outcomes and their probabilities; it does not receive an actual future wave or a random seed.
- A completed line wins immediately, including on action 80. Otherwise action 80 is a draw. Before the cap, a player with no legal action loses. No repetition adjudication or pie rule is included in this alpha.
- State: 25 row-major board integers (0, Gold +1, Purple -1), current player, turn, and current `wave`. Wave codes 0-4 mean rows 0-4; 5-9 mean columns 0-4. No upcoming wave is stored.
- Fixed 125 actions: placements 0-24; nudges `25 + origin*4 + direction`, N/E/S/W directions 0-3. Invalid endpoints and wrong-owner origins are masked out.
- Input `[6,5,5]`: own stones, opposing stones, current flooded cells, current axis flag (1 for vertical), turn parity, and turn/80. The former next-row plane is removed. The rules version changes even though the tensor dimensions remain the same; v0.1 checkpoints must be rejected.
- Augmentation currently uses identity and left-right reflection. For a vertical wave, reflection maps column c to 4-c. Nudge directions and policy indices reflect too. Horizontal waves keep their row index.

## Chance-aware engine extension

`applyMove(state, action, wave)` is pure and requires an explicit next-wave outcome. `chanceOutcomes(state)` returns the nine equiprobable legal wave codes. `sampleMove` draws an actual outcome; Python takes an injected RNG for reproducible tests, and live browser play uses its own RNG. `sampleInitial` similarly draws the opening water line. Search never samples from a hidden precomputed future.

The browser uses bounded expectimax over the nine possible waves. Python neural PUCT maintains action statistics and sampled chance-outcome child nodes. Self-play, arena, export-state sampling, and parity generation use the sampling helpers. Arena pairs use the same starting state and seeded wave draws across seats. Rule parity fixtures record the sampled next wave explicitly.

Undo restores the actual previous board and wave. Live random draws are resolved once before React's state updater so Strict Mode cannot draw a second wave while replaying that updater. Hints do not change the real wave or store a future one.

These remain prototype rules. Recorded balance tests describe the tested bots rather than optimal play or established competitive balance.
