import { toLocale, type Locale } from '@last-lesson/scenario';

/** Shared with the panels on the same site, so the game opens in the language chosen there. */
const KEY = 'last-lesson-lang';
let lang: Locale = 'en';
let dict: Record<string, string> = {};

/** Runs before the rest of the game is imported; story text in module scope is translated at import. */
export async function loadLanguage() {
  let wanted: string | null = new URLSearchParams(location.search).get('lang');
  try {
    if (wanted) localStorage.setItem(KEY, wanted);
    wanted ??= localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  lang = toLocale(wanted ?? navigator.language.slice(0, 2));
  document.documentElement.lang = lang;
  if (lang === 'ru') dict = (await import('./ru')).default;
  if (lang === 'uz') dict = (await import('./uz')).default;
}

export const getLanguage = () => lang;

export function tr(text: string, values?: Record<string, string | number>): string {
  const out = dict[text] ?? text;
  return values ? out.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? '')) : out;
}

/** Server messages are English; known codes have their own text. */
export const errorText = (e: { code?: string; message: string }) => (e.code && dict[`error.${e.code}`]) || tr(e.message);

/** Saved progress survives: the session is recovered after the reload. */
export function setLanguage(next: Locale) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  history.replaceState(null, '', url);
  location.reload();
}
