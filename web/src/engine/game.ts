export interface Terminal { done: boolean; winner: number }
export interface Game<State> {
  readonly ACTION_SIZE: number;
  initialState(): State;
  legalMoves(state: State): boolean[];
  applyMove(state: State, action: number): State;
  isTerminal(state: State): Terminal;
  encode(state: State): number[][][];
  symmetries(state: State, policy: number[]): {state: State; policy: number[]}[];
}
