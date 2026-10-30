import * as rules from '../engine/mirror';
import { searchMirror } from '../engine/mirror-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>(rules, { id: 'mirror', rulesVersion: rules.RULES_VERSION, shape: [7, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchMirror);
