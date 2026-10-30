import {rays,transformCell,transformAction,cellName} from './fortress';
export {transformCell,transformAction,cellName};
export interface State {board:number[];ghosts:number[];ghostTimers:number[];player:1|-1;turn:number;captured:number[];lastAction:number|null}
export const ACTION_SIZE=625,MOVE_CAP=60,SEAL_TURN=24,RULES_VERSION='mirror-v0.2';
export const rim=(c:number)=>Math.floor(c/5)===0||Math.floor(c/5)===4||c%5===0||c%5===4;
export const sealed=(s:State,c:number)=>s.turn>=SEAL_TURN&&rim(c);
export function initialState():State{const board=Array<number>(25).fill(0);[20,21,23,24].forEach(c=>{board[c]=1;});[0,1,3,4].forEach(c=>{board[c]=-1;});return{board,ghosts:Array(25).fill(0),ghostTimers:Array(25).fill(0),player:1,turn:0,captured:[],lastAction:null};}
export function rawLegal(state:State){const mask=Array<boolean>(ACTION_SIZE).fill(false);state.board.forEach((p,c)=>{if(p!==state.player)return;for(const ray of rays[c])for(const target of ray){if(sealed(state,target)||state.board[target]||state.ghostTimers[target]>0)break;mask[c*25+target]=true;}});return mask;}
export function isTerminal(s:State):{done:boolean;winner:number}{const counts=[1,-1].map(p=>s.board.filter(owner=>owner===p).length);if(!counts.every(Boolean))return{done:true,winner:counts[0]?1:counts[1]?-1:0};if(s.turn>=MOVE_CAP)return{done:true,winner:counts[0]>counts[1]?1:counts[1]>counts[0]?-1:0};if(!rawLegal(s).some(Boolean))return{done:true,winner:-s.player};return{done:false,winner:0};}
export const legalMoves=(s:State)=>isTerminal(s).done?Array<boolean>(ACTION_SIZE).fill(false):rawLegal(s);
export function applyMove(state:State,action:number):State{
  if(!Number.isInteger(action)||action<0||action>=ACTION_SIZE||!legalMoves(state)[action])throw new Error('Illegal move');
  const origin=Math.floor(action/25),target=action%25,board=[...state.board],captured:number[]=[];board[origin]=0;board[target]=state.player;
  for(const ray of rays[target]){const enemies:number[]=[];for(const cell of ray){if(state.ghostTimers[cell]>0)break;if(board[cell]===-state.player)enemies.push(cell);else{if(board[cell]===state.player)captured.push(...enemies);break;}}}
  captured.forEach(c=>{board[c]=0;});const ghosts=Array<number>(25).fill(0),ghostTimers=Array<number>(25).fill(0);ghosts[origin]=state.player;ghostTimers[origin]=1;
  if(state.turn+1>=SEAL_TURN)board.forEach((owner,c)=>{if(rim(c)){if(owner)captured.push(c);board[c]=0;ghosts[c]=0;ghostTimers[c]=0;}});
  return{board,ghosts,ghostTimers,player:state.player===1?-1:1,turn:state.turn+1,captured:captured.sort((a,b)=>a-b),lastAction:action};
}
export function encode(s:State){const values=[s.board.map(p=>Number(p===s.player)),s.board.map(p=>Number(p===-s.player)),s.ghosts.map((p,c)=>Number(p===s.player&&s.ghostTimers[c]>0)),s.ghosts.map((p,c)=>Number(p===-s.player&&s.ghostTimers[c]>0)),s.ghostTimers,Array(25).fill(s.turn/MOVE_CAP),s.board.map((_,c)=>Number(sealed(s,c)))];return values.map(p=>Array.from({length:5},(_,r)=>p.slice(r*5,r*5+5)));}
export function symmetries(s:State,policy:number[]){return Array.from({length:8},(_,t)=>{const state={...s},mapped=Array<number>(ACTION_SIZE).fill(0);for(const key of ['board','ghosts','ghostTimers'] as const){state[key]=Array(25).fill(0);s[key].forEach((v,c)=>{state[key][transformCell(c,t)]=v;});}policy.forEach((p,a)=>{mapped[transformAction(a,t)]=p;});state.captured=s.captured.map(c=>transformCell(c,t)).sort((a,b)=>a-b);state.lastAction=s.lastAction===null?null:transformAction(s.lastAction,t);return{state,policy:mapped};});}

export const describeAction=(_state:State,a:number)=>`move ${cellName(Math.floor(a/25))} to ${cellName(a%25)}`;
