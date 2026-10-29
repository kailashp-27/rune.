import { maskedPolicy } from './neural-search';
import type { TurnState, Evaluation } from './generic-neural';
export type GameId = 'connect4' | 'terraform' | 'tidal' | 'pulse' | 'fortress' | 'mirror';
export interface ModelEntry { id: string; url: string; parityUrl: string; status: 'candidate' | 'promoted'; game?: GameId; rulesVersion?: string; simulations?:number }
export interface ModelSpec<S> { id: GameId; rulesVersion: string; shape: [number, number, number]; actions: number; encode(state: S): number[][][]; legalMoves(state: S): boolean[] }
type Manifest = { schemaVersion: number } & Partial<Record<GameId, Partial<Record<'Easy' | 'Medium' | 'Hard', ModelEntry | null>>>>;
export async function resource<T>(url: string, json: boolean, noCache = false): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: noCache ? 'no-cache' : 'default' });
    if (!response.ok) throw new Error(`Model asset unavailable: ${response.status}`);
    return await (json ? response.json() : response.arrayBuffer()) as T;
  } finally { clearTimeout(timer); }
}
export function validateEntry<S>(entry: ModelEntry, spec: ModelSpec<S>) {
  if (entry.simulations!==undefined&&(!Number.isInteger(entry.simulations)||entry.simulations<2||entry.simulations>2000)) throw new Error('Invalid checkpoint search budget');
  if (!entry.id.startsWith(`${spec.id}-`) || !/^\/models\/[a-zA-Z0-9._-]+\.onnx$/.test(entry.url) || !/^\/models\/[a-zA-Z0-9._-]+\.json$/.test(entry.parityUrl)) throw new Error('Invalid checkpoint paths or game');
  // Legacy Connect Four artifacts predate these fields. Originals require both.
  if ((entry.game ?? 'connect4') !== spec.id || (entry.rulesVersion ?? 'connect4-v1') !== spec.rulesVersion) throw new Error('Checkpoint rules version mismatch');
}
export async function selectedGameModel<S>(spec: ModelSpec<S>, difficulty: string): Promise<ModelEntry | null> {
  const manifest = await resource<Manifest>('/models/manifest.json', true, true);
  if (manifest.schemaVersion !== 1) throw new Error('Invalid model manifest');
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) throw new Error('Invalid difficulty');
  const entry = manifest[spec.id]?.[difficulty as 'Easy' | 'Medium' | 'Hard'];
  if (!entry) return null;
  if (entry.status !== 'promoted') throw new Error('Checkpoint is not promoted');
  validateEntry(entry, spec); return entry;
}
export async function loadGameModel<S extends TurnState>(entry: ModelEntry, spec: ModelSpec<S>) {
  validateEntry(entry, spec);
  const ort = await import('onnxruntime-web/wasm');
  ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = new URL('/ort/', self.location.origin).href;
  const session = await ort.InferenceSession.create(await resource<ArrayBuffer>(entry.url, false), { executionProviders: ['wasm'] });
  async function raw(state: S) {
    const flat = spec.encode(state).flat(2);
    if (flat.length !== spec.shape.reduce((a, b) => a * b, 1) || flat.some(n => !Number.isFinite(n))) throw new Error('Checkpoint input shape mismatch');
    const output = await session.run({ state: new ort.Tensor('float32', Float32Array.from(flat), [1, ...spec.shape]) });
    const policy = output.policy_logits, value = output.value;
    if (!policy || !value || policy.data.length !== spec.actions || value.data.length !== 1) throw new Error('Checkpoint output shape mismatch');
    const logits = Array.from(policy.data, Number), scalar = Number(value.data[0]);
    if (logits.some(n => !Number.isFinite(n)) || !Number.isFinite(scalar) || Math.abs(scalar) > 1.001) throw new Error('Invalid checkpoint output');
    return { logits, value: scalar };
  }
  const cache = new Map<string, Evaluation>();
  const evaluate = async (state: S): Promise<Evaluation> => {
    // Include units, ghosts, timers and the current wave in evaluation identity.
    const key = JSON.stringify(state), cached = cache.get(key);
    if (cached) return cached;
    const output = await raw(state), result = { policy: maskedPolicy(output.logits, spec.legalMoves(state)), value: output.value };
    if (cache.size >= 5000) cache.delete(cache.keys().next().value!);
    cache.set(key, result); return result;
  };
  return { raw, evaluate, release: () => session.release() };
}
export async function validateGameModel<S extends TurnState>(entry: ModelEntry, spec: ModelSpec<S>) {
  const model = await loadGameModel(entry, spec);
  try {
    const fixtures = await resource<{ modelId: string; game?: string; rulesVersion?: string; samples: { state: S; logits: number[]; value: number }[] }>(entry.parityUrl, true);
    if (fixtures.modelId !== entry.id || (fixtures.game ?? 'connect4') !== spec.id || (fixtures.rulesVersion ?? 'connect4-v1') !== spec.rulesVersion || fixtures.samples.length !== 50) throw new Error('Parity fixture checkpoint mismatch');
    let maxError = 0;
    for (const sample of fixtures.samples) {
      if (sample.logits.length !== spec.actions || sample.logits.some(n => !Number.isFinite(n)) || !Number.isFinite(sample.value)) throw new Error('Invalid parity sample');
      const actual = await model.raw(sample.state);
      for (let i = 0; i < spec.actions; i++) maxError = Math.max(maxError, Math.abs(actual.logits[i] - sample.logits[i]));
      maxError = Math.max(maxError, Math.abs(actual.value - sample.value));
    }
    if (!Number.isFinite(maxError) || maxError > 1e-4) throw new Error(`Browser parity failed: ${maxError}`);
    return { modelId: entry.id, game: spec.id, rulesVersion: spec.rulesVersion, states: fixtures.samples.length, maxError, passed: true };
  } finally { await model.release(); }
}
