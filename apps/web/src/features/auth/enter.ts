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
    if (!languageChosen() && saved !== getLanguage()) await setLanguage(saved, false);
  };
}
