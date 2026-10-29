import * as rules from '../engine/tidal';
import { searchTidal } from '../engine/tidal-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>({...rules, applyMove: (s: rules.State, a: number, outcome?: number) => rules.applyMove(s, a, outcome!)}, { id: 'tidal', rulesVersion: 'tidal-v0.2', shape: [6, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchTidal);
