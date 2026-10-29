import { search } from '../engine/search';
import { loadModel, selectedModel, validateModel, type ModelEntry } from '../engine/models';
import { neuralSearch } from '../engine/neural-search';
let loaded: Awaited<ReturnType<typeof loadModel>> | null = null;
let loadedId = '';
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'validate') {
      self.postMessage({ id: data.id, validation: await validateModel(data.model) });
      return;
    }
    let entry: ModelEntry | null = null, fallbackReason: string | undefined;
    try { entry = data.diagnosticModel ?? await selectedModel(data.difficulty || 'Medium'); }
    catch (error) { fallbackReason = String(error); }
    if (entry) {
      try {
        if (loadedId !== entry.id) {
          await loaded?.release(); loaded = null; loadedId = '';
          loaded = await loadModel(entry); loadedId = entry.id;
        }
        const result = await neuralSearch(data.state, data.simulations, loaded!.evaluate);
        self.postMessage({ id: data.id, ...result, engine: 'neural', modelId: entry.id });
        return;
      } catch (error) { fallbackReason = String(error); }
    }
    self.postMessage({ id: data.id, ...search(data.state, data.simulations), engine: 'rollout', modelId: null, fallbackReason });
  } catch (error) { self.postMessage({ id: data.id, error: String(error) }); }
};
