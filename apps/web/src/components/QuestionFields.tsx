import { useState } from 'react';
import { QUESTION_TYPE_LABELS, QUESTION_TYPES, type QuestionKind } from '@last-lesson/scenario';
import { gradeAnswer, presentOptions } from '@last-lesson/validation/question';
import clsx from 'clsx';
import { Choice, Field } from './ui';
import { tr } from '../lib/i18n';

interface Opt { id: string; text: string }
export interface Draft { type: QuestionKind; options: any; correctAnswer: any }

const newId = () => Math.random().toString(36).slice(2, 8);
const blank = (n: number): Opt[] => Array.from({ length: n }, () => ({ id: newId(), text: '' }));

/** A fresh, correctly shaped question body for each type. */
export function emptyBody(type: QuestionKind): Pick<Draft, 'options' | 'correctAnswer'> {
  switch (type) {
    case 'MULTIPLE_CHOICE': return { options: blank(4), correctAnswer: null };
    case 'MULTI_SELECT': return { options: blank(4), correctAnswer: [] };
    case 'TRUE_FALSE': return { options: {}, correctAnswer: true };
    case 'TEXT': return { options: {}, correctAnswer: [''] };
    case 'MATCHING': { const left = blank(3); const right = blank(3); return { options: { left, right }, correctAnswer: Object.fromEntries(left.map((l, i) => [l.id, right[i].id])) }; }
    case 'ORDERING': { const items = blank(4); return { options: { items }, correctAnswer: items.map((i) => i.id) }; }
    case 'PUZZLE': return { options: { dials: [['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']] }, correctAnswer: ['0', '0'] };
  }
}

const Remove = ({ onClick, label }: { onClick: () => void; label: string }) => <button type="button" className="btn-quiet" aria-label={label} onClick={onClick}>{tr('Remove')}</button>;

export function QuestionBody({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  const { type, options, correctAnswer } = value;
  const set = (o: any, c: any = correctAnswer) => onChange({ type, options: o, correctAnswer: c });
  return (
    <div className="space-y-4">
      <Choice label={tr('Question type')} value={type} options={QUESTION_TYPES.map((t) => [t, tr(QUESTION_TYPE_LABELS[t])])} onChange={(e) => { const t = e.target.value as QuestionKind; onChange({ type: t, ...emptyBody(t) }); }} />
      {(type === 'MULTIPLE_CHOICE' || type === 'MULTI_SELECT') && (
        <fieldset>
          <legend className="lbl">{type === 'MULTIPLE_CHOICE' ? tr('Options: mark the correct one') : tr('Options: mark every correct one')}</legend>
          {(options as Opt[]).map((o, i) => {
            const on = type === 'MULTIPLE_CHOICE' ? correctAnswer === o.id : (correctAnswer as string[]).includes(o.id);
            return (
              <div key={o.id} className="mb-2 flex items-center gap-2">
                <input type={type === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'} name="correct" className="h-4 w-4 accent-[rgb(var(--accent))]" aria-label={tr('Option {0} is correct', { 0: i + 1 })} checked={on} onChange={() => set(options, type === 'MULTIPLE_CHOICE' ? o.id : on ? correctAnswer.filter((c: string) => c !== o.id) : [...correctAnswer, o.id])} />
                <input className="field" aria-label={tr('Option {0}', { 0: i + 1 })} maxLength={160} value={o.text} onChange={(e) => set(options.map((x: Opt) => (x.id === o.id ? { ...x, text: e.target.value } : x)))} />
                {options.length > (type === 'MULTIPLE_CHOICE' ? 2 : 3) && <Remove label={tr('Remove option {0}', { 0: i + 1 })} onClick={() => set(options.filter((x: Opt) => x.id !== o.id), type === 'MULTIPLE_CHOICE' ? (on ? null : correctAnswer) : correctAnswer.filter((c: string) => c !== o.id))} />}
              </div>
            );
          })}
          {options.length < 6 && <button type="button" className="btn-line" onClick={() => set([...options, ...blank(1)])}>{tr('Add an option')}</button>}
        </fieldset>
      )}
      {type === 'TRUE_FALSE' && <Choice label={tr('Correct answer')} value={String(correctAnswer)} options={[['true', tr('True')], ['false', tr('False')]]} onChange={(e) => set({}, e.target.value === 'true')} />}
      {type === 'TEXT' && (
        <fieldset>
          <legend className="lbl">{tr('Accepted answers (capital letters and punctuation do not matter)')}</legend>
          {(correctAnswer as string[]).map((c, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="field" aria-label={tr('Accepted answer {0}', { 0: i + 1 })} maxLength={60} value={c} onChange={(e) => set({}, correctAnswer.map((x: string, n: number) => (n === i ? e.target.value : x)))} />
              {correctAnswer.length > 1 && <Remove label={tr('Remove answer {0}', { 0: i + 1 })} onClick={() => set({}, correctAnswer.filter((_: string, n: number) => n !== i))} />}
            </div>
          ))}
          {correctAnswer.length < 10 && <button type="button" className="btn-line" onClick={() => set({}, [...correctAnswer, ''])}>{tr('Add an accepted answer')}</button>}
        </fieldset>
      )}
      {type === 'MATCHING' && (
        <fieldset>
          <legend className="lbl">{tr('Pairs: each row is a correct pair, the game shuffles them')}</legend>
          {(options.left as Opt[]).map((l, i) => {
            const r = (options.right as Opt[]).find((x) => x.id === correctAnswer[l.id]);
            const edit = (side: 'left' | 'right', id: string | undefined, t: string) => set({ ...options, [side]: options[side].map((x: Opt) => (x.id === id ? { ...x, text: t } : x)) });
            return (
              <div key={l.id} className="mb-2 flex gap-2">
                <input className="field" aria-label={tr('Pair {0}, left', { 0: i + 1 })} maxLength={160} value={l.text} onChange={(e) => edit('left', l.id, e.target.value)} />
                <input className="field" aria-label={tr('Pair {0}, right', { 0: i + 1 })} maxLength={160} value={r?.text ?? ''} onChange={(e) => edit('right', r?.id, e.target.value)} />
                {options.left.length > 2 && <Remove label={tr('Remove pair {0}', { 0: i + 1 })} onClick={() => { const { [l.id]: gone, ...rest } = correctAnswer; set({ left: options.left.filter((x: Opt) => x.id !== l.id), right: options.right.filter((x: Opt) => x.id !== gone) }, rest); }} />}
              </div>
            );
          })}
          {options.left.length < 5 && <button type="button" className="btn-line" onClick={() => { const [l] = blank(1); const [r] = blank(1); set({ left: [...options.left, l], right: [...options.right, r] }, { ...correctAnswer, [l.id]: r.id }); }}>{tr('Add a pair')}</button>}
        </fieldset>
      )}
      {type === 'ORDERING' && (
        <fieldset>
          <legend className="lbl">{tr('Items in the correct order, the game shuffles them')}</legend>
          {(options.items as Opt[]).map((o, i) => (
            <div key={o.id} className="mb-2 flex items-center gap-2">
              <span className="w-5 text-right text-soft">{i + 1}</span>
              <input className="field" aria-label={tr('Item {0}', { 0: i + 1 })} maxLength={160} value={o.text} onChange={(e) => set({ items: options.items.map((x: Opt) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
              {options.items.length > 3 && <Remove label={tr('Remove item {0}', { 0: i + 1 })} onClick={() => { const items = options.items.filter((x: Opt) => x.id !== o.id); set({ items }, items.map((x: Opt) => x.id)); }} />}
            </div>
          ))}
          {options.items.length < 6 && <button type="button" className="btn-line" onClick={() => { const items = [...options.items, ...blank(1)]; set({ items }, items.map((x: Opt) => x.id)); }}>{tr('Add an item')}</button>}
        </fieldset>
      )}
      {type === 'PUZZLE' && (
        <fieldset>
          <legend className="lbl">{tr('Dials: symbols separated by spaces, and the solution for each dial')}</legend>
          {(options.dials as string[][]).map((d, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="field" aria-label={tr('Dial {0} symbols', { 0: i + 1 })} value={d.join(' ')} onChange={(e) => set({ dials: options.dials.map((x: string[], n: number) => (n === i ? e.target.value.split(' ') : x)) })} onBlur={(e) => set({ dials: options.dials.map((x: string[], n: number) => (n === i ? e.target.value.split(/\s+/).filter(Boolean) : x)) })} />
              <select className="field !w-24" aria-label={tr('Dial {0} solution', { 0: i + 1 })} value={correctAnswer[i]} onChange={(e) => set(options, correctAnswer.map((x: string, n: number) => (n === i ? e.target.value : x)))}>{[...new Set([correctAnswer[i], ...d])].map((s) => <option key={s}>{s}</option>)}</select>
              {options.dials.length > 2 && <Remove label={tr('Remove dial {0}', { 0: i + 1 })} onClick={() => set({ dials: options.dials.filter((_: unknown, n: number) => n !== i) }, correctAnswer.filter((_: unknown, n: number) => n !== i))} />}
            </div>
          ))}
          {options.dials.length < 6 && <button type="button" className="btn-line" onClick={() => set({ dials: [...options.dials, [...options.dials[options.dials.length - 1]]] }, [...correctAnswer, options.dials[options.dials.length - 1][0]])}>{tr('Add a dial')}</button>}
        </fieldset>
      )}
    </div>
  );
}

/** Interactive answer control. Used for the in-game preview, practice before a game, and nothing else. */
export function AnswerControl({ type, options, value, onChange, dark }: { type: QuestionKind; options: any; value: any; onChange: (v: any) => void; dark?: boolean }) {
  const box = (on: boolean) => clsx('border px-3 py-2 text-left', dark ? (on ? 'border-lamp bg-lamp text-night' : 'border-night-4 bg-night-3 hover:border-lamp') : on ? 'border-accent bg-accent text-accent-ink' : 'border-rule bg-sheet hover:border-accent');
  const list = (opts: Opt[], many: boolean) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {opts.map((o) => {
        const on = many ? (value ?? []).includes(o.id) : value === o.id;
        return <button key={o.id} type="button" aria-pressed={on} className={box(on)} onClick={() => onChange(many ? (on ? value.filter((v: string) => v !== o.id) : [...(value ?? []), o.id]) : o.id)}>{o.text || '...'}</button>;
      })}
    </div>
  );
  switch (type) {
    case 'MULTIPLE_CHOICE': return list(options, false);
    case 'MULTI_SELECT': return list(options, true);
    case 'TRUE_FALSE': return <div className="grid grid-cols-2 gap-2">{[true, false].map((v) => <button key={String(v)} type="button" aria-pressed={value === v} className={box(value === v)} onClick={() => onChange(v)}>{v ? tr('True') : tr('False')}</button>)}</div>;
    case 'TEXT': return <input className={dark ? 'nfield' : 'field'} aria-label={tr('Your answer')} maxLength={60} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'MATCHING': return (
      <div className="space-y-2">
        {(options.left as Opt[]).map((l) => (
          <label key={l.id} className="grid items-center gap-2 sm:grid-cols-2"><span>{l.text}</span>
            <select className={dark ? 'nfield' : 'field'} value={value?.[l.id] ?? ''} onChange={(e) => onChange({ ...(value ?? {}), [l.id]: e.target.value })}><option value="">{tr('Choose a pair')}</option>{(options.right as Opt[]).map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}</select>
          </label>
        ))}
      </div>
    );
    case 'ORDERING': {
      const order: string[] = value ?? (options.items as Opt[]).map((i) => i.id);
      const move = (i: number, by: number) => { const n = [...order]; const [x] = n.splice(i, 1); n.splice(i + by, 0, x); onChange(n); };
      return (
        <ol className="space-y-1.5">
          {order.map((id, i) => {
            const t = (options.items as Opt[]).find((o) => o.id === id)?.text ?? '';
            return <li key={id} className={clsx('flex items-center gap-2 px-3 py-1.5', box(false))}><span className="opacity-60">{i + 1}</span><span className="flex-1">{t}</span><button type="button" aria-label={tr('Move {0} up', { 0: t })} disabled={i === 0} onClick={() => move(i, -1)} className="px-2 disabled:opacity-25">▲</button><button type="button" aria-label={tr('Move {0} down', { 0: t })} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="px-2 disabled:opacity-25">▼</button></li>;
          })}
        </ol>
      );
    }
    case 'PUZZLE': {
      const pos: string[] = value ?? (options.dials as string[][]).map((d) => d[0]);
      const turn = (i: number, by: number) => { const d = options.dials[i]; onChange(pos.map((p, n) => (n === i ? d[(d.indexOf(p) + by + d.length) % d.length] : p))); };
      return <div className="flex flex-wrap gap-3">{pos.map((p, i) => <div key={i} className="grid justify-items-center"><button type="button" aria-label={tr('Dial {0} up', { 0: i + 1 })} onClick={() => turn(i, 1)} className="px-4 py-1">▲</button><span className={clsx('grid h-12 w-12 place-items-center border text-2xl', dark ? 'border-night-4 bg-night font-dot text-lamp' : 'border-rule bg-well text-ink')}>{p}</span><button type="button" aria-label={tr('Dial {0} down', { 0: i + 1 })} onClick={() => turn(i, -1)} className="px-4 py-1">▼</button></div>)}</div>;
    }
    default: return null;
  }
}

/** What a student will see, playable in place. */
export function QuestionPreview({ q }: { q: { type: QuestionKind; prompt: string; options: any; correctAnswer: any; hint?: string | null; explanation?: string | null } }) {
  const [value, setValue] = useState<any>(undefined);
  const [result, setResult] = useState<boolean | null>(null);
  const shown = presentOptions(q.type, q.options, `preview:${q.prompt}`, q.correctAnswer);
  return (
    <div className="border-[6px] border-[#5c3f33] bg-[#1c3531] p-4 text-[#e9e6d2]">
      <p className="mb-3 font-dot text-xl">{q.prompt || tr('Your question')}</p>
      <AnswerControl dark type={q.type} options={shown} value={value} onChange={(v) => { setValue(v); setResult(null); }} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="nbtn !py-1.5" onClick={() => setResult(gradeAnswer(q.type, q.correctAnswer, value ?? (q.type === 'ORDERING' ? (shown as any).items.map((i: Opt) => i.id) : q.type === 'PUZZLE' ? (shown as any).dials.map((d: string[]) => d[0]) : undefined)))}>{tr('Try it')}</button>
        {result !== null && <span role="status" className={result ? 'text-[#a9d0a2]' : 'text-[#f09a86]'}>{result ? tr('Correct') : tr('Not correct')}{q.explanation ? `. ${q.explanation}` : ''}</span>}
      </div>
      {q.hint && <p className="mt-2 text-sm opacity-75">{tr('Hint for the student:')}{' '}{q.hint}</p>}
    </div>
  );
}

export const SubjectTopic = ({ subjects, subjectId, topicId, onChange, errors }: { subjects: any[]; subjectId: string; topicId: string; onChange: (s: string, t: string) => void; errors?: string }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Choice label={tr('Subject')} error={errors} value={subjectId} options={[['', tr('Choose a subject')], ...subjects.map((s) => [s.id, tr(s.name)] as [string, string])]} onChange={(e) => onChange(e.target.value, '')} required />
    <Field label={tr('Topic')}>{(id) => <select id={id} className="field" value={topicId} onChange={(e) => onChange(subjectId, e.target.value)}><option value="">{tr('No topic')}</option>{subjects.find((s) => s.id === subjectId)?.topics.map((t: any) => <option key={t.id} value={t.id}>{tr(t.name)}</option>)}</select>}</Field>
  </div>
);
