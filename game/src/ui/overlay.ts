import type { Audio } from '../audio';
import type { Line } from '../story';
import { setSetting, settings } from '../settings';
import { LOCALE_NAMES, LOCALES, type LessonCard } from '@last-lesson/scenario';
import { tr, getLanguage, setLanguage } from '../i18n';
import { canSpeak, hush, speak } from '../speech';
import { arrowNav, asset, el, ui, wait } from './dom';
import { isTouch, pressUse, setAction, showTouch, withoutKey } from './touch';

const NAMES: Record<Line['who'], string> = { me: '', voice: tr('SEVEN'), invigilator: tr('THE INVIGILATOR'), narration: '' };

/** Every in-game panel that is not a question: dialogue, notes, HUD, pause, fades. */
export class Overlay {
  private readonly hud = el('div', { id: 'hud', 'aria-live': 'off' });
  private readonly promptBox = el('div', { id: 'prompt' });
  private readonly toastBox = el('div', { id: 'toast', role: 'status' });
  private readonly titleBox = el('div', { id: 'roomname' });
  private readonly fadeBox = el('div', { id: 'fade' });
  private readonly link = el('div', { id: 'link', role: 'status' });
  private battery = el('i');
  private spare = el('span', { class: 'spare' });
  private marks = el('span', { class: 'marks' });
  private items = el('div', { class: 'items' });
  private goal = el('div', { class: 'goal' });
  private clock = el('span', { class: 'clock' });
  private noise = el('i');
  private toastTimer = 0;
  private readonly coachBox = el('div', { id: 'coach', role: 'status' });
  private depth = 0;
  private hudOn = false;
  private shownPrompt: string | null = null;
  playerName = '';

  constructor(private readonly audio: Audio) {
    this.hud.append(
      el('div', { class: 'left' }, el('div', { class: 'bat' }, el('b', {}, tr('TORCH')), el('span', { class: 'bar' }, this.battery), this.spare), el('div', { class: 'bat noise' }, el('b', {}, tr('NOISE')), el('span', { class: 'bar' }, this.noise))),
      el('div', { class: 'mid' }, this.goal),
      el('div', { class: 'right' }, this.clock, this.marks, this.items),
    );
    ui.append(this.hud, this.coachBox, this.promptBox, this.titleBox, this.toastBox, this.link, this.fadeBox);
    this.promptBox.addEventListener('pointerdown', pressUse);
    this.showHud(false);
  }

  /** True while a panel owns the keyboard. */
  get busy() {
    return this.depth > 0;
  }

  async hold<T>(work: () => Promise<T>): Promise<T> {
    this.depth += 1;
    showTouch(false);
    this.prompt(null);
    this.coach(null);
    try {
      return await work();
    } finally {
      this.depth -= 1;
      showTouch(this.depth === 0 && this.hudOn);
    }
  }

  showHud(on: boolean) {
    this.hudOn = on;
    this.hud.classList.toggle('on', on);
    showTouch(on && !this.busy);
  }

  setHud(s: { battery: number; torch: boolean; spare: number; lives: number; maxLives: number; items: string[]; goal: string; noise: number; pages: number; clock: string; chalk: number; torchOwned: boolean; study: boolean }) {
    this.hud.classList.toggle('study', s.study);
    this.hud.classList.toggle('notorch', !s.torchOwned);
    this.battery.style.width = `${Math.round(s.battery)}%`;
    this.battery.className = s.battery < 20 ? 'low' : s.torch ? 'lit' : '';
    this.noise.style.width = `${Math.round(s.noise * 100)}%`;
    this.spare.textContent = s.spare ? `x${s.spare}` : '';
    this.goal.textContent = s.goal;
    this.clock.textContent = s.clock;
    this.marks.textContent = s.study ? '' : '●'.repeat(s.lives) + '×'.repeat(Math.max(0, s.maxLives - s.lives));
    const list = [...s.items.map((i) => ICON[i] ?? i), ...(s.chalk ? [tr('CHALK x{0}', { 0: s.chalk })] : []), ...(s.pages ? [tr('REGISTER {0}/5', { 0: s.pages })] : [])];
    this.items.textContent = list.join('   ');
  }

  prompt(text: string | null) {
    if (text && this.busy) return;
    if (text === this.shownPrompt) return;
    this.shownPrompt = text;
    setAction(text);
    this.promptBox.classList.toggle('on', Boolean(text));
    if (text) this.promptBox.replaceChildren(...(isTouch() ? [] : [el('kbd', {}, 'E')]), text);
  }

  toast(text: string, ms = 2600) {
    this.toastBox.textContent = text;
    this.toastBox.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastBox.classList.remove('on'), ms);
  }

  /** One short instruction at a time, for players who have never played a game like this. */
  coach(text: string | null) {
    this.coachBox.classList.toggle('on', Boolean(text));
    if (text && this.coachBox.textContent !== text) this.coachBox.textContent = text;
  }

  /** A short piece of theory before the question. */
  async lesson(card: LessonCard) {
    await this.hold(
      () =>
        new Promise<void>((resolve) => {
          const close = () => {
            removeEventListener('keydown', key, true);
            hush();
            box.remove();
            resolve();
          };
          const key = (e: KeyboardEvent) => {
            if (['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code)) {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          };
          const box = el('div', { class: 'veil', role: 'dialog', 'aria-label': card.title }, el('div', { class: 'note lesson' }, el('span', { class: 'kicker' }, tr('A short lesson')), el('h2', {}, card.title), el('p', {}, card.body), card.example ? el('p', { class: 'example' }, card.example) : null, el('button', { class: 'plain', onclick: close }, withoutKey(tr('Got it, to the question (E)')))));
          ui.append(box);
          this.audio.play('paper', 0.6);
          speak(`${card.title}. ${card.body}`, 'voice');
          setTimeout(() => addEventListener('keydown', key, true), 400);
        }),
    );
  }

  /** Everything learned so far, readable at any moment. */
  async notebook(data: { lessons: LessonCard[]; learned: Array<{ q: string; a: string; ok: boolean }>; pages: Array<{ title: string; body: string }> }) {
    await this.hold(
      () =>
        new Promise<void>((resolve) => {
          const close = () => {
            removeEventListener('keydown', key, true);
            box.remove();
            resolve();
          };
          const key = (e: KeyboardEvent) => {
            if (['KeyJ', 'Escape'].includes(e.code)) {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          };
          const block = (title: string, items: HTMLElement[]) => (items.length ? el('section', {}, el('h3', {}, title), ...items) : null);
          const box = el(
            'div',
            { class: 'veil', role: 'dialog', 'aria-label': tr('Notebook') },
            el(
              'div',
              { class: 'note notebook', tabindex: '0' },
              el('h2', {}, tr('Notebook')),
              block(tr('Lessons'), data.lessons.map((l) => el('details', {}, el('summary', {}, l.title), el('p', {}, l.body), l.example ? el('p', { class: 'example' }, l.example) : null))),
              block(tr('What you worked out'), data.learned.map((l) => el('p', { class: l.ok ? 'ok' : 'no' }, `${l.ok ? '✓' : '✗'} ${l.q} ${l.a}`))),
              block(tr('Register pages'), data.pages.map((p) => el('details', {}, el('summary', {}, p.title), el('p', {}, p.body)))),
              !data.lessons.length && !data.learned.length && !data.pages.length ? el('p', {}, tr('Nothing is written here yet.')) : null,
              el('button', { class: 'plain', onclick: close }, withoutKey(tr('Close the notebook (J)'))),
            ),
          );
          ui.append(box);
          this.audio.play('paper', 0.6);
          box.querySelector<HTMLElement>('.notebook')?.focus();
          setTimeout(() => addEventListener('keydown', key, true), 150);
        }),
    );
  }

  roomName(text: string) {
    this.titleBox.textContent = text;
    this.titleBox.classList.remove('on');
    void this.titleBox.offsetWidth;
    this.titleBox.classList.add('on');
  }

  setLink(state: 'online' | 'retrying') {
    this.link.textContent = state === 'retrying' ? tr('The line is crackling. Reconnecting...') : '';
    this.link.classList.toggle('on', state === 'retrying');
  }

  async fade(on: boolean, ms = 500) {
    this.fadeBox.style.transitionDuration = `${ms}ms`;
    this.fadeBox.classList.toggle('on', on);
    await wait(ms);
  }

  async talk(lines: Line[]) {
    if (!lines.length) return;
    await this.hold(async () => {
      const face = el('div', { class: 'face' });
      const name = el('div', { class: 'name' });
      const text = el('p');
      const box = el('div', { class: 'talk', role: 'dialog', 'aria-live': 'polite', tabindex: '-1' }, face, el('div', { class: 'body' }, name, text, el('span', { class: 'next', 'aria-hidden': 'true' }, '▼')));
      ui.append(box);
      box.focus();
      for (const line of lines) {
        const portrait = line.who === 'me' ? `face_${line.face ?? 'calm'}` : line.who === 'voice' ? 'voice' : line.who === 'invigilator' ? 'face_invigilator' : '';
        face.className = `face ${portrait}`;
        face.style.display = portrait ? '' : 'none';
        if (portrait) face.style.backgroundImage = asset('faces.png');
        box.dataset.who = line.who;
        name.textContent = line.who === 'me' ? this.playerName.toUpperCase() : NAMES[line.who];
        await this.typeLine(text, line, box);
      }
      box.remove();
    });
  }

  private typeLine(node: HTMLElement, line: Line, box: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      let shown = 0;
      let done = false;
      const finish = () => {
        done = true;
        shown = line.text.length;
        node.textContent = line.text;
        box.classList.add('done');
      };
      node.textContent = '';
      box.classList.remove('done');
      const spoken = speak(line.text, line.who);
      const speed = (line.who === 'invigilator' ? 46 : 24) / settings.textSpeed;
      const timer = window.setInterval(() => {
        if (done) return;
        shown += 1;
        node.textContent = line.text.slice(0, shown);
        if (!spoken && shown % 2 && /\S/.test(line.text[shown - 1] ?? '')) {
          if (line.who === 'me') this.audio.play('blip_0', 0.5);
          else if (line.who === 'voice') this.audio.play('blip_voice', 0.6, 0.95 + Math.random() * 0.2);
          else if (line.who === 'invigilator') this.audio.play('type', 0.25, 0.6);
        }
        if (shown >= line.text.length) finish();
      }, speed);
      const advance = () => {
        if (!done) return finish();
        clearInterval(timer);
        hush();
        removeEventListener('keydown', key);
        box.removeEventListener('pointerdown', advance);
        resolve();
      };
      const key = (e: KeyboardEvent) => {
        if (e.repeat || !['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code)) return;
        e.preventDefault();
        e.stopPropagation();
        advance();
      };
      setTimeout(() => {
        addEventListener('keydown', key);
        box.addEventListener('pointerdown', advance);
      }, 120);
    });
  }

  async note(title: string, body: string, page = false) {
    await this.hold(
      () =>
        new Promise<void>((resolve) => {
          const close = () => {
            removeEventListener('keydown', key, true);
            box.remove();
            this.audio.play('paper', 0.5);
            resolve();
          };
          const key = (e: KeyboardEvent) => {
            if (['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code)) {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          };
          const box = el('div', { class: 'veil', role: 'dialog', 'aria-label': title }, el('div', { class: `note ${page ? 'page' : ''}` }, el('h2', {}, title), el('p', {}, body), el('button', { class: 'plain', onclick: close }, withoutKey(tr('Put it away (E)')))));
          ui.append(box);
          this.audio.play('paper', 0.7);
          setTimeout(() => addEventListener('keydown', key, true), 150);
        }),
    );
  }

  /** Simple list of choices; resolves with the index. */
  choose(title: string, options: string[]): Promise<number> {
    return this.hold(
      () =>
        new Promise<number>((resolve) => {
          const list = options.map((o, i) =>
            el('button', { onclick: () => { box.remove(); resolve(i); } }, o),
          );
          const box = el('div', { class: 'veil', role: 'dialog' }, el('div', { class: 'menu' }, el('h2', {}, title), ...list));
          arrowNav(box);
          ui.append(box);
          list[0].focus();
        }),
    );
  }

  pause(info: { objectives: string[]; live: boolean; canLeave: boolean }): Promise<'resume' | 'leave'> {
    return this.hold(
      () =>
        new Promise((resolve) => {
          const done = (r: 'resume' | 'leave') => {
            removeEventListener('keydown', key, true);
            box.remove();
            resolve(r);
          };
          const key = (e: KeyboardEvent) => {
            if (e.code === 'Escape' || e.code === 'KeyP') {
              e.preventDefault();
              e.stopPropagation();
              done('resume');
            }
          };
          const box = el(
            'div',
            { class: 'veil', role: 'dialog', 'aria-label': tr('Pause') },
            el(
              'div',
              { class: 'max-h-[94%] w-350 max-w-[96%] overflow-auto border-2 border-steel bg-night px-14 py-10' },
              el('h2', { class: 'mb-5 text-16 text-paper' }, tr('Break')),
              el('div', { class: 'mb-8 grid grid-cols-2 gap-5' }, el('button', { class: 'bg-lamp px-10 py-4 text-center text-11 text-ink hover:brightness-110', onclick: () => done('resume') }, tr('Back to the school')), info.canLeave ? el('button', { class: 'border border-steel bg-ink px-10 py-4 text-center text-11 text-paper hover:border-red hover:text-coral', onclick: () => done('leave') }, info.live ? tr('Leave and hand in') : tr('Leave')) : null),
              info.objectives.length ? el('ul', { class: 'goals' }, ...info.objectives.map((o) => el('li', {}, o))) : null,
              settingsPanel(),
              isTouch() ? null : el('p', { class: 'keys' }, tr('WASD or arrows: move    Shift: run    E: use    F: torch    R: battery    Q: throw chalk    J: notebook    V: phrases    Esc: break')),
            ),
          );
          ui.append(box);
          box.querySelector('button')?.focus();
          setTimeout(() => addEventListener('keydown', key, true), 120);
        }),
    );
  }

  message(title: string, text: string, button: string): Promise<void> {
    return this.hold(
      () =>
        new Promise((resolve) => {
          const box = el('div', { class: 'veil solid', role: 'alertdialog' }, el('div', { class: 'menu' }, el('h2', {}, title), el('p', {}, text), el('button', { onclick: () => { box.remove(); resolve(); } }, button)));
          ui.append(box);
          box.querySelector('button')?.focus();
        }),
    );
  }
}

const ICON: Record<string, string> = { torch: '', key_bio: tr('KEY: BIOLOGY'), fuse: tr('FUSE'), key_staff: tr('KEY: STAFF'), clapper: tr('BELL CLAPPER') };

const SETTING = 'flex min-h-16 items-center justify-between gap-6 border-b border-steel/30 py-2';

export function settingsPanel(): HTMLElement {
  const slider = (label: string, key: 'music' | 'sfx' | 'textSpeed' | 'brightness', min: number, max: number) => {
    const percent = () => `${Math.round(settings[key] * 100)}%`;
    const value = el('span', { class: 'w-20 text-right text-8 text-lamp' }, percent());
    const input = el('input', { class: 'h-6 w-48 cursor-pointer accent-lamp', type: 'range', min: String(min), max: String(max), step: '0.1', value: String(settings[key]), oninput: (e: Event) => { setSetting(key, Number((e.target as HTMLInputElement).value)); value.textContent = percent(); } });
    return el('label', { class: SETTING }, el('span', {}, label), el('span', { class: 'flex items-center gap-5' }, input, value));
  };
  const toggle = (label: string, key: 'calmFlashes' | 'lowQuality' | 'voice' | 'guide') =>
    el(
      'label',
      { class: `${SETTING} cursor-pointer` },
      el('span', {}, label),
      el('input', { class: 'peer sr-only', type: 'checkbox', role: 'switch', checked: settings[key], onchange: (e: Event) => setSetting(key, (e.target as HTMLInputElement).checked) }),
      el('span', { class: 'relative h-11 w-22 shrink-0 border border-steel bg-ink after:absolute after:left-1 after:top-1 after:h-7 after:w-8 after:bg-fog after:transition-transform peer-checked:border-lamp peer-checked:bg-lamp/30 peer-checked:after:translate-x-10 peer-checked:after:bg-lamp peer-focus-visible:outline peer-focus-visible:outline-lamp', 'aria-hidden': 'true' }),
    );
  const language = el('div', { class: 'grid grid-cols-3 gap-4', role: 'radiogroup', 'aria-label': tr('Language') }, ...LOCALES.map((l) => el('button', { role: 'radio', lang: l, 'aria-checked': String(l === getLanguage()), class: `border px-6 py-3 text-center text-10 ${l === getLanguage() ? 'border-lamp bg-lamp text-ink' : 'border-steel bg-ink text-paper hover:border-lamp'}`, onclick: () => l !== getLanguage() && setLanguage(l) }, LOCALE_NAMES[l])));
  const group = (title: string, ...rows: HTMLElement[]) => el('section', {}, el('h3', { class: 'mb-1 mt-6 text-9 font-normal text-lamp' }, title), ...rows);
  return el(
    'div',
    { class: 'grid grid-cols-2 gap-x-14 text-10 text-paper' },
    el('div', { class: 'col-span-2' }, language),
    group(tr('Sound'), slider(tr('Music'), 'music', 0, 1), slider(tr('Sounds'), 'sfx', 0, 1), toggle(canSpeak() ? tr('Read aloud') : tr('Read aloud (no voice for this language in your browser)'), 'voice')),
    group(tr('Picture'), slider(tr('Brightness'), 'brightness', 0.8, 1.8), toggle(tr('No lightning flashes'), 'calmFlashes'), toggle(tr('Simple lighting (older devices)'), 'lowQuality')),
    group(tr('Help'), slider(tr('Text speed'), 'textSpeed', 0.5, 3), toggle(tr('Arrow to the next task'), 'guide')),
  );
}
