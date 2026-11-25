import type { Tension } from '@last-lesson/scenario';

/** The Invigilator's mind. Pure logic: no rendering, no Phaser, deterministic with an injected random source. */
export type AiState = 'DORMANT' | 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCH' | 'RETURN';

export interface Vec {
  x: number;
  y: number;
}

export interface World {
  path(from: Vec, to: Vec): Vec[] | null;
  sees(from: Vec, to: Vec): boolean;
  /** Patrol points that can be reached right now. */
  waypoints(): Vec[];
}

export interface Perceived {
  pos: Vec;
  torch: boolean;
  moving: boolean;
  running: boolean;
  hidden: boolean;
  jumping?: boolean;
}

export interface Tuning {
  patrol: number;
  alert: number;
  chase: number;
  /** Sight range against a lit torch / without it. */
  sightLit: number;
  sightDark: number;
  hearing: number;
  /** Seconds without contact before a chase becomes a search. */
  memory: number;
  searchTime: number;
  catchRange: number;
}

export const TUNING: Record<Tension, Tuning> = {
  CALM: { patrol: 26, alert: 36, chase: 56, sightLit: 86, sightDark: 34, hearing: 0.7, memory: 1.6, searchTime: 4, catchRange: 10 },
  STANDARD: { patrol: 32, alert: 46, chase: 76, sightLit: 124, sightDark: 44, hearing: 1, memory: 2.6, searchTime: 7, catchRange: 11 },
  TENSE: { patrol: 38, alert: 56, chase: 88, sightLit: 150, sightDark: 54, hearing: 1.25, memory: 3.4, searchTime: 10, catchRange: 12 },
};

export interface AiEvents {
  state?(next: AiState, previous: AiState): void;
  caught?(): void;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export class InvigilatorMind {
  state: AiState = 'DORMANT';
  pos: Vec;
  facing: Vec = { x: 0, y: 1 };
  moving = false;
  private route: Vec[] = [];
  private lastSeen: Vec | null = null;
  private sinceSeen = 0;
  private timer = 0;
  private wait = 0;
  private repath = 0;
  private searchPoints: Vec[] = [];
  /** It reacts after a moment, so a brief glimpse can be escaped. */
  private awareness = 0;

  constructor(
    pos: Vec,
    private readonly world: World,
    readonly tuning: Tuning,
    private readonly events: AiEvents = {},
    private readonly random: () => number = Math.random,
  ) {
    this.pos = { ...pos };
  }

  wake() {
    if (this.state === 'DORMANT') this.enter('PATROL');
  }

  sleepAt(pos: Vec) {
    this.pos = { ...pos };
    this.route = [];
    this.enter('DORMANT');
  }

  /** Sent home after a catch: the player always gets a moment. */
  relocate(pos: Vec, pause: number) {
    this.pos = { ...pos };
    this.route = [];
    this.awareness = 0;
    this.enter('PATROL');
    this.wait = pause;
  }

  hear(at: Vec, loudness: number) {
    if (this.state === 'DORMANT' || this.state === 'CHASE') return;
    if (dist(this.pos, at) > loudness * this.tuning.hearing) return;
    this.lastSeen = { ...at };
    this.enter('INVESTIGATE');
    this.setRoute(at);
    if (!this.route.length) {
      const reachable = this.world.waypoints().filter((point) => this.world.path(this.pos, point));
      if (reachable.length) this.setRoute(reachable.reduce((a, b) => dist(a, at) < dist(b, at) ? a : b));
    }
  }

  /** A right answer in a hiding place: it stops looking here. */
  calm() {
    if (this.state === 'DORMANT' || this.state === 'PATROL') return;
    this.awareness = 0;
    this.lastSeen = null;
    this.enter('RETURN');
  }

  /** A scripted alarm: it knows where the player is, once. */
  alarm(at: Vec) {
    this.wake();
    this.lastSeen = { ...at };
    this.sinceSeen = 0;
    this.enter('CHASE');
    this.setRoute(at);
  }

  canSee(p: Perceived): boolean {
    if (p.hidden || this.state === 'DORMANT') return false;
    const d = dist(this.pos, p.pos);
    if (d < 20) return this.world.sees(this.pos, p.pos);
    // Paper has no eyes: it finds light and movement, not shapes. Standing still in the dark is safe.
    const range = p.torch ? this.tuning.sightLit : p.running ? this.tuning.sightDark * 1.6 : p.moving ? this.tuning.sightDark : 22;
    if (d > range) return false;
    const toward = ((p.pos.x - this.pos.x) * this.facing.x + (p.pos.y - this.pos.y) * this.facing.y) / d;
    if (toward < 0.1 && this.state !== 'CHASE' && d > 40) return false;
    return this.world.sees(this.pos, p.pos);
  }

  update(dt: number, p: Perceived) {
    this.moving = false;
    if (this.state === 'DORMANT') return;
    const seen = this.canSee(p);
    this.awareness = Math.max(0, Math.min(1, this.awareness + (seen ? dt * (dist(this.pos, p.pos) < 48 ? 5 : 2.2) : -dt * 0.8)));

    if (seen && (this.awareness >= 1 || this.state === 'CHASE')) {
      this.lastSeen = { ...p.pos };
      this.sinceSeen = 0;
      if (this.state !== 'CHASE') this.enter('CHASE');
    } else this.sinceSeen += dt;

    switch (this.state) {
      case 'PATROL':
        if (this.wait > 0) this.wait -= dt;
        else if (!this.route.length) {
          if (this.timer > 0) {
            this.wait = 0.6 + this.random() * 2;
            this.timer = 0;
            break;
          }
          const points = this.world.waypoints().filter((w) => dist(w, this.pos) > 40);
          if (points.length) this.setRoute(this.pick(points, p.pos));
          this.timer = 1;
        } else this.walk(this.tuning.patrol, dt);
        break;
      case 'INVESTIGATE':
        if (this.walk(this.tuning.alert, dt)) this.enter('SEARCH');
        break;
      case 'CHASE': {
        this.repath -= dt;
        if (this.lastSeen && this.repath <= 0) {
          this.setRoute(this.lastSeen);
          this.repath = 0.3;
        }
        if (seen && dist(this.pos, p.pos) < 26) this.step(p.pos, this.tuning.chase, dt);
        else this.walk(this.tuning.chase, dt);
        if (!p.hidden && !p.jumping && dist(this.pos, p.pos) < this.tuning.catchRange && this.world.sees(this.pos, p.pos)) {
          this.events.caught?.();
          return;
        }
        if (this.sinceSeen > this.tuning.memory) this.enter('SEARCH');
        break;
      }
      case 'SEARCH':
        this.timer -= dt;
        if (!this.route.length) {
          if (this.wait > 0) {
            this.wait -= dt;
            const a = this.timer * 2.2;
            this.facing = { x: Math.cos(a), y: Math.sin(a) };
          } else {
            const next = this.searchPoints.shift();
            if (next) {
              this.setRoute(next);
              this.wait = 0.9;
            } else this.timer = 0;
          }
        } else this.walk(this.tuning.alert, dt);
        if (this.timer <= 0) this.enter('RETURN');
        break;
      case 'RETURN':
        if (!this.route.length) {
          const points = this.world.waypoints();
          if (points.length) this.setRoute(points.reduce((a, b) => (dist(a, this.pos) < dist(b, this.pos) ? a : b)));
        }
        if (!this.route.length || this.walk(this.tuning.patrol, dt)) this.enter('PATROL');
        break;
      default:
    }
  }

  /** Prefers points at a middle distance from the player: present, but never glued to them. */
  private pick(points: Vec[], player: Vec): Vec {
    const scored = points.map((w) => ({ w, s: Math.abs(dist(w, player) - 190) + this.random() * 260 })).sort((a, b) => a.s - b.s);
    return scored[0].w;
  }

  private enter(next: AiState) {
    const previous = this.state;
    if (next === previous) return;
    this.state = next;
    if (next === 'SEARCH') {
      this.timer = this.tuning.searchTime;
      this.route = [];
      this.wait = 0.8;
      const c = this.lastSeen ?? this.pos;
      this.searchPoints = [0, 1, 2].map(() => ({ x: c.x + (this.random() - 0.5) * 130, y: c.y + (this.random() - 0.5) * 90 }));
    }
    if (next === 'PATROL') {
      this.route = [];
      this.timer = 0;
    }
    if (next === 'RETURN') this.route = [];
    if (next === 'CHASE') this.repath = 0;
    this.events.state?.(next, previous);
  }

  private setRoute(to: Vec) {
    this.route = this.world.path(this.pos, to) ?? [];
  }

  /** Follows the route. True when it has arrived. */
  private walk(speed: number, dt: number): boolean {
    let budget = speed * dt;
    while (this.route.length && budget > 0) {
      const next = this.route[0];
      const d = dist(this.pos, next);
      if (d <= budget) {
        this.pos = { ...next };
        this.route.shift();
        budget -= d;
      } else {
        this.step(next, budget / dt, dt);
        budget = 0;
      }
      this.moving = true;
    }
    return this.route.length === 0;
  }

  private step(to: Vec, speed: number, dt: number) {
    const d = dist(this.pos, to);
    if (d < 0.5) return;
    const f = { x: (to.x - this.pos.x) / d, y: (to.y - this.pos.y) / d };
    this.facing = f;
    const m = Math.min(d, speed * dt);
    this.pos = { x: this.pos.x + f.x * m, y: this.pos.y + f.y * m };
    this.moving = true;
  }
}
