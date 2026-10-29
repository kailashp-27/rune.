import type { Terminal } from './game';

export interface TurnState { player: 1 | -1; turn: number }
export interface Evaluation { policy: number[]; value: number }
export interface NeuralRules<S extends TurnState> {
  ACTION_SIZE: number;
  legalMoves(state: S): boolean[];
  isTerminal(state: S): Terminal;
  /** Chance games must receive an explicit sampled outcome. */
  applyMove(state: S, action: number, outcome?: number): S;
  chanceOutcomes?(state: S): number[];
}
interface Node<S> { state: S; visits: number; value: number; children: Map<number, Edge<S>> }
interface Edge<S> { prior: number; visits: number; value: number; outcomes: Map<number, Node<S>> }
const node = <S>(state: S): Node<S> => ({ state, visits: 0, value: 0, children: new Map() });

/** Action values belong to the actor; outcome nodes belong to their side to move.
 * Chance is sampled independently on every traversal, never supplied by the UI.
 * Transitions are lazy so large action spaces don't copy every child at expansion.
 */
export async function genericNeuralSearch<S extends TurnState>(
  rules: NeuralRules<S>, state: S, evaluate: (state: S) => Promise<Evaluation>,
  simulations = 100, maxMs = 1200, random = Math.random,
) {
  if (!Number.isInteger(simulations) || simulations < 2 || !Number.isFinite(maxMs) || maxMs <= 0) throw new Error('Invalid neural search budget');
  const started = performance.now(), root = node(state), terminal = rules.isTerminal(state);
  let completed = 0;
  if (terminal.done) return { action: -1, policy: Array<number>(rules.ACTION_SIZE).fill(0), value: terminal.winner * state.player, simulations: 0, nodes: 0, elapsedMs: 0, candidates: [] };
  for (; completed < simulations; completed++) {
    if (completed >= 2 && performance.now() - started >= maxMs) break;
    let current = root;
    const path = [current], edges: { edge: Edge<S>; player: number }[] = [];
    while (current.children.size && !rules.isTerminal(current.state).done) {
      let best = -Infinity, selected = -1, ties = 0;
      for (const [action, edge] of current.children) {
        const score = edge.value / Math.max(1, edge.visits) + 1.5 * edge.prior * Math.sqrt(current.visits + 1) / (1 + edge.visits);
        if (score > best) { best = score; selected = action; ties = 1; }
        else if (score === best && random() < 1 / ++ties) selected = action;
      }
      const edge = current.children.get(selected)!;
      const outcomes = rules.chanceOutcomes?.(current.state);
      const outcome = outcomes ? outcomes[Math.min(outcomes.length - 1, Math.floor(random() * outcomes.length))] : -1;
      let next = edge.outcomes.get(outcome);
      if (!next) { next = node(rules.applyMove(current.state, selected, outcomes ? outcome : undefined)); edge.outcomes.set(outcome, next); }
      edges.push({ edge, player: current.state.player }); current = next; path.push(current);
    }
    const end = rules.isTerminal(current.state);
    let value = end.winner * current.state.player;
    if (!end.done) {
      const evaluation = await evaluate(current.state);
      if (!Number.isFinite(evaluation.value) || Math.abs(evaluation.value) > 1.001 || evaluation.policy.length !== rules.ACTION_SIZE || evaluation.policy.some(n => !Number.isFinite(n) || n < 0)) throw new Error('Invalid model evaluation');
      value = evaluation.value;
      const mask = rules.legalMoves(current.state), actions = mask.flatMap((ok, a) => ok ? [a] : []);
      const total = actions.reduce((sum, a) => sum + evaluation.policy[a], 0);
      for (const action of actions) current.children.set(action, { prior: total ? evaluation.policy[action] / total : 1 / actions.length, visits: 0, value: 0, outcomes: new Map() });
    }
    const absolute = value * current.state.player;
    for (const ancestor of path) { ancestor.visits++; ancestor.value += absolute * ancestor.state.player; }
    for (const { edge, player } of edges) { edge.visits++; edge.value += absolute * player; }
  }
  const visits = Array.from({ length: rules.ACTION_SIZE }, (_, a) => root.children.get(a)?.visits ?? 0);
  const total = visits.reduce((a, b) => a + b, 0);
  const policy = visits.map((v, a) => total ? v / total : root.children.get(a)?.prior ?? 0);
  const candidates = [...root.children].map(([action, edge]) => ({ action, score: edge.value / Math.max(1, edge.visits), probability: policy[action], visits: edge.visits })).sort((a, b) => b.visits - a.visits || b.probability - a.probability);
  return { action: candidates[0].action, policy, value: root.value / Math.max(1, root.visits), simulations: completed, nodes: completed, elapsedMs: performance.now() - started, candidates: candidates.slice(0, 3) };
}
