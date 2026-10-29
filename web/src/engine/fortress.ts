export interface State {board:number[];hold:number[];player:1|-1;turn:number;captured:number[];lastAction:number|null}
export const ACTION_SIZE=625,MOVE_CAP=100;
export const rays=Array.from({length:25},(_,c)=>[[-1,0],[0,1],[1,0],[0,-1]].map(([dr,dc])=>Array.from({length:4},(_,i)=>[Math.floor(c/5)+dr*(i+1),c%5+dc*(i+1)]).filter(([r,col])=>r>=0&&r<5&&col>=0&&col<5).map(([r,col])=>r*5+col)));
export function initialState():State{const board=Array<number>(25).fill(0);[20,21,23,24].forEach(c=>{board[c]=1;});[0,1,3,4].forEach(c=>{board[c]=-1;});return{board,hold:[0,0],player:1,turn:0,captured:[],lastAction:null};}
export function rawLegal(state:State){const mask=Array<boolean>(ACTION_SIZE).fill(false);state.board.forEach((owner,c)=>{if(owner!==state.player)return;for(const ray of rays[c])for(const target of ray){if(state.board[target])break;mask[c*25+target]=true;}});return mask;}
export function isTerminal(state:State):{done:boolean;winner:number}{
  const counts=[1,-1].map(p=>state.board.filter(owner=>owner===p).length);
  if(!counts.every(Boolean))return{done:true,winner:counts[0]?1:counts[1]?-1:0};
  for(const [index,player] of [1,-1].entries())if(state.hold[index]>=3&&state.board[12]===player)return{done:true,winner:player};
  if(state.turn>=MOVE_CAP)return{done:true,winner:counts[0]>counts[1]?1:counts[1]>counts[0]?-1:0};
  if(!rawLegal(state).some(Boolean))return{done:true,winner:-state.player};return{done:false,winner:0};
}
export const legalMoves=(state:State)=>isTerminal(state).done?Array<boolean>(ACTION_SIZE).fill(false):rawLegal(state);
export function applyMove(state:State,action:number):State{
  if(!Number.isInteger(action)||action<0||action>=ACTION_SIZE||!legalMoves(state)[action])throw new Error('Illegal move');
  const origin=Math.floor(action/25),target=action%25,board=[...state.board],captured:number[]=[];board[origin]=0;board[target]=state.player;
  for(const ray of rays[target]){const enemies:number[]=[];for(const c of ray){if(board[c]===-state.player)enemies.push(c);else{if(board[c]===state.player)captured.push(...enemies);break;}}}
  captured.forEach(c=>{board[c]=0;});const hold=[...state.hold],index=state.player===1?0:1;
  [1,-1].forEach((owner,i)=>{if(board[12]!==owner)hold[i]=0;});if(board[12]===state.player)hold[index]++;
  return{board,hold,player:state.player===1?-1:1,turn:state.turn+1,captured:captured.sort((a,b)=>a-b),lastAction:action};
}
export function encode(state:State){const index=state.player===1?0:1,values=[state.board.map(p=>Number(p===state.player)),state.board.map(p=>Number(p===-state.player)),Array(25).fill(state.hold[index]/3),Array(25).fill(state.hold[1-index]/3),state.board.map((_,c)=>Number(c===12)),Array(25).fill(state.turn/MOVE_CAP)];return values.map(p=>Array.from({length:5},(_,r)=>p.slice(r*5,r*5+5)));}
export function transformCell(cell:number,t:number){let r=Math.floor(cell/5),c=cell%5;if(t>=4)c=4-c;for(let i=0;i<t%4;i++)[r,c]=[c,4-r];return r*5+c;}
export const transformAction=(a:number,t:number)=>transformCell(Math.floor(a/25),t)*25+transformCell(a%25,t);
export function symmetries(state:State,policy:number[]){return Array.from({length:8},(_,t)=>{const board=Array<number>(25).fill(0),target=Array<number>(ACTION_SIZE).fill(0);state.board.forEach((p,c)=>{board[transformCell(c,t)]=p;});policy.forEach((p,a)=>{target[transformAction(a,t)]=p;});return{state:{...state,board,hold:[...state.hold],captured:state.captured.map(c=>transformCell(c,t)).sort((a,b)=>a-b),lastAction:state.lastAction===null?null:transformAction(state.lastAction,t)},policy:target};});}
export const cellName=(c:number)=>`${String.fromCharCode(65+c%5)}${Math.floor(c/5)+1}`;
export const describeAction=(_state:State,a:number)=>`move ${cellName(Math.floor(a/25))} to ${cellName(a%25)}`;
