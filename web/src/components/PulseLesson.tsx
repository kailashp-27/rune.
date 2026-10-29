import {PulseBoard} from './PulseScreen';
import * as rules from '../engine/pulse';

export const pulseSteps=[
  {title:'Light up your side',text:'You are gold. Rune is purple. Your emitters send waves that claim territory. Keep at least one emitter alive.'},
  {title:'Build your network',text:'Choose Build, then tap a glowing square. Build on your own territory or on empty neutral ground touching your territory. Diagonals do not count.'},
  {title:'Watch the countdown',text:'Every action ticks every emitter’s timer down by one. When it fires, the timer resets to three. New emitters charge before their first burst.'},
  {title:'Boost your signal',text:'Choose Boost, then tap your emitter. Its power rises by one and it fires this turn. Power three is the maximum.'},
  {title:'Let the waves spread',text:'Waves travel up, down, left, and right. Each square of distance loses one strength. Brighter cells hold a stronger signal; unused signal fades.'},
  {title:'Win the collision',text:'Waves fire together. Opposing strengths subtract; equal strengths leave neutral ground. Friendly waves use the strongest signal instead of adding up.'},
  {title:'Capture an emitter',text:'A stronger wave can take over an enemy emitter. A tie destroys it. A captured emitter keeps its power and starts a fresh countdown.'},
  {title:'Make the field yours',text:'Wait lets the timers tick without building. Win by removing all enemy emitters, or hold more territory after 120 actions. Equal territory is a draw.'},
];
export function PulseLesson({step}:{step:number}){
  let state=rules.initialState(),actions:number[]=[];
  if(step===1){state=rules.applyMove(state,50);state.player=1;actions=rules.legalMoves(state).flatMap((ok,a)=>ok&&a<25?[a]:[]);}
  if(step===2)state=rules.applyMove(state,50);
  if(step===3){state=rules.applyMove(state,45);state.player=1;actions=[45];}
  if(step===4||step===5||step===6){
    state=rules.initialState();for(const key of ['board','strength','level','cooldown'] as const)state[key]=Array(25).fill(0);
    state.board[10]=1;state.level[10]=3;state.cooldown[10]=1;state.strength[10]=2;
    state.board[14]=-1;state.level[14]=step===4?1:3;state.cooldown[14]=1;state.strength[14]=2;
    if(step===6){state.board[14]=0;state.level[14]=0;state.board[11]=1;state.level[11]=3;state.cooldown[11]=1;state.board[12]=-1;state.level[12]=1;state.cooldown[12]=2;}
    state=rules.step(state);
  }
  return <div className="lesson-scene pulse-lesson-scene"><PulseBoard state={state} actions={actions} illustration/>{step===2&&<span className="pulse-lesson-caption">COUNT DOWN · FIRE · REPEAT</span>}{step===5&&<span className="pulse-lesson-caption">EQUAL WAVES CANCEL</span>}{step===6&&<span className="pulse-lesson-caption">TURN THEIR SIGNAL GOLD</span>}{step===7&&<span className="pulse-lesson-caption">CONTROL MORE OF THE FIELD</span>}</div>;
}
