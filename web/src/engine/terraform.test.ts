import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadStream,readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {initialState,applyMove,isTerminal,legalMoves,encode,symmetries,transformAction,type State} from './terraform';
import {searchTerraform} from './terraform-search';

test('Terraform Python/TypeScript transition and full-mask parity',async()=>{
  const source=new URL(process.env.RUNE_TERRAFORM_PARITY_FILE||'../../../parity/terraform.jsonl',import.meta.url);
  for await(const line of createInterface({input:createReadStream(source),crlfDelay:Infinity})){
    const fixture=JSON.parse(line);
    assert.deepEqual(legalMoves(fixture.state).flatMap((ok,a)=>ok?[a]:[]),fixture.legal_actions);
    assert.deepEqual(applyMove(fixture.state,fixture.action),fixture.next_state);
    assert.deepEqual(isTerminal(fixture.next_state),fixture.terminal);
  }
});
test('Terraform Python/TypeScript encoding and symmetry policy parity',()=>{
  const fixtures=JSON.parse(readFileSync(new URL('../../../parity/terraform-symmetry.json',import.meta.url),'utf8'));
  for(const f of fixtures){assert.deepEqual(encode(f.state),f.encoded);assert.deepEqual(symmetries(f.state,f.policy),f.symmetries.map(([state,policy]:[State,number[]])=>({state,policy})));}
});
test('Terraform forbids occupied terrain edits and steep climbs, and detects wins',()=>{
  const s:State={board:Array(25).fill(0),units:[12,4],player:1,turn:0};s.board[12]=2;s.board[7]=3;
  assert.equal(isTerminal(applyMove(s,12*8+1)).winner,1);
  assert.throws(()=>applyMove(s,212));assert.throws(()=>applyMove(s,1.5));
  s.board[12]=0;assert.equal(legalMoves(s)[12*8+1],false);
});
test('Terraform swap is offered only after the opening and preserves terrain',()=>{
  const opening=applyMove(initialState(),20*8+2),swapped=applyMove(opening,250);
  assert.deepEqual(swapped.units,[4,16]);assert.deepEqual(swapped.board,opening.board);
  assert.equal(swapped.player,1);assert.equal(legalMoves(swapped)[250],false);
  assert.equal(transformAction(250,7),250);
});
test('Terraform transformations commute with legal moves',()=>{
  const s=initialState(),policy=Array.from({length:251},(_,i)=>i);
  for(const a of legalMoves(s).flatMap((ok,i)=>ok?[i]:[]))for(let t=0;t<8;t++){
    const transformed=symmetries(s,policy)[t].state;
    assert.deepEqual(applyMove(transformed,transformAction(a,t)),symmetries(applyMove(s,a),policy)[t].state);
  }
});
test('Terraform search selects a winning move and only returns legal actions',()=>{
  const s:State={board:Array(25).fill(0),units:[12,4],player:1,turn:0};s.board[12]=2;s.board[7]=3;
  const won=searchTerraform(s,2,200);assert.equal(won.action,12*8+1);
  const result=searchTerraform(initialState(),2,200);assert.ok(legalMoves(initialState())[result.action]);
});
