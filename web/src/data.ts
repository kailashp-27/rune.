export const games = [
  { id: 'connect', name: 'Connect Four', accent: '#ffd079', background: '#343f59', tagline: 'Four in a row. Make your move.', playable: true },
  { id: 'terraform', name: 'Terraform', accent: '#385f38', background: '#d9edb3', tagline: 'Shape the ground. Reach the summit.', playable: true },
  { id: 'tidal', name: 'Tidal Lock', accent: '#173c56', background: '#77d8e0', tagline: 'Find your rhythm. Turn the tide.', playable: true },
  { id: 'pulse', name: 'Pulse', accent: '#f5baff', background: '#382946', tagline: 'One move. A whole new ripple.', playable: true },
  { id: 'fortress', name: 'Fortress', accent: '#713c2f', background: '#ffab86', tagline: 'Make your stand.', playable: true },
  { id: 'mirror', name: 'Mirror Siege', accent: '#49437e', background: '#c7c8fa', tagline: 'Every move leaves an echo.', playable: true },
] as const;
export type Game = typeof games[number];
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Mode = 'human' | 'watch';
export const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];
export const budgets: Record<Difficulty, number> = { Easy: 80, Medium: 400, Hard: 1200 };

export function readSaved<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`rune.v1.${key}`) || 'null');
    return validate(value) ? value : fallback;
  } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(`rune.v1.${key}`, JSON.stringify(value)); } catch { /* Private storage may be unavailable. */ }
}
