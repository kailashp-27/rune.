import * as rules from '../engine/pulse';
import { searchPulse } from '../engine/pulse-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>(rules, { id: 'pulse', rulesVersion: 'pulse-v0.1', shape: [7, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchPulse);
