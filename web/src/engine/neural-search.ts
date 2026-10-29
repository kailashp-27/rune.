import { applyMove, isTerminal, legalMoves, type State } from './connect4';

export interface Evaluation { policy: number[]; value: number }
export type Evaluator = (state: State) => Promise<Evaluation>;
interface Node { state: State; prior: number; visits: number; value: number; children: Map<number, Node> }
const create = (state: State, prior = 1): Node => ({ state, prior, visits: 0, value: 0, children: new Map() });

export function maskedPolicy(logits: ArrayLike<number>, mask: boolean[]): number[] {
  if (logits.length !== mask.length || Array.from(logits).some(n => !Number.isFinite(n))) throw new Error('Invalid model policy');
  const maximum = Math.max(...Array.from(logits).filter((_, i) => mask[i]));
  const weights = Array.from(logits, (value, i) => mask[i] ? Math.exp(value - maximum) : 0);
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map(value => total ? value / total : 0);
}

/** Node values are relative to the node's side to move, including neural leaf values. */
export async function neuralSearch(state: State, simulations: number, evaluate: Evaluator, maxMs = 2000) {
  const started = performance.now();
  const result = isTerminal(state);
  if (result.done) return { action: -1, policy: Array(7).fill(0), value: result.winner * state.player, simulations: 0, elapsedMs: 0 };
  const root = create(state);
  let completed = 0;
  for (let sim = 0; sim < simulations; sim++) {
    if (sim > 1 && performance.now() - started >= maxMs) break;
    let node = root;
    const path = [node];
    while (node.children.size && !isTerminal(node.state).done) {
      let best = -Infinity, next = node;
      for (const child of node.children.values()) {
        const score = -child.value / Math.max(1, child.visits) + 1.5 * child.prior * Math.sqrt(node.visits + 1) / (1 + child.visits);
        if (score > best) { best = score; next = child; }
      }
      node = next; path.push(node);
    }
    const terminal = isTerminal(node.state);
    let value = terminal.winner * node.state.player;
    if (!terminal.done) {
      const evaluation = await evaluate(node.state);
      if (!Number.isFinite(evaluation.value) || Math.abs(evaluation.value) > 1.001 || evaluation.policy.length !== 7 || evaluation.policy.some(n => !Number.isFinite(n) || n < 0)) throw new Error('Invalid model evaluation');
      value = evaluation.value;
      const mask = legalMoves(node.state);
      const total = evaluation.policy.reduce((sum, p, a) => sum + (mask[a] ? p : 0), 0);
      const count = mask.filter(Boolean).length;
      mask.forEach((legal, a) => { if (legal) node.children.set(a, create(applyMove(node.state, a), total ? evaluation.policy[a] / total : 1 / count)); });
    }
    for (let i = path.length - 1; i >= 0; i--) { path[i].visits++; path[i].value += value; value = -value; }
    completed++;
  }
  const visits = Array.from({ length: 7 }, (_, a) => root.children.get(a)?.visits ?? 0);
  const total = visits.reduce((a, b) => a + b, 0);
  const legal = legalMoves(state).flatMap((ok, a) => ok ? [a] : []);
  const win = legal.find(a => isTerminal(applyMove(state, a)).winner === state.player);
  const safe = legal.filter(a => { const next = applyMove(state, a); return !legalMoves(next).some((ok, b) => ok && isTerminal(applyMove(next, b)).winner === next.player); });
  const candidates = safe.length ? safe : legal;
  const action = win ?? candidates.reduce((best, a) => visits[a] > visits[best] ? a : best, candidates[0]);
  return { action, policy: visits.map(n => total ? n / total : 0), value: root.value / Math.max(1, root.visits), simulations: completed, elapsedMs: performance.now() - started };
}
