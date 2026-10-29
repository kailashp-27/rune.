# Pulse training run

Completed four CPU rounds with 16 self-play games per round: **64 games**, **60,104 augmented replay entries**, 32 simulations per move, eight interleaved games, 100 optimizer steps per round, and eight-game paired arenas. The network used two residual blocks and 16 channels. This is a larger training run than the earlier four-game integration check, but still a small budget for Pulse's 120-action horizon.

| Round | Loss | Arena score | Promoted locally |
| --- | --- | --- | --- |
| 1 | 4.167 | 37.5% | No |
| 2 | 4.261 | 18.75% | No |
| 3 | 4.227 | 12.5% | No |
| 4 | 4.287 | 56.25% | Yes |

Selected checkpoint: `training/checkpoints/pulse-alpha/best.pt`. Resume state is `latest.pt` in the same directory. These local artifacts are ignored; raw metrics and export metadata are retained in `training/reports/pulse-alpha-training.json`.

Independent benchmarking used 40 games per opponent, 32 neural PUCT simulations, alternating seats, and paired two-action random openings. The selected model won **1/40** against random play and **0/40** against the one-ply heuristic, with no draws. See `training/reports/pulse-alpha-benchmark.json`.

**The network is not release-ready and is not enabled in the app.** Local arena promotion only measures improvement against the current local champion; it did not establish independent strength. The app retains its existing search opponent. The long-horizon game needs further training/search-budget investigation before promotion to a difficulty model. No improvement claim against the heuristic or random baseline is made.

ONNX candidate `pulse-008f94d2e5bb6cc7` is 62,851 bytes. CPU ONNX Runtime matched PyTorch on 50 legal states with maximum absolute error 1.1920928955078125e-6. Browser neural inference/parity for Pulse is still pending. Exported binaries are retained locally under `training/exports/pulse-alpha`.

```powershell
python -m training.train --game pulse --resume training/checkpoints/pulse-alpha/latest.pt --iterations 4 --games 16 --simulations 32 --self-play-batch 8 --steps 100 --arena-games 8 --output training/checkpoints/pulse-alpha
python -m training.pulse_evaluate --checkpoint training/checkpoints/pulse-alpha/best.pt --games 40 --simulations 32 --output training/reports/pulse-alpha-benchmark.json
```
