# Rune: built and remaining

Updated 29 October 2026. All six games are playable web alphas with Python/TypeScript parity, hints, undo, watch mode, step-by-step help and worker opponents.

## Completed this phase

- Lazy ONNX loading, versioned model contracts, neural PUCT and failure fallback for all five original games. Tidal Lock samples independent chance outcomes, with no future-wave preview or stored seed.
- Fifty-state browser parity, immediate-win and broken-model recovery checks passed for every original game.
- **Pulse Medium** enabled: a clearly labelled teacher-trained seed won 40/40 random games, 29/40 one-ply heuristic games, and scored 100% against the previous checkpoint in a 20-game paired arena. A further 72 self-play games across three rounds completed; those newer checkpoints remain experiments until independently evaluated.
- **Fortress Medium** enabled: 32 self-play games, 40/40 random wins, 29/40 heuristic wins, and 62.5% local arena score.
- Mirror Siege completed 32 self-play games and browser checks. It scored 86.25% against both measured baselines but won only 31/40 random games, so it remains disabled. Tidal's new teacher seed won 38/40 random and 1/40 heuristic games and remains disabled.
- **Terraform Medium** enabled: 64 teacher games, 40/40 random wins, 57.5% heuristic score, 100% in its 20-game arena, and 50-state browser parity/search/fallback checks.
- Full-page Rune's training page with real curves and paired-seat benchmark results. Consistent top-candidate displays remain inside optional Search details. Raw values and visit shares are not presented as win probabilities.
- Compact replay storage, safe legacy replay conversion, teacher provenance, digest-bound external arena evidence and generic checkpoint benchmarking.
- Exact Connect Four endgame benchmark: 40/40 optimal W/D/L choices at 34 moves played. Budget exhaustion is reported as unsolved; this does not establish full-game perfect play.
- Pulse mobile board, tutorial, trained reply, undo, hint and analysis verified in the browser. Backgrounding the page cancels the current worker; returning restarts the request from the preserved match.
- Project uploaded to the user-provided `kailashp-27/rune.` GitHub repository; GitHub Actions is configured. Netlify deployment is deferred at the user's request.

## Still required

1. Qualify remaining trained models/difficulties; continue Tidal experiments and evaluate new Pulse/Mirror checkpoints independently. Easy and Hard currently remain search opponents.
2. Human balance/pacing playtests, especially Terraform's opening, Pulse/Mirror cap-length play, and Fortress's seat asymmetry. Prototype rules have not been declared stable.
3. Physical Android/iPhone checks for sound, vibration, touch performance and resumed searches. Desktop phone-sized browser checks are not physical-device tests.
4. Calibrated win probabilities, measured Elo, and full-game Connect Four perfect-opponent matches. The page currently shows the evidence actually collected.
5. Confirm GitHub CI results. Netlify publication and deployed-origin checks are deferred at the user's request. Netlify configuration includes SPA routing, model/runtime cache handling and hashed asset caching.

Optional: installable PWA/offline support, Android/iOS store packaging, Rust rules, larger GPU runs and WebGPU/quantization when measurements justify them.

See [AI integration](AI-INTEGRATION.md) for training methods, validation and commands. Prior milestone reports are historical and may describe older disabled models.
