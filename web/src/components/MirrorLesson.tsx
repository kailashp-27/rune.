import {FortressBoard} from './FortressScreen';
import * as rules from '../engine/mirror';
export const mirrorSteps=[
  {title:'Every move leaves an echo',text:'You command gold rooks. Rune commands purple. Each rook you move leaves a ghost on its old square.'},
  {title:'Slide your solid rook',text:'Tap a solid gold rook, then a glowing square. Move straight up, down, left, or right. You cannot jump over rooks or ghosts.'},
  {title:'Leave a temporary shield',text:'Your ghost blocks that square during Rune’s reply. It cannot move, be captured, or count as one of your surviving rooks.'},
  {title:'Watch the ghost fade',text:'The old ghost stays while the reply and its captures resolve. Then it disappears, and the replying rook leaves its own new ghost.'},
  {title:'Close a real sandwich',text:'Trap a continuous line of enemy rooks between your moved rook and another solid gold rook to capture the whole line.'},
  {title:'Ghosts break captures',text:'Either colour of ghost breaks a capture line. A friendly ghost cannot close a sandwich, and an enemy ghost cannot be captured.'},
  {title:'Leave the edge before it seals',text:'After 24 moves, the outer edge closes. Rooks left on the edge are lost. Move into the inner nine squares before the countdown runs out.'},
  {title:'Win the siege',text:'Capture every enemy rook to win. No legal move means a loss. After 60 moves, more solid rooks wins; equal armies draw. Ghosts never count.'},
];
export function MirrorLesson({step}:{step:number}){
  let state=rules.initialState();let selected=-1,sources:number[]=[],targets:number[]=[];
  if(step===1){selected=21;sources=[21];targets=rules.legalMoves(state).flatMap((ok,a)=>ok&&Math.floor(a/25)===21?[a%25]:[]);}
  if(step===2||step===3||step===6){state=rules.applyMove(state,21*25+11);if(step===3)state=rules.applyMove(state,1*25+6);}
  if(step===4||step===5){state.board=Array(25).fill(0);state.board[10]=1;state.board[12]=-1;state.board[13]=1;state.board[4]=-1;selected=10;sources=[10];targets=[11];if(step===5){state.board[13]=0;state.ghosts[13]=1;state.ghostTimers[13]=1;}}
  return <div className="lesson-scene fortress-lesson-scene mirror-lesson-scene"><FortressBoard blocked={step===6?[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]:[]} center={false} ghosts={state.ghosts} state={state} selected={selected} sources={sources} targets={targets} illustration/>{step===2&&<span className="fortress-lesson-caption">ONE REPLY · THEN FADE</span>}{step===3&&<span className="fortress-lesson-caption">OLD ECHO OUT · NEW ECHO IN</span>}{step===5&&<span className="fortress-lesson-caption">GHOSTS ARE NOT BACKSTOPS</span>}</div>;
}
