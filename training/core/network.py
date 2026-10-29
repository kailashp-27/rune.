import time
import json
import torch
from torch import nn

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.layers = nn.Sequential(nn.Conv2d(channels, channels, 3, padding=1, bias=False), nn.BatchNorm2d(channels), nn.ReLU(), nn.Conv2d(channels, channels, 3, padding=1, bias=False), nn.BatchNorm2d(channels))
    def forward(self, x):
        return torch.relu(x + self.layers(x))

class PolicyValueNet(nn.Module):
    def __init__(self, planes=3, height=6, width=7, actions=7, channels=64, blocks=4):
        super().__init__()
        self.config = dict(planes=planes, height=height, width=width, actions=actions, channels=channels, blocks=blocks)
        self.body = nn.Sequential(nn.Conv2d(planes, channels, 3, padding=1), nn.ReLU(), *[ResidualBlock(channels) for _ in range(blocks)])
        self.policy = nn.Sequential(nn.Conv2d(channels, 2, 1), nn.ReLU(), nn.Flatten(), nn.Linear(2*height*width, actions))
        self.value = nn.Sequential(nn.Conv2d(channels, 1, 1), nn.ReLU(), nn.Flatten(), nn.Linear(height*width, 64), nn.ReLU(), nn.Linear(64, 1), nn.Tanh())
    def forward(self, x):
        features = self.body(x)
        return self.policy(features), self.value(features)

class BatchedEvaluator:
    """Read-only model evaluator with deduplicated, ordered batches and a bounded cache.

    Construct a fresh instance after changing any model weights.
    """
    def __init__(self, model, game, device, capacity=10000):
        if capacity < 1:
            raise ValueError('Cache capacity must be positive')
        self.model, self.game, self.device = model.eval(), game, device
        self.capacity = capacity
        self.cache = {}
        self.stats = dict(requested_positions=0, evaluated_positions=0, forward_calls=0, cache_hits=0, max_batch_size=0, evaluation_seconds=0.0)

    @staticmethod
    def key(state):
        return json.dumps(state, sort_keys=True, separators=(',', ':'))

    def evaluate_many(self, states):
        if not states:
            return []
        started = time.perf_counter()
        keys = [self.key(state) for state in states]
        needed = {}
        resolved = {}
        self.stats['requested_positions'] += len(states)
        for key, state in zip(keys, states):
            if key in self.cache:
                resolved[key] = self.cache[key]
                self.stats['cache_hits'] += 1
            elif key not in needed:
                needed[key] = state
        if needed:
            missing_states = list(needed.values())
            masks = [self.game.legalMoves(state) for state in missing_states]
            if any(not any(mask) for mask in masks):
                raise ValueError('Do not evaluate terminal states')
            with torch.inference_mode():
                x = torch.tensor([self.game.encode(state) for state in missing_states], dtype=torch.float32, device=self.device)
                logits, values = self.model(x)
                if not torch.isfinite(logits).all() or not torch.isfinite(values).all():
                    raise FloatingPointError('Network evaluation is non-finite')
                mask = torch.tensor(masks, dtype=torch.bool, device=self.device)
                policies = logits.masked_fill(~mask, -1e9).softmax(-1).cpu().tolist()
                scalars = values.flatten().cpu().tolist()
            for key, policy, value in zip(needed, policies, scalars):
                resolved[key] = (policy, value)
                if len(self.cache) >= self.capacity:
                    self.cache.pop(next(iter(self.cache)))
                self.cache[key] = resolved[key]
            self.stats['forward_calls'] += 1
            self.stats['evaluated_positions'] += len(needed)
            self.stats['max_batch_size'] = max(self.stats['max_batch_size'], len(needed))
        self.stats['evaluation_seconds'] += time.perf_counter() - started
        return [resolved[key] for key in keys]

    def __call__(self, state):
        return self.evaluate_many([state])[0]

def evaluator(model, game, device):
    return BatchedEvaluator(model, game, device)
