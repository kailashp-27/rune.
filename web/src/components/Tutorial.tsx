import { useState } from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Hand, ArrowDown } from 'lucide-react';
import { Dialog } from './Dialog';
import {TerrainBoard} from './TerraformScreen';
import * as terraform from '../engine/terraform';
import {TidalLesson,tidalSteps} from './TidalLesson';
import {PulseLesson,pulseSteps} from './PulseLesson';
import {FortressLesson,fortressSteps} from './FortressLesson';
import {MirrorLesson,mirrorSteps} from './MirrorLesson';
import type {Mode} from '../data';

const steps = [
  { title: 'Pick a column', text: 'Tap any open column to drop your gold piece into the board.' },
  { title: 'Let it drop', text: 'Your piece falls to the lowest empty space. Stack your next move on top.' },
  { title: 'Take turns', text: 'You play gold. Rune plays purple. You each drop one piece at a time.' },
  { title: 'Make your four', text: 'Connect four of your pieces across, down, or diagonally to win.' },
  { title: 'Keep an eye on Rune', text: 'Block their line before it reaches four. A full board with no winner is a draw.' },
];
const terrainSteps=[
  {title:'Meet your climber',text:'You are gold. Rune is purple. Take turns choosing one action.'},
  {title:'Keep the opening fair',text:'After the first action, the second player may swap climbers instead. Your climber is still your colour.'},
  {title:'Make your move',text:'Choose Move, then tap a glowing neighbour. Diagonal moves count too.'},
  {title:'One height at a time',text:'Climb up by one height. You can step down by any amount.'},
  {title:'Raise the ground',text:'Choose Raise to add one height to an empty neighbouring cell. Three is the maximum.'},
  {title:'Bring it down',text:'Choose Lower to remove one height nearby. You cannot edit a cell with a unit on it.'},
  {title:'Reach the summit',text:'Move onto height three to win. Raising and moving are separate turns.'},
  {title:'Keep it moving',text:'A match ends in a draw after 80 turns unless someone reaches the summit first.'},
];

function TerrainLesson({step}:{step:number}){
  if(step===1){const state=terraform.applyMove(terraform.applyMove(terraform.initialState(),20*8+2),250);return <div className="lesson-scene terrain-lesson-scene"><TerrainBoard state={state} illustration/><span className="terrain-turn-badge">SWAP CLIMBERS ⇄</span></div>;}
  if(step>1)step--;
  const state=terraform.initialState();let kind:terraform.ActionKind='move',cell=-1;
  if(step===1){state.units=[16,4];cell=11;}
  if(step===2){state.units=[11,13];cell=12;}
  if(step===3){state.units=[12,4];state.board[13]=2;kind='raise';cell=13;}
  if(step===4){state.units=[12,4];state.board[7]=3;kind='lower';cell=7;}
  if(step===5){state.units=[12,4];state.board[13]=3;cell=13;}
  const actions=terraform.legalMoves(state).flatMap((ok,a)=>ok&&terraform.actionKind(a)===kind&&(cell<0||terraform.destination(state,a)===cell)?[a]:[]);
  return <div className="lesson-scene terrain-lesson-scene"><TerrainBoard state={state} kind={kind} activeActions={step===0||step===6?[]:actions} illustration/>{step===6&&<span className="terrain-turn-badge">80 TURNS</span>}{step===5&&<span className="terrain-goal-badge">REACH 3 ★</span>}</div>;
}

function LessonBoard({ step,mode }: { step: number;mode:Mode }) {
  const gold = step === 0 ? [37] : step === 1 ? [37, 30] : step === 2 ? [37, 31] : step === 3 ? [35, 36, 37, 38] : [35, 28];
  const purple = step < 2 ? [] : step === 2 ? [38, 36] : step === 3 ? [39, 40, 31] : [36, 37, 38];
  return <div className={`lesson-scene lesson-${step}`} aria-hidden="true">
    {step < 2 && <div className="lesson-drop"><span className="lesson-token gold" /><ArrowDown strokeWidth={4} /></div>}
    <div className="lesson-board">{Array.from({ length: 42 }, (_, i) => <span key={i} className={`lesson-hole ${gold.includes(i) ? 'gold' : purple.includes(i) ? 'purple' : ''} ${step === 3 && gold.includes(i) ? 'lesson-win' : ''} ${step === 4 && i === 39 ? 'lesson-block' : ''}`} />)}</div>
    {step === 0 && <Hand className="lesson-hand" fill="#fff0d9" stroke="#3f374b" strokeWidth={2} size={60} />}
    {step === 2 && <div className="lesson-players"><span><i className="gold" />{mode==='friend'?'GOLD':'YOU'}</span><span><i className="purple" />{mode==='friend'?'PURPLE':'RUNE'}</span></div>}
    {step === 3 && <div className="win-directions"><span>↔</span><span>↕</span><span>⤢</span></div>}
    {step === 4 && <span className="block-label">BLOCK HERE! <ArrowDown size={22} strokeWidth={4} /></span>}
  </div>;
}

export function Tutorial({ onClose,game='connect',mode='human' }: { onClose: () => void;game?:string;mode?:Mode }) {
  const [step, setStep] = useState(0);
  const instructions=game==='mirror'?mirrorSteps:game==='fortress'?fortressSteps:game==='pulse'?pulseSteps:game==='tidal'?tidalSteps:game==='terraform'?terrainSteps:steps;
  const copy=(text:string)=>mode==='friend'?text.replaceAll('Rune','your friend'):text;
  return <Dialog title="How to play" onClose={onClose} className="tutorial-dialog">
    <div className="lesson-card" aria-live="polite" aria-atomic="true">
      {game==='mirror'?<MirrorLesson step={step}/>:game==='fortress'?<FortressLesson step={step}/>:game==='pulse'?<PulseLesson step={step}/>:game==='tidal'?<TidalLesson step={step}/>:game==='terraform'?<TerrainLesson step={step}/>:<LessonBoard step={step} mode={mode}/>}
      <div className="lesson-copy"><span className="step-label">STEP {step + 1} OF {instructions.length}</span><h3>{copy(instructions[step].title)}</h3><p>{copy(instructions[step].text)}</p></div>
    </div>
    <div className="step-dots" aria-label="Tutorial steps">{instructions.map((s, i) => <button key={s.title} className={i === step ? 'current' : ''} onClick={() => setStep(i)} aria-label={`Step ${i + 1}: ${copy(s.title)}`} aria-current={i === step ? 'step' : undefined} />)}</div>
    <div className="lesson-controls"><button className="chunky purple-button square" disabled={step === 0} onClick={() => setStep(s => s - 1)} aria-label="Previous step"><ArrowLeftToLine /></button><button className="chunky purple-button" onClick={onClose}>{step === instructions.length - 1 ? 'LET’S PLAY' : 'OK'}</button><button className="chunky purple-button square" disabled={step === instructions.length - 1} onClick={() => setStep(s => s + 1)} aria-label="Next step"><ArrowRightToLine /></button></div>
  </Dialog>;
}
