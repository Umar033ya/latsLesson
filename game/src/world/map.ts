/** The school, described as rooms, doors and furniture. No Phaser types: this module is unit tested. */
export const TILE = 16;
export const COLS = 98;
export const ROWS = 55;

export type FloorKind = 'wood' | 'hall' | 'tile' | 'concrete' | 'carpet' | 'gym';
export type WallKind = 'hall' | 'class' | 'lab' | 'library' | 'brick';

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: FloorKind;
  wall: WallKind;
}

export const ROOMS: Room[] = [
  { id: 'hall', name: 'East corridor', x: 4, y: 24, w: 88, h: 4, floor: 'hall', wall: 'hall' },
  { id: 'class', name: 'Room 9-B', x: 6, y: 12, w: 16, h: 9, floor: 'wood', wall: 'class' },
  { id: 'library', name: 'Library', x: 27, y: 10, w: 18, h: 11, floor: 'carpet', wall: 'library' },
  { id: 'archive', name: 'The archive', x: 49, y: 14, w: 6, h: 7, floor: 'concrete', wall: 'brick' },
  { id: 'biology', name: 'Biology lab', x: 59, y: 11, w: 14, h: 10, floor: 'tile', wall: 'lab' },
  { id: 'staff', name: 'Staff room', x: 77, y: 12, w: 14, h: 9, floor: 'wood', wall: 'library' },
  { id: 'boiler', name: 'Boiler room', x: 6, y: 32, w: 12, h: 9, floor: 'concrete', wall: 'brick' },
  { id: 'maths', name: 'Maths room', x: 22, y: 32, w: 13, h: 9, floor: 'wood', wall: 'class' },
  { id: 'cloak', name: 'Cloakroom', x: 40, y: 32, w: 9, h: 9, floor: 'tile', wall: 'lab' },
  { id: 'gym', name: 'Assembly hall', x: 54, y: 32, w: 18, h: 12, floor: 'gym', wall: 'hall' },
  { id: 'lobby', name: 'Main lobby', x: 77, y: 32, w: 15, h: 12, floor: 'hall', wall: 'hall' },
  { id: 'back', name: 'Service corridor', x: 6, y: 48, w: 86, h: 3, floor: 'concrete', wall: 'brick' },
];

/** What has to be true before a door opens. */
export type Lock = { type: 'none' } | { type: 'item'; item: string; text: string } | { type: 'flag'; flag: string; text: string };

export interface Door {
  id: string;
  /** Passage column and the first row of the passage. */
  x: number;
  y: number;
  len: number;
  axis: 'v' | 'h';
  sprite: 'door' | 'gate' | 'none';
  lock: Lock;
  leads: string;
}

const none: Lock = { type: 'none' };
const flag = (f: string, text: string): Lock => ({ type: 'flag', flag: f, text });
const item = (i: string, text: string): Lock => ({ type: 'item', item: i, text });
const noPower = 'A magnetic lock. No power, no door.';

export const DOORS: Door[] = [
  { id: 'd_class', x: 14, y: 21, len: 3, axis: 'v', sprite: 'door', lock: flag('blackboard', 'Chalk letters fill the keyhole. They want an answer.'), leads: 'class' },
  { id: 'd_library', x: 33, y: 21, len: 3, axis: 'v', sprite: 'door', lock: none, leads: 'library' },
  { id: 'd_bio', x: 65, y: 21, len: 3, axis: 'v', sprite: 'door', lock: item('key_bio', 'Locked. The plate says BIOLOGY.'), leads: 'biology' },
  { id: 'd_staff', x: 83, y: 21, len: 3, axis: 'v', sprite: 'door', lock: item('key_staff', 'Locked. STAFF ONLY, in letters someone has polished every day.'), leads: 'staff' },
  { id: 'd_boiler', x: 11, y: 28, len: 4, axis: 'v', sprite: 'gate', lock: none, leads: 'boiler' },
  { id: 'd_maths', x: 28, y: 28, len: 4, axis: 'v', sprite: 'gate', lock: flag('power', noPower), leads: 'maths' },
  { id: 'd_cloak', x: 44, y: 28, len: 4, axis: 'v', sprite: 'door', lock: none, leads: 'cloak' },
  { id: 'd_gym', x: 62, y: 28, len: 4, axis: 'v', sprite: 'gate', lock: flag('power', noPower), leads: 'gym' },
  { id: 'd_lobby', x: 84, y: 28, len: 4, axis: 'v', sprite: 'gate', lock: item('clapper', 'The lobby grille. A slot beside it is shaped like the tongue of a bell.'), leads: 'lobby' },
  { id: 'b_boiler', x: 9, y: 41, len: 7, axis: 'v', sprite: 'gate', lock: flag('power', noPower), leads: 'back' },
  { id: 'b_maths', x: 30, y: 41, len: 7, axis: 'v', sprite: 'none', lock: none, leads: 'back' },
  { id: 'b_gym', x: 60, y: 44, len: 4, axis: 'v', sprite: 'none', lock: none, leads: 'back' },
  { id: 'b_lobby', x: 88, y: 44, len: 4, axis: 'v', sprite: 'gate', lock: item('clapper', 'Barred from the other side.'), leads: 'lobby' },
  { id: 'secret', x: 45, y: 18, len: 4, axis: 'h', sprite: 'none', lock: flag('secret', 'A shelf of registers. Cold air comes from behind it.'), leads: 'archive' },
];

export interface Prop {
  sprite: string;
  /** Pixel position of the bottom centre. */
  x: number;
  y: number;
  /** Solid footprint measured from the bottom centre. */
  solid?: [w: number, h: number];
  /** Drawn flat on the floor or on the wall, below everything that moves. */
  flat?: boolean;
  /** Blocks light. */
  tall?: boolean;
  flip?: boolean;
  id?: string;
}

const T = (n: number) => n * TILE;
const props: Prop[] = [];
const on = (sprite: string, tx: number, ty: number, extra: Partial<Prop> = {}) => props.push({ sprite, x: Math.round(T(tx)), y: Math.round(T(ty)), ...extra });
/** Hung on the wall face of a room: ty is the first floor row. */
const wall = (sprite: string, tx: number, floorRow: number, lift: number, extra: Partial<Prop> = {}) => props.push({ sprite, x: Math.round(T(tx)), y: T(floorRow) - lift, flat: true, ...extra });

/* Room 9-B */
wall('blackboard', 14, 12, 4, { id: 'blackboard' });
wall('clock', 18.6, 12, 14);
wall('intercom', 10.6, 12, 12, { id: 'ic_class' });
wall('window', 7.6, 12, 0, { id: 'window' });
wall('window', 20.4, 12, 0, { id: 'window' });
on('teacher_desk', 14, 14.4, { solid: [42, 14], id: 'teacher_desk' });
for (const [r, row] of [15.9, 17.5, 19.1].entries())
  for (const [c, col] of [9, 12, 16.6, 19.4].entries()) {
    const fallen = r === 1 && c === 2;
    on(fallen ? 'desk_fallen' : (r + c) % 3 ? 'desk' : 'desk_empty', col, row, { solid: [18, 10] });
    if ((r + c) % 2) on('chair', col - 0.1, row + 0.65, { solid: [10, 6] });
  }
on('wardrobe', 6.8, 13, { solid: [18, 12], tall: true, id: 'hide' });
on('plant', 21.3, 13.2, { solid: [12, 8] });
on('papers_0', 11, 16.6, { flat: true });
on('papers_2', 17.8, 18.4, { flat: true });

/* Corridor */
for (const x of [6, 9, 20, 24, 38, 42, 49, 56, 72, 76, 89]) wall(x % 2 ? 'window' : 'board', x + 0.4, 24, x % 2 ? 0 : 6, x % 2 ? { id: 'window' } : {});
wall('portrait', 17.6, 24, 8, { id: 'portrait1' });
wall('portrait', 30, 24, 8);
wall('portrait', 36.4, 24, 8);
wall('portrait', 69, 24, 8, { id: 'portrait2' });
wall('clock', 46.5, 24, 12);
wall('intercom', 27, 24, 12, { id: 'ic_hall' });
wall('intercom', 60.5, 24, 12, { id: 'ic_hall2' });
wall('extinguisher', 52.5, 24, 2);
for (const x of [26, 54, 79]) on('radiator', x, 24.1, { flat: true });
for (const x of [40, 41.05, 58, 59.05, 74, 75.05, 22.1]) on('locker', x, 24.35, { solid: [16, 6], id: 'hide' });
on('bench', 12.2, 24.6, { solid: [32, 8] });
on('bench', 48.4, 24.6, { solid: [32, 8] });
on('bin', 35.2, 24.6, { solid: [8, 5] });
on('plant', 5.2, 24.9, { solid: [12, 8] });
on('plant', 91, 24.9, { solid: [12, 8] });
on('puddle', 19, 26.6, { flat: true });
on('puddle', 51, 27.4, { flat: true });
on('puddle', 70, 26.2, { flat: true });
for (const [i, x] of [16, 31.5, 47, 64, 80.5].entries()) on(`papers_${i % 3}`, x, 26.8 + (i % 2), { flat: true });
for (const x of [11.5, 28.5, 44.5, 62.5, 84.5]) on('rug', x, 28, { flat: true });

/* Library */
for (const x of [28.7, 32, 35.3, 38.6]) on(`shelf_${Math.round(x) % 3}`, x, 10.9, { solid: [48, 12], tall: true });
on('shelf_1', 29, 15.4, { solid: [48, 12], tall: true });
on('shelf_2', 36.6, 15.4, { solid: [48, 12], tall: true });
on('catalogue', 43.2, 12, { solid: [38, 12], tall: true, id: 'catalogue' });
on('shelf_0', 43.3, 18, { solid: [48, 12], tall: true, id: 'secret_shelf' });
on('teacher_desk', 33.6, 18.4, { solid: [42, 14] });
on('chair', 33.6, 19.4, { solid: [10, 6] });
on('globe', 41.2, 20.4, { solid: [12, 6] });
wall('intercom', 41, 10, 10, { id: 'ic_library' });
on('wardrobe', 27.7, 20.5, { solid: [18, 10], tall: true, id: 'hide' });
on('papers_1', 39, 17.6, { flat: true });

/* Archive */
on('crates', 50.4, 15.3, { solid: [30, 12], tall: true });
on('crates', 53.6, 19.8, { solid: [30, 12] });
on('shelf_2', 53.2, 15, { solid: [48, 12], tall: true });

/* Biology */
on('specimens', 62, 12, { solid: [46, 12], tall: true, id: 'specimens' });
wall('board', 66, 11, 6);
wall('intercom', 68, 11, 10, { id: 'ic_bio' });
on('skeleton', 70.8, 12.5, { solid: [14, 6] });
on('sink', 72.2, 11.8, { solid: [18, 8] });
for (const [x, y] of [[62, 15.4], [68.4, 15.4], [62, 18.6], [68.4, 18.6]]) on('lab_bench', x, y, { solid: [50, 14] });
on('plant', 59.7, 12.4, { solid: [12, 8] });
on('wardrobe', 72.2, 20.4, { solid: [18, 10], tall: true, id: 'hide' });

/* Staff room */
on('typewriter', 84, 14, { solid: [38, 12], id: 'typewriter' });
on('sofa', 79.3, 13.7, { solid: [40, 14] });
on('coats', 90.2, 13.4, { solid: [10, 6] });
on('shelf_0', 88.2, 12.9, { solid: [48, 12], tall: true });
on('teacher_desk', 79.4, 18, { solid: [42, 14] });
on('teacher_desk', 87.4, 18, { solid: [42, 14] });
wall('clock', 81.8, 12, 12);
wall('intercom', 85.8, 12, 12, { id: 'ic_staff' });
wall('portrait', 77.8, 12, 12);
on('wardrobe', 77.7, 20.4, { solid: [18, 10], tall: true, id: 'hide' });

/* Boiler room */
on('boiler', 8.2, 34.3, { solid: [44, 20], tall: true });
wall('breaker', 13.6, 32, 3, { id: 'breakers' });
wall('pipes', 13.5, 32, 22);
wall('pipes', 9.4, 32, 24);
on('crates', 16.6, 34, { solid: [30, 14], tall: true });
on('crates', 7.4, 40.4, { solid: [30, 12], tall: true });
on('bin', 14.6, 33, { solid: [8, 5] });
on('puddle', 12.6, 38.6, { flat: true });
on('locker', 17.4, 40.6, { solid: [16, 8], id: 'hide' });

/* Maths */
wall('blackboard', 26.4, 32, 4);
wall('safe', 31.6, 32, 5, { id: 'safe' });
wall('intercom', 33.6, 32, 12, { id: 'ic_maths' });
on('teacher_desk', 26.2, 34.6, { solid: [42, 14] });
for (const [r, row] of [36.6, 38.6].entries()) for (const [c, col] of [24, 27.4, 32.6].entries()) on((r + c) % 2 ? 'desk' : 'desk_empty', col, row, { solid: [18, 10] });
on('globe', 33.9, 34.4, { solid: [12, 6] });
on('wardrobe', 22.7, 40.5, { solid: [18, 10], tall: true, id: 'hide' });

/* Cloakroom */
on('locker', 42.2, 33, { solid: [16, 12], id: 'locker' });
on('locker', 41.1, 33, { solid: [16, 12] });
on('locker', 46.8, 33, { solid: [16, 12], id: 'hide' });
on('locker', 47.9, 33, { solid: [16, 12] });
on('coats', 41, 37.4, { solid: [10, 6] });
on('coats', 48.2, 37.4, { solid: [10, 6] });
on('bench', 44.6, 36.8, { solid: [32, 8] });
on('sink', 41.2, 40.4, { solid: [18, 8] });

/* Assembly hall */
on('curtain', 67.2, 32.4, { flat: true });
wall('scoreboard', 57, 32, 0, { id: 'scoreboard' });
on('piano', 69.6, 34.6, { solid: [50, 16], tall: true, id: 'piano' });
on('bench', 58, 37.4, { solid: [32, 8] });
on('bench', 62, 37.4, { solid: [32, 8] });
on('bench', 66, 37.4, { solid: [32, 8] });
on('bench', 58, 39.6, { solid: [32, 8] });
on('bench', 66, 39.6, { solid: [32, 8] });
on('crates', 70.6, 43.4, { solid: [30, 12], tall: true });
on('wardrobe', 54.7, 43.4, { solid: [18, 10], tall: true, id: 'hide' });
wall('banner', 60, 32, 2);

/* Lobby */
wall('exit', 82, 32, 0, { id: 'exit' });
wall('bell', 88, 32, 2, { id: 'bell' });
wall('clock', 86, 32, 14);
wall('portrait', 79, 32, 10, { id: 'portrait3' });
wall('intercom', 90.4, 32, 12, { id: 'ic_lobby' });
on('exam_desk', 84.5, 37, { solid: [46, 14], id: 'exam' });
on('plant', 78, 33, { solid: [12, 8] });
on('plant', 91, 33, { solid: [12, 8] });
on('bench', 79.6, 40.6, { solid: [32, 8] });
on('bench', 89.4, 40.6, { solid: [32, 8] });
on('papers_0', 82, 39.6, { flat: true });
on('papers_2', 87.6, 38.6, { flat: true });

/* Service corridor */
for (const x of [14, 24, 38, 52, 70, 80]) wall('pipes', x, 48, 20);
on('crates', 20, 48.9, { solid: [30, 10] });
on('crates', 47, 48.9, { solid: [30, 10] });
on('bin', 66, 48.8, { solid: [8, 5] });
on('locker', 36, 48.4, { solid: [16, 6], id: 'hide' });
on('locker', 75, 48.4, { solid: [16, 6], id: 'hide' });
on('puddle', 33, 50, { flat: true });
on('puddle', 57, 50.4, { flat: true });

export const PROPS: readonly Prop[] = props;

/** Ceiling lamps: some work only after the power is back. */
export const LAMPS: Array<{ x: number; y: number; power: boolean; r: number; flicker?: boolean }> = [
  { x: T(14), y: T(13.2), power: false, r: 92, flicker: true },
  { x: T(16), y: T(25), power: true, r: 124 },
  { x: T(34), y: T(25), power: true, r: 124, flicker: true },
  { x: T(52), y: T(25), power: true, r: 124 },
  { x: T(68), y: T(25), power: true, r: 124 },
  { x: T(85), y: T(25), power: true, r: 124, flicker: true },
  { x: T(35), y: T(13), power: false, r: 80 },
  { x: T(64), y: T(13), power: true, r: 92 },
  { x: T(28), y: T(34), power: true, r: 92 },
  { x: T(44.5), y: T(35), power: true, r: 78 },
  { x: T(63), y: T(36), power: true, r: 120 },
  { x: T(84), y: T(36), power: true, r: 120 },
  { x: T(84), y: T(14.5), power: true, r: 92 },
];

export const WAYPOINTS: Array<{ x: number; y: number; room: string }> = [
  [8, 26, 'hall'], [17, 26, 'hall'], [26, 26, 'hall'], [36, 26, 'hall'], [47, 26, 'hall'], [57, 26, 'hall'], [67, 26, 'hall'], [78, 26, 'hall'], [89, 26, 'hall'],
  [33, 19, 'library'], [39, 14, 'library'], [65, 17, 'biology'], [83, 16, 'staff'], [11, 37, 'boiler'], [28, 40, 'maths'], [44, 39, 'cloak'], [62, 41, 'gym'], [57, 35, 'gym'], [84, 41, 'lobby'],
  [12, 49, 'back'], [28, 49, 'back'], [44, 49, 'back'], [60, 49, 'back'], [72, 49, 'back'], [86, 49, 'back'],
].map(([x, y, room]) => ({ x: T(x as number) + 8, y: T(y as number) + 8, room: room as string }));

export const START = { x: T(16.6), y: T(18.5) };
export const DETENTION = { x: T(13), y: T(17) };
export const INVIGILATOR_HOME = { x: T(89) + 8, y: T(26) + 8 };

export class Grid {
  /** 1 = walkable floor. */
  readonly floor = new Uint8Array(COLS * ROWS);
  readonly room: (Room | null)[] = new Array(COLS * ROWS).fill(null);
  readonly passage = new Uint8Array(COLS * ROWS);
  /** Cells covered by furniture, for pathfinding. */
  readonly blocked = new Uint8Array(COLS * ROWS);
  readonly solids: Array<{ x: number; y: number; w: number; h: number; tall: boolean; id?: string }> = [];
  private readonly closed = new Map<string, number[]>();

  constructor() {
    for (const r of ROOMS) for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) { this.floor[this.i(x, y)] = 1; this.room[this.i(x, y)] = r; }
    for (const d of DOORS) {
      const cells: number[] = [];
      for (let n = 0; n < d.len; n += 1) for (const s of d.axis === 'h' ? [0, 1] : [0]) {
        const i = d.axis === 'v' ? this.i(d.x, d.y + n) : this.i(d.x + n, d.y + s);
        if (this.floor[i]) continue;
        this.floor[i] = 1;
        this.passage[i] = 1;
        this.room[i] = ROOMS.find((r) => r.id === d.leads) ?? null;
        cells.push(i);
      }
      if (d.sprite !== 'none' || d.lock.type !== 'none') this.closed.set(d.id, cells);
    }
    for (const p of PROPS) {
      if (!p.solid) continue;
      const [w, h] = p.solid;
      const rect = { x: p.x - w / 2, y: p.y - h, w, h, tall: Boolean(p.tall), id: p.id };
      this.solids.push(rect);
      this.markSolid(rect, 1);
    }
  }

  private markSolid(rect: { x: number; y: number; w: number; h: number }, value: 0 | 1) {
    for (let cy = Math.floor(rect.y / TILE); cy <= Math.floor((rect.y + rect.h - 1) / TILE); cy += 1)
      for (let cx = Math.floor(rect.x / TILE); cx <= Math.floor((rect.x + rect.w - 1) / TILE); cx += 1) {
        const ox = Math.min(rect.x + rect.w, (cx + 1) * TILE) - Math.max(rect.x, cx * TILE);
        const oy = Math.min(rect.y + rect.h, (cy + 1) * TILE) - Math.max(rect.y, cy * TILE);
        if (ox * oy > 40) this.blocked[this.i(cx, cy)] = value;
      }
  }

  removeSolid(id: string) {
    const n = this.solids.findIndex((s) => s.id === id);
    if (n >= 0) this.markSolid(this.solids.splice(n, 1)[0], 0);
  }

  i(x: number, y: number) {
    return y * COLS + x;
  }

  isFloor(x: number, y: number) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS && this.floor[this.i(x, y)] === 1;
  }

  isClosed(i: number) {
    for (const cells of this.closed.values()) if (cells.includes(i)) return true;
    return false;
  }

  doorOpen(id: string) {
    return !this.closed.has(id);
  }

  openDoor(id: string) {
    this.closed.delete(id);
  }

  /** Cells that are behind a closed door block sight. */
  closedCells(): number[] {
    return [...this.closed.values()].flat();
  }

  walkable(x: number, y: number) {
    if (!this.isFloor(x, y)) return false;
    const i = this.i(x, y);
    return this.blocked[i] === 0 && !this.isClosed(i);
  }

  /** Collision for a small box given by its centre. */
  hits(cx: number, cy: number, hw: number, hh: number): boolean {
    const x0 = Math.floor((cx - hw) / TILE);
    const x1 = Math.floor((cx + hw - 0.01) / TILE);
    const y0 = Math.floor((cy - hh) / TILE);
    const y1 = Math.floor((cy + hh - 0.01) / TILE);
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (!this.isFloor(x, y) || this.isClosed(this.i(x, y))) return true;
    return this.solids.some((s) => cx + hw > s.x && cx - hw < s.x + s.w && cy + hh > s.y && cy - hh < s.y + s.h);
  }

  roomAt(px: number, py: number): Room | null {
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    return this.isFloor(x, y) ? this.room[this.i(x, y)] : null;
  }

  /** Straight line of sight over floor cells. Furniture does not block it; walls and closed doors do. */
  sees(ax: number, ay: number, bx: number, by: number): boolean {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 5);
    for (let n = 1; n < steps; n += 1) {
      const x = Math.floor((ax + ((bx - ax) * n) / steps) / TILE);
      const y = Math.floor((ay + ((by - ay) * n) / steps) / TILE);
      if (!this.isFloor(x, y) || this.isClosed(this.i(x, y))) return false;
    }
    return true;
  }

  nearestWalkable(px: number, py: number): { x: number; y: number } | null {
    const cx = Math.floor(px / TILE);
    const cy = Math.floor(py / TILE);
    for (let r = 0; r < 5; r += 1) for (let y = cy - r; y <= cy + r; y += 1) for (let x = cx - r; x <= cx + r; x += 1) if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === r && this.walkable(x, y)) return { x, y };
    return null;
  }

  /** A* over tiles, returned as pixel centres without the starting cell. */
  path(ax: number, ay: number, bx: number, by: number, throughDoors = false): Array<{ x: number; y: number }> | null {
    const s = this.nearestWalkable(ax, ay);
    const e = this.nearestWalkable(bx, by);
    if (!s || !e) return null;
    const start = this.i(s.x, s.y);
    const goal = this.i(e.x, e.y);
    const came = new Int32Array(COLS * ROWS).fill(-1);
    const cost = new Float32Array(COLS * ROWS).fill(Infinity);
    cost[start] = 0;
    const h = (i: number) => Math.abs((i % COLS) - e.x) + Math.abs(Math.floor(i / COLS) - e.y);
    const open: Array<[number, number]> = [[h(start), start]];
    while (open.length) {
      let best = 0;
      for (let n = 1; n < open.length; n += 1) if (open[n][0] < open[best][0]) best = n;
      const [, cur] = open.splice(best, 1)[0];
      if (cur === goal) {
        const out: Array<{ x: number; y: number }> = [];
        for (let c = goal; c !== start; c = came[c]) out.unshift({ x: (c % COLS) * TILE + 8, y: Math.floor(c / COLS) * TILE + 8 });
        return out;
      }
      const x = cur % COLS;
      const y = Math.floor(cur / COLS);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!this.walkable(x + dx, y + dy) && !(throughDoors && this.isFloor(x + dx, y + dy) && this.blocked[this.i(x + dx, y + dy)] === 0)) continue;
        const n = this.i(x + dx, y + dy);
        const c = cost[cur] + 1;
        if (c < cost[n]) {
          cost[n] = c;
          came[n] = cur;
          open.push([c + h(n), n]);
        }
      }
    }
    return null;
  }
}
