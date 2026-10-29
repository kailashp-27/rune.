import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genericNeuralSearch, type NeuralRules } from './generic-neural';
import * as pulse from './pulse';
import * as mirror from './mirror';
import * as tidal from './tidal';
import { validateEntry, type ModelSpec } from './model-runtime';

test('generic neural search respects original action spaces, ghosts and legal masks', async () => {
  for (const rules of [pulse, mirror]) {
    // Each rule engine is checked separately; their state types deliberately differ.
    const run = async <S extends {player:1|-1;turn:number}>(game: NeuralRules<S> & {initialState():S}) => {
      const state=game.initialState();const result=await genericNeuralSearch(game,state,async()=>({policy:Array(game.ACTION_SIZE).fill(1),value:0}),32,10000,()=>.7);
      assert.ok(game.legalMoves(state)[result.action]);assert.equal(result.policy.length,game.ACTION_SIZE);
      assert.ok(Math.abs(result.policy.reduce((a,b)=>a+b,0)-1)<1e-10);
      result.policy.forEach((p,a)=>{if(!game.legalMoves(state)[a])assert.equal(p,0);});
    };
    if(rules===pulse)await run(pulse);else await run(mirror);
  }
});
test('chance search samples both wave orientations independently of the chosen move', async () => {
  const seen=new Set<number>();let count=0;
  const rules={...tidal,applyMove:(s:tidal.State,a:number,w?:number)=>tidal.applyMove(s,a,w!)};
  await genericNeuralSearch(rules,tidal.initialState(0),async s=>{seen.add(s.wave);return{policy:Array(125).fill(1),value:0};},250,10000,()=>((count++*37)%101)/101);
  assert.ok([...seen].some(w=>w>0&&w<5));assert.ok([...seen].some(w=>w>=5));
});
test('chance backup optimizes expected outcome rather than a favorable wave', async () => {
  type State={player:1|-1;turn:number;action?:number;outcome?:number};
  const rules:NeuralRules<State>={ACTION_SIZE:2,legalMoves:s=>s.turn===0?[true,true]:[false,false],chanceOutcomes:()=>[0,1],applyMove:(s,a,outcome)=>({player:-1,turn:s.turn+1,action:a,outcome}),isTerminal:s=>({done:s.turn>0,winner:s.turn===0?0:s.action===0?0:s.outcome===0?1:-1})};
  const result=await genericNeuralSearch(rules,{player:1,turn:0},async()=>({policy:[.5,.5],value:0}),500,10000,()=>.9);
  assert.equal(result.action,0);
});
test('model contracts reject obsolete tidal rules even with matching dimensions', () => {
  const spec:ModelSpec<tidal.State>={id:'tidal',rulesVersion:'tidal-v0.2',shape:[6,5,5],actions:125,...tidal};
  const entry={id:'tidal-test',url:'/models/tidal-test.onnx',parityUrl:'/models/tidal-test.json',status:'candidate' as const,game:'tidal' as const,rulesVersion:'tidal-v0.2'};
  assert.doesNotThrow(()=>validateEntry(entry,spec));
  assert.throws(()=>validateEntry({...entry,rulesVersion:'tidal-v0.1'},spec));
  assert.throws(()=>validateEntry({...entry,url:'https://other/model.onnx'},spec));
});
