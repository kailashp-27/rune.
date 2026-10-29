import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,applyMove,isTerminal,legalMoves,encode,symmetries,type State} from './connect4';
import {search} from './search';
test('Python/TypeScript parity for every generated transition',()=>{
 const fixtures=JSON.parse(readFileSync(new URL(process.env.RUNE_PARITY_FILE || '../../../parity/connect4.json',import.meta.url),'utf8'));
 for(const f of fixtures){assert.deepEqual(legalMoves(f.state),f.legal_mask);assert.deepEqual(applyMove(f.state,f.action),f.next_state);assert.deepEqual(isTerminal(f.next_state),f.terminal);}
});
const play=(moves:number[])=>moves.reduce((s,a)=>applyMove(s,a),initialState());
test('wins stop play and illegal moves are rejected',()=>{const s=play([0,1,0,1,0,1,0]);assert.equal(isTerminal(s).winner,1);assert.ok(legalMoves(s).every(x=>!x));assert.throws(()=>applyMove(s,2));for(const a of [-1,7,1.5])assert.throws(()=>applyMove(initialState(),a));});
test('immutable moves and current-player encoding',()=>{const s=initialState();const next=applyMove(s,0);assert.equal(s.turn,0);assert.equal(encode(next)[1][5][0],1);assert.equal(symmetries(next,[0,1,2,3,4,5,6])[1].state.board[41],1);});
test('search takes immediate wins and blocks immediate losses',()=>{assert.equal(search(play([0,1,0,1,0,2]),40).action,0);assert.equal(search(play([0,1,0,1,0]),40).action,0);});
test('search distribution is legal and finite',()=>{const s=play([0,0,0,0,0,0]);const result=search(s,50);assert.equal(result.policy[0],0);assert.ok(legalMoves(s)[result.action]);assert.ok(Math.abs(result.policy.reduce((a,b)=>a+b,0)-1)<1e-9);assert.ok(Number.isFinite(result.value));});
