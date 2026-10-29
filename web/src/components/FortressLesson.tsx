import {FortressBoard} from './FortressScreen';
import * as rules from '../engine/fortress';
export const fortressSteps=[
  {title:'Command your rooks',text:'You play gold. Rune plays purple. Each side starts with four rooks. Take turns moving one rook.'},
  {title:'Slide in straight lines',text:'Tap your rook, then a glowing destination. Slide any distance up, down, left, or right. You cannot jump over pieces or move diagonally.'},
  {title:'Close the sandwich',text:'Finish a move so enemy rooks lie between your moved rook and another gold rook. Capture the whole unbroken line.'},
  {title:'Watch every direction',text:'One move can capture in several directions at once. Empty squares, the center, and board edges cannot complete a sandwich.'},
  {title:'Claim the fortress',text:'The marked center is another path to victory. Finish your turn with a gold rook there to earn your first hold mark.'},
  {title:'Hold through your turns',text:'Keep the center through three of your own turn endings to win. Move another rook while your center rook stays. Rune’s turns do not add marks.'},
  {title:'Keep your hold alive',text:'Leaving the center or losing its rook clears your hold marks. Watch for a sandwich capture before your next turn.'},
  {title:'Win the siege',text:'Win by capturing every enemy rook or completing your center hold. After 100 actions, more rooks wins; equal armies draw. No legal move means a loss.'},
];
export function FortressLesson({step}:{step:number}){
  const state=rules.initialState();let selected=-1,targets:number[]=[],sources:number[]=[];
  if(step===1){selected=21;sources=[21];targets=rules.legalMoves(state).flatMap((ok,a)=>ok&&Math.floor(a/25)===21?[a%25]:[]);}
  if(step===2||step===3){state.board=Array(25).fill(0);state.board[10]=1;state.board[12]=-1;state.board[13]=1;state.board[4]=-1;selected=10;sources=[10];targets=[11];if(step===3){state.board[7]=-1;state.board[2]=1;targets=[12];state.board[12]=0;state.board[13]=-1;state.board[14]=1;state.board[17]=-1;state.board[22]=1;}}
  if(step>=4&&step<=6){state.board[21]=0;state.board[12]=1;state.hold=[step===4?1:step===5?2:0,0];if(step===6){state.board[12]=0;state.board[13]=1;}}
  return <div className="lesson-scene fortress-lesson-scene"><FortressBoard state={state} selected={selected} sources={sources} targets={targets} illustration/>{step>=4&&step<=6&&<span className="fortress-lesson-caption">{step===4?'CENTER HOLD · 1 / 3':step===5?'TWO MARKS · KEEP HOLDING':'LEAVING RESETS THE HOLD'}</span>}</div>;
}
