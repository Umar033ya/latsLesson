import { LOBBY_COLORS, type LobbyStanding, type LobbySync, type SessionSummary } from '@last-lesson/scenario';
import type { GameSession, RoomLink } from '../platform/session';
import { arrowNav, asset, el, ui, wait } from './dom';
import { getLanguage, setLanguage, tr } from '../i18n';
import { LOCALE_NAMES, LOCALES } from '@last-lesson/scenario';
import { settingsPanel } from './overlay';

const platformUrl = () => import.meta.env.VITE_PLATFORM_URL || '/student';

/** Guests have no student page: they return to the room. */
export const homeUrl = (session: GameSession) => (session.data.lobby ? platformUrl().replace(/\/student\/?$/, '/room') : platformUrl());

/** Title screen. Resolves when the player starts. */
export function titleScreen(opts: { session: GameSession | null; error?: string; onSound: () => void }): Promise<'start' | 'demo'> {
  return new Promise((resolve) => {
    const { session, error } = opts;
    const go = (r: 'start' | 'demo') => {
      opts.onSound();
      screen.classList.add('out');
      setTimeout(() => screen.remove(), 700);
      resolve(r);
    };
    const more = el('div', { class: 'more' });
    const toggle = (name: string, panel: () => HTMLElement) => {
      const same = more.dataset.open === name;
      more.dataset.open = same ? '' : name;
      more.replaceChildren(...(same ? [] : [panel()]));
    };
    const main = session
      ? el('button', { onclick: () => go('start') }, session.data.checkpoint ? tr('Return to the school') : tr('Take your seat'))
      : el('button', { onclick: () => location.assign(platformUrl()) }, tr('Enter your access code'));
    const items = [
      main,
      !session && el('button', { onclick: () => go('demo') }, tr('Play the demo night')),
      el('button', { onclick: () => toggle('settings', settingsPanel) }, tr('Settings')),
      el('button', { onclick: () => toggle('how', howTo) }, tr('How to play')),
    ].filter((x): x is HTMLButtonElement => Boolean(x));
    const screen = el(
      'div',
      { class: 'title', style: `background-image:${asset('title.png')}` },
      el('canvas', { class: 'rain', width: '480', height: '270', 'aria-hidden': 'true' }),
      el('div', { class: 'langs top', role: 'radiogroup', 'aria-label': tr('Language') }, ...LOCALES.map((l) => el('button', { role: 'radio', lang: l, 'aria-checked': String(l === getLanguage()), class: l === getLanguage() ? 'on' : '', title: LOCALE_NAMES[l], onclick: () => l !== getLanguage() && setLanguage(l) }, l.toUpperCase()))),
      el('div', { class: 'titlebox' }, el('h1', {}, 'Last Lesson'), el('p', { class: 'tag' }, tr('Knowledge is your only way out.')), el('nav', {}, ...items), more),
      el(
        'aside',
        {},
        session ? el('p', {}, el('b', {}, session.data.branding.displayName), el('br'), tr(session.data.campaign.title), el('br'), `${session.data.student.firstName} ${session.data.student.lastName}`.trim()) : null,
        error ? el('p', { class: 'err', role: 'alert' }, error) : null,
        !session && !error ? el('p', {}, tr('The demo is not recorded.')) : null,
      ),
    );
    arrowNav(screen);
    ui.append(screen);
    main.focus();
    rain(screen.querySelector('canvas')!);
  });
}

const howTo = () =>
  el('p', { class: 'how' }, tr('Follow the arrow to the next task. Walk with WASD or arrows, use things with E. Before a question you get a short lesson; J opens your notebook. The Invigilator sees light and hears noise. Hide in lockers and answer a quick question to stay quiet.'));

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
        el('p', { class: 'saved' }, session.live ? tr('Your result has been recorded.') : tr('Demo night: nothing was recorded.')),
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
    el('th', { class: `${cell} w-24 font-jac text-18 ${i === 0 && s.outcome ? 'text-red' : 'text-wood'}`, scope: 'row' }, s.outcome ? String(i + 1) : '-'),
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
