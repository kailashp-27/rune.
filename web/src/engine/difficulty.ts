export type Level='Easy'|'Medium'|'Hard';
export function seededRandom(seed?:number){
  if(seed===undefined)return Math.random;
  let value=seed>>>0;
  return()=>{value+=0x6D2B79F5;let n=Math.imul(value^value>>>15,1|value);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};
}
/** Early checkpoints also explore and occasionally miss a move. Hard commits to search. */
export function difficultyAction(level:Level,preferred:number,mask:boolean[],policy?:number[],random=Math.random){
  const legal=mask.flatMap((ok,a)=>ok?[a]:[]);
  if(!legal.length)return-1;
  if(level==='Hard')return mask[preferred]?preferred:legal[0];
  const explore=level==='Easy'?.3:.05;
  if(random()<explore)return legal[Math.min(legal.length-1,Math.floor(random()*legal.length))];
  if(level==='Medium'&&mask[preferred])return preferred;
  const power=level==='Easy'?.7:1.5;
  const weights=legal.map(a=>Math.pow(Math.max(0,policy?.[a]??(a===preferred?1:.05)),power));
  const total=weights.reduce((a,b)=>a+b,0);let draw=random()*total;
  for(let i=0;i<legal.length;i++){draw-=weights[i];if(draw<=0)return legal[i];}
  return legal.at(-1)!;
}
