import { LOCALES, toLocale, type Locale } from '@last-lesson/scenario';
import { ApiError, call, setLangHeader } from './api';

const KEY = 'last-lesson-lang';
let lang: Locale = 'en';
let dict: Record<string, string> = {};

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Saved choice, then the browser language. Runs before the app is imported, so every module sees the language. */
export async function loadLanguage() {
  const wanted = stored() ?? navigator.language.slice(0, 2);
  lang = toLocale(wanted);
  document.documentElement.lang = lang;
  setLangHeader(lang);
  if (lang === 'ru') dict = (await import('../i18n/ru')).default;
  if (lang === 'uz') dict = (await import('../i18n/uz')).default;
}

export const getLanguage = () => lang;
export const languageChosen = () => (LOCALES as readonly string[]).includes(stored() ?? '');
export const dateLocale = () => ({ en: 'en-GB', ru: 'ru-RU', uz: 'uz-UZ' })[lang];

/** English text is the key. A missing translation shows the English text instead of an empty label. */
export function tr(text: string, values?: Record<string, string | number>): string {
  const out = dict[text] ?? text;
  return values ? out.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? '')) : out;
}

/** Plural forms: "one|few|many" for Russian, "one|many" for English, a single form for Uzbek. */
export function plural(n: number, forms: string): string {
  const list = tr(forms).split('|');
  if (lang === 'ru' && list.length === 3) {
    const i = n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
    return `${n} ${list[i]}`;
  }
  return `${n} ${list[n === 1 ? 0 : list.length - 1]}`;
}

export function errorText(error: unknown): string {
  if (!(error instanceof Error)) return tr('Something went wrong');
  if (error instanceof ApiError) {
    const byCode = `error.${error.code}`;
    if (dict[byCode]) return dict[byCode];
  }
  return tr(error.message);
}

/** The page reloads so that every open screen, date and cached answer changes together. */
export async function setLanguage(next: Locale, signedIn: boolean) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  if (signedIn) await call('PATCH', '/auth/me', { locale: next }).catch(() => undefined);
  location.reload();
}

const THEME = 'last-lesson-theme';
export type Theme = 'day' | 'night';
export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'night' ? 'night' : 'day');
export function applyTheme(theme?: Theme) {
  let value = theme;
  try {
    if (theme) localStorage.setItem(THEME, theme);
    else value = (localStorage.getItem(THEME) as Theme | null) ?? 'day';
  } catch {
    /* private mode */
  }
  document.documentElement.dataset.theme = value === 'night' ? 'night' : 'day';
}
