import { tr } from '../i18n';
import { el } from './dom';
import { icon, type IconName } from './icons';

export const touch = { x: 0, y: 0, run: false };
/** Past the edge of the stick the pupil runs, which is loud. */
const RUN_AT = 1.15;
const IDLE = 0.2;

let layer: HTMLElement | null = null;
let action: HTMLButtonElement | null = null;
let label: HTMLElement | null = null;

export const isTouch = () => layer !== null;
/** Removes a keyboard hint such as "(E)" from the end of a label on phones. */
export const withoutKey = (text: string) => (isTouch() ? text.replace(/\s*\([A-Z][a-z]*\)$/, '') : text);

const press = (code: string) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
export const pressUse = () => press('KeyE');
export const pressJump = () => press('Space');

/** What the big button does right now, or null when there is nothing to use. */
export function setAction(text: string | null) {
  if (!action || !label) return;
  action.dataset.can = text ? 'yes' : 'no';
  label.textContent = text ?? '';
}

/** Dialogs own the screen: the controls step aside. */
export function showTouch(on: boolean) {
  layer?.classList.toggle('hidden', !on);
  if (!on) stop();
}

function stop() {
  touch.x = touch.y = 0;
  touch.run = false;
}

function stick() {
  const knob = el('i', { class: 'absolute inset-[30%] rounded-full bg-white/40' });
  const base = el('div', { class: 'pointer-events-auto absolute bottom-10 left-[max(calc(var(--u)*8),env(safe-area-inset-left))] h-86 w-86 touch-none rounded-full border border-white/30 bg-ink/30 data-[run=yes]:border-lamp', 'aria-hidden': 'true' }, knob);
  let id: number | null = null;
  const move = (e: PointerEvent) => {
    const r = base.getBoundingClientRect();
    const rawX = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const rawY = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const length = Math.hypot(rawX, rawY);
    const k = length > 1 ? 1 / length : 1;
    const [dx, dy] = [rawX * k, rawY * k];
    touch.x = length < IDLE ? 0 : dx;
    touch.y = length < IDLE ? 0 : dy;
    touch.run = length > RUN_AT;
    base.dataset.run = touch.run ? 'yes' : 'no';
    knob.style.transform = `translate(${dx * 70}%, ${dy * 70}%)`;
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    stop();
    base.dataset.run = 'no';
    knob.style.transform = '';
  };
  base.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    base.setPointerCapture(id);
    move(e);
  });
  base.addEventListener('pointermove', (e) => e.pointerId === id && move(e));
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  return base;
}

/** pointerdown, not click: the thumb that steers must not delay the other one. */
function button(name: IconName, title: string, run: () => void, size = 'h-28 w-28') {
  return el('button', { class: `pointer-events-auto touch-none rounded-full border border-white/30 bg-ink/50 text-paper active:bg-lamp active:text-ink ${size}`, 'aria-label': title, onpointerdown: (e: Event) => { e.preventDefault(); run(); } }, el('span', { class: 'grid place-items-center' }, icon(name)));
}

async function fullscreen() {
  try {
    if (document.fullscreenElement) return await document.exitFullscreen();
    await document.documentElement.requestFullscreen();
    await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* not supported: the game works in the page as well */
  }
}

function mount(onTalk: () => void) {
  if (layer) return;
  label = el('span', { class: 'pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap bg-ink/80 px-4 text-9 empty:hidden' });
  action = el('button', { class: 'pointer-events-auto h-46 w-46 touch-none rounded-full border-2 border-white/25 bg-ink/50 text-center text-14 text-paper opacity-50 active:bg-lamp active:text-ink data-[can=yes]:border-lamp data-[can=yes]:opacity-100', 'aria-label': tr('Use'), onpointerdown: (e: Event) => { e.preventDefault(); pressUse(); } }, el('span', { class: 'grid place-items-center' }, icon('use', 'h-24 w-24')));
  const right = 'right-[max(calc(var(--u)*8),env(safe-area-inset-right))]';
  layer = el(
    'div',
    { class: 'pointer-events-none fixed inset-0 z-10 hidden select-none font-dot text-9 text-paper' },
    stick(),
    el(
      'div',
      { class: `absolute bottom-10 flex items-end gap-6 ${right}` },
      el('div', { class: 'grid grid-cols-2 gap-5' }, button('chalk', tr('Throw chalk'), () => press('KeyQ')), button('battery', tr('Change the battery'), () => press('KeyR')), button('talk', tr('Say to the others'), onTalk), button('jump', tr('Jump'), pressJump), button('torch', tr('Torch'), () => press('KeyF'))),
      el('div', { class: 'relative' }, label, action),
    ),
    el('div', { class: `absolute top-34 flex gap-5 ${right}` }, button('notebook', tr('Notebook'), () => press('KeyJ'), 'h-24 w-24'), button('full', tr('Full screen'), () => void fullscreen(), 'h-24 w-24'), button('pause', tr('Pause'), () => press('Escape'), 'h-24 w-24')),
  );
  document.body.append(
    layer,
    el(
      'div',
      { class: 'fixed inset-0 z-50 hidden place-items-center bg-ink p-24 text-center font-dot text-[18px] text-paper portrait:grid' , id: 'rotate' },
      el('div', { class: 'grid justify-items-center gap-[16px]' }, el('div', { class: 'h-[92px] w-[52px] animate-[turn_2.4s_ease-in-out_infinite] rounded border-2 border-lamp' }), el('p', {}, tr('Turn the phone sideways')), el('button', { class: 'border border-steel px-[18px] py-[10px]', onclick: () => void fullscreen() }, tr('Full screen'))),
    ),
  );
  document.body.classList.add('touching');
}

/** Phones get the controls at once, a laptop with a touch screen at the first touch. */
export function mountTouch(onTalk: () => void) {
  if (matchMedia('(pointer: coarse)').matches) mount(onTalk);
  else addEventListener('touchstart', () => mount(onTalk), { once: true, passive: true });
}
