# Terraform training and opening diagnostics

The Terraform training-to-ONNX path is implemented. The app continues using its existing search opponent. No neural model was activated and no UI changes were made in this milestone.

## Opening evidence

`training/reports/terraform-openings.json` records 600 games: all six legal first actions, 50 paired seeds for each forced keep/swap response, then one-ply heuristic play. Moving first won every keep game and lost every swap game. Two raise openings showed the opposite pattern. Raising cell 16 scored 94% when kept and 6% when swapped, counting draws as half a point.

This diagnoses a weakness in the bot's opening decisions. It does not prove a forced win under optimal play. With the second player choosing the better measured branch, Gold scored 0–6% across these openings. Rules remain v0.1; further search-based analysis and human playtesting are needed before changing the opening or investing in a large run.

## Training and export evidence

Two small CPU rounds generated 16 games and 7,592 augmented replay positions. Each round used 16 simulations, four concurrent games, 20 optimizer steps, a 16-channel/two-block network, and an eight-game arena. Both candidates scored 50% against the current champion and failed promotion. This budget checks the pipeline, not playing strength.

The second candidate exported as `terraform-34cc6b0dc9572948`, 104,232 bytes, with eight 5×5 input planes and 251 action logits. PyTorch and CPU ONNX Runtime matched across 50 legal states, with maximum absolute error 2.384185791015625e-7. The legacy Connect Four export also passed its 50-state regression check. Raw Terraform metrics and export metadata are retained in `training/reports/terraform-pipeline.json`; checkpoints and model binaries remain local ignored artifacts.

Exports now validate game identity, rules version, and tensor dimensions before writing assets. Terraform gets a separate validation pointer so it cannot overwrite Connect Four's diagnostics pointer. The Connect Four release tool rejects Terraform metadata. Terraform browser inference, browser parity, strength gating, and activation are still pending.

All 26 Python tests passed, including checkpoint-contract rejection and paired-opening report coverage. No rendered-browser verification was performed: this milestone changes Python tools and documentation only.

## Reproduce

```powershell
python -m training.terraform_openings --games 50
python -m training.train --game terraform --iterations 2 --games 8 --simulations 16 --self-play-batch 4 --steps 20 --arena-games 8 --channels 16 --blocks 2 --output training/checkpoints/terraform-new-run
python -m training.export_onnx training/checkpoints/terraform-new-run/candidate-0002.pt --directory training/exports/terraform-new-run
python -m unittest discover -s training/tests
```

Export requires the packages in `training/requirements.txt`. Use a fresh output directory or resume an existing run explicitly. An exported candidate is not a released difficulty model.
