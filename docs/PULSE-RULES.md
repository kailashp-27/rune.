# Pulse v0.1 alpha rules

The original plan specified waves, emitter power, cooldowns, and territory but not a full rulebook. These are explicit prototype decisions for the first playable version.

## Goal and board

- A 5×5 board starts with a Gold power-one emitter at A5 (cell 20) and a Purple power-one emitter at E1 (cell 4). Each starts at strength two with countdown one. Gold acts first.
- Destroy or capture all opposing emitters to win immediately. If neither player has an emitter, the result is a draw. Otherwise, after 120 actions the player owning more cells wins; equal territory is a draw. Emitter elimination is checked before the cap.
- Every occupied cell, including an emitter cell, counts as one territory cell. The UI percentages divide by all 25 cells; neutral territory is a separate unclaimed part of the bar. This bar is not a win probability.

## One action per turn

- **Build:** place a new power-one emitter on an emitter-free cell that you own, or on neutral ground orthogonally adjacent to one of your owned cells. Enemy territory is not directly buildable. The new core starts at strength two and countdown two before this action's simulation tick.
- **Boost:** increase one of your emitters by one power, up to three. Set its core strength to at least its new power plus one and its countdown to one, so it fires during this action's tick.
- **Wait:** make no construction change; all countdowns and waves still advance. Wait remains legal while the game is ongoing, even when no build/boost is available.
- After the action, run one simultaneous wave tick, increment the action count, and change the player. Every action ticks both players' emitters. There are no real-time clocks or random wave draws in Pulse.

## Pure integer wave tick

1. Read all emitters and fields from one unchanged snapshot. Each owned field retains `strength - 1`, bounded below by zero. An existing emitter core retains at least strength one.
2. Decrement all emitter countdowns. At zero, the emitter fires and resets to three. A power `L` emitter emits strength `L + 1`, reduced by one for every orthogonal grid step of Manhattan distance. Only positive strengths propagate. Emitters and other cells do not block waves.
3. For each cell and each owner, take the **maximum** of all friendly waves and that owner's retained field. Friendly waves do not add together.
4. Subtract Purple's maximum from Gold's maximum. A positive result gives Gold ownership at that strength; a negative result gives Purple ownership at the absolute strength; a tie becomes neutral at zero strength. Every cell resolves from the same snapshot, so source traversal order cannot change the result.
5. An emitter on neutral ground is destroyed. An emitter whose ownership changes keeps its power but resets its countdown to three. Its outgoing wave for this tick still belongs to its pre-capture owner. Captured emitters cannot fire a second wave during the same tick.

Non-emitter fields fade without refresh; emitter cores do not vanish merely from idling. Strength stays an integer from zero to four. `step(state)` returns a fresh state and does not change the player or turn; `applyMove` handles those two changes.

## Engine contract

- State arrays: `board` owner IDs (0/+1/−1), `strength` (0–4), `level` emitter power (0–3), `cooldown` (0–3), and `bursts` signed source strengths for the last tick's animations. Player and turn complete the state. `bursts` is display metadata and does not affect the next tick.
- Fixed 51 actions: Build 0–24; Boost 25–49 (`25 + cell`); Wait 50. Terminal states expose an all-false legal mask.
- Input `[7,5,5]`: own territory, opposing territory, strength/4, own emitter power/3, opposing emitter power/3, cooldown/3, and turn/120. Ownership planes use the current player's perspective.
- All eight square rotations/reflections are valid augmentations. Board arrays and both cell-addressed action ranges transform together; Wait is invariant.

These remain alpha rules. Random and one-ply balance measurements do not establish optimal-play balance; long games reaching the cap need human playtesting before competitive release.
