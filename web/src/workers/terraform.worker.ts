import * as rules from '../engine/terraform';
import { searchTerraform } from '../engine/terraform-search';
import { installNeuralWorker } from './neural-worker';
installNeuralWorker<rules.State>(rules, { id: 'terraform', rulesVersion: 'terraform-v0.1', shape: [8, 5, 5], actions: rules.ACTION_SIZE, ...rules }, searchTerraform);
