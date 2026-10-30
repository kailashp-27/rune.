# Rune: current build and remaining work

Updated 30 October 2026. All six games are playable mobile-first web alphas. Deployment remains deferred at the user's request; the project is pushed to GitHub and Rune.cmd starts a persistent local app.

## Current gameplay

- Every AI turn is displayed after at least one second, including already-computed moves. A pending reply is cancelled safely by undo, reset, menu pause, backgrounding or a difficulty change.
- A shared result popup reports the winner or draw in all six games, with Try Again and Back to Games.
- Each game shows Rune's previous action. Terraform also highlights the affected square and shows before/after terrain heights.
- Real three-position difficulty sliders are present on setup and inside a match.
- Mirror Siege v0.2 seals the outer sixteen squares after action 24, removes exposed rooks, and finishes by action 60. This forces corner campers into the inner board. Its seven-plane models are incompatible with v0.1. Fortress's rules are unchanged.

## AI difficulty

All 18 slots now reference distinct models: Easy uses an eight-game checkpoint, Medium a 24-game checkpoint, and Hard a 64-game checkpoint. Terraform retains its previously qualified 64-game teacher checkpoint for Hard. The other games use their later checkpoint from the new cumulative teacher run. These are supervised heuristic-teacher seeds; they are not claimed to be completed pure AlphaZero training. Existing self-play runs remain separate experiments.

Tier behavior includes search budgets and more exploration/missed moves for Easy; it does not use presentation delay to create difficulty. All tiers have the same one-second minimum. Browser validation checked 50 fixed states per model and 12 paired-seat games for each tier pairing per game. Hard beat Medium, Medium beat Easy and Hard beat Easy in every game's final sample. These are small local difficulty comparisons, not Elo or perfect-play claims. The first comparison and corrected Pulse/Fortress comparisons are retained in training/reports.

## Verification

- Production build, 56 Python tests and 46 TypeScript tests passed.
- Mirror v0.2 matched 89,140 Python/TypeScript transitions from 2,000 games and all sampled symmetry/encoding fixtures.
- All six games and three difficulties were played through a legal human move, trained AI reply, hint and undo in the actual browser. Model IDs were checked, and every AI reply took at least one second.
- A deliberate corner-camping browser game ended at edge closure with a draw popup at action 24.
- A natural Fortress game showed its win popup; Try Again and Back to Games worked.
- Production workers completed full oracle-checked games; browser model comparisons exercised 216 complete neural games.

## Remaining release work

Larger self-play training, more independent strength/balance testing, calibrated win probabilities, measured Elo, full-game perfect-solver comparisons, and physical Android/iPhone sound/vibration/performance checks remain. Current model values and visit shares are not calibrated win probabilities. Human playtesting is still needed before treating prototype rules as final. Netlify publication and native-store packaging remain deferred/optional.

See [playability update](PLAYABILITY-2026-10-30.md), [Mirror rules](MIRROR-RULES.md), and the checked-in browser reports for evidence. Earlier milestone documents are historical.
