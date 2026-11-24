import { LOBBY_COLORS, type LobbyStanding, type LobbySync, type SessionSummary } from '@last-lesson/scenario';
import type { GameSession, RoomLink } from '../platform/session';
import { arrowNav, asset, el, ui, wait } from './dom';
import { icon, type IconName } from './icons';
import { tr } from '../i18n';
import { settingsPanel } from './overlay';

const platformUrl = () => import.meta.env.VITE_PLATFORM_URL || (import.meta.env.DEV ? 'http://localhost:5173/student' : '/student');

/** Guests have no student page: they return to the room. */
export const homeUrl = (session: GameSession) => (session.data.lobby ? platformUrl().replace(/\/student\/?$/, '/room') : platformUrl());

/** Pages of the platform, next to the game on the same site. */
const site = (path: string) => platformUrl().replace(/\/student\/?$/, '') + path;

const BEVEL = 'shadow-[inset_0_calc(var(--u)*-2)_0_#a8741f,inset_0_calc(var(--u)*1)_0_#f6dd96]';
function menuButton(name: IconName, label: string, run: () => void, main = false) {
  const look = main
    ? `bg-lamp text-ink text-12 py-4 hover:brightness-110 focus-visible:brightness-110 ${BEVEL}`
    : 'border border-steel/70 bg-ink/75 text-paper text-10 py-3 hover:border-lamp hover:text-lamp focus-visible:border-lamp focus-visible:text-lamp';
  return el('button', { class: `flex w-148 items-center gap-7 px-9 outline-none transition-[color,border-color,filter] ${look}`, onclick: run }, icon(name, 'h-11 w-11'), el('span', {}, label));
}

/** A window over the title screen. Escape and the cross close it and return the focus. */
function windowBox(title: string, body: HTMLElement) {
  const back = document.activeElement as HTMLElement | null;
  const close = () => {
    removeEventListener('keydown', key, true);
    box.remove();
    back?.focus();
  };
  const key = (e: KeyboardEvent) => {
    if (e.code !== 'Escape') return;
    e.stopPropagation();
    close();
  };
  const box = el(
    'div',
    { class: 'absolute inset-0 z-40 grid place-items-center bg-black/70 p-8', role: 'dialog', 'aria-label': title, onclick: (e: Event) => e.target === box && close() },
    el(
      'div',
      { class: 'max-h-full w-350 max-w-full overflow-auto border-2 border-steel bg-night shadow-[0_calc(var(--u)*8)_calc(var(--u)*24)_#000]' },
      el('div', { class: 'sticky top-0 z-[1] flex items-center justify-between border-b border-steel/60 bg-[#151b2a] px-14 py-4' }, el('h2', { class: 'text-13 text-paper' }, title), el('button', { class: 'p-3 text-fog hover:text-lamp', 'aria-label': tr('Close'), onclick: close }, icon('close', 'h-12 w-12'))),
      el('div', { class: 'px-14 pb-12 pt-10' }, body),
    ),
  );
  ui.append(box);
  addEventListener('keydown', key, true);
  box.querySelector<HTMLElement>('button, input')?.focus();
}

/** Title screen. Resolves when the player starts. */
export function titleScreen(opts: { session: GameSession | null; error?: string; onSound: () => void }): Promise<'start' | 'guest'> {
  return new Promise((resolve) => {
    const { session, error } = opts;
    const go = (r: 'start' | 'guest') => {
      opts.onSound();
      screen.classList.add('out');
      setTimeout(() => screen.remove(), 700);
      resolve(r);
    };
    const open = (path: string) => () => location.assign(site(path));
    const main = session
      ? menuButton('play', session.data.checkpoint ? tr('Return to the school') : tr('Take your seat'), () => go('start'), true)
      : menuButton('play', tr('Play'), () => go('guest'), true);
    const items = [
      main,
      ...(session ? [] : [menuButton('key', tr('Enter with a code'), open('/')), menuButton('room', tr('Join a room'), open('/join')), menuButton('user', tr('Sign in'), open('/login'))]),
      menuButton('gear', tr('Settings'), () => windowBox(tr('Settings'), settingsPanel())),
      menuButton('help', tr('How to play'), () => windowBox(tr('How to play'), howTo())),
    ];
    const who = session ? `${session.data.student.firstName} ${session.data.student.lastName}`.trim() : '';
    const screen = el(
      'div',
      { class: 'title', style: `background-image:${asset('title.png')}` },
      el('div', { class: 'pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#05060af2_0%,#05060ab3_32%,transparent_62%),linear-gradient(0deg,#05060ae6_0%,transparent_34%)]' }),
      el('canvas', { class: 'rain', width: '480', height: '270', 'aria-hidden': 'true' }),
      el(
        'div',
        { class: 'absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-8 overflow-y-auto px-[max(calc(var(--u)*22),5vw)] py-12' },
        el('div', {}, el('h1', { class: 'text-paper' }, 'Last Lesson'), el('p', { class: 'mt-2 text-11 text-lamp' }, tr('Knowledge is your only way out.'))),
        session ? el('div', { class: 'w-176 border-l-2 border-lamp bg-ink/70 px-8 py-4 text-10 leading-snug text-fog' }, el('div', { class: 'text-12 text-paper' }, who), el('div', {}, tr(session.data.campaign.title)), el('div', {}, session.data.lobby?.title ?? session.data.branding.displayName)) : null,
        error ? el('p', { class: 'w-200 border-l-2 border-red bg-ink/80 px-8 py-4 text-10 text-coral', role: 'alert' }, error) : null,
        el('nav', { class: 'grid justify-items-start gap-3' }, ...items),
        session ? null : el('p', { class: 'text-9 text-fog/80' }, tr('Without signing in the result is not saved.')),
      ),
    );
    arrowNav(screen);
    ui.append(screen);
    main.focus();
    rain(screen.querySelector('canvas')!);
  });
}

const HOW: Array<[IconName, string, string]> = [
  ['play', tr('Follow the yellow arrow'), tr('It points to the next task. Walk with WASD or the arrow keys, on a phone with the stick.')],
  ['notebook', tr('Learn, then answer'), tr('Before a question you get a short lesson. J opens the notebook with everything you learned.')],
  ['torch', tr('Stay unnoticed'), tr('The Invigilator sees light and hears running. Shift is faster, but louder.')],
  ['room', tr('Hide in lockers'), tr('Answer a quick question there and he walks on.')],
  ['talk', tr('Play with friends'), tr('In a room hold V and choose a phrase. The first one out wins.')],
];
const howTo = () => el('div', { class: 'grid gap-7' }, ...HOW.map(([name, title, text]) => el('div', { class: 'flex items-start gap-8' }, el('span', { class: 'grid h-24 w-24 shrink-0 place-items-center border border-steel bg-ink text-lamp' }, icon(name)), el('div', {}, el('div', { class: 'text-11 text-paper' }, title), el('div', { class: 'text-9 leading-snug text-fog' }, text)))));

function rain(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!;
  const drops = Array.from({ length: 130 }, () => ({ x: Math.random() * 520, y: Math.random() * 270, s: 3 + Math.random() * 4 }));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    if (!canvas.isConnected) return;
    g.clearRect(0, 0, 480, 270);
    g.fillStyle = 'rgba(140,170,205,.32)';
    for (const d of drops) {
      d.y += d.s;
      d.x -= d.s * 0.28;
      if (d.y > 270) {
        d.y = -8;
        d.x = Math.random() * 520;
      }
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round(d.s * 1.4));
    }
    if (!still) requestAnimationFrame(tick);
  };
  tick();
}

const OUTCOME: Record<SessionSummary['outcome'], [title: string, text: string]> = {
  ESCAPED: [tr('Present'), tr('You left the school through the front door.')],
  DISMISSED: [tr('Dismissed'), tr('You rang the bell. The last lesson is over.')],
  DETAINED: [tr('Detention'), tr('You were sent back to your seat too many times.')],
  TIMEOUT: [tr('Time'), tr('The lesson ended before you did.')],
  LEFT: [tr('Left early'), tr('What you answered has been handed in.')],
};

/** School report at the end. Numbers come from the session summary, which the server computes. */
export function resultScreen(summary: SessionSummary, session: GameSession, pages: number): Promise<'again' | 'home'> {
  return new Promise((resolve) => {
    const [title, text] = OUTCOME[summary.outcome];
    const good = summary.outcome === 'ESCAPED' || summary.outcome === 'DISMISSED';
    const row = (k: string, v: string) => el('tr', {}, el('th', {}, k), el('td', {}, v));
    const m = Math.floor(summary.durationSeconds / 60);
    const mark = summary.accuracy >= 90 ? '5' : summary.accuracy >= 70 ? '4' : summary.accuracy >= 50 ? '3' : '2';
    const done = (r: 'again' | 'home') => {
      screen.remove();
      resolve(r);
    };
    const screen = el(
      'div',
      { class: 'title results', style: `background-image:${asset(good ? 'dawn.png' : 'title.png')}` },
      el(
        'div',
        { class: 'report' },
        el('span', { class: 'stamp' }, mark),
        el('p', { class: 'school' }, session.data.branding.displayName),
        el('h1', {}, title),
        el('p', {}, text),
        el(
          'table',
          {},
          row(tr('Pupil'), `${session.data.student.firstName} ${session.data.student.lastName}`.trim()),
          row(tr('Campaign'), tr(session.data.campaign.title)),
          row(tr('Score'), tr('{0} of {1}', { 0: summary.score, 1: summary.maxScore })),
          row(tr('Correct answers'), tr('{0} of {1} ({2}%)', { 0: summary.correctAnswers, 1: summary.correctAnswers + summary.incorrectAnswers, 2: Math.round(summary.accuracy) })),
          row(tr('Time'), tr('{0} min {1} s', { 0: m, 1: summary.durationSeconds % 60 })),
          row(tr('Register pages'), tr('{0} of 5', { 0: pages })),
          summary.topicsNeedImprovement.length ? row(tr('Revise'), summary.topicsNeedImprovement.map((x) => tr(x)).join(', ')) : null as never,
        ),
        summary.mistakes?.length ? el('details', { class: 'mistakes', open: true }, el('summary', {}, tr('Learn from this')), ...summary.mistakes.slice(0, 6).map((m) => el('p', {}, el('b', {}, m.prompt), ' ', m.explanation ?? ''))) : null,
        session.data.content.closingLine ? el('p', { class: 'closing' }, session.data.content.closingLine) : null,
        el('p', { class: 'saved' }, session.live ? tr('Your result has been recorded.') : tr('You played without signing in, so nothing was saved.')),
        el('footer', {}, session.live ? el('button', { onclick: () => done('home') }, session.room ? tr('See the table') : tr('Back to my page')) : el('button', { onclick: () => done('again') }, tr('Play again'))),
      ),
    );
    ui.append(screen);
    screen.querySelector('button')?.focus();
  });
}

const FINAL_POLL_MS = 2000;

function boardRow(s: LobbyStanding, i: number, mine: boolean, steps: number) {
  const out = s.outcome === 'ESCAPED' || s.outcome === 'DISMISSED';
  const ms = s.durationMs ?? 0;
  const time = tr('{0} min {1} s', { 0: Math.floor(ms / 60_000), 1: ((ms % 60_000) / 1000).toFixed(1) });
  const cell = 'border-0 border-b border-solid border-line px-4 py-3 text-left font-normal';
  return el(
    'tr',
    { class: mine ? 'bg-line/40' : '' },
    el('td', { class: `${cell} w-20 font-jac text-18 ${i === 0 && s.outcome ? 'text-red' : 'text-wood'}` }, s.outcome ? String(i + 1) : '-'),
    el('td', { class: cell }, el('i', { class: 'mr-4 inline-block h-6 w-6', style: `background:${LOBBY_COLORS[s.color] ?? LOBBY_COLORS[0]}` }), s.nickname),
    el('td', { class: cell }, !s.outcome ? tr('Still inside: {0} of {1}', { 0: s.progress, 1: steps }) : out ? time : `${OUTCOME[s.outcome][0]}, ${s.progress}/${steps}`),
    el('td', { class: `${cell} text-right` }, tr('{0} points', { 0: s.score })),
  );
}

/** The table of a room: who reached the door first and how long it took. Refreshes until everybody is out. */
export async function boardScreen(session: GameSession, room: RoomLink): Promise<void> {
  const title = el('h1', { class: 'font-jac text-32 leading-none text-wine' }, session.data.lobby?.title ?? '');
  const note = el('p', { class: 'text-wood', role: 'status' });
  const body = el('tbody', {});
  let open = true;
  const screen = el(
    'div',
    { class: 'title results', style: `background-image:${asset('dawn.png')}` },
    el(
      'div',
      { class: 'report' },
      title,
      note,
      el('table', { class: 'w-full border-collapse' }, body),
      el('footer', {}, el('button', { onclick: () => (open = false) }, tr('Back to the room'))),
    ),
  );
  ui.append(screen);
  screen.querySelector('button')?.focus();
  const draw = (r: LobbySync) => {
    const left = r.standings.filter((s) => !s.outcome).length;
    note.textContent = r.status === 'FINISHED' ? tr('Final table') : tr('Players still in the school: {0}', { 0: left });
    body.replaceChildren(...r.standings.map((s, i) => boardRow(s, i, s.id === session.data.lobby?.playerId, r.steps)));
  };
  for (let next = 0, done = false; open; await wait(100)) {
    if (done || performance.now() < next) continue;
    next = performance.now() + FINAL_POLL_MS;
    try {
      const reply = await room.watch();
      draw(reply);
      done = reply.status === 'FINISHED';
    } catch {
      note.textContent = tr('The table is not loading. Trying again...');
    }
  }
  screen.remove();
}
