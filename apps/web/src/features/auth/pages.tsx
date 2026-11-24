import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { LanguageSwitch } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
import { copy, fieldError, Text } from '../../components/ui';
import { get, homeOf, post, startSession, useAuth } from '../../lib/api';
import { tr, errorText, getLanguage, languageChosen, setLanguage } from '../../lib/i18n';
import { toLocale } from '@last-lesson/scenario';

interface CodeReply {
  accessToken?: string;
  needsProfile?: boolean;
  personalCode?: string | null;
  center?: { name: string; logoUrl: string | null; accent: string };
  group?: string | null;
}
interface Options {
  centerSignup: boolean;
  studentSignup: boolean;
  trialDays: number;
  supportEmail: string;
}
const useOptions = () => useQuery({ queryKey: ['auth-options'], queryFn: () => get<Options>('/auth/options'), staleTime: 60_000 });

/** Opens the session and, on a device without its own choice, switches to the language saved in the account. */
async function enter(token: string, nav: (to: string) => void) {
  const me = await startSession(token);
  const saved = toLocale(me.locale);
  nav(homeOf(me));
  if (!languageChosen() && saved !== getLanguage()) await setLanguage(saved, false);
}

/** The public entrance: a student needs nothing but the code from their center. */
export function CodePage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [profile, setProfile] = useState<CodeReply | null>(null);
  const [name, setName] = useState({ first: '', last: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [personal, setPersonal] = useState<string | null>(null);
  const me = useAuth((s) => s.me);
  const nav = useNavigate();
  if (me && !personal && !busy) return <Navigate to={homeOf(me)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await post<CodeReply>('/auth/code', { code, ...(profile ? { firstName: name.first, lastName: name.last } : {}) });
      if (r.needsProfile) setProfile(r);
      else if (r.personalCode) {
        setPersonal(r.personalCode);
        await startSession(r.accessToken!);
      } else await enter(r.accessToken!, nav);
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  };

  return (
    <div className="night relative flex flex-col">
      <div className="absolute inset-0 bg-cover bg-center opacity-90 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[#05060a]/35" aria-hidden="true" />
      <header className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-[8vw]"><LanguageSwitch dark /><nav className="flex flex-wrap gap-2"><Link to="/login" className="nbtn-line bg-night-2/80">{tr('Sign in')}</Link><Link to="/register" className="nbtn-line bg-night-2/80">{tr('Create account')}</Link></nav></header>
      <main className="relative flex flex-1 flex-col justify-center px-5 pb-16 pt-6 sm:px-[8vw]">
        <h1><Wordmark className="text-[clamp(52px,10vw,112px)] text-bone drop-shadow-[0_4px_0_#05060a]" /></h1>
        <p className="mb-8 mt-2 font-dot text-xl text-lamp">{tr('Knowledge is your only way out.')}</p>
        {personal ? (
          <div className="npanel max-w-md p-5">
            <p className="text-fog">{tr('This is your own code. Write it down: next time it brings you straight back to your progress.')}</p>
            <p className="my-4 select-all font-dot text-4xl text-lamp">{personal}</p>
            <div className="flex flex-wrap gap-3"><button className="nbtn" onClick={() => nav('/student')}>{tr('I wrote it down')}</button><button className="nbtn-line" onClick={() => copy(personal)}>{tr('Copy')}</button></div>
          </div>
        ) : (
          <form onSubmit={submit} className="npanel max-w-md p-5">
            {!profile ? (
              <>
                <label htmlFor="code" className="mb-2 block text-fog">{tr('Access code from your education center')}</label>
                <input id="code" className="nfield font-dot text-2xl uppercase tracking-wider" placeholder="LL-XXXX-XXXX" autoComplete="off" autoFocus spellCheck={false} maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} required minLength={6} />
              </>
            ) : (
              <>
                <p className="mb-1 font-dot text-xl text-bone">{profile.center?.name}</p>
                <p className="mb-4 text-fog">{profile.group ? `${profile.group}. ` : ''}<span>{tr('How should we write your name in the register?')}</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input aria-label={tr('First name')} className="nfield" placeholder={tr('First name')} autoFocus required maxLength={80} value={name.first} onChange={(e) => setName({ ...name, first: e.target.value })} />
                  <input aria-label={tr('Last name')} className="nfield" placeholder={tr('Last name')} maxLength={80} value={name.last} onChange={(e) => setName({ ...name, last: e.target.value })} />
                </div>
              </>
            )}
            {error && <p className="mt-3 text-[#f09a86]" role="alert">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="nbtn" disabled={busy}>{busy ? tr('Checking...') : profile ? tr('Sign the register') : tr('Enter')}</button>
              {profile && <button type="button" className="nbtn-line" onClick={() => setProfile(null)}>{tr('Use another code')}</button>}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Frame({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-paper md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-night p-8 text-bone sm:p-12">
        <div className="absolute inset-0 bg-cover bg-[72%_50%] opacity-60 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/30 to-night/90" aria-hidden="true" />
        <Link to="/" className="relative"><Wordmark className="text-5xl" /></Link>
        <p className="relative mt-10 max-w-[30ch] text-balance text-2xl leading-snug">{lead}</p>
        <Link to="/" className="relative mt-10 font-dot text-lamp hover:underline">{tr('I have an access code')}</Link>
      </div>
      <div className="flex flex-col p-6 sm:p-12">
        <div className="flex justify-end"><LanguageSwitch /></div>
        <div className="my-auto w-full max-w-md py-8"><h1 className="mb-6 text-[28px] font-bold">{title}</h1>{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const options = useOptions();
  const me = useAuth((s) => s.me);
  const nav = useNavigate();
  if (me) return <Navigate to={homeOf(me)} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await enter((await post<{ accessToken: string }>('/auth/login', form)).accessToken, nav);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Frame title={tr('Sign in')} lead={tr('Set the questions by day. Your students find their way out with them by night.')}>
      <form onSubmit={submit} className="space-y-4">
        <Text label={tr('E-mail')} type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Text label={tr('Password')} type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="font-semibold text-pencil-dark" role="alert">{error}</p>}
        <button className="btn-main w-full py-2.5" disabled={busy}>{busy ? tr('Signing in...') : tr('Sign in')}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><Link to="/register" className="font-semibold text-accent hover:underline">{tr('Create account')}</Link><button className="text-soft hover:underline" onClick={() => setForgot(!forgot)}>{tr('Forgot your password?')}</button></div>
      {forgot && <p className="mt-3 rounded-lg bg-well p-3 text-sm text-soft">{tr('Students: enter with your access code and set a new password in settings. Center administrators: the platform can issue a new password.')}{' '}{options.data?.supportEmail}</p>}
    </Frame>
  );
}

export function RegisterPage() {
  const [params] = useSearchParams();
  const [kind, setKind] = useState<'student' | 'center'>(params.get('as') === 'center' ? 'center' : 'student');
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', repeat: '', invitationCode: params.get('code') ?? '', centerName: '', city: '', agree: false });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = useOptions();
  const me = useAuth((s) => s.me);
  const nav = useNavigate();
  if (me) return <Navigate to={homeOf(me)} replace />;
  const closed = options.data && (kind === 'student' ? !options.data.studentSignup : !options.data.centerSignup);
  const mismatch = f.repeat !== '' && f.repeat !== f.password;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    try {
      const { firstName, lastName, email, password } = f;
      const base = { firstName, lastName, email, password, locale: getLanguage() };
      const r = kind === 'student' ? await post<{ accessToken: string }>('/auth/register', { ...base, invitationCode: f.invitationCode }) : await post<{ accessToken: string }>('/auth/register-center', { ...base, centerName: f.centerName, city: f.city || undefined });
      await enter(r.accessToken, nav);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  const tab = (k: 'student' | 'center', label: string) => <button type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setError(null); }} className={clsx('flex-1 rounded-lg px-3 py-2 font-semibold', kind === k ? 'bg-sheet text-ink shadow-sheet' : 'text-soft hover:text-ink')}>{label}</button>;
  return (
    <Frame title={tr('Create account')} lead={kind === 'student' ? tr('An account keeps your progress on any device.') : tr('Your own questions, groups and campaigns. Students play with codes.')}>
      <div className="mb-5 flex gap-1 rounded-xl bg-track p-1" role="tablist">{tab('student', tr('I am a student'))}{tab('center', tr('I run an education center'))}</div>
      {closed ? (
        <p className="rounded-lg bg-well p-4">{tr('Registration is closed right now.')}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {kind === 'center' && <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('Center name')} required minLength={2} maxLength={120} value={f.centerName} onChange={set('centerName')} /><Text label={tr('City')} maxLength={80} value={f.city} onChange={set('city')} /></div>}
          {kind === 'student' && <Text label={tr('Access code from your center')} required minLength={6} maxLength={20} className="uppercase" placeholder="LL-XXXX-XXXX" autoComplete="off" hint={tr('A group code or your personal code. With a personal code your earlier results stay with you.')} value={f.invitationCode} onChange={set('invitationCode')} />}
          <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('First name')} required maxLength={80} autoComplete="given-name" value={f.firstName} onChange={set('firstName')} /><Text label={tr('Last name')} required maxLength={80} autoComplete="family-name" value={f.lastName} onChange={set('lastName')} /></div>
          <Text label={tr('E-mail')} type="email" required autoComplete="username" value={f.email} error={fieldError(error, 'email')} onChange={set('email')} />
          <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('Password')} type="password" required minLength={8} maxLength={128} autoComplete="new-password" hint={tr('At least 8 characters')} value={f.password} error={fieldError(error, 'password')} onChange={set('password')} /><Text label={tr('Repeat the password')} type="password" required autoComplete="new-password" error={mismatch ? tr('The passwords do not match') : undefined} value={f.repeat} onChange={set('repeat')} /></div>
          {Boolean(error) && <p className="font-semibold text-pencil-dark" role="alert">{errorText(error)}</p>}
          <button className="btn-main w-full py-2.5" disabled={busy || mismatch}>{busy ? tr('Creating...') : kind === 'student' ? tr('Create student account') : tr('Start free trial')}</button>
          {kind === 'center' && options.data && <p className="text-sm text-soft">{tr('The trial lasts {0} days. No payment details are needed.', { 0: options.data.trialDays })}</p>}
        </form>
      )}
      <p className="mt-5 text-sm text-soft">{tr('Already registered?')}{' '}<Link to="/login" className="font-semibold text-accent hover:underline">{tr('Sign in')}</Link></p>
    </Frame>
  );
}
