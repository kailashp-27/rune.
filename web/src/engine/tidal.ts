export interface State {board:number[];player:1|-1;turn:number;wave:number}
export const ACTION_SIZE=125,MOVE_CAP=80;
const directions=[[-1,0],[0,1],[1,0],[0,-1]];
export const lines:number[][]=[];
for(let r=0;r<5;r++)for(let c=0;c<5;c++)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
  if(r+3*dr>=0&&r+3*dr<5&&c+3*dc>=0&&c+3*dc<5)lines.push(Array.from({length:4},(_,i)=>(r+i*dr)*5+c+i*dc));
}
export const initialState=(wave=0):State=>({board:Array(25).fill(0),player:1,turn:0,wave});
export const chanceOutcomes=(state:State)=>Array.from({length:10},(_,i)=>i).filter(wave=>wave!==state.wave);
export const wet=(state:State,cell:number)=>(state.wave<5?Math.floor(cell/5):cell%5)===state.wave%5;
export const waveLabel=(state:State)=>state.wave<5?`ROW ${state.wave+1}`:`COLUMN ${String.fromCharCode(65+state.wave-5)}`;
// Only live play samples randomness. Search receives the current wave, never an RNG seed.
export const sampleInitial=()=>initialState(Math.floor(Math.random()*10));
export function sampleMove(state:State,action:number){const waves=chanceOutcomes(state);return applyMove(state,action,waves[Math.floor(Math.random()*waves.length)]);}
export function destination(action:number){
  if(action<25)return action;
  const origin=Math.floor((action-25)/4),[dr,dc]=directions[(action-25)%4];
  const r=Math.floor(origin/5)+dr,c=origin%5+dc;
  return r>=0&&r<5&&c>=0&&c<5?r*5+c:-1;
}
export const origin=(action:number)=>action<25?-1:Math.floor((action-25)/4);
function rawLegal(state:State){
  const mask=Array<boolean>(ACTION_SIZE).fill(false);
  state.board.forEach((piece,cell)=>{
    if(wet(state,cell))return;
    if(piece===0)mask[cell]=true;
    if(piece===state.player)for(let d=0;d<4;d++){
      const action=25+cell*4+d,target=destination(action);
      mask[action]=target>=0&&!wet(state,target)&&state.board[target]===0;
    }
  });return mask;
}
export function isTerminal(state:State):{done:boolean;winner:number}{
  for(const line of lines){const owner=state.board[line[0]];if(owner&&line.every(c=>state.board[c]===owner))return{done:true,winner:owner};}
  if(state.turn>=MOVE_CAP)return{done:true,winner:0};
  if(!rawLegal(state).some(Boolean))return{done:true,winner:-state.player};
  return{done:false,winner:0};
}
export const legalMoves=(state:State)=>isTerminal(state).done?Array<boolean>(ACTION_SIZE).fill(false):rawLegal(state);
export function applyMove(state:State,action:number,wave:number):State{
  if(!Number.isInteger(action)||action<0||action>=ACTION_SIZE||!legalMoves(state)[action])throw new Error('Illegal move');
  if(!Number.isInteger(wave)||!chanceOutcomes(state).includes(wave))throw new Error('Invalid next wave');
  const board=[...state.board];if(action>=25)board[origin(action)]=0;board[destination(action)]=state.player;
  return{board,player:state.player===1?-1:1,turn:state.turn+1,wave};
}
export function encode(state:State){
  const values=[state.board.map(p=>Number(p===state.player)),state.board.map(p=>Number(p===-state.player)),
    state.board.map((_,c)=>Number(wet(state,c))),Array(25).fill(Number(state.wave>=5)),
    Array(25).fill(state.turn%2),Array(25).fill(state.turn/MOVE_CAP)];
  return values.map(p=>Array.from({length:5},(_,r)=>p.slice(r*5,r*5+5)));
}
export const flipCell=(cell:number)=>Math.floor(cell/5)*5+4-cell%5;
export const flipAction=(a:number)=>a<25?flipCell(a):25+flipCell(origin(a))*4+[0,3,2,1][(a-25)%4];
export function symmetries(state:State,policy:number[]){
  const board=Array<number>(25).fill(0),flipped=Array<number>(ACTION_SIZE).fill(0);
  state.board.forEach((p,c)=>{board[flipCell(c)]=p;});policy.forEach((p,a)=>{flipped[flipAction(a)]=p;});
  const wave=state.wave<5?state.wave:14-state.wave;
  return[{state,policy},{state:{...state,board,wave},policy:flipped}];
}
export const cellName=(c:number)=>`${String.fromCharCode(65+c%5)}${Math.floor(c/5)+1}`;
export const describeAction=(_state:State,a:number)=>a<25?`place at ${cellName(a)}`:`nudge ${cellName(origin(a))} to ${cellName(destination(a))}`;
