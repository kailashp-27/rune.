import * as rules from './connect4';
import { loadGameModel, selectedGameModel, validateGameModel, type ModelEntry, type ModelSpec } from './model-runtime';
export type { ModelEntry } from './model-runtime';
const spec: ModelSpec<rules.State> = { id: 'connect4', rulesVersion: 'connect4-v1', shape: [3, 6, 7], actions: 7, ...rules };
export const selectedModel = (difficulty: string) => selectedGameModel(spec, difficulty);
export const loadModel = (entry: ModelEntry) => loadGameModel(entry, spec);
export const validateModel = (entry: ModelEntry) => validateGameModel(entry, spec);
