import { genericNeuralSearch, type NeuralRules, type TurnState } from '../engine/generic-neural';
import { loadGameModel, selectedGameModel, validateGameModel, type ModelSpec, type ModelEntry } from '../engine/model-runtime';
import {difficultyAction,seededRandom,type Level} from '../engine/difficulty';
interface Request<S> { id: number; type?: string; state: S; difficulty?: Level; seed?:number; applyDifficulty?:boolean; depth?: number; maxMs?: number; simulations?: number; diagnosticModel?: ModelEntry; model?: ModelEntry }
export function installNeuralWorker<S extends TurnState>(rules: NeuralRules<S>, spec: ModelSpec<S>, fallback: (state: S, depth?: number, maxMs?: number) => object) {
  let loaded: Awaited<ReturnType<typeof loadGameModel<S>>> | null = null, loadedId = '';
  let queue = Promise.resolve();
  async function handle(data: Request<S>) {
    try {
      if (data.type === 'validate') { self.postMessage({ id: data.id, validation: await validateGameModel(data.model!, spec) }); return; }
      let entry: ModelEntry | null = null, fallbackReason: string | undefined;
      const level=data.difficulty??'Medium',random=seededRandom(data.seed);
      try { entry = data.diagnosticModel ?? await selectedGameModel(spec, data.difficulty ?? 'Medium'); }
      catch (error) { fallbackReason = String(error); }
      if (entry) {
        try {
          if (loadedId !== entry.id) {
            await loaded?.release(); loaded = null; loadedId = '';
            loaded = await loadGameModel(entry, spec); loadedId = entry.id;
          }
          const simulations = data.simulations ?? entry.simulations ?? ({ Easy: 25, Medium: 100, Hard: 600 }[data.difficulty ?? 'Medium'] ?? 100);
          const result = await genericNeuralSearch(rules, data.state, loaded!.evaluate, simulations, data.maxMs ?? 1200,random);
          if(!data.diagnosticModel||data.applyDifficulty)result.action=difficultyAction(level,result.action,rules.legalMoves(data.state),result.policy,random);
          self.postMessage({ id: data.id, ...result, engine: 'neural', modelId: entry.id, evaluatedPlayer: data.state.player, evaluatedTurn: data.state.turn }); return;
        } catch (error) { fallbackReason = String(error); }
      }
      const baseline=fallback(data.state,data.depth,data.maxMs) as {action:number};
      if(!data.diagnosticModel||data.applyDifficulty)baseline.action=difficultyAction(level,baseline.action,rules.legalMoves(data.state),undefined,random);
      self.postMessage({ id: data.id, ...baseline, engine: 'heuristic', modelId: null, fallbackReason, evaluatedPlayer: data.state.player, evaluatedTurn: data.state.turn });
    } catch (error) { self.postMessage({ id: data.id, error: String(error) }); }
  }
  self.onmessage = ({ data }: { data: Request<S> }) => { queue = queue.then(() => handle(data)); };
}
