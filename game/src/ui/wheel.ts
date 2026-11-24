import { PHRASES, type PhraseId } from '@last-lesson/scenario';
import { tr } from '../i18n';
import { el, ui } from './dom';

const RADIUS = 82;
const DEAD_ZONE = 0.06;
const SECTOR = 360 / PHRASES.length;

/**
 * Radial menu with ready phrases. Hold V, point, release; or press a digit; on a phone, tap.
 * The game keeps running while it is open.
 */
export class PhraseWheel {
  private root: HTMLElement | null = null;
  private buttons: HTMLElement[] = [];
  private picked = -1;
  private sticky = false;

  constructor(
    private readonly say: (id: PhraseId) => void,
    private readonly toggled: (open: boolean) => void = () => undefined,
  ) {}

  get open() {
    return this.root !== null;
  }

  show(sticky = false) {
    if (this.root) return;
    this.sticky = sticky;
    this.picked = -1;
    this.buttons = PHRASES.map((p, i) => {
      const angle = ((i * SECTOR - 90) * Math.PI) / 180;
      const x = Math.cos(angle) * RADIUS * 1.75;
      const y = Math.sin(angle) * RADIUS;
      return el(
        'button',
        {
          class: 'absolute left-1/2 top-1/2 flex min-w-84 items-center gap-5 border border-steel bg-ink/90 px-6 py-4 text-10 text-paper aria-selected:border-lamp aria-selected:bg-lamp aria-selected:text-ink',
          style: `transform:translate(calc(-50% + var(--u) * ${x.toFixed(1)}),calc(-50% + var(--u) * ${y.toFixed(1)}))`,
          role: 'option',
          'aria-selected': 'false',
          onpointerup: (e: Event) => {
            e.stopPropagation();
            this.choose(i);
          },
        },
        el('span', { class: 'opacity-60', 'aria-hidden': 'true' }, String(i + 1)),
        tr(p.text),
      );
    });
    this.root = el(
      'div',
      { class: 'absolute inset-0 z-[22] bg-[radial-gradient(circle,#05060acc_0%,#05060a66_55%,transparent_80%)]', role: 'listbox', 'aria-label': tr('Say to the others'), onpointerup: () => this.sticky && this.hide() },
      ...this.buttons,
    );
    ui.append(this.root);
    this.toggled(true);
    addEventListener('pointermove', this.point);
    addEventListener('keydown', this.key, true);
  }

  /** The key was let go: say whatever is pointed at. */
  release() {
    if (!this.root || this.sticky) return;
    if (this.picked >= 0) this.choose(this.picked);
    else this.hide();
  }

  hide() {
    if (!this.root) return;
    this.root.remove();
    this.root = null;
    this.toggled(false);
    removeEventListener('pointermove', this.point);
    removeEventListener('keydown', this.key, true);
  }

  private choose(i: number) {
    this.hide();
    this.say(PHRASES[i].id);
  }

  private readonly point = (e: PointerEvent) => {
    if (!this.root) return;
    const r = this.root.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const near = Math.hypot(dx, dy) < r.height * DEAD_ZONE;
    this.mark(near ? -1 : Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) / SECTOR) % PHRASES.length);
  };

  private readonly key = (e: KeyboardEvent) => {
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1];
    if (digit && Number(digit) <= PHRASES.length) {
      e.preventDefault();
      e.stopPropagation();
      this.choose(Number(digit) - 1);
    } else if (e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    }
  };

  private mark(i: number) {
    if (i === this.picked) return;
    this.picked = i;
    this.buttons.forEach((b, n) => b.setAttribute('aria-selected', String(n === i)));
  }
}
