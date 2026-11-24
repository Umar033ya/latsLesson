import { LOBBY_COLORS, PHRASES, type LobbyStanding, type LobbyStatus, type PhraseId } from '@last-lesson/scenario';
import { tr } from '../i18n';
import { el, ui } from './dom';

const BUBBLE_MS = 3500;
const FEED_LINES = 4;
const color = (i: number) => LOBBY_COLORS[i] ?? LOBBY_COLORS[0];
export const phraseText = (id: PhraseId) => tr(PHRASES.find((p) => p.id === id)?.text ?? '');

export function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A name above a head, with a speech bubble while somebody talks. Plain DOM, so it stays sharp and unlit. */
export class NameTag {
  private readonly bubble = el('div', { class: 'absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-paper px-5 py-1 text-9 text-ink' });
  private readonly node: HTMLElement;
  private timer = 0;

  constructor(name: string, colorIndex: number) {
    this.node = el('div', { class: 'pointer-events-none absolute left-0 top-0 z-[5] will-change-transform' }, this.bubble, name ? el('div', { class: 'whitespace-nowrap bg-ink/70 px-3 text-7', style: `color:${color(colorIndex)}` }, name) : null);
    ui.append(this.node);
  }

  say(id: PhraseId) {
    this.bubble.textContent = phraseText(id);
    this.bubble.classList.remove('hidden');
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.bubble.classList.add('hidden'), BUBBLE_MS);
  }

  /** Screen position in game pixels. */
  place(x: number, y: number, opacity: number) {
    this.node.style.transform = `translate(calc(var(--u) * ${x.toFixed(1)} - 50%), calc(var(--u) * ${y.toFixed(1)} - 100%))`;
    this.node.style.opacity = String(opacity);
  }

  destroy() {
    clearTimeout(this.timer);
    this.node.remove();
  }
}

/** Race clock, places and the last phrases, in the corner of the screen. */
export class RoomHud {
  private readonly time = el('div', { class: 'text-13 text-lamp' });
  private readonly list = el('ol', { class: 'm-0 list-none p-0' });
  private readonly feed = el('div', { class: 'mt-4 grid justify-items-start gap-1', role: 'log', 'aria-live': 'polite' });
  private readonly root = el('div', { class: 'pointer-events-none absolute left-6 top-34 z-[6] w-110 text-8 text-fog' }, this.time, this.list, this.feed);
  private base = 0;
  private at = performance.now();
  private running = true;

  constructor(
    private readonly myId: string,
    elapsedMs: number,
  ) {
    this.sync(elapsedMs, 'RUNNING');
    ui.append(this.root);
  }

  sync(elapsedMs: number, status: LobbyStatus) {
    this.base = elapsedMs;
    this.at = performance.now();
    this.running = status === 'RUNNING';
  }

  tick() {
    this.time.textContent = clock(this.base + (this.running ? performance.now() - this.at : 0));
  }

  /** The leaders and, if they are not among them, the player. */
  standings(all: LobbyStanding[], steps: number) {
    const rows = all.slice(0, 4);
    const mine = all.find((s) => s.id === this.myId);
    if (mine && !rows.includes(mine)) rows.splice(3, 1, mine);
    this.list.replaceChildren(
      ...rows.map((s) =>
        el(
          'li',
          { class: `flex items-center gap-3 whitespace-nowrap ${s.id === this.myId ? 'text-paper' : ''} ${s.online || s.outcome ? '' : 'opacity-50'}` },
          el('span', { class: 'w-8 text-right' }, `${all.indexOf(s) + 1}.`),
          el('i', { class: 'inline-block h-5 w-5', style: `background:${color(s.color)}` }),
          el('span', { class: 'max-w-56 overflow-hidden text-ellipsis' }, s.nickname),
          el('span', { class: 'ml-auto' }, s.outcome ? '✓' : `${s.progress}/${steps}`),
        ),
      ),
    );
  }

  said(name: string, colorIndex: number, id: PhraseId) {
    const line = el('div', { class: 'bg-ink/70 px-3' }, el('b', { class: 'font-normal', style: `color:${color(colorIndex)}` }, name), `: ${phraseText(id)}`);
    this.feed.append(line);
    while (this.feed.children.length > FEED_LINES) this.feed.firstChild?.remove();
    setTimeout(() => line.remove(), 7000);
  }

  destroy() {
    this.root.remove();
  }
}
