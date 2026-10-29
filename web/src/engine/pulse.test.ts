import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadStream,readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import * as game from './pulse';
import {searchPulse} from './pulse-search';

test('Pulse Python/TypeScript masks, simulation and terminal parity',async()=>{
  const source=new URL(process.env.RUNE_PULSE_PARITY_FILE||'../../../parity/pulse.jsonl',import.meta.url);let count=0;
  for await(const line of createInterface({input:createReadStream(source),crlfDelay:Infinity})){
    const f=JSON.parse(line);assert.deepEqual(game.legalMoves(f.state).flatMap((ok,a)=>ok?[a]:[]),f.legal_actions);assert.deepEqual(game.applyMove(f.state,f.action),f.next_state);assert.deepEqual(game.isTerminal(f.next_state),f.terminal);count++;
  }assert.ok(count>100);
});
test('Pulse Python/TypeScript encoding and all eight symmetries agree',()=>{
  const fixtures=JSON.parse(readFileSync(new URL('../../../parity/pulse-symmetry.json',import.meta.url),'utf8'));
  for(const f of fixtures){assert.deepEqual(game.encode(f.state),f.encoded);assert.deepEqual(game.symmetries(f.state,f.policy),f.symmetries.map(([state,policy]:[game.State,number[]])=>({state,policy})));}
});
test('Pulse build and boost are immutable; cooldowns and bursts resolve together',()=>{
  const state=game.initialState(),original=game.initialState();
  assert.deepEqual(game.legalMoves(state).flatMap((ok,a)=>ok?[a]:[]),[15,21,45,50]);
  const built=game.applyMove(state,15);assert.deepEqual(state,original);assert.equal(built.cooldown[15],1);assert.equal(built.bursts[20],2);assert.equal(built.bursts[4],-2);
  const boosted=game.applyMove(state,45);assert.equal(boosted.level[20],2);assert.equal(boosted.bursts[20],3);assert.equal(boosted.cooldown[20],3);
  assert.throws(()=>game.applyMove(state,12));assert.throws(()=>game.applyMove(state,1.5));assert.throws(()=>game.applyMove(state,51));
});
test('Pulse waves cancel, capture and fire from the original owner before capture',()=>{
  const state=game.initialState();for(const key of ['board','strength','level','cooldown'] as const)state[key]=Array(25).fill(0);
  state.board[11]=1;state.level[11]=3;state.cooldown[11]=1;state.strength[11]=2;
  state.board[12]=-1;state.level[12]=1;state.cooldown[12]=1;state.strength[12]=2;
  const captured=game.step(state);assert.equal(captured.board[12],1);assert.equal(captured.level[12],1);assert.equal(captured.bursts[12],-2);assert.equal(captured.cooldown[12],3);
  state.level[11]=2;const neutral=game.step(state);assert.equal(neutral.board[12],0);assert.equal(neutral.level[12],0);
  const win=searchPulse(state,2,100);assert.equal(game.isTerminal(game.applyMove(state,win.action)).winner,1);
});
test('Pulse search stays legal with tiny budgets and terminal cap stops play',()=>{
  const state=game.initialState();assert.ok(game.legalMoves(state)[searchPulse(state,5,1).action]);
  state.turn=120;assert.deepEqual(game.isTerminal(state),{done:true,winner:0});assert.ok(game.legalMoves(state).every(ok=>!ok));
});
