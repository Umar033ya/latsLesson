import { dateLocale, tr } from './i18n';

export const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const when = (v?: string | null) => (v ? new Date(v).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const mins = (s?: number | null) => (!s ? `0 ${tr('min')}` : s < 60 ? `${s} ${tr('s')}` : `${Math.floor(s / 60)} ${tr('min')}${s < 600 && s % 60 ? ` ${s % 60} ${tr('s')}` : ''}`);
export const pct = (v?: number | null) => (v === null || v === undefined ? tr('No data') : `${Math.round(v)}%`);
export function ago(v: string): string {
  const s = Math.round((new Date(v).getTime() - Date.now()) / 1000);
  const f = new Intl.RelativeTimeFormat(dateLocale(), { numeric: 'auto' });
  const abs = Math.abs(s);
  if (abs < 60) return f.format(0, 'minute');
  if (abs < 3600) return f.format(Math.round(s / 60), 'minute');
  if (abs < 86_400) return f.format(Math.round(s / 3600), 'hour');
  return f.format(Math.round(s / 86_400), 'day');
}
export const words = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');
export const OUTCOME: Record<string, string> = { ESCAPED: tr('Escaped'), DISMISSED: tr('Rang the bell'), DETAINED: tr('Detention'), TIMEOUT: tr('Out of time'), LEFT: tr('Left early') };
/** Local calendar day; the UTC one would move an evening deadline by a day. */
export const toDateInput = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-CA') : '');
export const fromDateInput = (v: string) => (v ? new Date(`${v}T23:59:59`).toISOString() : null);

/** Human-readable answer for any question type. */
export function describeAnswer(type: string, options: any, answer: any): string {
  if (answer === null || answer === undefined) return tr('No answer');
  const label = (list: any[], id: string) => list?.find((o) => o.id === id)?.text ?? id;
  switch (type) {
    case 'MULTIPLE_CHOICE': return label(options, answer);
    case 'MULTI_SELECT': return Array.isArray(answer) ? answer.map((a) => label(options, a)).join(', ') : String(answer);
    case 'TRUE_FALSE': return answer ? tr('True') : tr('False');
    case 'MATCHING': return Object.entries(answer).map(([l, r]) => `${label(options.left, l)} = ${label(options.right, r as string)}`).join('; ');
    case 'ORDERING': return Array.isArray(answer) ? answer.map((a) => label(options.items, a)).join(' > ') : String(answer);
    case 'PUZZLE': return Array.isArray(answer) ? answer.join(' ') : String(answer);
    case 'TEXT': return Array.isArray(answer) ? answer.join(' / ') : String(answer);
    default: return String(answer);
  }
}
