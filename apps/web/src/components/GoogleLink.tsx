import { useState } from 'react';
import { Section, Text, useAction } from './ui';
import { del, get, post, useAuth, type Me } from '../lib/api';
import { tr } from '../lib/i18n';
import { GoogleButton, useAuthOptions } from './Google';

/** Connects a Google account to the profile. The password is asked again, so an open tab is not enough. */
export function GoogleLink() {
  const me = useAuth((s) => s.me)!;
  const options = useAuthOptions().data;
  const [password, setPassword] = useState('');
  const refresh = async () => useAuth.setState({ me: await get<Me>('/auth/me') });
  const link = useAction((credential: string) => post('/auth/google/link', { credential, password }), { ok: 'Google account linked', then: () => { setPassword(''); void refresh(); } });
  const unlink = useAction(() => del('/auth/google/link'), { ok: 'Google account unlinked', then: () => void refresh() });
  if (!options?.googleClientId) return null;
  return (
    <Section title="Google">
      {me.signIn.google ? (
        <>
          <p className="mb-3 text-soft">{tr('You can sign in with Google.')}</p>
          {me.signIn.password && <button className="btn-line" disabled={unlink.isPending} onClick={() => unlink.mutate(undefined as never)}>{tr('Unlink Google')}</button>}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-soft">{tr('Type your password, then choose the Google account.')}</p>
          <Text label={tr('Current password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {password && <GoogleButton onCredential={(credential) => link.mutate(credential)} />}
        </div>
      )}
    </Section>
  );
}
