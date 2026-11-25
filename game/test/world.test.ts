import { describe, expect, it, vi } from 'vitest';
import { InvigilatorMind, TUNING, type Perceived, type Vec } from '../src/world/ai';
import { ASSISTANT_HOMES, DETENTION, DOORS, Grid, INVIGILATOR_HOME, PROPS, START, TILE, WAYPOINTS } from '../src/world/map';
import { NOTES, PAGES } from '../src/story';
import { freshState, parseState } from '../src/world/state';
import ru from '../src/i18n/ru';
import uz from '../src/i18n/uz';

const open = (g: Grid) => DOORS.forEach((d) => g.openDoor(d.id));

describe('map', () => {
  it('starts the player and the Invigilator on free floor', () => {
    const g = new Grid();
    for (const p of [START, DETENTION]) expect(g.hits(p.x, p.y - 3, 5, 3)).toBe(false);
    expect(g.walkable(Math.floor(INVIGILATOR_HOME.x / TILE), Math.floor(INVIGILATOR_HOME.y / TILE))).toBe(true);
  });

  it('lets every assistant out through a door of their own that no puzzle guards', () => {
    expect(new Set(ASSISTANT_HOMES.map((h) => h.door)).size).toBe(ASSISTANT_HOMES.length);
    for (const h of ASSISTANT_HOMES) {
      const g = new Grid();
      expect(DOORS.find((d) => d.id === h.door)?.lock.type).toBe('none');
      const before = g.path(h.x, h.y, 50 * TILE, 26 * TILE);
      g.openDoor(h.door);
      expect(g.path(h.x, h.y, 50 * TILE, 26 * TILE), h.door).not.toBeNull();
      expect(before, h.door).toBeNull();
    }
  });

  it('has a side passage that never leads past a lock', () => {
    const g = new Grid();
    for (const d of DOORS) if (d.lock.type === 'none') g.openDoor(d.id);
    g.openDoor('d_class');
    g.openDoor('s_class');
    for (const [x, y] of [[65, 17], [83, 16], [28, 39], [62, 41], [84, 41], [44, 49]]) expect(g.path(START.x, START.y, x * TILE, y * TILE), `${x},${y}`).toBeNull();
    expect(g.path(START.x, START.y, 114 * TILE, 19 * TILE)).not.toBeNull();
  });

  it('keeps the classroom closed until its door opens', () => {
    const g = new Grid();
    expect(g.path(START.x, START.y, 26 * TILE, 26 * TILE)).toBeNull();
    g.openDoor('d_class');
    expect(g.path(START.x, START.y, 26 * TILE, 26 * TILE)).not.toBeNull();
  });

  it('can be finished: every room, page, note and patrol point is reachable with the doors open', () => {
    const g = new Grid();
    open(g);
    g.removeSolid('secret_shelf');
    for (const t of [...WAYPOINTS, ...PAGES, ...NOTES]) expect(g.path(START.x, START.y, t.x, t.y), `unreachable: ${JSON.stringify(t)}`).not.toBeNull();
  });

  it('opens in story order without dead ends', () => {
    const g = new Grid();
    const reach = (x: number, y: number) => g.path(START.x, START.y, x * TILE, y * TILE) !== null;
    g.openDoor('d_class');
    g.openDoor('d_library');
    g.openDoor('d_boiler');
    g.openDoor('d_cloak');
    expect(reach(41, 13)).toBe(true);
    expect(reach(65, 17)).toBe(false);
    expect(reach(28, 37)).toBe(false);
    g.openDoor('d_bio');
    expect(reach(62, 13)).toBe(true);
    g.openDoor('d_maths');
    expect(reach(31, 33)).toBe(true);
    expect(reach(84, 41)).toBe(false);
    g.openDoor('d_staff');
    g.openDoor('d_lobby');
    expect(reach(84, 41)).toBe(true);
  });

  it('lets the player stand next to every device', () => {
    const g = new Grid();
    open(g);
    for (const id of ['blackboard', 'catalogue', 'specimens', 'breakers', 'safe', 'typewriter', 'locker', 'scoreboard', 'exam', 'exit', 'bell']) {
      const p = PROPS.find((x) => x.id === id)!;
      const spot = g.nearestWalkable(p.x, p.y + 12);
      expect(spot, id).not.toBeNull();
      expect(Math.hypot(spot!.x * TILE + 8 - p.x, spot!.y * TILE + 8 - p.y), id).toBeLessThan(40);
    }
  });

  it('blocks sight through walls and closed doors', () => {
    const g = new Grid();
    expect(g.sees(START.x, START.y, 14 * TILE + 8, 26 * TILE)).toBe(false);
    g.openDoor('d_class');
    expect(g.sees(14 * TILE + 8, 19 * TILE, 14 * TILE + 8, 26 * TILE)).toBe(true);
  });
});

describe('the Invigilator', () => {
  const world = { path: (a: Vec, b: Vec) => [a, b], sees: () => true, waypoints: () => [{ x: 400, y: 0 }, { x: 0, y: 0 }] };
  const player = (over: Partial<Perceived> = {}): Perceived => ({ pos: { x: 70, y: 0 }, torch: false, moving: false, running: false, hidden: false, ...over });
  const mind = (events = {}) => {
    const m = new InvigilatorMind({ x: 0, y: 0 }, world, TUNING.STANDARD, events, () => 0.5);
    m.wake();
    m.facing = { x: 1, y: 0 };
    return m;
  };
  const run = (m: InvigilatorMind, p: Perceived, sec: number) => {
    for (let i = 0; i < sec * 30; i += 1) m.update(1 / 30, p);
  };

  it('does not notice a player standing still in the dark', () => {
    expect(mind().canSee(player())).toBe(false);
    expect(mind().canSee(player({ torch: true }))).toBe(true);
    expect(mind().canSee(player({ running: true, moving: true }))).toBe(true);
  });

  it('cannot see a hidden player, nor one behind it', () => {
    expect(mind().canSee(player({ torch: true, hidden: true }))).toBe(false);
    const m = mind();
    m.facing = { x: -1, y: 0 };
    expect(m.canSee(player({ torch: true }))).toBe(false);
  });

  it('needs a moment before it gives chase', () => {
    const m = mind();
    m.update(1 / 30, player({ torch: true }));
    expect(m.state).toBe('PATROL');
    run(m, player({ pos: { x: 300, y: 0 } }), 0.1);
    const n = mind();
    for (let i = 0; i < 20; i += 1) {
      n.facing = { x: 1, y: 0 };
      n.update(1 / 30, player({ pos: { x: n.pos.x + 60, y: 0 }, torch: true }));
    }
    expect(n.state).toBe('CHASE');
  });

  it('walks to a noise, searches, and goes back to its rounds', () => {
    const seen: string[] = [];
    const m = mind({ state: (s: string) => seen.push(s) });
    m.hear({ x: 120, y: 0 }, 300);
    expect(m.state).toBe('INVESTIGATE');
    run(m, player({ pos: { x: 900, y: 900 } }), 40);
    expect(seen).toEqual(expect.arrayContaining(['INVESTIGATE', 'SEARCH', 'RETURN', 'PATROL']));
  });

  it('ignores sounds that are too quiet or too far', () => {
    const m = mind();
    m.hear({ x: 400, y: 0 }, 120);
    expect(m.state).toBe('PATROL');
  });

  it('gives up a chase after losing contact and catches only within reach', () => {
    const caught = vi.fn();
    const m = mind({ caught });
    m.alarm({ x: 60, y: 0 });
    run(m, player({ pos: { x: 900, y: 0 } }), 5);
    expect(m.state).not.toBe('CHASE');
    expect(caught).not.toHaveBeenCalled();
    const n = mind({ caught });
    n.alarm({ x: 6, y: 0 });
    n.update(1 / 30, player({ pos: { x: 6, y: 0 }, moving: true }));
    expect(caught).toHaveBeenCalled();
  });

  it('calms down after a right answer in a hiding place', () => {
    const m = mind();
    m.hear({ x: 120, y: 0 }, 300);
    m.calm();
    expect(m.state).toBe('RETURN');
  });

  it('is never faster than a running player, at any intensity', () => {
    for (const t of Object.values(TUNING)) expect(t.chase).toBeLessThan(100);
  });
});

describe('languages', () => {
  it('have the same keys and the same placeholders', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(uz).sort());
    const marks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(ru)) {
      if (k.startsWith('error.')) continue;
      expect(marks(ru[k]), k).toBe(marks(k));
      expect(marks(uz[k]), k).toBe(marks(k));
      expect(ru[k].length && uz[k].length, k).toBeTruthy();
    }
  });
});

describe('state', () => {
  it('repairs damaged checkpoints', () => {
    const s = parseState({ x: 'NaN', y: 1e9, items: ['torch', 4], battery: -5, lives: 99 }, 3);
    expect(s).toMatchObject({ x: START.x, y: 4000, items: ['torch'], battery: 0, lives: 3 });
    expect(parseState(null, 2)).toEqual(freshState(2));
  });
});
