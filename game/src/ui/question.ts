import { ALL_GATES, type DeviceKind, type PlayQuestion } from '@last-lesson/scenario';
import type { Audio } from '../audio';
import { SessionError, type GameSession } from '../platform/session';
import { errorText, tr } from '../i18n';
import { hush, speak } from '../speech';
import { arrowNav, el, ui, wait } from './dom';
import { isTouch, withoutKey } from './touch';

export interface QuestionOutcome {
  result: 'correct' | 'wrong' | 'closed';
  resolved: boolean;
  explanation?: string | null;
}
interface Choice {
  id: string;
  text: string;
}
/** A control for one question type: what to show, and what the answer currently is (null = incomplete). */
interface Control {
  node: HTMLElement;
  value(): unknown | null;
  reset?(): void;
}

const VERB: Record<DeviceKind, string> = { BLACKBOARD: tr('Write it down'), CATALOGUE: tr('Close the drawer'), SPECIMENS: tr('Fix the labels'), BREAKERS: tr('Throw the main switch'), SAFE: tr('Try the handle'), TYPEWRITER: tr('Pull the lever'), EXAM: tr('Hand it in'), LOCKER: tr('Pull the latch'), SCOREBOARD: tr('Confirm'), HIDING: tr('Think it, quietly') };
const WRONG: Record<DeviceKind, string> = { BLACKBOARD: tr('The chalk screeches across the board.'), CATALOGUE: tr('The drawer slams shut.'), SPECIMENS: tr('Glass rings against glass.'), BREAKERS: tr('A spark, and a bang.'), SAFE: tr('The bolt rattles loudly.'), TYPEWRITER: tr('The keys jam with a clatter.'), EXAM: tr('A red line crosses the page.'), LOCKER: tr('The metal door booms.'), SCOREBOARD: tr('The buzzer sounds.'), HIDING: tr('A floorboard creaks.') };

export class QuestionDesk {
  private hints: number;
  constructor(
    private readonly session: GameSession,
    private readonly audio: Audio,
  ) {
    this.hints = Math.max(0, session.data.gameplay.hintsPerSession - session.data.hintsUsed);
  }

  /** Opens the device. `attemptsUsed` comes from stored progress after a recovery. */
  open(question: PlayQuestion, attemptsUsed: number, onWrong: () => void, seconds = this.session.data.gameplay.questionTimeLimit): Promise<QuestionOutcome> {
    const gate = ALL_GATES.find((g) => g.id === question.gateId)!;
    const hiding = gate.device === 'HIDING';
    const limit = hiding ? 1 : this.session.data.gameplay.attemptsPerQuestion;
    const timeLimit = seconds;
    const opened = performance.now();
    return new Promise((resolve) => {
      let busy = false;
      let tries = attemptsUsed;
      let clock: number | undefined;
      const control = this.control(question, gate.device);
      const status = el('p', { class: 'status', role: 'status' });
      const left = el('span', { class: 'tries' });
      const submit = el('button', { class: 'submit', onclick: () => void send() }, VERB[gate.device]);
      const hint = el('button', { class: 'plain', onclick: () => void askHint() });
      const leave = el('button', { class: 'plain', onclick: () => close({ result: 'closed', resolved: false }) }, withoutKey(hiding ? tr('Step out (Esc)') : tr('Step away (Esc)')));
      const notes = question.lesson ? el('details', { class: 'lessonbox' }, el('summary', {}, tr('Open the lesson')), el('p', {}, question.lesson.body), question.lesson.example ? el('p', { class: 'example' }, question.lesson.example) : null) : null;
      const listen = el('button', { class: 'plain listen', 'aria-label': tr('Read the question aloud'), onclick: () => speak(question.prompt, 'question') }, '♪');
      const timer = el('span', { class: 'timer' });
      const box = el(
        'div',
        { class: `veil desk ${gate.device.toLowerCase()}`, role: 'dialog', 'aria-label': tr(gate.title) },
        el(
          'div',
          { class: 'device' },
          el('header', {}, el('b', {}, tr(gate.title)), el('span', { class: 'meta' }, [question.subject && tr(question.subject), question.topic && tr(question.topic)].filter(Boolean).join(', ')), timer, left),
          el('p', { class: 'flavour' }, tr(gate.flavour)),
          el('h2', {}, question.prompt, ' ', listen),
          notes,
          control.node,
          status,
          el('footer', {}, submit, hint, leave),
        ),
      );
      const refresh = () => {
        left.textContent = limit > 1 ? tr('Tries left: {0}', { 0: limit - tries }) : '';
        hint.textContent = this.hints ? tr('Ask Seven for a hint ({0})', { 0: this.hints }) : tr('No hints left');
        hint.disabled = !this.hints || !question.hasHint;
        hint.style.display = question.hasHint ? '' : 'none';
      };
      const close = (o: QuestionOutcome) => {
        if (busy && o.result === 'closed') return;
        clearInterval(clock);
        hush();
        removeEventListener('keydown', key, true);
        box.remove();
        resolve(o);
      };
      const key = (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.code === 'Escape') {
          e.preventDefault();
          close({ result: 'closed', resolved: false });
        } else if (e.code === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          void send();
        }
      };
      const say = (text: string, tone = '') => {
        status.textContent = text;
        status.className = `status ${tone}`;
      };
      const askHint = async () => {
        if (busy) return;
        busy = true;
        try {
          const r = await this.session.hint(question);
          this.hints = r.hintsLeft;
          say(tr('Seven: "{0}"', { 0: r.hint }), 'hint');
          hint.disabled = true;
          hint.textContent = tr('Hint given');
        } catch (error) {
          say(errorText(error as SessionError), 'bad');
        }
        busy = false;
      };
      const send = async (timeout = false) => {
        if (busy) return;
        const value = control.value();
        if (value === null && !timeout) {
          say(tr('It is not complete yet.'));
          return;
        }
        busy = true;
        submit.disabled = true;
        leave.disabled = true;
        say('...');
        try {
          const r = await this.session.answer(question, timeout ? null : value, performance.now() - opened);
          if (r.correct) {
            clearInterval(clock);
            this.audio.play('correct', 0.8);
            box.classList.add('ok');
            say(r.explanation ? tr('Correct. {0}', { 0: r.explanation }) : tr('Correct.'), 'good');
            await this.continueButton(box);
            busy = false;
            close({ result: 'correct', resolved: true, explanation: r.explanation });
            return;
          }
          tries += 1;
          this.audio.play('wrong', 0.7);
          box.classList.add('shake');
          setTimeout(() => box.classList.remove('shake'), 400);
          onWrong();
          if (r.resolved) {
            clearInterval(clock);
            say([timeout && tr('Out of time. '), WRONG[gate.device], !hiding && tr('It gives way anyway.'), r.explanation].filter(Boolean).join(' '), 'bad');
            await this.continueButton(box);
            busy = false;
            close({ result: 'wrong', resolved: true, explanation: r.explanation });
            return;
          }
          say(tr('{0} Not that.', { 0: WRONG[gate.device] }), 'bad');
          control.reset?.();
          refresh();
          if (timeLimit) startClock();
        } catch (error) {
          const e = error as SessionError;
          if (e.code === 'ALREADY_RESOLVED') {
            busy = false;
            close({ result: 'correct', resolved: true });
            return;
          }
          if (e.fatal) {
            busy = false;
            close({ result: 'closed', resolved: false });
            dispatchEvent(new CustomEvent('session-lost', { detail: errorText(e) }));
            return;
          }
          say(tr('{0} Your answer is still here.', { 0: errorText(e) }), 'bad');
        }
        busy = false;
        submit.disabled = false;
        leave.disabled = false;
      };
      const startClock = () => {
        clearInterval(clock);
        let remaining = timeLimit;
        timer.textContent = `${remaining}s`;
        clock = window.setInterval(() => {
          if (busy) return;
          remaining -= 1;
          timer.textContent = `${Math.max(0, remaining)}s`;
          timer.classList.toggle('low', remaining <= 10);
          if (remaining <= 5) this.audio.play('tick', 0.4);
          if (remaining <= 0) {
            clearInterval(clock);
            void send(true);
          }
        }, 1000);
      };
      refresh();
      arrowNav(box, 'button:not([disabled]), input');
      ui.append(box);
      if (timeLimit) startClock();
      setTimeout(() => {
        addEventListener('keydown', key, true);
        // A phone keyboard would cover the question before it is read.
        if (!isTouch()) box.querySelector<HTMLElement>('.control button, .control input')?.focus();
      }, 120);
    });
  }

  private async continueButton(box: HTMLElement) {
    const footer = box.querySelector('footer')!;
    await wait(250);
    await new Promise<void>((resolve) => {
      const b = el('button', { class: 'submit', onclick: () => resolve() }, tr('Continue'));
      footer.replaceChildren(b);
      b.focus();
    });
  }

  private control(q: PlayQuestion, device: DeviceKind): Control {
    switch (q.type) {
      case 'MULTIPLE_CHOICE':
        return this.choices(q.options as Choice[], false, device);
      case 'MULTI_SELECT':
        return this.choices(q.options as Choice[], true, device);
      case 'TRUE_FALSE': {
        const c = this.choices([{ id: 'true', text: tr('True') }, { id: 'false', text: tr('False') }], false, device);
        c.node.classList.add('two');
        return { ...c, value: () => (c.value() === null ? null : c.value() === 'true') };
      }
      case 'TEXT':
        return this.text();
      case 'MATCHING':
        return this.matching(q.options as { left: Choice[]; right: Choice[] });
      case 'ORDERING':
        return this.ordering((q.options as { items: Choice[] }).items);
      case 'PUZZLE':
        return this.dials((q.options as { dials: string[][] }).dials);
      default:
        return this.text();
    }
  }

  private choices(options: Choice[], many: boolean, device: DeviceKind): Control {
    const picked = new Set<string>();
    const buttons = options.map((o, i) => {
      const b = el('button', { role: many ? 'checkbox' : 'radio', 'aria-checked': 'false', onclick: () => toggle(o.id) }, el('b', {}, many ? '' : String.fromCharCode(65 + i)), el('span', {}, o.text));
      b.dataset.id = o.id;
      return b;
    });
    const toggle = (id: string) => {
      if (many) {
        if (!picked.delete(id)) picked.add(id);
      } else {
        picked.clear();
        picked.add(id);
      }
      this.audio.play(device === 'BREAKERS' ? 'switch' : 'tick', 0.5);
      for (const b of buttons) {
        b.classList.toggle('on', picked.has(b.dataset.id!));
        b.setAttribute('aria-checked', String(picked.has(b.dataset.id!)));
      }
    };
    return {
      node: el('div', { class: `control ${many ? 'switches' : 'choices'}`, role: many ? 'group' : 'radiogroup' }, ...buttons),
      value: () => (picked.size ? (many ? [...picked] : [...picked][0]) : null),
    };
  }

  private text(): Control {
    const input = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', spellcheck: 'false', 'aria-label': tr('Your answer'), oninput: () => this.audio.play('type', 0.35, 0.9 + Math.random() * 0.3) });
    return { node: el('div', { class: 'control typed' }, input), value: () => input.value.trim() || null };
  }

  /** Pick a label on the left, then its partner on the right. Pairs are shown by shared numbers. */
  private matching(options: { left: Choice[]; right: Choice[] }): Control {
    const pairs = new Map<string, string>();
    let active: string | null = null;
    const make = (c: Choice, side: 'l' | 'r') => {
      const b = el('button', { onclick: () => (side === 'l' ? pickLeft(c.id) : pickRight(c.id)) }, el('i'), el('span', {}, c.text));
      b.dataset.id = c.id;
      return b;
    };
    const left = options.left.map((c) => make(c, 'l'));
    const right = options.right.map((c) => make(c, 'r'));
    const paint = () => {
      const order = options.left.map((l) => l.id);
      for (const b of left) {
        const r = pairs.get(b.dataset.id!);
        b.classList.toggle('active', active === b.dataset.id);
        b.dataset.pair = r ? String(order.indexOf(b.dataset.id!) + 1) : '';
        b.querySelector('i')!.textContent = b.dataset.pair;
      }
      for (const b of right) {
        const owner = [...pairs].find(([, r]) => r === b.dataset.id)?.[0];
        b.dataset.pair = owner ? String(order.indexOf(owner) + 1) : '';
        b.querySelector('i')!.textContent = b.dataset.pair;
      }
    };
    const pickLeft = (id: string) => {
      active = active === id ? null : id;
      this.audio.play('tick', 0.4);
      paint();
    };
    const pickRight = (id: string) => {
      if (!active) active = options.left.find((l) => !pairs.has(l.id))?.id ?? null;
      if (!active) return;
      for (const [l, r] of pairs) if (r === id) pairs.delete(l);
      pairs.set(active, id);
      active = options.left.find((l) => !pairs.has(l.id))?.id ?? null;
      this.audio.play('wood', 0.4);
      paint();
    };
    active = options.left[0].id;
    paint();
    return {
      node: el('div', { class: 'control matching' }, el('div', {}, ...left), el('div', {}, ...right)),
      value: () => (pairs.size === options.left.length ? Object.fromEntries(pairs) : null),
    };
  }

  private ordering(items: Choice[]): Control {
    const order = [...items];
    const list = el('ol', { class: 'control ordering' });
    const move = (from: number, to: number, focus = true) => {
      if (to < 0 || to >= order.length || from === to) return;
      const [x] = order.splice(from, 1);
      order.splice(to, 0, x);
      this.audio.play('book', 0.5);
      paint();
      if (focus) list.children[to]?.querySelector<HTMLElement>('button')?.focus();
    };
    const paint = () => {
      list.replaceChildren(
        ...order.map((o, i) => {
          const li = el('li', { draggable: 'true' }, el('b', {}, String(i + 1)), el('span', {}, o.text), el('button', { 'aria-label': tr('Move {0} up', { 0: o.text }), onclick: () => move(i, i - 1) }, '▲'), el('button', { 'aria-label': tr('Move {0} down', { 0: o.text }), onclick: () => move(i, i + 1) }, '▼'));
          li.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', String(i)));
          li.addEventListener('dragover', (e) => e.preventDefault());
          li.addEventListener('drop', (e) => {
            e.preventDefault();
            move(Number(e.dataTransfer?.getData('text/plain')), i, false);
          });
          return li;
        }),
      );
    };
    paint();
    return { node: list, value: () => order.map((o) => o.id) };
  }

  private dials(dials: string[][]): Control {
    const pos = dials.map(() => 0);
    let touched = false;
    const faces: HTMLElement[] = [];
    const turn = (d: number, by: number) => {
      touched = true;
      pos[d] = (pos[d] + by + dials[d].length) % dials[d].length;
      faces[d].textContent = dials[d][pos[d]];
      this.audio.play('tick', 0.5, 0.9 + Math.random() * 0.2);
    };
    const node = el(
      'div',
      { class: 'control dials' },
      ...dials.map((symbols, d) => {
        const face = el('strong', { 'aria-live': 'polite' }, symbols[0]);
        faces.push(face);
        const col = el('div', { class: 'dial' }, el('button', { 'aria-label': tr('Dial {0} up', { 0: d + 1 }), onclick: () => turn(d, 1) }, '▲'), face, el('button', { 'aria-label': tr('Dial {0} down', { 0: d + 1 }), onclick: () => turn(d, -1) }, '▼'));
        col.addEventListener('wheel', (e) => {
          e.preventDefault();
          turn(d, e.deltaY < 0 ? 1 : -1);
        });
        return col;
      }),
    );
    node.addEventListener('keydown', (e) => {
      const d = [...node.children].findIndex((c) => c.contains(document.activeElement));
      if (d < 0 || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      e.stopPropagation();
      turn(d, e.key === 'ArrowUp' ? 1 : -1);
    });
    return { node, value: () => (touched ? pos.map((p, d) => dials[d][p]) : null) };
  }
}
