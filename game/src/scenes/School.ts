import Phaser from 'phaser';
import { gatesFor, THEMES, type Facing, type LessonCard, type LobbySync, type PhraseId, type PlayQuestion, type SessionOutcome, type SessionSummary } from '@last-lesson/scenario';
import type { Audio } from '../audio';
import type { GameSession } from '../platform/session';
import { SessionError } from '../platform/session';
import { settings } from '../settings';
import { INSPECT, NOTES, OBJECTIVES, PAGES, story, type Line } from '../story';
import { errorText, tr } from '../i18n';
import type { Overlay } from '../ui/overlay';
import { QuestionDesk } from '../ui/question';
import { NameTag, RoomHud } from '../ui/room';
import { isTouch, showTouch, touch } from '../ui/touch';
import { PhraseWheel } from '../ui/wheel';
import { InvigilatorMind, TUNING, type AiState } from '../world/ai';
import { bakeSchool } from '../world/bake';
import { Friends, skin } from '../world/friends';
import { Occluders, type Light, type LightPipeline } from '../world/lighting';
import { COLS, DETENTION, DOORS, Grid, INVIGILATOR_HOME, LAMPS, PROPS, ROWS, TILE, WAYPOINTS, type Door, type Prop } from '../world/map';
import { parseState, type GameState } from '../world/state';

export interface SchoolResult {
  summary?: SessionSummary;
  pages: number;
  /** The host ended the game; the server has already recorded the result. */
  ended?: boolean;
  /** Set when the session can no longer continue on the server. */
  lost?: string;
}
interface Init {
  session: GameSession;
  audio: Audio;
  overlay: Overlay;
  done: (r: SchoolResult) => void;
}
interface Thing {
  x: number;
  y: number;
  r: number;
  label: () => string | null;
  use: () => Promise<void> | void;
  sprite?: Phaser.GameObjects.Image;
}

const WALK = 62;
const RUN = 100;
/** Time between two position reports in a room. */
const SYNC_MS = 700;
const SYNC_RETRY_MS = 2500;
const HW = 5;
const HH = 3;

export class School extends Phaser.Scene {
  private init_!: Init;
  private s!: GameState;
  private grid!: Grid;
  private player!: Phaser.GameObjects.Sprite;
  private inv!: Phaser.GameObjects.Sprite;
  private mind!: InvigilatorMind;
  private pipe: LightPipeline | null = null;
  private occ!: Occluders;
  private things: Thing[] = [];
  private doors = new Map<string, Phaser.GameObjects.Image>();
  private windows: Phaser.GameObjects.Image[] = [];
  private propSprites = new Map<string, Phaser.GameObjects.Image>();
  private keys = new Set<string>();
  private desk!: QuestionDesk;
  private questions = new Map<string, PlayQuestion>();
  private attempts = new Map<string, number>();
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private torch = false;
  private face = new Phaser.Math.Vector2(0, 1);
  private aim = new Phaser.Math.Vector2(0, 1);
  private hidden: Thing | null = null;
  private frozen = true;
  private over = false;
  private noise = 0;
  private stepT = 0;
  private saveT = 0;
  private flash = 0;
  private nextFlash = 14;
  private dread = 0;
  private heartT = 0;
  private penT = 0;
  private roomId = '';
  private near: Thing | null = null;
  private chalkFly: Phaser.GameObjects.Image | null = null;
  private lowWarned = false;
  private roomSeen: string | null = null;
  private guide!: Phaser.GameObjects.Triangle;
  private guideT = 0;
  private guideTo: { x: number; y: number } | null = null;
  private walked = 0;
  private unlisten: Array<() => void> = [];
  private wheel!: PhraseWheel;
  private friends: Friends | null = null;
  private room: RoomHud | null = null;
  private myTag!: NameTag;
  /** Suffix of the walk cycles that match the scarf. */
  private look = '';
  private phrase: PhraseId | null = null;

  constructor() {
    super('School');
  }

  init(data: Init) {
    this.init_ = data;
  }

  private get session() {
    return this.init_.session;
  }
  private get audio() {
    return this.init_.audio;
  }
  private get ui() {
    return this.init_.overlay;
  }
  private get game_() {
    return this.session.data.gameplay;
  }
  private get study() {
    return this.game_.mode === 'STUDY';
  }
  private has(flag: string) {
    return this.s.flags.includes(flag);
  }
  private set(flag: string) {
    if (!this.has(flag)) this.s.flags.push(flag);
  }
  private owns(item: string) {
    return this.s.items.includes(item);
  }

  create() {
    const d = this.session.data;
    Object.assign(this, { things: [], windows: [], torch: false, hidden: null, frozen: true, over: false, noise: 0, near: null, roomId: '', dread: 0, lowWarned: false, flash: 0, roomSeen: null, guideT: 0, guideTo: null, walked: 0, phrase: null });
    this.doors.clear();
    this.propSprites.clear();
    this.keys.clear();
    this.unlisten = [];
    this.s = parseState(d.checkpoint?.state, d.gameplay.lives);
    this.grid = new Grid();
    this.desk = new QuestionDesk(this.session, this.audio);
    this.questions = new Map(d.questions.map((q) => [q.gateId, q]));
    this.attempts = new Map(d.progress.map((p) => [p.gateId, p.attempts]));
    this.ui.playerName = d.student.firstName;
    // The server knows which gates are resolved; a checkpoint can be older than that.
    for (const p of d.progress) if (p.resolved) this.set(p.gateId);
    // Gates that are not part of this campaign stand open.
    for (const g of gatesFor(['classroom', 'library', 'biology', 'boiler', 'maths', 'staff', 'extras', 'lobby'])) if (!this.questions.has(g.id)) this.set(`open:${g.id}`);

    bakeSchool(this, this.grid);
    this.buildProps();
    this.buildDoors();
    for (const id of this.s.doors) this.openDoor(id, true);
    if (this.has('secret')) this.openSecret(true);

    const lobby = d.lobby;
    const texture = lobby ? skin(this, lobby.color) : 'player';
    this.look = lobby ? `_${texture}` : '';
    this.player = this.add.sprite(this.s.x, this.s.y, texture, 0).setOrigin(0.5, 0.94);
    this.inv = this.add.sprite(0, 0, 'invigilator', 0).setOrigin(0.5, 0.97);
    this.mind = new InvigilatorMind(
      INVIGILATOR_HOME,
      {
        path: (a, b) => this.grid.path(a.x, a.y, b.x, b.y),
        sees: (a, b) => this.grid.sees(a.x, a.y, b.x, b.y),
        waypoints: () => WAYPOINTS.filter((w) => (this.game_.tension === 'CALM' ? w.room === 'hall' || w.room === 'back' : true) && this.roomReachable(w.room)),
      },
      TUNING[this.game_.tension],
      { state: (n, p) => this.onMind(n, p), caught: () => void this.caught() },
    );
    if (this.huntStarted() && !this.study) this.mind.wake();

    this.buildThings();
    this.buildLight();
    this.guide = this.add.triangle(0, 0, 0, 0, 9, 4, 0, 8, 0xf6dd96, 0.95).setOrigin(0.5).setDepth(9000).setVisible(false);
    this.dust = this.add.particles(0, 0, 'glow', { scale: { min: 0.008, max: 0.016 }, alpha: { start: 0, end: 0.5, ease: 'Sine.easeInOut' }, speedX: { min: -4, max: 4 }, speedY: { min: -6, max: 2 }, lifespan: 4200, frequency: 170, emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-240, -135, 480, 270) as never, quantity: 1 } as never }).setDepth(8000);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12, 0, 10);
    cam.setRoundPixels(true);
    cam.centerOn(this.player.x, this.player.y);

    this.wheel = new PhraseWheel(
      (id) => this.say(id),
      (open) => showTouch(!open && !this.ui.busy && !this.over),
    );
    this.myTag = new NameTag(lobby?.nickname ?? '', lobby?.color ?? 0);
    this.friends = lobby ? new Friends(this, (peer, id) => this.heard(peer.nickname, peer.color, id)) : null;
    this.room = lobby ? new RoomHud(lobby.playerId, lobby.elapsedMs) : null;
    this.listen(window, 'phrase-wheel', () => this.openWheel(true));
    this.listen(window, 'keydown', (e) => this.onKey(e as KeyboardEvent));
    this.listen(window, 'keyup', (e) => {
      const { code } = e as KeyboardEvent;
      this.keys.delete(code);
      if (code === 'KeyV') this.wheel.release();
    });
    this.listen(window, 'blur', () => this.keys.clear());
    this.listen(window, 'session-lost', (e) => this.lose((e as CustomEvent<string>).detail));
    this.listen(document, 'visibilitychange', () => document.hidden && this.save());
    this.events.once('shutdown', () => this.dispose());
    if (import.meta.env.DEV) (window as unknown as { __school: School }).__school = this;
    void this.begin();
    if (lobby) void this.stayInTouch();
  }

  private dispose() {
    this.unlisten.forEach((f) => f());
    this.wheel.hide();
    this.myTag.destroy();
    this.friends?.destroy();
    this.room?.destroy();
    this.friends = this.room = null;
  }

  /* ---------------------------------------------------------------- together */

  private openWheel(sticky: boolean) {
    if (this.ui.busy || this.frozen || this.over) return;
    this.wheel.show(sticky);
  }

  private say(id: PhraseId) {
    this.phrase = id;
    this.set('tut:talk');
    this.myTag.say(id);
    this.audio.play('blip_0', 0.4);
    const lobby = this.session.data.lobby;
    if (lobby) this.room?.said(lobby.nickname, lobby.color, id);
  }

  private heard(name: string, color: number, id: PhraseId) {
    this.audio.play('blip_1', 0.4);
    this.room?.said(name, color, id);
  }

  private facing(): Facing {
    return Math.abs(this.face.x) > Math.abs(this.face.y) ? (this.face.x < 0 ? 'left' : 'right') : this.face.y < 0 ? 'up' : 'down';
  }

  /** Reports the own position and draws the others until the scene ends. A lost reply is simply skipped. */
  private async stayInTouch() {
    const link = this.session.room;
    while (link && this.room && !this.over) {
      let pause = SYNC_MS;
      const phrase = this.phrase;
      try {
        const reply = await link.sync({ x: Math.round(this.player.x), y: Math.round(this.player.y), dir: this.facing(), moving: this.player.anims.isPlaying, hidden: Boolean(this.hidden), phrase });
        if (this.phrase === phrase) this.phrase = null;
        this.receive(reply);
      } catch (error) {
        if (error instanceof SessionError && error.fatal) return this.lose(errorText(error));
        pause = SYNC_RETRY_MS;
      }
      await new Promise((r) => setTimeout(r, pause));
    }
  }

  private receive(reply: LobbySync) {
    if (this.over || !this.room || !this.friends) return;
    if (reply.status === 'REMOVED') return this.lose(tr('The teacher removed you from this room'));
    this.room.sync(reply.elapsedMs, reply.status);
    this.room.standings(reply.standings, reply.steps);
    this.friends.apply(reply.peers);
    if (reply.status === 'FINISHED') this.endedByHost();
  }

  private endedByHost() {
    this.over = true;
    this.frozen = true;
    this.ui.showHud(false);
    this.init_.done({ ended: true, pages: this.s.pages.length });
  }

  private listen(target: EventTarget, type: string, fn: (e: Event) => void) {
    target.addEventListener(type, fn);
    this.unlisten.push(() => target.removeEventListener(type, fn));
  }

  /** The first rooms are for learning. He starts his rounds after the library. */
  private huntStarted() {
    return this.has('seen') && (this.has('reward:catalogue') || this.game_.tension === 'TENSE');
  }

  private roomReachable(room: string) {
    if (room === 'hall') return true;
    return DOORS.some((d) => (d.leads === room || (room === 'back' && d.id.startsWith('b_'))) && this.grid.doorOpen(d.id)) && (room !== 'back' || this.grid.doorOpen('b_boiler') || this.grid.doorOpen('d_maths') || this.grid.doorOpen('d_gym'));
  }

  /* ---------------------------------------------------------------- building */

  private buildProps() {
    for (const p of PROPS) {
      const img = this.add.image(p.x, p.y, 'world', p.sprite).setOrigin(0.5, 1).setFlipX(Boolean(p.flip));
      img.setDepth(p.flat ? -900 + p.y / 10_000 : p.y - 2);
      if (p.id === 'window') this.windows.push(img);
      else if (p.id) this.propSprites.set(p.id, img);
    }
    for (const l of LAMPS) if (l.y === 25 * TILE) this.add.image(l.x, l.y - 26, 'world', 'lamp').setDepth(-890);
  }

  private buildDoors() {
    for (const d of DOORS) {
      if (d.sprite === 'none') continue;
      const y = (d.y + d.len) * TILE;
      this.doors.set(d.id, this.add.image(d.x * TILE + 8, y, 'world', d.sprite).setOrigin(0.5, 1).setDepth(y - 14));
    }
  }

  private buildLight() {
    this.occ = new Occluders(this, this.grid);
    const cam = this.cameras.main;
    cam.setPostPipeline('Light');
    const p = cam.getPostPipeline('Light') as LightPipeline | LightPipeline[];
    this.pipe = Array.isArray(p) ? p[0] : p;
    const theme = THEMES.find((t) => t.id === this.session.data.branding.theme) ?? THEMES[0];
    this.pipe.tint = [...theme.tint];
    this.pipe.ambient = theme.ambient.map((c) => c * 1.45) as [number, number, number];
    this.pipe.occluder = this.occ.gl;
  }

  private thing(t: Thing) {
    this.things.push(t);
    return t;
  }

  private pickup(id: string, sprite: string, x: number, y: number, label: string, take: () => Promise<void> | void) {
    if (this.s.taken.includes(id)) return;
    const img = this.add.image(x, y, 'world', sprite).setDepth(y + 18);
    this.tweens.add({ targets: img, y: y - 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const t: Thing = {
      x, y, r: 24, sprite: img,
      label: () => (this.s.taken.includes(id) ? null : label),
      use: async () => {
        this.s.taken.push(id);
        img.destroy();
        this.audio.play(sprite === 'key' ? 'keys' : sprite === 'page' || sprite === 'note' ? 'paper' : 'pickup', 0.8);
        await take();
        this.save();
      },
    };
    this.thing(t);
  }

  private buildThings() {
    const P = (id: string) => PROPS.find((p) => p.id === id)!;
    const T = TILE;
    this.pickup('torch', 'torch', 14.7 * T, 14.05 * T, tr('Take the torch'), async () => {
      this.s.items.push('torch');
      this.torch = true;
      this.set('torch');
      this.audio.play('switch');
      await this.ui.talk(story.torch(this.session.data.content.openingLine));
    });
    this.gate('blackboard', P('blackboard').x, 12 * T + 8, 34, tr('Read the blackboard'), () => this.has('torch'), [{ who: 'me', text: tr('Too dark to read. I need some light first.') }], async () => {
      this.openDoor('d_class');
      await this.ui.talk(story.boardDone());
    });
    this.gate('catalogue', P('catalogue').x, P('catalogue').y + 4, 30, tr('Search the card catalogue'), () => true, [], async () => {
      await this.gain('key_bio', story.key());
      if (!this.study) this.mind.wake();
    });
    this.gate('specimens', P('specimens').x, P('specimens').y + 4, 32, tr('Look into the cabinet'), () => true, [], async () => {
      await this.gain('fuse', story.fuse());
    });
    this.gate('breakers', P('breakers').x, 32 * T + 8, 28, tr('Examine the breaker panel'), () => this.owns('fuse') || this.has('power'), story.boilerNoFuse(), async () => {
      this.s.items = this.s.items.filter((i) => i !== 'fuse');
      this.powerOn();
      await this.ui.talk(story.power());
    });
    this.gate('safe', P('safe').x, 32 * T + 8, 26, tr('Examine the safe'), () => true, [], async () => {
      this.propSprites.get('safe')?.setFrame('safe_open');
      await this.gain('key_staff', story.staffKey());
    });
    this.gate('typewriter', P('typewriter').x, P('typewriter').y + 6, 30, tr('Sit down at the typewriter'), () => true, [], async () => {
      await this.gain('clapper', story.clapper());
      if (!this.study) {
        this.mind.relocate({ x: 70 * T, y: 26 * T }, 0);
        this.mind.alarm({ x: this.player.x, y: this.player.y });
      }
    });
    this.gate('locker', P('locker').x, P('locker').y + 6, 22, tr('Read the note on the locker'), () => true, [], async (ok) => {
      this.propSprites.get('locker')?.setFrame('locker_open');
      if (ok) this.s.spare += 2;
      this.ui.toast(ok ? tr('Two batteries') : tr('Empty. The batteries rolled under the floor.'));
    });
    this.gate('scoreboard', P('scoreboard').x, 32 * T + 10, 30, tr('Look at the scoreboard'), () => true, [], async (ok) => {
      if (ok) this.s.chalk += 3;
      this.ui.toast(ok ? tr('A box of chalk drops out of the scoreboard') : tr('The scoreboard goes dark'));
    });
    const exam = P('exam');
    this.thing({
      x: exam.x, y: exam.y + 6, r: 32,
      label: () => (this.examLeft().length ? tr('Sit the final paper') : null),
      use: () => this.exam(),
    });
    const exit = P('exit');
    this.thing({ x: exit.x, y: 32 * T + 8, r: 28, label: () => (this.has('examdone') ? tr('Leave the school') : tr('Try the front door')), use: () => this.tryExit() });
    const bell = P('bell');
    this.thing({ x: bell.x, y: 32 * T + 8, r: 22, label: () => (this.has('examdone') && this.s.pages.length >= 5 ? tr('Hang the clapper and ring the bell') : tr('Look at the bell')), use: () => this.bell() });
    const shelf = P('secret_shelf');
    this.thing({
      x: shelf.x, y: shelf.y + 6, r: 26,
      label: () => (this.has('secret') ? null : tr('Push the crooked shelf')),
      use: async () => {
        this.set('secret');
        this.audio.play('creak');
        this.openSecret(false);
        await this.ui.talk(story.secret());
        this.makeNoise(this.player.x, this.player.y, 150);
      },
    });
    for (const p of PAGES) {
      this.pickup(p.id, 'page', p.x, p.y, tr('Pick up the torn page'), async () => {
        this.s.pages.push(p.id);
        await this.ui.note(p.title, p.body, true);
        this.ui.toast(tr('Register page {0} of 5', { 0: this.s.pages.length }));
      });
    }
    for (const n of NOTES) this.readable(n.x, n.y, n.title, n.body);
    const spots = [[12.5, 25.6], [47.4, 26.4], [66, 16.6], [34, 27]];
    this.session.data.content.notes.forEach((n, i) => this.readable(spots[i][0] * T, spots[i][1] * T, n.title, n.body));
    if (this.session.data.content.announcement) this.thing({ x: 24.4 * T, y: 24 * T + 10, r: 20, label: () => tr('Read the notice board'), use: () => this.ui.note(tr('Notice board'), this.session.data.content.announcement) });
    for (const id of ['portrait1', 'portrait2', 'portrait3', 'piano']) {
      const p = P(id);
      this.thing({ x: p.x, y: p.y + (id === 'piano' ? 6 : 16), r: 20, label: () => (id === 'piano' ? tr('Press a key') : tr('Look at the portrait')), use: async () => { if (id === 'piano') { this.audio.play('correct', 0.25, 0.5); this.makeNoise(p.x, p.y, 120); } await this.ui.talk(INSPECT[id]); } });
    }
    for (const [i, [x, y]] of [[29.6, 26.6], [52.6, 18.9], [72, 19.6], [16.4, 39.6], [33.8, 39.4], [48, 36], [71, 41], [55.4, 49.6]].entries())
      this.pickup(`battery${i}`, 'battery', x * T, y * T, tr('Take the battery'), () => { this.s.spare += 1; this.ui.toast(tr('Battery. R to change it.')); });
    for (const [i, [x, y]] of [[24.8, 26.8], [23.4, 34.2], [79, 15.4], [41.8, 49.8]].entries())
      this.pickup(`chalk${i}`, 'chalk', x * T, y * T, tr('Take the chalk'), () => { this.s.chalk += 1; this.ui.toast(tr('Chalk. Q to throw it.')); });
    for (const p of PROPS) if (p.id === 'hide') this.hideSpot(p);
    for (const d of DOORS) this.doorThing(d);
  }

  private readable(x: number, y: number, title: string, body: string) {
    this.add.image(x, y, 'world', 'note').setDepth(y - 1);
    this.thing({ x, y, r: 18, label: () => tr('Read the note'), use: () => this.ui.note(title, body) });
  }

  private hideSpot(p: Prop) {
    const t: Thing = {
      x: p.x, y: p.y + 5, r: 18,
      label: () => (this.hidden === t ? tr('Step out') : p.sprite === 'locker' ? tr('Hide in the locker') : tr('Hide in the wardrobe')),
      use: () => {
        if (this.hidden === t) return this.unhide();
        const watched = this.mind.state === 'CHASE' && this.mind.canSee(this.perceived());
        this.hidden = t;
        this.audio.play('locker', 0.5);
        this.player.setVisible(false);
        if (watched) {
          this.ui.toast(tr('He saw you get in.'));
          this.time.delayedCall(900, () => { if (this.hidden === t) { this.unhide(); } });
        } else void this.hideQuestion(t);
      },
    };
    this.thing(t);
  }

  /** Hiding is a quick test: a right answer keeps the player quiet, a wrong one gives them away. */
  private async hideQuestion(spot: Thing) {
    if (this.study || this.game_.hidingQuestions === false) return;
    const q = [...this.questions.values()].find((x) => x.gateId.startsWith('hide') && !this.has(x.gateId));
    if (!q) return;
    await new Promise<void>((r) => this.time.delayedCall(550, () => r()));
    if (this.hidden !== spot || this.over || this.frozen || this.ui.busy) return;
    const seconds = { CALM: 30, STANDARD: 22, TENSE: 15 }[this.game_.tension];
    const out = await this.ui.hold(() => this.desk.open(q, 0, () => undefined, seconds));
    if (out.resolved) {
      this.set(q.gateId);
      this.learn(q, out.explanation, out.result === 'correct');
    }
    if (out.result === 'correct') {
      this.mind.calm();
      this.s.battery = Math.min(100, this.s.battery + 10);
      this.ui.toast(tr('You stay quiet. He walks on. Battery +10'));
    } else {
      if (out.resolved) {
        this.makeNoise(this.player.x, this.player.y, 230);
        this.ui.toast(tr('The door creaks. He heard that.'));
      }
      if (this.hidden === spot) this.unhide();
    }
    this.save();
  }

  private learn(q: PlayQuestion, explanation: string | null | undefined, ok: boolean) {
    if (explanation) this.s.learned = [...this.s.learned.filter((l) => l.q !== q.prompt), { q: q.prompt, a: explanation, ok }].slice(-24);
  }

  private lessons(): LessonCard[] {
    const seen = new Map<string, LessonCard>();
    for (const q of this.questions.values()) if (q.lesson && this.has(`lesson:${q.lesson.title}`)) seen.set(q.lesson.title, q.lesson);
    return [...seen.values()];
  }

  private async notebook() {
    this.keys.clear();
    this.set('tut:journal');
    await this.ui.notebook({ lessons: this.lessons(), learned: this.s.learned, pages: PAGES.filter((p) => this.s.pages.includes(p.id)) });
  }

  private unhide() {
    this.hidden = null;
    this.audio.play('locker_close', 0.4);
    this.player.setVisible(true);
  }

  private doorThing(d: Door) {
    if (d.sprite === 'none') return;
    const x = d.x * TILE + 8;
    for (const y of [d.y * TILE - 4, (d.y + d.len) * TILE + 6]) {
      this.thing({
        x, y, r: 20,
        label: () => (this.grid.doorOpen(d.id) ? null : tr('Open the door')),
        use: async () => {
          const l = d.lock;
          const ok = l.type === 'none' || this.s.doors.includes(d.id) || (l.type === 'item' ? this.owns(l.item) : this.has(l.flag) || (l.flag === 'blackboard' && this.has('open:blackboard')));
          if (ok) {
            this.openDoor(d.id);
            if (!this.s.doors.includes(d.id)) this.s.doors.push(d.id);
            // A key that has done its work stays in the lock; the clapper is still needed.
            if (l.type === 'item' && l.item !== 'clapper') this.s.items = this.s.items.filter((i) => i !== l.item);
            this.makeNoise(x, y, 70);
            this.save();
          } else {
            this.audio.play('locked', 0.8);
            this.makeNoise(x, y, 50);
            await this.ui.talk([{ who: 'narration', text: tr(l.text) }]);
          }
        },
      });
    }
  }

  private openDoor(id: string, silent = false) {
    if (this.grid.doorOpen(id) && silent === false && !this.doors.has(id)) return;
    this.grid.openDoor(id);
    if (!this.s.doors.includes(id)) this.s.doors.push(id);
    const img = this.doors.get(id);
    const def = DOORS.find((d) => d.id === id);
    if (img && def) img.setFrame(`${def.sprite}_open`);
    if (!silent) {
      this.audio.play(def?.sprite === 'gate' ? 'locker' : 'door_open', 0.8);
      this.occ.redraw();
    }
  }

  private openSecret(silent: boolean) {
    this.grid.openDoor('secret');
    this.grid.removeSolid('secret_shelf');
    const img = this.propSprites.get('secret_shelf');
    if (img) {
      if (silent) img.y -= 34;
      else this.tweens.add({ targets: img, y: img.y - 34, duration: 1300, ease: 'Sine.easeInOut', onUpdate: () => img.setDepth(img.y - 2) });
      img.setDepth(img.y - 36);
    }
    if (!silent) this.occ.redraw();
  }

  private powerOn() {
    this.set('power');
    this.propSprites.get('breakers')?.setFrame('breaker_on');
    this.audio.play('power_up');
    this.audio.loop('hum', 0.25);
    this.makeNoise(this.player.x, this.player.y, 420);
    this.save();
  }

  /** A device with a question. When the campaign has no question for it, the reward is simply there. */
  private gate(id: string, x: number, y: number, r: number, label: string, ready: () => boolean, notReady: Line[], reward: (correct: boolean) => Promise<void>) {
    this.thing({
      x, y, r,
      label: () => (this.has(`reward:${id}`) ? null : label),
      use: async () => {
        if (!ready()) return this.ui.talk(notReady);
        let ok = true;
        if (!this.has(id) && !this.has(`open:${id}`)) {
          const result = await this.ask(id);
          if (!result.resolved) return;
          ok = result.correct;
        }
        this.set(id);
        this.set(`reward:${id}`);
        await reward(ok);
        this.save();
      },
    });
  }

  private async gain(item: string, lines: Line[]) {
    if (!this.owns(item)) this.s.items.push(item);
    this.audio.play('keys', 0.7);
    await this.ui.talk(lines);
  }

  private async ask(id: string): Promise<{ resolved: boolean; correct: boolean }> {
    const q = this.questions.get(id)!;
    if (q.lesson && this.game_.lessonCards !== false && !this.has(`lesson:${q.lesson.title}`)) {
      await this.ui.lesson(q.lesson);
      this.set(`lesson:${q.lesson.title}`);
    }
    const out = await this.ui.hold(() =>
      this.desk.open(q, this.attempts.get(id) ?? 0, () => {
        this.attempts.set(id, (this.attempts.get(id) ?? 0) + 1);
        const c = this.game_.wrongAnswer;
        if (c.includes('NOISE')) this.makeNoise(this.player.x, this.player.y, 300);
        if (c.includes('BATTERY')) {
          this.s.battery = Math.max(0, this.s.battery - 15);
          this.audio.play('battery_low', 0.6);
        }
      }),
    );
    if (out.resolved) this.learn(q, out.explanation, out.result === 'correct');
    if (out.resolved && out.result === 'wrong') this.makeNoise(this.player.x, this.player.y, 480);
    return { resolved: out.resolved, correct: out.result === 'correct' };
  }

  private examLeft() {
    return ['exam1', 'exam2', 'exam3'].filter((g) => this.questions.has(g) && !this.has(g));
  }

  private async exam() {
    const missing = [...this.questions.values()].filter((q) => !q.gateId.startsWith('exam') && !['locker', 'scoreboard'].includes(q.gateId) && !q.gateId.startsWith('hide') && !this.has(q.gateId));
    if (missing.length) return this.ui.talk([{ who: 'narration', text: tr('The paper is blank. Other rooms are still waiting for answers.') }]);
    for (const id of this.examLeft()) {
      const r = await this.ask(id);
      if (!r.resolved) return;
      this.set(id);
      this.save();
    }
    await this.finishExam();
  }

  private async finishExam() {
    this.set('examdone');
    this.propSprites.get('exit')?.setFrame('exit_open');
    this.audio.play('door_open');
    this.mind.sleepAt(INVIGILATOR_HOME);
    this.save();
    await this.ui.talk(story.examDone(this.s.pages.length));
  }

  private async tryExit() {
    if (!this.has('examdone')) {
      if (!this.examLeft().length && this.owns('clapper')) return this.finishExam();
      this.audio.play('locked');
      return this.ui.talk([{ who: 'narration', text: tr('The front door. It is waiting for the final paper.') }]);
    }
    const i = await this.ui.choose(tr('The street smells of rain.'), [tr('Go home'), tr('Not yet')]);
    if (i === 0) await this.end('ESCAPED', story.escaped(this.session.data.student.firstName));
  }

  private async bell() {
    if (!this.has('examdone')) return this.ui.talk([{ who: 'narration', text: tr('The school bell. Its clapper is missing.') }]);
    if (this.s.pages.length < 5) return this.ui.talk([{ who: 'voice', text: tr('The bell needs the whole register, all five pages. It has to know who to call.') }]);
    this.audio.play('bell');
    this.audio.music(null);
    await this.end('DISMISSED', story.dismissed(this.session.data.student.firstName));
  }

  /* ---------------------------------------------------------------- flow */

  private async begin() {
    const fresh = !this.session.data.checkpoint;
    await this.ui.fade(true, 0);
    this.audio.music('music_explore');
    this.audio.loop('rain', 0.5);
    if (this.has('power')) {
      this.propSprites.get('breakers')?.setFrame('breaker_on');
      this.audio.loop('hum', 0.25);
    }
    if (this.has('examdone')) this.propSprites.get('exit')?.setFrame('exit_open');
    if (this.has('reward:safe')) this.propSprites.get('safe')?.setFrame('safe_open');
    if (this.has('reward:locker')) this.propSprites.get('locker')?.setFrame('locker_open');
    this.ui.showHud(true);
    await this.ui.fade(false, 1400);
    this.frozen = false;
    if (fresh) {
      const goals = this.session.data.campaign.objectives;
      await this.ui.talk(story.wake(this.session.data.student.firstName));
      if (goals.length) this.ui.toast(tr(goals[0]), 4000);
    } else this.ui.toast(tr('You are back where you left off.'));
  }

  private async end(outcome: SessionOutcome, lines: Line[]) {
    if (this.over) return;
    this.over = true;
    this.frozen = true;
    // In a race the clock stops at the door, not after the closing lines. Handing in again is safe.
    if (this.session.room) void this.session.complete(outcome, { pages: this.s.pages.length, caught: this.s.caught }).catch(() => undefined);
    this.audio.music(outcome === 'ESCAPED' || outcome === 'DISMISSED' ? 'music_ending' : null);
    for (const l of ['rain', 'hum', 'music_tension']) this.audio.loop(l, l === 'rain' ? 0.25 : 0);
    await this.ui.fade(true, 900);
    this.ui.showHud(false);
    await this.ui.talk(lines);
    await this.handIn(outcome);
  }

  /** Keeps asking until the server has the result; the attempt is also stored locally. */
  private async handIn(outcome: SessionOutcome) {
    for (;;) {
      try {
        const summary = await this.session.complete(outcome, { pages: this.s.pages.length, caught: this.s.caught });
        await this.ui.fade(false, 0);
        this.init_.done({ summary, pages: this.s.pages.length });
        return;
      } catch (error) {
        if (error instanceof SessionError && error.fatal) return this.lose(errorText(error));
        await this.ui.message(tr('Your paper could not be handed in'), tr('{0} It is saved on this device and will also be sent the next time you open the game.', { 0: errorText(error as SessionError) }), tr('Try again'));
      }
    }
  }

  private lose(text: string) {
    this.over = true;
    this.frozen = true;
    this.ui.showHud(false);
    this.init_.done({ lost: text, pages: this.s.pages.length });
  }

  private save() {
    if (this.over) return;
    this.s.x = Math.round(this.player.x);
    this.s.y = Math.round(this.player.y);
    this.session.save(structuredClone(this.s) as unknown as Record<string, unknown>);
  }

  private async caught() {
    if (this.frozen || this.over) return;
    this.frozen = true;
    this.s.lives -= 1;
    this.s.caught += 1;
    this.torch = false;
    this.audio.play('noticed', 0.5);
    this.audio.music(null);
    await this.ui.fade(true, 350);
    this.mind.relocate(INVIGILATOR_HOME, 6);
    this.inv.setVisible(false);
    this.unhideSilently();
    await this.ui.talk(story.caught(this.session.data.student.firstName));
    if (this.s.lives <= 0) return this.end('DETAINED', story.detained());
    this.player.setPosition(DETENTION.x, DETENTION.y);
    this.cameras.main.centerOn(DETENTION.x, DETENTION.y);
    this.s.battery = Math.max(this.s.battery, 35);
    this.audio.music('music_explore');
    await this.ui.fade(false, 900);
    this.frozen = false;
    this.save();
    await this.ui.talk(story.caughtAgain(this.s.lives));
  }

  private unhideSilently() {
    this.hidden = null;
    this.player.setVisible(true);
  }

  private onMind(next: AiState, previous: AiState) {
    if (next === 'CHASE') {
      this.audio.play('noticed', 0.8);
      this.audio.music('music_chase');
      this.cameras.main.shake(180, 0.004);
      if (!this.has('chaseTip')) {
        this.set('chaseTip');
        this.ui.toast(tr('Break his line of sight and hide'), 3200);
      }
    } else if (previous === 'CHASE') this.audio.music('music_explore');
    if (next === 'INVESTIGATE') this.ui.toast(tr('He heard something'), 1600);
  }

  private makeNoise(x: number, y: number, loud: number) {
    this.noise = Math.min(1, this.noise + loud / 420);
    if (!this.study) this.mind.hear({ x, y }, loud);
  }

  private perceived() {
    const v = this.input_();
    const moving = v.lengthSq() > 0.01 && !this.ui.busy;
    return { pos: { x: this.player.x, y: this.player.y }, torch: this.torch, moving, running: moving && this.running(), hidden: Boolean(this.hidden) };
  }

  /* ---------------------------------------------------------------- input */

  private onKey(e: KeyboardEvent) {
    if (this.over) return;
    if (e.target instanceof HTMLInputElement) return;
    this.keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (this.ui.busy || this.frozen || e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') void this.use();
    if (e.code === 'KeyF') this.toggleTorch();
    if (e.code === 'KeyR') this.changeBattery();
    if (e.code === 'KeyQ') this.throwChalk();
    if (e.code === 'KeyJ') void this.notebook();
    if (e.code === 'KeyV') this.openWheel(false);
    if (e.code === 'Escape' || e.code === 'KeyP') void this.pause();
  }

  private async use() {
    const t = this.hidden ?? this.near;
    if (!t) return;
    this.keys.clear();
    await t.use();
  }

  private async pause() {
    this.keys.clear();
    this.save();
    const r = await this.ui.pause({ objectives: this.session.data.campaign.objectives, live: this.session.live, canLeave: true });
    if (r === 'leave') {
      const sure = await this.ui.choose(this.session.live ? tr('Hand in what you have answered so far?') : tr('Leave the demo?'), [tr('Yes, leave'), tr('Stay')]);
      if (sure === 0) await this.end('LEFT', []);
    }
  }

  private toggleTorch() {
    if (!this.owns('torch')) return;
    if (!this.torch && this.s.battery <= 0) {
      this.audio.play('switch', 0.5, 0.8);
      this.ui.toast(this.s.spare ? tr('Empty. R to change the battery.') : tr('The battery is empty.'));
      return;
    }
    this.torch = !this.torch;
    this.set('tut:torch');
    this.audio.play('switch', 0.6);
  }

  private changeBattery() {
    if (!this.owns('torch') || !this.s.spare) return;
    this.s.spare -= 1;
    this.s.battery = 100;
    this.lowWarned = false;
    this.audio.play('pickup', 0.8);
    this.ui.toast(tr('Fresh battery'));
  }

  private throwChalk() {
    if (!this.s.chalk || this.chalkFly || this.hidden) return;
    this.s.chalk -= 1;
    let x = this.player.x;
    let y = this.player.y;
    for (let i = 0; i < 34; i += 1) {
      const nx = x + this.aim.x * 4;
      const ny = y + this.aim.y * 4;
      const cx = Math.floor(nx / TILE);
      const cy = Math.floor(ny / TILE);
      if (!this.grid.isFloor(cx, cy) || this.grid.isClosed(this.grid.i(cx, cy))) break;
      x = nx;
      y = ny;
    }
    const c = this.add.image(this.player.x, this.player.y - 12, 'world', 'chalk').setDepth(7000);
    this.chalkFly = c;
    this.tweens.add({ targets: c, x, y, angle: 720, duration: 520, onComplete: () => {
      this.audio.at('chalk_hit', x, y, this.player.x, this.player.y, 320);
      if (!this.study) this.mind.hear({ x, y }, 260);
      c.destroy();
      this.chalkFly = null;
    } });
  }

  private input_() {
    const k = this.keys;
    const v = new Phaser.Math.Vector2(touch.x, touch.y);
    if (k.has('KeyA') || k.has('ArrowLeft')) v.x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) v.x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) v.y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) v.y += 1;
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  private running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || touch.run;
  }

  /* ---------------------------------------------------------------- update */

  update(_t: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    if (!this.player) return;
    const free = !this.ui.busy && !this.frozen && !this.over;
    if (free) {
      this.s.seconds += dt;
      this.movePlayer(dt);
      this.scan();
      this.triggers();
      this.coach();
      this.pointGuide(dt);
      this.saveT += dt;
      if (this.saveT > 15) {
        this.saveT = 0;
        this.save();
      }
      if (this.s.seconds > this.game_.sessionMinutes * 60) void this.end('TIMEOUT', story.timeout());
    } else {
      if (!this.hidden) this.player.anims.stop();
      this.guide.setVisible(false);
    }

    // Reading a note or a dialogue never gets a player caught; questions can keep the clock running.
    const worldRuns = free || (this.ui.busy && !this.frozen && !this.over && !this.game_.pauseOnQuestion && document.querySelector('.desk'));
    if (worldRuns && !this.study) this.mind.update(free ? dt : dt * 0.5, this.perceived());
    this.drawInvigilator(dt);
    this.drainTorch(free ? dt : 0);
    this.noise = Math.max(0, this.noise - dt * 0.6);
    this.weather(dt);
    this.friends?.update(dt, this.cameras.main, (x, y) => this.grid.roomAt(x, y - 2)?.id === this.roomId);
    this.myTag.place(this.player.x - this.cameras.main.scrollX, this.player.y - this.cameras.main.scrollY - 26, 1);
    this.room?.tick();
    this.updateLights();
    this.hud();
  }

  private movePlayer(dt: number) {
    const v = this.input_();
    const moving = v.lengthSq() > 0.01 && !this.hidden;
    const run = moving && this.running();
    if (moving) {
      this.face.copy(v);
      this.aim.lerp(v, Math.min(1, dt * 12));
      if (this.aim.lengthSq() > 0.001) this.aim.normalize();
      const speed = (run ? RUN : WALK) * dt;
      this.walked += speed;
      this.slide(v.x * speed, 0, v);
      this.slide(0, v.y * speed, v);
      const dir = Math.abs(v.x) > Math.abs(v.y) ? 'side' : v.y < 0 ? 'up' : 'down';
      this.player.setFlipX(dir === 'side' && v.x < 0);
      this.player.anims.play(`walk_${dir}${this.look}`, true);
      this.player.anims.timeScale = run ? 1.6 : 1;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = run ? 0.26 : 0.42;
        this.audio.play(`step_${Math.floor(Math.random() * 4)}` as 'step_0', run ? 0.5 : 0.22, 0.9 + Math.random() * 0.2);
        this.makeNoise(this.player.x, this.player.y, run ? 130 : 26);
      }
    } else {
      this.player.anims.stop();
      const dir = Math.abs(this.face.x) > Math.abs(this.face.y) ? 1 : this.face.y < 0 ? 2 : 0;
      this.player.setFrame(dir * 4);
    }
    this.player.setDepth(this.player.y);
  }

  /** Axis move with corner rounding, so narrow doors never catch on a pixel. */
  private slide(dx: number, dy: number, v: Phaser.Math.Vector2) {
    const p = this.player;
    const hit = (x: number, y: number) => this.grid.hits(x, y - HH, HW, HH);
    if (!hit(p.x + dx, p.y + dy)) {
      p.x += dx;
      p.y += dy;
      return;
    }
    for (let n = 1; n <= 7; n += 1)
      for (const s of [1, -1]) {
        const ox = dx ? 0 : s * n;
        const oy = dx ? s * n : 0;
        if ((ox && v.x) || (oy && v.y)) continue;
        if (!hit(p.x + dx + ox, p.y + dy + oy) && !hit(p.x + Math.sign(ox), p.y + Math.sign(oy))) {
          p.x += Math.sign(ox) * 0.8;
          p.y += Math.sign(oy) * 0.8;
          return;
        }
      }
  }

  private scan() {
    let best: Thing | null = null;
    let score = Infinity;
    if (!this.hidden) {
      for (const t of this.things) {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d > t.r || !t.label()) continue;
        const s = d - (dx * this.face.x + dy * this.face.y) * 0.4;
        if (s < score) {
          score = s;
          best = t;
        }
      }
    }
    this.near = best;
    this.ui.prompt(this.hidden ? tr('Step out') : (best?.label() ?? null));
  }

  /** Teaches one control at a time, and only until it has been used. */
  private coach() {
    const step =
      this.walked < 60 && !this.has('tut:done') ? (isTouch() ? tr('Walk with the stick on the left') : tr('Walk with W A S D or the arrow keys'))
      : !this.has('torch') ? (this.near ? (isTouch() ? tr('Tap the round button to use it') : tr('Press E to use it')) : tr('Follow the yellow arrow'))
      : !this.has('tut:torch') ? (isTouch() ? tr('The torch button switches the light') : tr('Press F to switch the torch off and on'))
      : this.has('seen') && !this.has('tut:hide') && !this.study && this.mind.state !== 'DORMANT' ? tr('Lockers hide you. Answer quickly and he walks on')
      : this.session.data.lobby && !this.has('tut:talk') ? (isTouch() ? tr('The speech button talks to the others') : tr('Hold V to talk to the others'))
      : this.s.learned.length > 0 && !this.has('tut:journal') ? (isTouch() ? tr('The notebook keeps what you learned') : tr('Press J to open your notebook'))
      : null;
    if (this.hidden) this.set('tut:hide');
    this.ui.coach(this.hidden ? null : step);
  }

  private goalSpot(): { x: number; y: number } | null {
    const at = (id: string) => PROPS.find((p) => p.id === id) ?? null;
    if (!this.has('torch')) return { x: 14.7 * TILE, y: 14.2 * TILE };
    for (const id of ['blackboard', 'catalogue', 'specimens', 'breakers', 'safe', 'typewriter']) if (!this.has(`reward:${id}`)) return at(id);
    return this.has('examdone') ? at('exit') : at('exam');
  }

  /** A small arrow beside the player, along the real path to the next task. */
  private pointGuide(dt: number) {
    this.guideT -= dt;
    if (this.guideT <= 0) {
      this.guideT = 0.5;
      const goal = this.goalSpot();
      const route = goal && this.grid.path(this.player.x, this.player.y - 4, goal.x, goal.y + 10, true);
      this.guideTo = route?.length ? route[Math.min(route.length - 1, 4)] : null;
    }
    const show = settings.guide && Boolean(this.guideTo) && !this.hidden && this.mind.state !== 'CHASE';
    this.guide.setVisible(show);
    if (!show || !this.guideTo) return;
    const a = Math.atan2(this.guideTo.y - this.player.y, this.guideTo.x - this.player.x);
    const r = 24 + Math.sin(this.time.now / 220) * 2;
    this.guide.setPosition(Math.round(this.player.x + Math.cos(a) * r), Math.round(this.player.y - 8 + Math.sin(a) * r * 0.85)).setRotation(a);
  }

  private triggers() {
    const room = this.grid.roomAt(this.player.x, this.player.y - 2);
    if (room && room.id !== this.roomId) {
      this.roomId = room.id;
      this.ui.roomName(tr(room.name));
      const line: Record<string, () => Line[]> = { library: story.library, archive: story.archive, biology: story.biology, maths: story.maths, staff: story.staff, lobby: story.lobby };
      if (line[room.id] && !this.has(`in:${room.id}`)) {
        this.set(`in:${room.id}`);
        this.audio.play('static', 0.4);
        void this.ui.talk(line[room.id]());
      }
      this.save();
    }
    if (!this.has('seen') && this.roomId === 'hall' && this.player.y > 24.6 * TILE) {
      this.set('seen');
      if (this.study) void this.ui.talk(story.study());
      else void this.glimpse();
    }
  }

  /** First sight of the Invigilator: shown, explained, harmless. */
  private async glimpse() {
    this.frozen = true;
    const spot = { x: 33 * TILE, y: 26 * TILE };
    this.mind.pos = { ...spot };
    this.mind.facing = { x: 1, y: 0 };
    this.flash = settings.calmFlashes ? 0.25 : 0.8;
    this.audio.play('thunder', 0.5);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(26 * TILE, 25 * TILE, 1300, 'Sine.easeInOut');
    this.time.delayedCall(900, () => (this.flash = settings.calmFlashes ? 0.25 : 0.7));
    await new Promise<void>((r) => this.time.delayedCall(1900, () => r()));
    await this.ui.talk(story.firstSight());
    cam.pan(this.player.x, this.player.y - 10, 700, 'Sine.easeInOut');
    await new Promise<void>((r) => this.time.delayedCall(720, () => r()));
    cam.startFollow(this.player, true, 0.12, 0.12, 0, 10);
    if (this.huntStarted()) this.mind.relocate({ x: 52 * TILE, y: 26 * TILE }, 1);
    else this.mind.sleepAt(INVIGILATOR_HOME);
    this.frozen = false;
    this.save();
  }

  private drawInvigilator(dt: number) {
    const m = this.mind;
    const shown = m.state !== 'DORMANT' || (this.frozen && this.has('seen') && !this.study && !this.over);
    this.inv.setVisible(shown && !this.study);
    this.inv.setPosition(Math.round(m.pos.x), Math.round(m.pos.y + 4)).setDepth(m.pos.y + 2);
    const f = m.facing;
    const dir = Math.abs(f.x) > Math.abs(f.y) ? 'side' : f.y < 0 ? 'up' : 'down';
    this.inv.setFlipX(dir === 'side' && f.x < 0);
    const set = m.state === 'CHASE' ? 'mark' : 'inv';
    if (m.moving) this.inv.anims.play(`${set}_${dir}`, true);
    else {
      this.inv.anims.stop();
      this.inv.setFrame({ down: 0, side: 8, up: 16 }[dir] + (set === 'mark' ? 4 : 0));
    }
    const d = shown && !this.study ? Math.hypot(m.pos.x - this.player.x, m.pos.y - this.player.y) : 999;
    const want = m.state === 'DORMANT' ? 0 : Phaser.Math.Clamp(1 - d / 190, 0, 1) * (m.state === 'CHASE' ? 1 : 0.75) * (this.game_.tension === 'CALM' ? 0.5 : 1);
    this.dread += (want - this.dread) * Math.min(1, dt * 2);
    this.audio.loop('music_tension', this.over ? 0 : m.state === 'CHASE' ? 0 : this.dread > 0.25 ? this.dread * 0.9 : 0);
    this.penT -= dt;
    if (d < 240 && this.penT <= 0 && m.state !== 'DORMANT') {
      this.penT = 2.5 + Math.random() * 1.5;
      this.audio.at('pen', m.pos.x, m.pos.y, this.player.x, this.player.y, 240, 0.9);
    }
    this.heartT -= dt;
    if (this.dread > 0.45 && this.heartT <= 0 && !this.over) {
      this.heartT = 1.3 - this.dread * 0.6;
      this.audio.play('heart', this.dread * 0.5);
    }
  }

  private drainTorch(dt: number) {
    if (!this.torch) return;
    this.s.battery = Math.max(0, this.s.battery - dt * 0.42 * this.game_.batteryDrain);
    if (this.s.battery < 18 && !this.lowWarned) {
      this.lowWarned = true;
      this.audio.play('battery_low', 0.5);
      this.ui.toast(this.s.spare ? tr('Battery low. R to change it.') : tr('Battery low'));
    }
    if (this.s.battery <= 0) {
      this.torch = false;
      this.audio.play('power_down', 0.4);
    }
  }

  private weather(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.nextFlash -= dt;
    if (this.nextFlash <= 0) {
      this.nextFlash = 18 + Math.random() * 26;
      this.flash = settings.calmFlashes ? 0.08 : 0.42;
      this.time.delayedCall(700 + Math.random() * 1400, () => !this.over && this.audio.play('thunder', 0.28));
    }
    for (const w of this.windows) w.setFrame(this.flash > 0.18 ? 'window_flash' : 'window');
    this.dust.setPosition(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y);
  }

  private updateLights() {
    if (!this.pipe) return;
    const cam = this.cameras.main;
    const t = this.time.now / 1000;
    const list: Light[] = [];
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y) - 8;
    const power = this.has('power');
    if (this.hidden) list.push({ x: px, y: py, r: 46, color: [0.35, 0.42, 0.55], power: 0.7 });
    else {
      list.push({ x: px, y: py, r: 74, color: [0.7, 0.72, 0.86], power: this.torch ? 0.55 : 0.6 });
      if (this.torch) {
        const low = this.s.battery < 18 ? 0.72 + 0.28 * Math.sin(t * 23) * Math.sin(t * 7.3) : 1;
        list.push({ x: px + this.aim.x * 5, y: py + 2 + this.aim.y * 5, r: 178, color: [1.25, 1.08, 0.76], power: 1.15 * low, dir: [this.aim.x, this.aim.y], angle: 0.62 });
      }
    }
    const view = cam.worldView;
    const near = (x: number, y: number, r: number) => x > view.x - r && x < view.right + r && y > view.y - r && y < view.bottom + r;
    const extra: Light[] = [];
    for (const l of LAMPS) {
      if ((l.power && !power) || !near(l.x, l.y, l.r)) continue;
      const f = l.flicker ? (Math.sin(t * 11 + l.x) * Math.sin(t * 3.7 + l.y) > 0.72 ? 0.35 : 1) : 1;
      extra.push({ x: l.x, y: l.y, r: l.r, color: [1.05, 0.88, 0.6], power: 1.1 * f });
    }
    for (const w of this.windows) if (near(w.x, w.y, 70)) extra.push({ x: w.x, y: w.y + 12, r: 62, color: [0.42, 0.56, 0.82], power: 0.55 + this.flash });
    if (this.guide.visible) extra.push({ x: this.guide.x, y: this.guide.y, r: 16, color: [1, 0.9, 0.6], power: 0.8 });
    for (const t2 of this.things) if (t2.sprite?.active && near(t2.x, t2.y, 30)) extra.push({ x: t2.x, y: t2.y - 2, r: 26, color: [0.95, 0.8, 0.45], power: 0.5 + 0.12 * Math.sin(t * 3 + t2.x) });
    for (const f of this.friends?.spots() ?? []) if (near(f.x, f.y, 44)) extra.push({ x: f.x, y: f.y - 8, r: 44, color: [0.7, 0.72, 0.86], power: 0.5 });
    if (this.has('examdone')) {
      const e = PROPS.find((p) => p.id === 'exit')!;
      if (near(e.x, e.y, 150)) extra.push({ x: e.x, y: e.y + 6, r: 150, color: [1.3, 1.05, 0.7], power: 1.1 });
    }
    if (this.inv.visible && this.mind.state === 'CHASE') list.push({ x: this.mind.pos.x, y: this.mind.pos.y - 34, r: 56, color: [0.9, 0.3, 0.28], power: 0.7 });
    else if (this.inv.visible) list.push({ x: this.mind.pos.x, y: this.mind.pos.y - 40, r: 34, color: [0.6, 0.58, 0.48], power: 0.55 });
    extra.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    this.pipe.lights = [...list, ...extra].slice(0, 12);
    const room = this.grid.roomAt(this.player.x, this.player.y - 2);
    if (room) {
      const r = this.pipe.room;
      const k = this.roomSeen === null ? 1 : 0.12;
      this.roomSeen = room.id;
      const want = [room.x * TILE, (room.y - 2) * TILE, (room.x + room.w) * TILE, (room.y + room.h) * TILE];
      for (let i = 0; i < 4; i += 1) r[i] += (want[i] - r[i]) * k;
    }
    this.pipe.cam.x = Math.floor(cam.scrollX);
    this.pipe.cam.y = Math.floor(cam.scrollY);
    this.pipe.flash = this.flash * (this.roomId === 'boiler' || this.roomId === 'archive' || this.roomId === 'back' ? 0.15 : 0.5);
    this.pipe.dread = this.dread;
    this.pipe.steps = settings.lowQuality ? 9 : 22;
    this.pipe.bright = settings.brightness * (power ? 1.12 : 1);
  }

  private hud() {
    const goal = OBJECTIVES.find((o) => o.until === 'end' || (o.until === 'exam3' ? !this.has('examdone') : o.until === 'torch' ? !this.has('torch') : !this.has(`reward:${o.until}`)));
    const left = Math.max(0, this.game_.sessionMinutes * 60 - this.s.seconds);
    this.ui.setHud({
      battery: this.s.battery,
      torch: this.torch,
      torchOwned: this.owns('torch'),
      spare: this.s.spare,
      lives: this.s.lives,
      maxLives: this.game_.lives,
      items: this.s.items.filter((i) => i !== 'torch'),
      goal: goal?.text ?? '',
      noise: this.noise,
      pages: this.s.pages.length,
      chalk: this.s.chalk,
      study: this.study,
      clock: left < 300 ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` : '',
    });
  }
}
