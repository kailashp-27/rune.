"""Compact float16 replay bytes, compatible with weights_only checkpoints.

Rule fixtures remain exact integers/floats. Only neural learning targets are
stored in half precision; tensors are decoded to float32 for optimization.
"""
import struct

def pack(planes, policy, value):
    flat = [number for plane in planes for row in plane for number in row]
    return struct.pack(f'{len(flat)}e', *flat), struct.pack(f'{len(policy)}e', *policy), float(value)

def compact(entry):
    return entry if isinstance(entry[0], bytes) else pack(*entry)

def tensors(entries, shape, device='cpu'):
    import torch
    entries = [compact(entry) for entry in entries]
    x = torch.stack([torch.frombuffer(bytearray(entry[0]), dtype=torch.float16).reshape(shape) for entry in entries]).to(device=device, dtype=torch.float32)
    policy = torch.stack([torch.frombuffer(bytearray(entry[1]), dtype=torch.float16) for entry in entries]).to(device=device, dtype=torch.float32)
    policy = policy / policy.sum(-1, keepdim=True).clamp_min(1e-12)
    value = torch.tensor([entry[2] for entry in entries], dtype=torch.float32, device=device)
    return x, policy, value
