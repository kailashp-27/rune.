import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, initialState, legalMoves } from './connect4';
import { maskedPolicy, neuralSearch } from './neural-search';
const uniform = async () => ({ policy: Array(7).fill(1 / 7), value: 0 });
test('masked softmax is stable and never gives mass to illegal actions', () => {
  const policy = maskedPolicy([10000, 10001, 9999], [true, false, true]);
  assert.equal(policy[1], 0); assert.ok(Math.abs(policy.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  assert.deepEqual(maskedPolicy([1, 2], [false, false]), [0, 0]);
  assert.throws(() => maskedPolicy([NaN], [true]));
});
test('neural search negates child values during parent selection', async () => {
  const state = initialState();
  const result = await neuralSearch(state, 100, async s => ({ policy: Array(7).fill(1 / 7), value: s.board[38] === 1 ? -1 : 1 }));
  assert.equal(result.action, 3);
});
test('neural search enforces tactical wins and legal distributions', async () => {
  let state = initialState(); for (const a of [0, 1, 0, 1, 0, 2]) state = applyMove(state, a);
  const result = await neuralSearch(state, 50, uniform);
  assert.equal(result.action, 0); assert.ok(legalMoves(state)[result.action]);
  assert.ok(Math.abs(result.policy.reduce((a, b) => a + b, 0) - 1) < 1e-10);
});
test('terminal states never call the network and invalid outputs fail', async () => {
  let state = initialState(); for (const a of [0, 1, 0, 1, 0, 1, 0]) state = applyMove(state, a);
  assert.equal((await neuralSearch(state, 10, async () => { throw new Error('must not run'); })).action, -1);
  await assert.rejects(neuralSearch(initialState(), 10, async () => ({ policy: [1], value: NaN })));
});
