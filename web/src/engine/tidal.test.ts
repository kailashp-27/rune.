import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadStream,readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import * as game from './tidal';
import {searchTidal} from './tidal-search';

test('Tidal Python/TypeScript legal masks, moves and results agree',async()=>{
  const source=new URL(process.env.RUNE_TIDAL_PARITY_FILE||'../../../parity/tidal.jsonl',import.meta.url);
  let count=0;
  for await(const line of createInterface({input:createReadStream(source),crlfDelay:Infinity})){
    const f=JSON.parse(line);assert.deepEqual(game.legalMoves(f.state).flatMap((ok,a)=>ok?[a]:[]),f.legal_actions);
    assert.deepEqual(game.applyMove(f.state,f.action,f.next_state.wave),f.next_state);assert.deepEqual(game.isTerminal(f.next_state),f.terminal);count++;
  }assert.ok(count>=832);
});
test('Tidal encoding and reflection match Python',()=>{
  const fixtures=JSON.parse(readFileSync(new URL('../../../parity/tidal-symmetry.json',import.meta.url),'utf8'));
  for(const f of fixtures){assert.deepEqual(game.encode(f.state),f.encoded);assert.deepEqual(game.symmetries(f.state,f.policy),f.symmetries.map(([state,policy]:[game.State,number[]])=>({state,policy})));}
});
test('Tidal nudge cannot wrap, use occupied cells or cross flooded endpoints',()=>{
  const state=game.initialState();state.board[5]=1;state.board[6]=-1;state.board[0]=1;
  const mask=game.legalMoves(state);
  for(const a of [25,45,46,48,49,50,51,52])assert.equal(mask[a],false);
  const next=game.applyMove(state,47,7);assert.equal(next.board[5],0);assert.equal(next.board[10],1);assert.equal(state.board[5],1);
  assert.equal(next.turn,1);assert.equal(next.wave,7);
});
test('Tidal reflection preserves every legal transition',()=>{
  const state=game.initialState();state.board[12]=1;state.board[18]=-1;
  const policy=Array.from({length:125},(_,i)=>i),reflected=game.symmetries(state,policy)[1].state;
  assert.deepEqual(Array.from({length:125},(_,a)=>game.flipAction(game.flipAction(a))),policy);
  game.legalMoves(state).forEach((legal,a)=>{assert.equal(legal,game.legalMoves(reflected)[game.flipAction(a)]);if(legal)assert.deepEqual(game.applyMove(reflected,game.flipAction(a),8),game.symmetries(game.applyMove(state,a,6),policy)[1].state);});
});
test('Tidal search wins immediately and obeys legal masks at tiny budgets',()=>{
  const state=game.initialState();state.turn=79;state.board[10]=state.board[11]=state.board[12]=1;
  // The current horizontal wave leaves row 2 dry. Win takes priority over the cap.
  const result=searchTidal(state,3,100);assert.equal(result.action,13);assert.equal(game.isTerminal(game.applyMove(state,result.action,7)).winner,1);
  assert.ok(game.legalMoves(game.initialState())[searchTidal(game.initialState(),5,1).action]);
  assert.throws(()=>game.applyMove(state,1.5,7));assert.throws(()=>game.applyMove(state,125,7));
});

test('Tidal vertical water masks both nudge endpoints and has no hidden future',()=>{
  const state=game.initialState(7);state.board[11]=1;state.board[12]=1;
  assert.equal(game.waveLabel(state),'COLUMN C');
  assert.equal(game.legalMoves(state)[25+11*4+1],false);
  assert.ok(game.legalMoves(state).slice(25+12*4,25+12*4+4).every(ok=>!ok));
  assert.deepEqual(game.chanceOutcomes(state),[0,1,2,3,4,5,6,8,9]);
  assert.throws(()=>game.applyMove(state,6,7));
  assert.equal(game.encode(state)[3][0][0],1);
  const outputs=game.chanceOutcomes(state).map(wave=>game.applyMove(state,6,wave));
  outputs.forEach(next=>assert.deepEqual(next.board,outputs[0].board));
});
