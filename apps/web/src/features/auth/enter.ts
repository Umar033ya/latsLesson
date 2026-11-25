import { useNavigate } from 'react-router-dom';
import { toLocale } from '@last-lesson/scenario';
import { homeOf, startSession } from '../../lib/api';
import { getLanguage, languageChosen, setLanguage } from '../../lib/i18n';

/** Opens the session and, on a device without its own choice, switches to the language saved in the account. */
export function useEnter() {
  const nav = useNavigate();
  return async (token: string) => {
    const me = await startSession(token);
    const saved = toLocale(me.locale);
    nav(homeOf(me));
    // English is also what an account has before anybody chose, so it never overrides the language of the browser.
    if (!languageChosen() && saved !== 'en' && saved !== getLanguage()) await setLanguage(saved, false);
  };
}
