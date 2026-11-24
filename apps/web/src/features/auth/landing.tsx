import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Building2, DoorOpen, GraduationCap, KeyRound, LineChart, LogIn, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { LanguageSwitch } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
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

/** The front page: a code for players, sign-in for everybody else, and what this place is. */
export function CodePage() {
  const me = useAuth((s) => s.me);
  return (
    <div className="night">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-night/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link to="/"><Wordmark className="text-[34px] text-bone" /></Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label={tr('Main')}>
            <LanguageSwitch dark />
            {me ? (
              <Link to={homeOf(me)} className="nbtn !py-2">{tr('Open my page')}<ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/login" className="nbtn-line !py-2"><LogIn size={16} />{tr('Sign in')}</Link>
                <Link to="/register" className="nbtn !hidden !py-2 sm:!inline-flex">{tr('Create account')}</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <Hero />
      <Roles />
      <Steps />
      <footer className="border-t border-white/5 px-5 py-8 text-center text-sm text-fog/70">LAST LESSON. {tr('Knowledge is your only way out.')}</footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-[60%_70%] [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0c13_4%,#0a0c13b3_38%,#0a0c1326_100%),linear-gradient(0deg,#0a0c13_0%,transparent_38%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:min-h-[640px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-20">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lamp/30 bg-lamp/10 px-3.5 py-1.5 text-sm text-lamp"><Sparkles size={15} aria-hidden="true" />{tr('A game for schools and learning centers')}</p>
          <h1 className="text-balance text-[clamp(34px,5.4vw,62px)] font-bold leading-[1.06] tracking-[-0.02em] text-bone">{tr('Knowledge is your only way out.')}</h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-fog">{tr('A pixel mystery where every door opens with an answer. The teacher brings the questions, the class finds the way out together.')}</p>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-fog">
            {[tr('No accounts for players'), tr('Three languages'), tr('Phone and computer')].map((t) => <li key={t} className="flex items-center gap-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-lamp">{t}</li>)}
          </ul>
        </div>
        <CodeCard />
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
      <div className="npanel p-7">
        <h2 className="text-xl font-bold text-bone">{tr('This is your own code')}</h2>
        <p className="mt-2 text-fog">{tr('This is your own code. Write it down: next time it brings you straight back to your progress.')}</p>
        <p className="my-5 select-all rounded-xl bg-black/40 py-4 text-center font-dot text-4xl text-lamp">{personal}</p>
        <div className="grid gap-3 sm:grid-cols-2"><button className="nbtn" onClick={() => nav('/student')}>{tr('I wrote it down')}</button><button className="nbtn-line" onClick={() => copy(personal)}>{tr('Copy')}</button></div>
      </div>
    );
  return (
    <form onSubmit={submit} className="npanel p-7 shadow-[0_24px_80px_-20px_#000]">
      {!profile ? (
        <>
          <h2 className="text-2xl font-bold text-bone">{tr('Enter with a code')}</h2>
          <label htmlFor="code" className="mb-4 mt-1.5 block text-fog">{tr('Access code from your education center, or six digits of a room')}</label>
          <input id="code" className="nfield py-4 text-center font-dot text-3xl uppercase tracking-wider" placeholder="LL-XXXX-XXXX" autoComplete="off" spellCheck={false} maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} required minLength={6} />
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-bone">{profile.center?.name}</h2>
          <p className="mb-4 mt-1.5 text-fog">{profile.group ? `${profile.group}. ` : ''}<span>{tr('How should we write your name in the register?')}</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label={tr('First name')} className="nfield" placeholder={tr('First name')} autoFocus required maxLength={80} value={name.first} onChange={(e) => setName({ ...name, first: e.target.value })} />
            <input aria-label={tr('Last name')} className="nfield" placeholder={tr('Last name')} maxLength={80} value={name.last} onChange={(e) => setName({ ...name, last: e.target.value })} />
          </div>
        </>
      )}
      {error && <p className="mt-3 text-[#f09a86]" role="alert">{error}</p>}
      <button className="nbtn mt-4 w-full py-3.5" disabled={busy}>{busy ? tr('Checking...') : profile ? tr('Sign the register') : tr('Enter')}</button>
      {profile ? (
        <button type="button" className="nbtn-line mt-3 w-full" onClick={() => setProfile(null)}>{tr('Use another code')}</button>
      ) : (
        <>
          <p className="my-4 flex items-center gap-3 text-sm text-fog/70 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">{tr('or')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/join" className="nbtn-line"><DoorOpen size={17} />{tr('Join a room')}</Link>
            <a href={import.meta.env.DEV ? 'http://localhost:5174/' : '/play/'} className="nbtn-line"><Sparkles size={17} />{tr('Try the game')}</a>
          </div>
        </>
      )}
    </form>
  );
}

const ROLES: Array<[LucideIcon, string, string, string, string]> = [
  [Users, tr('Student'), tr('A code instead of a password. Lessons before questions, a notebook and an explanation of every mistake.'), '/join', tr('Join a room')],
  [GraduationCap, tr('Teacher'), tr('Open a room, show six digits, start the game for the whole class and see who got out first.'), '/login', tr('Sign in')],
  [Building2, tr('Education center'), tr('Own questions and campaigns, groups and codes, results by topic.'), '/register?as=center', tr('Start free trial')],
];
function Roles() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h2 className="text-3xl font-bold tracking-tight text-bone">{tr('Who is it for')}</h2>
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {ROLES.map(([Icon, title, text, to, action]) => (
          <article key={title} className="npanel flex flex-col p-6">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-lamp/15 text-lamp"><Icon size={24} aria-hidden="true" /></span>
            <h3 className="mt-5 text-xl font-bold text-bone">{title}</h3>
            <p className="mt-2 flex-1 leading-relaxed text-fog">{text}</p>
            <Link to={to} className="mt-5 inline-flex items-center gap-2 font-semibold text-lamp hover:underline">{action}<ArrowRight size={16} /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const STEPS: Array<[LucideIcon, string, string]> = [
  [KeyRound, tr('The teacher shows a code'), tr('Six digits or a QR code on the screen.')],
  [BookOpen, tr('The class learns and answers'), tr('Every room has a short lesson and a question.')],
  [LineChart, tr('Everybody sees the result'), tr('Places, minutes, points and topics to revise.')],
];
function Steps() {
  return (
    <section className="border-t border-white/5 bg-night-2/50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-3xl font-bold tracking-tight text-bone">{tr('How it works')}</h2>
        <ol className="mt-7 grid gap-8 md:grid-cols-3">
          {STEPS.map(([Icon, title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-jac text-5xl leading-none text-lamp">{i + 1}</span>
              <div><h3 className="flex items-center gap-2 text-lg font-bold text-bone"><Icon size={18} className="text-lamp" aria-hidden="true" />{title}</h3><p className="mt-1 text-fog">{text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
