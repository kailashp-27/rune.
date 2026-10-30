import {RotateCcw} from 'lucide-react';
export function MatchError({message,onRetry}:{message:string;onRetry:()=>void}) {
  return <div className="match-error"><p className="error-message" role="alert">{message}</p><button className="chunky purple-button" onClick={onRetry}><RotateCcw size={18}/>RETRY</button></div>;
}
