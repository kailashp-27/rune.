export type Player = 1 | -1;
export interface State { board: number[]; player: Player; turn: number }
export const ACTION_SIZE = 7;
export const initialState = (): State => ({ board: Array(42).fill(0), player: 1, turn: 0 });
const windows: number[][] = [];
for (let r=0;r<6;r++) for (let c=0;c<7;c++) for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
  if (r+3*dr<6 && c+3*dc>=0 && c+3*dc<7) windows.push(Array.from({length:4},(_,i)=>(r+i*dr)*7+c+i*dc));
}
export function winningCells(s: State): number[] {
  for (const cells of windows) if (s.board[cells[0]] && cells.every(i=>s.board[i]===s.board[cells[0]])) return cells;
  return [];
}
export function isTerminal(s: State) { const line=winningCells(s); return {done:line.length>0 || s.turn>=42,winner:line.length?s.board[line[0]]:0}; }
export const legalMoves = (s: State): boolean[] => s.board.slice(0,7).map(v=>v===0 && !isTerminal(s).done);
export function applyMove(s: State,a: number): State {
  if (!Number.isInteger(a) || a<0 || a>=7 || !legalMoves(s)[a]) throw new Error('Illegal move');
  const board=[...s.board]; for(let r=5;r>=0;r--) if(!board[r*7+a]) {board[r*7+a]=s.player;break;}
  return {board,player:s.player===1?-1:1,turn:s.turn+1};
}
export const encode = (s:State): number[][][] => [s.board.map(v=>+(v===s.player)),s.board.map(v=>+(v===-s.player)),Array(42).fill(s.turn/42)].map(p=>Array.from({length:6},(_,r)=>p.slice(r*7,r*7+7)));
export function symmetries(s:State,policy:number[]) {return [{state:s,policy},{state:{...s,board:Array.from({length:6},(_,r)=>s.board.slice(r*7,r*7+7).reverse()).flat()},policy:[...policy].reverse()}];}
