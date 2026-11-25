import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { errorText, getLanguage, tr } from '../lib/i18n';

const SCRIPT = 'https://accounts.google.com/gsi/client';

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode: 'popup' }): void;
  renderButton(node: HTMLElement, o: { theme: string; size: string; width: number; text: string; locale: string }): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

export interface AuthOptions {
  centerSignup: boolean;
  studentSignup: boolean;
  trialDays: number;
  supportEmail: string;
  googleClientId: string | null;
}
export const useAuthOptions = () => useQuery({ queryKey: ['auth-options'], queryFn: () => get<AuthOptions>('/auth/options'), staleTime: 60_000 });

let loading: Promise<GoogleId> | null = null;
/** The script is requested only on pages that show the button. */
function loadGoogle(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google did not load')));
    s.onerror = () => reject(new Error('Google did not load'));
    document.head.append(s);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** Google's own button. Hidden when the platform has no client id. */
export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const clientId = useAuthOptions().data?.googleClientId;
  const box = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    handler.current = onCredential;
  });
  useEffect(() => {
    if (!clientId) return;
    let here = true;
    loadGoogle()
      .then((google) => {
        if (!here || !box.current) return;
        google.initialize({ client_id: clientId, ux_mode: 'popup', callback: (r) => handler.current(r.credential) });
        google.renderButton(box.current, { theme: 'outline', size: 'large', width: Math.min(400, box.current.clientWidth || 320), text: 'continue_with', locale: getLanguage() });
      })
      .catch(() => here && setFailed(true));
    return () => {
      here = false;
    };
  }, [clientId]);
  if (!clientId) return null;
  return failed ? <p className="text-sm text-soft">{tr('Google sign-in did not load. Use the password.')}</p> : <div ref={box} className="min-h-[44px] w-full" />;
}

interface Reply {
  needsProfile: boolean;
  accessToken?: string;
  email?: string;
  firstName?: string;
}

/** Sign in or sign up with Google. A new person can only register a center. */
export function GoogleSignIn({ onToken }: { onToken: (token: string) => Promise<void> }) {
  const options = useAuthOptions().data;
  const [pending, setPending] = useState<{ credential: string; email: string } | null>(null);
  const [value, setValue] = useState('');
  const send = useMutation({
    mutationFn: (body: { credential: string; centerName?: string }) => post<Reply>('/auth/google', { ...body, locale: getLanguage() }),
    onSuccess: async (r, body) => {
      if (r.accessToken) await onToken(r.accessToken);
      else setPending({ credential: body.credential, email: r.email ?? '' });
    },
  });
  if (!options?.googleClientId) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) send.mutate({ credential: pending.credential, centerName: value });
  };
  return (
    <div className="mb-5">
      {!pending ? (
        <GoogleButton onCredential={(credential) => send.mutate({ credential })} />
      ) : (
        <form className="space-y-3 rounded-xl border border-rule bg-well p-4" onSubmit={submit}>
          <p className="text-sm text-soft">{tr('{0} is new here. Name your education center to register it.', { 0: pending.email })}</p>
          <input className="field" required minLength={2} maxLength={120} aria-label={tr('Center name')} placeholder={tr('Center name')} value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="btn-main w-full" disabled={send.isPending}>{tr('Register a center')}</button>
        </form>
      )}
      {send.error && <p className="mt-2 font-semibold text-pencil-dark" role="alert">{errorText(send.error)}</p>}
      {!pending && <p className="mt-5 flex items-center gap-3 text-sm text-soft before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">{tr('or with e-mail')}</p>}
    </div>
  );
}
