import { START } from './map';

/** Everything needed to continue after a refresh. Plain JSON, saved as the session checkpoint. */
export interface GameState {
  v: 1;
  x: number;
  y: number;
  items: string[];
  flags: string[];
  pages: string[];
  doors: string[];
  taken: string[];
  battery: number;
  spare: number;
  chalk: number;
  lives: number;
  caught: number;
  seconds: number;
  /** What the player has learned: shown in the notebook. */
  learned: Array<{ q: string; a: string; ok: boolean }>;
}

export const freshState = (lives: number): GameState => ({ v: 1, x: START.x, y: START.y, items: [], flags: [], pages: [], doors: [], taken: [], battery: 100, spare: 0, chalk: 0, lives, caught: 0, seconds: 0, learned: [] });

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
const num = (v: unknown, fallback: number, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);

/** Tolerant parser: a damaged checkpoint falls back field by field instead of breaking the session. */
export function parseState(raw: unknown, lives: number): GameState {
  const base = freshState(lives);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  return {
    v: 1,
    x: num(r.x, base.x, 0, 4000),
    y: num(r.y, base.y, 0, 4000),
    items: strings(r.items),
    flags: strings(r.flags),
    pages: strings(r.pages),
    doors: strings(r.doors),
    taken: strings(r.taken),
    battery: num(r.battery, 100, 0, 100),
    spare: num(r.spare, 0, 0, 20),
    chalk: num(r.chalk, 0, 0, 20),
    lives: num(r.lives, lives, 1, lives),
    caught: num(r.caught, 0, 0, 50),
    seconds: num(r.seconds, 0, 0, 86_400),
    learned: Array.isArray(r.learned) ? (r.learned as GameState['learned']).filter((x) => typeof x?.q === 'string' && typeof x?.a === 'string').slice(-24).map((x) => ({ q: x.q, a: x.a, ok: Boolean(x.ok) })) : [],
  };
}
