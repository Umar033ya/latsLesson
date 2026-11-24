import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import clsx from 'clsx';
import { toast } from 'sonner';
import { TriangleAlert, type LucideIcon } from 'lucide-react';
import { ApiError } from '../lib/api';
import { ago, words } from '../lib/format';
import { dateLocale, errorText, tr } from '../lib/i18n';

export function Page({ title, note, action, children, bare }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode; bare?: boolean }) {
  useEffect(() => {
    document.title = `${title} | LAST LESSON`;
  }, [title]);
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-12 pt-5 sm:px-8 sm:pt-7">
      {!bare && (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-balance text-[28px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
            {note && <p className="mt-1 max-w-[64ch] text-soft">{note}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-2">{action}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

export const Section = ({ title, children, action, className }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) => (
  <section className={clsx('sheet min-w-0 overflow-x-auto p-5', className)}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

export interface Figure {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  /** Recent values, drawn as a small trend without axes. */
  trend?: number[];
  tone?: 'plain' | 'good' | 'warn';
}
export const Figures = ({ items }: { items: Figure[] }) => (
  <dl className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
    {items.map(({ label, value, sub, icon: Icon, trend, tone }) => (
      <div key={label} className="sheet relative overflow-hidden p-4">
        <dt className="flex items-center justify-between gap-2 text-[13px] text-soft">
          {label}
          {Icon && <Icon size={18} aria-hidden="true" className={tone === 'warn' ? 'text-pencil' : 'text-accent'} />}
        </dt>
        <dd className={clsx('mt-1.5 text-[26px] font-bold leading-none tabular-nums', tone === 'warn' && 'text-pencil-dark')}>{value}</dd>
        {sub && <dd className="mt-1.5 text-[13px] text-soft">{sub}</dd>}
        {trend && trend.some(Boolean) && <Spark values={trend} />}
      </div>
    ))}
  </dl>
);

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${26 - (v / max) * 22}`).join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden="true">
      <polygon points={`0,28 ${pts} 100,28`} className="fill-s1/15" />
      <polyline points={pts} fill="none" className="stroke-s1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const Tag = ({ tone = 'grey', children }: { tone?: 'grey' | 'green' | 'red' | 'amber' | 'blue'; children: ReactNode }) => (
  <span className={clsx('tag', { grey: 'bg-well text-soft ring-1 ring-inset ring-rule', green: 'bg-moss-pale text-moss', red: 'bg-pencil-pale text-pencil-dark', amber: 'bg-amber-pale text-amber-dark', blue: 'bg-sky-pale text-sky' }[tone])}>{children}</span>
);

const TONES: Record<string, 'green' | 'red' | 'amber' | 'grey' | 'blue'> = { ACTIVE: 'green', PUBLISHED: 'green', COMPLETED: 'green', ESCAPED: 'green', DISMISSED: 'green', SUSPENDED: 'red', REVOKED: 'red', EXPIRED: 'red', DETAINED: 'red', DRAFT: 'amber', PAUSED: 'amber', IN_PROGRESS: 'blue', INACTIVE: 'grey', ABANDONED: 'grey', ARCHIVED: 'grey', USED_UP: 'grey', LEFT: 'grey', TIMEOUT: 'amber' };
export const Status = ({ value }: { value: string }) => <Tag tone={TONES[value] ?? 'grey'}>{tr(words(value))}</Tag>;

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label className="lbl" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && !error && <p className="mt-1 text-[13px] text-soft">{hint}</p>}
      {error && <p className="mt-1 text-[13px] font-semibold text-pencil-dark">{error}</p>}
    </div>
  );
}

export const Text = ({ label, error, hint, ...p }: { label: string; error?: string; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <Field label={label} error={error} hint={hint}>{(id) => <input id={id} {...p} className={clsx('field', p.className)} aria-invalid={Boolean(error)} />}</Field>
);
export const Area = ({ label, error, hint, ...p }: { label: string; error?: string; hint?: ReactNode } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <Field label={label} error={error} hint={hint}>{(id) => <textarea id={id} rows={3} {...p} className={clsx('field', p.className)} />}</Field>
);
export const Choice = ({ label, error, hint, options, ...p }: { label: string; error?: string; hint?: ReactNode; options: Array<[string, string]> } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <Field label={label} error={error} hint={hint}>
    {(id) => (
      <select id={id} {...p} className={clsx('field', p.className)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    )}
  </Field>
);
export const Check = ({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) => (
  <label className={clsx('flex items-start gap-2.5', disabled && 'opacity-50')}>
    <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}{hint && <span className="block text-[13px] text-soft">{hint}</span>}</span>
  </label>
);

export function Dialog({ title, open, onClose, children, wide }: { title: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} className={clsx('max-h-[92vh] w-[calc(100vw-24px)] overflow-auto rounded-xl border border-rule bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/55', wide ? 'max-w-3xl' : 'max-w-lg')}>
      <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="btn-quiet" onClick={onClose} aria-label={tr('Close')}>{tr('Close')}</button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-rule bg-sheet/60 px-4 py-12 text-center">
    <p className="font-semibold">{title}</p>
    {children && <div className="mx-auto mt-1 max-w-[52ch] text-soft">{children}</div>}
  </div>
);

/** Loading, error and data states for a query in one place. */
export function Load<T>({ q, children }: { q: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (q.isPending) return <div className="space-y-2 py-2" role="status" aria-label={tr('Loading')}>{[70, 92, 84, 60].map((w) => <div key={w} className="h-5 animate-pulse rounded-sm bg-track" style={{ width: `${w}%` }} />)}</div>;
  if (q.isError) return <div className="sheet border-pencil/40 p-5"><p className="font-semibold text-pencil-dark">{errorText(q.error)}</p><button className="btn-line mt-3" onClick={() => q.refetch()}>{tr('Try again')}</button></div>;
  return <>{children(q.data)}</>;
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages < 2) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm text-soft">
      <span>{tr('Page {page} of {pages}, {total} in total', { page, pages, total })}</span>
      <button className="btn-line" disabled={page <= 1} onClick={() => onPage(page - 1)}>{tr('Back')}</button>
      <button className="btn-line" disabled={page >= pages} onClick={() => onPage(page + 1)}>{tr('Next')}</button>
    </div>
  );
}

/** Horizontal bars with the value written out; a warning is an icon and a colour, never colour alone. */
export const Bars = ({ rows, max = 100, unit = '%', warnBelow }: { rows: Array<{ key: string; label: ReactNode; value: number; note?: string }>; max?: number; unit?: string; warnBelow?: number }) => (
  <ul className="space-y-3">
    {rows.map((r) => {
      const warn = warnBelow !== undefined && r.value < warnBelow;
      return (
        <li key={r.key}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate">{warn && <TriangleAlert size={14} aria-hidden="true" className="mr-1 inline text-pencil" />}{r.label}</span><span className="whitespace-nowrap tabular-nums text-soft"><b className="text-ink">{r.value}{unit}</b>{r.note && ` ${r.note}`}</span></div>
          <div className="mt-1.5 h-2 rounded-full bg-track"><div className={clsx('h-full rounded-full', warn ? 'bg-pencil' : 'bg-s1')} style={{ width: `${Math.max(1.5, Math.min(100, (r.value / Math.max(1, max)) * 100))}%` }} /></div>
        </li>
      );
    })}
  </ul>
);

/** Sessions per day: columns, a crosshair tooltip that also works from the keyboard, and a table for screen readers. */
export function DayChart({ data }: { data: Array<{ day: string; started: number; completed: number }> }) {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(4, ...data.map((d) => d.started));
  const top = Math.ceil(max / 4) * 4;
  const label = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
  const hover = at === null ? null : data[at];
  const move = (by: number) => setAt((i) => Math.max(0, Math.min(data.length - 1, (i ?? data.length - 1) + by)));
  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-soft"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-s1" />{tr('Completed')}</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-s2" />{tr('Not finished')}</span></div>
      <div className="relative grid grid-cols-[28px_1fr]">
        <div className="flex h-44 flex-col justify-between pr-2 text-right text-xs tabular-nums text-soft" aria-hidden="true"><span>{top}</span><span>{top / 2}</span><span>0</span></div>
        <div className="relative h-44" tabIndex={0} role="img" aria-label={`${tr('Sessions per day')}: ${data.reduce((s, d) => s + d.started, 0)}`} onKeyDown={(e) => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); }} onMouseLeave={() => setAt(null)} onBlur={() => setAt(null)} onFocus={() => setAt(data.length - 1)}>
          {[0, 50, 100].map((y) => <div key={y} className="absolute inset-x-0 border-t border-rule" style={{ top: `${y}%` }} />)}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.day} className="flex h-full flex-1 flex-col justify-end gap-[2px]" onMouseEnter={() => setAt(i)}>
                {d.started > d.completed && <div className={clsx('mx-auto w-full max-w-[22px] rounded-t-[4px] bg-s2', at !== null && at !== i && 'opacity-50')} style={{ height: `${((d.started - d.completed) / top) * 100}%` }} />}
                {d.completed > 0 && <div className={clsx('mx-auto w-full max-w-[22px] bg-s1', d.started === d.completed && 'rounded-t-[4px]', at !== null && at !== i && 'opacity-50')} style={{ height: `${(d.completed / top) * 100}%` }} />}
              </div>
            ))}
          </div>
          {hover && (
            <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-rule bg-sheet px-3 py-2 text-[13px] shadow-sheet" style={{ left: `${((at! + 0.5) / data.length) * 100}%`, transform: `translate(${at! > data.length / 2 ? '-100%' : '0'}, 0)` }}>
              <p className="text-soft">{label(hover.day)}</p>
              <p className="whitespace-nowrap"><b className="tabular-nums">{hover.completed}</b> <span className="text-soft">{tr('Completed').toLowerCase()}</span></p>
              <p className="whitespace-nowrap"><b className="tabular-nums">{hover.started - hover.completed}</b> <span className="text-soft">{tr('Not finished').toLowerCase()}</span></p>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 flex justify-between pl-7 text-xs text-soft"><span>{data[0] && label(data[0].day)}</span><span>{data.length > 2 && label(data[Math.floor(data.length / 2)].day)}</span><span>{data.length > 0 && label(data[data.length - 1].day)}</span></figcaption>
      <table className="sr-only"><tbody>{data.filter((d) => d.started).map((d) => <tr key={d.day}><th>{label(d.day)}</th><td>{d.started}</td><td>{d.completed}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Parts of a whole as one bar with a written legend. */
export function Split({ parts }: { parts: Array<{ label: string; value: number; tone: 'good' | 'plain' | 'warn' }> }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const color = { good: 'bg-s1', plain: 'bg-s2', warn: 'bg-pencil' };
  if (!total) return <p className="text-soft">{tr('No data')}</p>;
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">{parts.filter((p) => p.value).map((p) => <div key={p.label} title={`${p.label}: ${p.value}`} className={color[p.tone]} style={{ width: `${(p.value / total) * 100}%` }} />)}</div>
      <ul className="mt-3 space-y-1.5 text-sm">{parts.map((p) => <li key={p.label} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={clsx('h-2.5 w-2.5 rounded-[3px]', color[p.tone])} />{p.label}</span><span className="tabular-nums"><b>{p.value}</b> <span className="text-soft">{Math.round((p.value / total) * 100)}%</span></span></li>)}</ul>
    </div>
  );
}

/** Opening panel of a dashboard: the school at night, a greeting, and what to do next. */
export const Hero = ({ title, text, children, aside }: { title: string; text: ReactNode; children?: ReactNode; aside?: ReactNode }) => (
  <div className="relative mb-5 overflow-hidden rounded-2xl bg-night text-bone">
    <div className="absolute inset-y-0 right-0 w-full bg-cover bg-[70%_60%] [image-rendering:pixelated] sm:w-3/4" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/10" aria-hidden="true" />
    <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
      <div className="max-w-xl">
        <h1 className="text-balance text-[26px] font-bold leading-tight sm:text-[32px]">{title}</h1>
        <p className="mt-1.5 text-fog">{text}</p>
        {children && <div className="mt-5 flex flex-wrap gap-2.5">{children}</div>}
      </div>
      {aside}
    </div>
  </div>
);

/** Short activity list with relative time. */
export const Feed = ({ items }: { items: Array<{ key: string; text: ReactNode; who?: string; at: string }> }) => (
  <ol className="relative space-y-3.5 border-l border-rule pl-4">
    {items.map((i) => <li key={i.key} className="relative text-sm"><i className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-sheet bg-accent" />{i.text}<span className="block text-[13px] text-soft">{[i.who, ago(i.at)].filter(Boolean).join(', ')}</span></li>)}
  </ol>
);

/** Mutation with a toast for both outcomes and cache refresh. */
export function useAction<V, R>(fn: (v: V) => Promise<R>, opts: { ok?: string; keys?: string[]; then?: (r: R, v: V) => void } = {}) {
  const qc = useQueryClient();
  return useMutation<R, Error, V>({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      if (opts.ok) toast.success(tr(opts.ok));
      await Promise.all((opts.keys ?? []).map((k) => qc.invalidateQueries({ queryKey: [k] })));
      opts.then?.(r, v);
    },
    onError: (e) => toast.error(errorText(e)),
  });
}
export const fieldError = (e: unknown, name: string) => (e instanceof ApiError && e.fields[name]?.[0] ? tr(e.fields[name][0]) : undefined);

export const confirmed = (text: string) => window.confirm(text);
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Copying is blocked by the browser');
  }
}
export function download(name: string, content: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
