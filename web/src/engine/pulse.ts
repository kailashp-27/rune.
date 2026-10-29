export interface State {board:number[];strength:number[];level:number[];cooldown:number[];bursts:number[];player:1|-1;turn:number}
export const ACTION_SIZE=51,MOVE_CAP=120;
const neighbors=Array.from({length:25},(_,cell)=>{const r=Math.floor(cell/5),c=cell%5;return [[r-1,c],[r,c+1],[r+1,c],[r,c-1]].filter(([rr,cc])=>rr>=0&&rr<5&&cc>=0&&cc<5).map(([rr,cc])=>rr*5+cc);});
const waves=Array.from({length:25},(_,source)=>Array.from({length:4},(_,level)=>Array.from({length:25},(_,target)=>({target,power:level+1-Math.abs(Math.floor(source/5)-Math.floor(target/5))-Math.abs(source%5-target%5)})).filter(({power})=>power>0)));
export function initialState():State{
  const state:State={board:Array(25).fill(0),strength:Array(25).fill(0),level:Array(25).fill(0),cooldown:Array(25).fill(0),bursts:Array(25).fill(0),player:1,turn:0};
  for(const [cell,owner] of [[20,1],[4,-1]]){state.board[cell]=owner;state.strength[cell]=2;state.level[cell]=1;state.cooldown[cell]=1;}
  return state;
}
export const territory=(state:State)=>[1,-1].map(p=>state.board.filter(owner=>owner===p).length);
export function isTerminal(state:State):{done:boolean;winner:number}{
  const emitters=[1,-1].map(p=>state.board.filter((owner,c)=>owner===p&&state.level[c]>0).length);
  if(!emitters.every(Boolean))return{done:true,winner:emitters[0]?1:emitters[1]?-1:0};
  if(state.turn>=MOVE_CAP){const [gold,purple]=territory(state);return{done:true,winner:gold>purple?1:purple>gold?-1:0};}
  return{done:false,winner:0};
}
export function legalMoves(state:State){
  const mask=Array<boolean>(ACTION_SIZE).fill(false);if(isTerminal(state).done)return mask;
  state.board.forEach((owner,c)=>{mask[c]=state.level[c]===0&&(owner===state.player||owner===0&&neighbors[c].some(n=>state.board[n]===state.player));mask[25+c]=owner===state.player&&state.level[c]>0&&state.level[c]<3;});
  mask[50]=true;return mask;
}
export function step(state:State):State{
  const incoming=[Array<number>(25).fill(0),Array<number>(25).fill(0)],cooldown=Array<number>(25).fill(0),bursts=Array<number>(25).fill(0);
  state.board.forEach((owner,c)=>{
    if(!owner)return;const side=owner===1?0:1;
    incoming[side][c]=Math.max(incoming[side][c],state.strength[c]-1,state.level[c]?1:0);
    if(state.level[c]){cooldown[c]=state.cooldown[c]-1;if(cooldown[c]<=0){cooldown[c]=3;bursts[c]=owner*(state.level[c]+1);for(const {target,power} of waves[c][state.level[c]])incoming[side][target]=Math.max(incoming[side][target],power);}}
  });
  const board=Array<number>(25).fill(0),strength=Array<number>(25).fill(0),level=[...state.level];
  for(let c=0;c<25;c++){const difference=incoming[0][c]-incoming[1][c];board[c]=Math.sign(difference);strength[c]=Math.abs(difference);if(!board[c]){level[c]=0;cooldown[c]=0;}else if(level[c]&&board[c]!==state.board[c])cooldown[c]=3;}
  return{...state,board,strength,level,cooldown,bursts};
}
export function applyMove(state:State,action:number):State{
  if(!Number.isInteger(action)||action<0||action>=ACTION_SIZE||!legalMoves(state)[action])throw new Error('Illegal move');
  const modified={...state,board:[...state.board],strength:[...state.strength],level:[...state.level],cooldown:[...state.cooldown],bursts:[...state.bursts]};
  if(action<25){modified.board[action]=state.player;modified.strength[action]=2;modified.level[action]=1;modified.cooldown[action]=2;}
  else if(action<50){const c=action-25;modified.level[c]++;modified.strength[c]=Math.max(modified.strength[c],modified.level[c]+1);modified.cooldown[c]=1;}
  const result=step(modified);return{...result,player:state.player===1?-1:1,turn:state.turn+1};
}
export function encode(state:State){
  const values=[state.board.map(p=>Number(p===state.player)),state.board.map(p=>Number(p===-state.player)),state.strength.map(v=>v/4),state.level.map((v,c)=>state.board[c]===state.player?v/3:0),state.level.map((v,c)=>state.board[c]===-state.player?v/3:0),state.cooldown.map(v=>v/3),Array(25).fill(state.turn/MOVE_CAP)];
  return values.map(plane=>Array.from({length:5},(_,r)=>plane.slice(r*5,r*5+5)));
}
export function transformCell(cell:number,transform:number){let r=Math.floor(cell/5),c=cell%5;if(transform>=4)c=4-c;for(let i=0;i<transform%4;i++)[r,c]=[c,4-r];return r*5+c;}
export const transformAction=(a:number,t:number)=>a===50?50:(a>=25?25:0)+transformCell(a%25,t);
export function symmetries(state:State,policy:number[]){return Array.from({length:8},(_,t)=>{const target={...state};for(const key of ['board','strength','level','cooldown','bursts'] as const){target[key]=Array(25).fill(0);state[key].forEach((v,c)=>{target[key][transformCell(c,t)]=v;});}const transformed=Array<number>(ACTION_SIZE).fill(0);policy.forEach((v,a)=>{transformed[transformAction(a,t)]=v;});return{state:target,policy:transformed};});}
export const cellName=(c:number)=>`${String.fromCharCode(65+c%5)}${Math.floor(c/5)+1}`;
export const describeAction=(_state:State,a:number)=>a===50?'wait for the next pulse':a<25?`build at ${cellName(a)}`:`boost ${cellName(a-25)}`;
