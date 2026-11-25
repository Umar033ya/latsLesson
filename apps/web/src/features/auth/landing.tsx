import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageSwitch } from '../../components/Preferences';
import { copy } from '../../components/ui';
import { homeOf, post, startSession, useAuth } from '../../lib/api';
import { errorText, tr } from '../../lib/i18n';
import { isRoomCode } from '../../lib/room';
import { useEnter } from './enter';

interface CodeReply {
  accessToken?: string;
  needsProfile?: boolean;
  personalCode?: string | null;
  center?: { name: string; logoUrl: string | null; accent: string };
  group?: string | null;
}

const GAME_URL = import.meta.env.DEV ? 'http://localhost:5174/' : '/play/';

/** The front page: the school at night, and a pass to get in. */
export function CodePage() {
  const me = useAuth((s) => s.me);
  return (
    <div className="min-h-screen bg-night text-bone">
      <div className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-cover bg-[80%_60%] lg:bg-[50%_60%] [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#0a0c13_0%,#0a0c1300_26%,#0a0c1300_70%,#0a0c13b3_100%)]" aria-hidden="true" />
        <Rain />
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-10">
          <Link to="/" aria-label="Last Lesson"><img src="/logo.svg" alt="" className="h-12 w-12 [image-rendering:pixelated]" /></Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label={tr('Main')}>
            <LanguageSwitch dark />
            {me ? (
              <Link to={homeOf(me)} className="top-link">{tr('Open my page')}</Link>
            ) : (
              <>
                <Link to="/login" className="top-link">{tr('For teachers')}</Link>
                <Link to="/register" className="top-link hidden sm:inline">{tr('Register a center')}</Link>
              </>
            )}
          </nav>
        </header>
        <div className="grid flex-1 items-end gap-x-16 gap-y-8 px-5 pb-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:pb-10">
          <div>
            <h1 className="font-jac text-[clamp(64px,11vw,168px)] leading-[0.82] text-bone [text-shadow:0_6px_0_#0a0c13]">Last Lesson</h1>
            <p className="mt-5 max-w-[34ch] text-[clamp(19px,2vw,26px)] leading-snug text-bone [text-shadow:0_2px_0_#0a0c13]">{tr('The school is locked. Every door opens with a right answer.')}</p>
          </div>
          <CodeCard />
        </div>
      </div>
      <Inside />
      <Timetable />
      <footer className="flex flex-wrap items-center justify-between gap-4 px-5 py-10 text-fog sm:px-10">
        <span className="inline-flex items-center gap-3"><img src="/logo.svg" alt="" className="h-8 w-8" />{tr('Knowledge is your only way out.')}</span>
        <span className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/join" className="top-link">{tr('Join a room')}</Link>
          <Link to="/login" className="top-link">{tr('For teachers')}</Link>
          <Link to="/register" className="top-link">{tr('Register a center')}</Link>
        </span>
      </footer>
    </div>
  );
}

/** Rain in whole pixels, the same as in the game. */
function Rain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const drops = Array.from({ length: 90 }, () => ({ x: Math.random() * 480, y: Math.random() * 270, v: 150 + Math.random() * 130 }));
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, 480, 270);
      g.fillStyle = '#a9bddc55';
      for (const d of drops) {
        d.y += d.v * dt;
        d.x -= d.v * dt * 0.18;
        if (d.y > 270) Object.assign(d, { y: -8, x: Math.random() * 530 });
        g.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} width={480} height={270} className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover [image-rendering:pixelated]" aria-hidden="true" />;
}

const SCENES: Array<[string, string, number, number]> = [
  ['night', tr('The examiners of the night walk the corridors. Put the torch out and hide.'), 995, 560],
  ['lesson', tr('Each room first teaches: a short lesson, an example, then the question.'), 1120, 810],
  ['puzzle', tr('Answers open doors. A mistake brings a hint and an explanation.'), 1120, 810],
];
function Inside() {
  return (
    <section className="px-5 pt-16 sm:px-10">
      <div className="grid items-start gap-x-8 gap-y-10 lg:grid-cols-12">
        {SCENES.map(([name, text, width, height], i) => (
          <figure key={name} className={i === 0 ? 'lg:col-span-12 xl:col-span-6 xl:row-span-2' : 'lg:col-span-6 xl:col-span-3'}>
            <img src={`/art/${name}.webp`} alt="" width={width} height={height} loading="lazy" className="h-auto w-full border-4 border-[#2b3a63]" />
            <figcaption className="mt-3 max-w-[52ch] text-fog">{text}</figcaption>
          </figure>
        ))}
        <p className="text-lg leading-relaxed text-bone lg:col-span-12 xl:col-span-6">{tr('The questions are your own: the center writes them by subject, level and topic, and what the class missed comes back on the next level.')}</p>
      </div>
    </section>
  );
}

const DAY: Array<[string, string, string]> = [
  ['1', tr('The teacher opens a room'), tr('Six digits or a QR code on the board. Nobody needs an account.')],
  ['2', tr('The class walks in'), tr('Everybody writes a name and waits in the hall until the teacher starts.')],
  ['3', tr('The lesson becomes a night'), tr('Friends see each other in the corridors. Doors open for those who learned.')],
  ['4', tr('The register'), tr('Who got out first, minutes, points and the topics to repeat.')],
];
function Timetable() {
  return (
    <section className="px-5 py-20 sm:px-10">
      <div className="mx-auto max-w-5xl border-l-[10px] border-[#7c2230] bg-[#efe6cc] px-6 py-8 text-[#2b2233] shadow-[0_30px_80px_-30px_#000] sm:px-12 sm:py-12">
        <h2 className="text-4xl font-bold leading-none tracking-tight text-[#7c2230] sm:text-5xl">{tr('Timetable')}</h2>
        <ol className="mt-6">
          {DAY.map(([n, title, text]) => (
            <li key={n} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-[#8fa3c8] py-4 md:grid-cols-[56px_minmax(0,5fr)_minmax(0,7fr)]">
              <span className="font-dot text-3xl leading-none text-[#2558d6]">{n}</span>
              <strong className="text-lg leading-snug">{title}</strong>
              <span className="col-start-2 text-[#5a4c55] md:col-start-3">{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link to="/register" className="border-b-4 border-[#173a9a] bg-[#2558d6] px-6 py-3 font-bold text-white hover:bg-[#1d4bbb]">{tr('Register a center')}</Link>
          <Link to="/login" className="font-semibold text-[#173a9a] underline underline-offset-4">{tr('I am a teacher')}</Link>
        </p>
      </div>
    </section>
  );
}

function CodeCard() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [profile, setProfile] = useState<CodeReply | null>(null);
  const [name, setName] = useState({ first: '', last: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [personal, setPersonal] = useState<string | null>(null);
  const me = useAuth((s) => s.me);
  const nav = useNavigate();
  const enter = useEnter();
  if (me?.role === 'GAMER' && !personal && !busy) return <Navigate to="/student" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (isRoomCode(code)) return nav(`/join?code=${code.replace(/\D/g, '')}`);
    setError('');
    setBusy(true);
    try {
      const r = await post<CodeReply>('/auth/code', { code, ...(profile ? { firstName: name.first, lastName: name.last } : {}) });
      if (r.needsProfile) setProfile(r);
      else if (r.personalCode) {
        setPersonal(r.personalCode);
        await startSession(r.accessToken!);
      } else await enter(r.accessToken!);
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  };

  if (personal)
    return (
      <div className="pass">
        <h2 className="pass-title">{tr('This is your own code')}</h2>
        <p className="mt-2 text-[#5a4c55]">{tr('This is your own code. Write it down: next time it brings you straight back to your progress.')}</p>
        <p className="my-5 select-all border-y border-[#8fa3c8] py-4 text-center font-dot text-4xl text-[#173a9a]">{personal}</p>
        <button className="pass-btn" onClick={() => nav('/student')}>{tr('I wrote it down')}</button>
        <button className="pass-link mt-4" onClick={() => copy(personal)}>{tr('Copy')}</button>
      </div>
    );
  return (
    <form onSubmit={submit} className="pass">
      {!profile ? (
        <>
          <h2 className="pass-title">{tr('Pass')}</h2>
          <label htmlFor="code" className="mt-2 block text-[#5a4c55]">{tr('Access code from your education center, or six digits of a room')}</label>
          <input id="code" className="pass-field text-center font-dot text-3xl uppercase tracking-wider" placeholder="LL-XXXX-XXXX" autoComplete="off" spellCheck={false} maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} required minLength={6} />
        </>
      ) : (
        <>
          <h2 className="pass-title">{profile.center?.name}</h2>
          <p className="mt-2 text-[#5a4c55]">{profile.group ? `${profile.group}. ` : ''}<span>{tr('Choose your name')}</span></p>
          <input aria-label={tr('First name')} className="pass-field" placeholder={tr('First name')} autoFocus required maxLength={80} value={name.first} onChange={(e) => setName({ ...name, first: e.target.value })} />
          <input aria-label={tr('Last name')} className="pass-field" placeholder={tr('Last name')} maxLength={80} value={name.last} onChange={(e) => setName({ ...name, last: e.target.value })} />
        </>
      )}
      {error && <p className="mt-3 font-semibold text-[#9d2230]" role="alert">{error}</p>}
      <button className="pass-btn mt-5" disabled={busy}>{busy ? tr('Checking...') : profile ? tr('Sign the register') : tr('Enter')}</button>
      <p className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2">
        {profile ? (
          <button type="button" className="pass-link" onClick={() => setProfile(null)}>{tr('Use another code')}</button>
        ) : (
          <>
            <Link to="/join" className="pass-link">{tr('Join a room')}</Link>
            <a href={GAME_URL} className="pass-link">{tr('Try the game')}</a>
          </>
        )}
      </p>
    </form>
  );
}
