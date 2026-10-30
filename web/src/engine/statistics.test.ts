import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readStatistics,recordResult} from './statistics';
function memory(){const map=new Map<string,string>();return{getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);}};}
test('statistics count completed outcomes, reset streaks on draws and losses, and retain the best streak',()=>{
  const storage=memory();
  for(const [i,winner] of [1,1,0,1,-1].entries())recordResult('connect','human',String(i),winner,storage);
  assert.deepEqual(readStatistics('connect','human',storage),{wins:3,losses:1,draws:1,currentStreak:0,bestStreak:2});
});
test('replayed completion effects do not count a match twice, including after a storage reload',()=>{
  const storage=memory();
  recordResult('pulse','human','same-match',1,storage);
  recordResult('pulse','human','same-match',1,storage);
  assert.equal(readStatistics('pulse','human',storage).wins,1);
  recordResult('pulse','human','rematch',1,storage);
  assert.equal(readStatistics('pulse','human',storage).currentStreak,2);
});
test('games and friend results have separate statistics',()=>{
  const storage=memory();
  recordResult('terraform','friend','friend-match',-1,storage);
  assert.equal(readStatistics('terraform','friend',storage).losses,1);
  assert.equal(readStatistics('terraform','human',storage).losses,0);
  assert.equal(readStatistics('mirror','friend',storage).losses,0);
});
test('invalid saved statistics recover safely',()=>{
  const storage=memory();
  storage.setItem('rune.v1.statistics.tidal.human','{"wins":-2}');
  assert.deepEqual(readStatistics('tidal','human',storage),{wins:0,losses:0,draws:0,currentStreak:0,bestStreak:0});
});
test('blocked persistent storage still keeps accurate session statistics',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw new Error('Storage blocked');}};
  recordResult('fortress','friend','blocked-1',1,storage);
  recordResult('fortress','friend','blocked-2',1,storage);
  assert.equal(readStatistics('fortress','friend',storage).wins,2);
});
