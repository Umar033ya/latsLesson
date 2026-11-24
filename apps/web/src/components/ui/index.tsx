import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function Button({ variant = 'primary', className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost',
    danger: 'btn bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60',
  };
  return <button className={clsx(styles[variant], className)} {...props}>{children}</button>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

export function Input({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input className={clsx('input', error && 'border-red-500')} {...props} />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <select className="input" {...props}>{children}</select>
    </label>
  );
}

export function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <textarea className="input min-h-[90px]" {...props} />
    </label>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue'; children: ReactNode }) {
  const tones = {
    slate: 'bg-white/10 text-slate-300', green: 'bg-emerald-500/15 text-emerald-300',
    red: 'bg-red-500/15 text-red-300', amber: 'bg-amber-500/15 text-amber-300', blue: 'bg-sky-500/15 text-sky-300',
  };
  return <span className={clsx('badge', tones[tone])}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'red' }: { label: string; value: string | number; icon?: ReactNode; hint?: string; tone?: 'red' | 'green' | 'blue' | 'amber' }) {
  const tones = { red: 'text-red-400 bg-red-500/10', green: 'text-emerald-400 bg-emerald-500/10', blue: 'text-sky-400 bg-sky-500/10', amber: 'text-amber-400 bg-amber-500/10' };
  return (
    <Card className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <div className={clsx('rounded-lg p-2.5', tones[tone])}>{icon}</div>}
    </Card>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />{label}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-600" />
      <p className="font-semibold text-slate-300">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-900/40 bg-red-950/20 py-12 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-400" />
      <p className="font-semibold text-red-200">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-red-300/70">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, title, children, onClose, footer }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button className="text-slate-500 hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, tone = 'red' }: { value: number; tone?: 'red' | 'green' | 'amber' }) {
  const color = { red: 'bg-blood', green: 'bg-mint', amber: 'bg-amber-500' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
