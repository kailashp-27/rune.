import * as rules from '../engine/fortress';
import { searchFortress } from '../engine/fortress-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>(rules, { id: 'fortress', rulesVersion: 'fortress-v0.1', shape: [6, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchFortress);
