import * as rules from '../engine/mirror';
import { searchMirror } from '../engine/mirror-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>(rules, { id: 'mirror', rulesVersion: 'mirror-v0.1', shape: [6, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchMirror);
