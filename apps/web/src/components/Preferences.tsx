import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { LOCALE_NAMES, LOCALES } from '@last-lesson/scenario';
import { useAuth } from '../lib/api';
import { tr, applyTheme, getLanguage, getTheme, setLanguage } from '../lib/i18n';
import { useState } from 'react';

/** Language names are written in their own language so that everyone can find theirs. */
export function LanguageSwitch({ dark, className }: { dark?: boolean; className?: string }) {
  const signedIn = useAuth((s) => Boolean(s.me));
  const now = getLanguage();
  return (
    <div className={clsx('inline-flex overflow-hidden rounded-lg border', dark ? 'border-night-4' : 'border-rule', className)} role="group" aria-label={tr('Language')}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={now === l} title={LOCALE_NAMES[l]} onClick={() => l !== now && setLanguage(l, signedIn)} className={clsx('px-2.5 py-1.5 text-[13px] font-semibold uppercase', dark ? (now === l ? 'bg-lamp text-night' : 'bg-night-2/80 text-fog hover:text-bone') : now === l ? 'bg-accent text-accent-ink' : 'bg-sheet text-soft hover:text-ink')}>{l}</button>
      ))}
    </div>
  );
}

export function LanguagePicker({ dark }: { dark?: boolean }) {
  const signedIn = useAuth((s) => Boolean(s.me));
  const now = getLanguage();
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr('Language')}>
      {LOCALES.map((l) => (
        <button key={l} type="button" role="radio" lang={l} aria-checked={now === l} onClick={() => l !== now && setLanguage(l, signedIn)} className={clsx('rounded-lg border px-4 py-3 text-left font-semibold', dark ? (now === l ? 'border-lamp bg-lamp text-night' : 'border-night-4 text-fog hover:border-lamp') : now === l ? 'border-accent bg-accent-soft text-ink' : 'border-rule hover:border-soft')}>{LOCALE_NAMES[l]}</button>
      ))}
    </div>
  );
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState(getTheme());
  const next = theme === 'day' ? 'night' : 'day';
  return (
    <button type="button" className="btn-line !px-2.5" aria-label={next === 'night' ? tr('Night theme') : tr('Day theme')} title={next === 'night' ? tr('Night theme') : tr('Day theme')} onClick={() => { applyTheme(next); setTheme(next); }}>
      {theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
