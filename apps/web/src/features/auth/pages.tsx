import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import clsx from 'clsx';
import { DoorOpen, KeyRound } from 'lucide-react';
import { GoogleSignIn, useAuthOptions } from '../../components/Google';
import { LanguageSwitch } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
import { fieldError, Text } from '../../components/ui';
import { homeOf, post, useAuth } from '../../lib/api';
import { errorText, getLanguage, tr } from '../../lib/i18n';
import { useEnter } from './enter';

function Frame({ title, lead, children, wide }: { title: string; lead: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="night relative flex flex-col">
      <div className="fixed inset-0 bg-cover bg-[60%_70%] opacity-100 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
      <div className="fixed inset-0 bg-[radial-gradient(760px_620px_at_50%_48%,#0a0c13d9,#0a0c1340)]" aria-hidden="true" />
      <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4"><Link to="/"><Wordmark className="text-[34px] text-bone" /></Link><LanguageSwitch dark /></header>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-14 pt-4">
        <div className={clsx('w-full rounded-3xl border border-rule bg-sheet p-6 text-ink shadow-[0_30px_100px_-20px_#000] sm:p-9', wide ? 'max-w-xl' : 'max-w-lg')}>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
          <p className="mb-6 mt-1.5 text-soft">{lead}</p>
          {children}
          <div className="mt-6 grid gap-2 border-t border-rule pt-5 sm:grid-cols-2"><Link to="/" className="btn-line"><KeyRound size={16} />{tr('Enter with a code')}</Link><Link to="/join" className="btn-line"><DoorOpen size={16} />{tr('Join a room')}</Link></div>
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const options = useAuthOptions();
  const me = useAuth((s) => s.me);
  const enter = useEnter();
  if (me) return <Navigate to={homeOf(me)} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await enter((await post<{ accessToken: string }>('/auth/login', form)).accessToken);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Frame title={tr('Sign in')} lead={tr('For teachers and administrators. Students enter with a code.')}>
      <GoogleSignIn onToken={enter} />
      <form onSubmit={submit} className="space-y-4">
        <Text label={tr('E-mail')} type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Text label={tr('Password')} type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="font-semibold text-pencil-dark" role="alert">{error}</p>}
        <button className="btn-main w-full py-2.5" disabled={busy}>{busy ? tr('Signing in...') : tr('Sign in')}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><Link to="/register" className="font-semibold text-accent hover:underline">{tr('Register a center')}</Link><button className="text-soft hover:underline" onClick={() => setForgot(!forgot)}>{tr('Forgot your password?')}</button></div>
      {forgot && <p className="mt-3 rounded-lg bg-well p-3 text-sm text-soft">{tr('Teachers: ask your center for a new password. Center administrators: the platform can issue a new password.')}{' '}{options.data?.supportEmail}</p>}
    </Frame>
  );
}

/** Only an education center registers here. Teachers are added by their center; students enter with a code and a name. */
export function RegisterPage() {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', repeat: '', centerName: '', city: '' });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = useAuthOptions();
  const me = useAuth((s) => s.me);
  const enter = useEnter();
  if (me) return <Navigate to={homeOf(me)} replace />;
  const mismatch = f.repeat !== '' && f.repeat !== f.password;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    try {
      const { repeat: _repeat, city, ...fields } = f;
      const r = await post<{ accessToken: string }>('/auth/register-center', { ...fields, city: city || undefined, locale: getLanguage() });
      await enter(r.accessToken);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return (
    <Frame wide title={tr('Register a center')} lead={tr('Your own questions, groups and campaigns. Students play with codes.')}>
      {options.data && !options.data.centerSignup ? (
        <p className="rounded-lg bg-well p-4">{tr('Registration is closed right now.')}</p>
      ) : (
        <>
          <GoogleSignIn onToken={enter} />
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('Center name')} required minLength={2} maxLength={120} value={f.centerName} onChange={set('centerName')} /><Text label={tr('City')} maxLength={80} value={f.city} onChange={set('city')} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('First name')} required maxLength={80} autoComplete="given-name" value={f.firstName} onChange={set('firstName')} /><Text label={tr('Last name')} required maxLength={80} autoComplete="family-name" value={f.lastName} onChange={set('lastName')} /></div>
            <Text label={tr('E-mail')} type="email" required autoComplete="username" value={f.email} error={fieldError(error, 'email')} onChange={set('email')} />
            <div className="grid gap-4 sm:grid-cols-2"><Text label={tr('Password')} type="password" required minLength={8} maxLength={128} autoComplete="new-password" hint={tr('At least 8 characters')} value={f.password} error={fieldError(error, 'password')} onChange={set('password')} /><Text label={tr('Repeat the password')} type="password" required autoComplete="new-password" error={mismatch ? tr('The passwords do not match') : undefined} value={f.repeat} onChange={set('repeat')} /></div>
            {Boolean(error) && <p className="font-semibold text-pencil-dark" role="alert">{errorText(error)}</p>}
            <button className="btn-main w-full py-2.5" disabled={busy || mismatch}>{busy ? tr('Creating...') : tr('Start free trial')}</button>
            {options.data && <p className="text-sm text-soft">{tr('The trial lasts {0} days. No payment details are needed.', { 0: options.data.trialDays })}</p>}
          </form>
        </>
      )}
      <p className="mt-5 text-sm text-soft">{tr('Already registered?')}{' '}<Link to="/login" className="font-semibold text-accent hover:underline">{tr('Sign in')}</Link></p>
    </Frame>
  );
}
