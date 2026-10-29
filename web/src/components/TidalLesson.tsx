import {TidalBoard} from './TidalScreen';
import * as rules from '../engine/tidal';

export const tidalSteps=[
  {title:'Meet the shore',text:'You play gold. Rune plays purple. Make a line of four across, down, or diagonally to win.'},
  {title:'Place on dry ground',text:'Choose Place, then tap a glowing empty square. You add one stone per turn.'},
  {title:'Watch the water',text:'The blue row or column is locked. You cannot place there or move stones into or out of it. Stones in water still count in a line.'},
  {title:'Expect a surprise',text:'After each action, a new row or column is chosen at random. There is no fixed order and no preview. Both players face the same chance.'},
  {title:'Give a stone a nudge',text:'Choose Nudge, tap one of your glowing stones, then tap an empty neighbour. Move one square up, down, left, or right.'},
  {title:'Keep both ends dry',text:'A nudge uses your whole turn. Both squares must be dry. You cannot jump, push, move diagonally, or move a purple stone.'},
  {title:'Connect your four',text:'Join four gold stones to win, even if part of your line is underwater. Keep an eye on Rune’s lines too.'},
  {title:'Make each turn count',text:'No legal action means a loss. Otherwise a match is a draw after 80 actions, unless the last action makes a winning line.'},
];
export function TidalLesson({step}:{step:number}){
  const state=rules.initialState();let targets:number[]=[],sources:number[]=[],selected=-1;
  state.board[12]=1;state.board[18]=-1;
  if(step===1)targets=[6,7,8,11,13,16,17];
  if(step===2){state.board[2]=1;state.board[3]=-1;}
  if(step===3)state.wave=7;
  if(step===4){sources=[12];selected=12;targets=[7,11,13,17];}
  if(step===5){state.wave=7;state.board[12]=0;state.board[16]=1;sources=[16];selected=16;targets=[11,15,21];}
  if(step===6){state.board=Array(25).fill(0);[0,6,12,18].forEach(c=>{state.board[c]=1;});}
  return <div className="lesson-scene tidal-lesson-scene"><TidalBoard state={state} targets={targets} sources={sources} selected={selected} illustration/>{step===3&&<span className="tidal-lesson-caption">ROWS ↔ COLUMNS</span>}{step===6&&<span className="tidal-lesson-caption">FOUR IN A ROW ★</span>}{step===7&&<span className="tidal-lesson-caption">80 ACTIONS</span>}</div>;
}
