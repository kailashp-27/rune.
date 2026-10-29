export type Player = 1 | -1;
export interface State { board: number[]; units: [number, number]; player: Player; turn: number }
export const ACTION_SIZE = 251;
export const RULES_VERSION = 'terraform-v0.1';
export const MOVE_CAP = 80;
export const DIRECTIONS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
export const NEIGHBORS = Array.from({length:25},(_,i)=>DIRECTIONS.map(([dr,dc])=>{
  const r=Math.floor(i/5)+dr,c=i%5+dc; return r>=0&&r<5&&c>=0&&c<5?r*5+c:-1;
}));
export function initialState(): State {
  const board=Array(25).fill(0); for(const i of [7,11,13,17])board[i]=1;board[12]=2;
  return {board,units:[20,4],player:1,turn:0};
}
export function rawLegal(s:State):boolean[] {
  const mask=Array(ACTION_SIZE).fill(false),origin=s.units[s.player===1?0:1];
  mask[250]=s.turn===1;
  NEIGHBORS[origin].forEach((cell,d)=>{if(cell<0||s.units.includes(cell))return;
    mask[origin*8+d]=s.board[cell]<=s.board[origin]+1;
    mask[200+cell]=s.board[cell]<3;mask[225+cell]=s.board[cell]>0;
  });return mask;
}
export function isTerminal(s:State) {
  for(const [i,p] of [[0,1],[1,-1]])if(s.board[s.units[i]]===3)return{done:true,winner:p};
  if(s.turn>=MOVE_CAP)return{done:true,winner:0};
  if(!rawLegal(s).some(Boolean))return{done:true,winner:-s.player};
  return{done:false,winner:0};
}
export const legalMoves=(s:State):boolean[]=>isTerminal(s).done?Array(ACTION_SIZE).fill(false):rawLegal(s);
export function applyMove(s:State,a:number):State {
  if(!Number.isInteger(a)||a<0||a>=ACTION_SIZE||!legalMoves(s)[a])throw new Error('Illegal move');
  const board=[...s.board],units:[number,number]=[...s.units];
  if(a===250)units.reverse();else if(a<200)units[s.player===1?0:1]=NEIGHBORS[Math.floor(a/8)][a%8];else if(a<225)board[a-200]++;else board[a-225]--;
  return{board,units,player:s.player===1?-1:1,turn:s.turn+1};
}
export function encode(s:State):number[][][] {
  const own=s.player===1?0:1;
  const planes=Array.from({length:4},(_,level)=>s.board.map(h=>+(h===level)));
  planes.push(Array.from({length:25},(_,i)=>+(i===s.units[own])),Array.from({length:25},(_,i)=>+(i===s.units[1-own])),Array(25).fill(+(s.player===1)),Array(25).fill(s.turn/MOVE_CAP));
  return planes.map(p=>Array.from({length:5},(_,r)=>p.slice(r*5,r*5+5)));
}
export function transformCell(cell:number,symmetry:number):number {
  let r=Math.floor(cell/5),c=cell%5;if(symmetry>=4)c=4-c;
  for(let i=0;i<symmetry%4;i++)[r,c]=[c,4-r];return r*5+c;
}
export function transformAction(action:number,symmetry:number):number {
  if(action===250)return 250;
  if(action>=200){const base=action<225?200:225;return base+transformCell(action-base,symmetry);}
  let [dr,dc]=DIRECTIONS[action%8];if(symmetry>=4)dc=-dc;
  for(let i=0;i<symmetry%4;i++)[dr,dc]=[dc,-dr];
  return transformCell(Math.floor(action/8),symmetry)*8+DIRECTIONS.findIndex(([r,c])=>r===dr&&c===dc);
}
export function symmetries(s:State,policy:number[]) {
  return Array.from({length:8},(_,symmetry)=>{const board=Array(25).fill(0),target=Array(ACTION_SIZE).fill(0);
    s.board.forEach((h,i)=>board[transformCell(i,symmetry)]=h);policy.forEach((p,a)=>target[transformAction(a,symmetry)]=p);
    return {state:{...s,board,units:s.units.map(i=>transformCell(i,symmetry)) as [number,number]},policy:target};
  });
}
export type ActionKind='move'|'raise'|'lower'|'swap';
export function destination(s:State,a:number) { return a===250?-1:a<200?NEIGHBORS[Math.floor(a/8)][a%8]:a<225?a-200:a-225; }
export const actionKind=(a:number):ActionKind=>a===250?'swap':a<200?'move':a<225?'raise':'lower';
export function describeAction(s:State,a:number) {if(a===250)return 'swap climbers';const cell=destination(s,a);return `${actionKind(a)} ${String.fromCharCode(65+cell%5)}${Math.floor(cell/5)+1}`;}
