"""Export a content-addressed browser bundle plus 50 legal-state parity samples."""
import argparse
import hashlib
import json
import random
from pathlib import Path
import numpy as np
import torch
import onnxruntime as ort
from training.core.network import PolicyValueNet
from training.core.contracts import checkpoint_game
from training.core.transitions import initial, advance


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('checkpoint')
    parser.add_argument('--directory', default='web/public/models')
    args = parser.parse_args()
    torch.set_num_threads(2)
    checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
    try:
        game_id, game = checkpoint_game(checkpoint)
    except (ValueError, KeyError) as error:
        parser.error(str(error))
    model = PolicyValueNet(**checkpoint['config']).eval()
    model.load_state_dict(checkpoint['state_dict'])
    config = model.config
    directory = Path(args.directory)
    directory.mkdir(parents=True, exist_ok=True)
    temporary = directory / f'{game_id}-export.tmp.onnx'
    x = torch.zeros(1, *game.INPUT_SHAPE)
    torch.onnx.export(model, x, str(temporary), input_names=['state'], output_names=['policy_logits', 'value'], dynamic_axes={'state': {0: 'batch'}, 'policy_logits': {0: 'batch'}, 'value': {0: 'batch'}}, opset_version=17, dynamo=False)
    digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
    model_id = f'{game_id}-{digest[:16]}'
    output = directory / f'{model_id}.onnx'
    temporary.replace(output)
    rng = random.Random(42)
    state = initial(game, rng)
    states = []
    for _ in range(50):
        if game.isTerminal(state)['done']:
            state = initial(game, rng)
        states.append(state)
        state = advance(game, state, rng.choice([a for a, ok in enumerate(game.legalMoves(state)) if ok]), rng)
    sample = torch.tensor([game.encode(s) for s in states], dtype=torch.float32)
    with torch.inference_mode():
        expected = model(sample)
    session = ort.InferenceSession(str(output), providers=['CPUExecutionProvider'])
    actual = session.run(None, {'state': sample.numpy()})
    max_error = 0.0
    for want, got in zip(expected, actual):
        np.testing.assert_allclose(want.numpy(), got, atol=1e-4, rtol=1e-4)
        max_error = max(max_error, float(np.abs(want.numpy() - got).max()))
    samples = [{'state': s, 'logits': expected[0][i].tolist(), 'value': expected[1][i].item()} for i, s in enumerate(states)]
    (directory / f'{model_id}-parity.json').write_text(json.dumps({'modelId': model_id, 'game': game_id, 'rulesVersion': game.RULES_VERSION, 'samples': samples}, separators=(',', ':')))
    entry = {'game': game_id, 'rulesVersion': game.RULES_VERSION, 'id': model_id, 'url': f'/models/{model_id}.onnx', 'parityUrl': f'/models/{model_id}-parity.json', 'status': 'candidate'}
    metadata = {'game': game_id, 'rules_version': game.RULES_VERSION, 'model': entry, 'sha256': digest, 'checkpoint_sha256': hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest(), 'config': config, 'iteration': checkpoint.get('iteration'), 'arena_score': checkpoint.get('arena_score'), 'promoted': bool(checkpoint.get('promoted')), 'cpu_parity': {'states': 50, 'max_error': max_error, 'passed': True}, 'bytes': output.stat().st_size}
    metadata['training_origin'] = checkpoint.get('training_origin', {'method':'self-play'})
    (directory / f'{model_id}-meta.json').write_text(json.dumps(metadata, indent=2))
    pointer = 'validation.json' if game_id == 'connect4' else f'{game_id}-validation.json'
    (directory / pointer).write_text(json.dumps(entry, indent=2))
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
