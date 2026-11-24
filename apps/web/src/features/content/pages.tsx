import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUESTION_TYPE_LABELS, QUESTION_TYPES, type QuestionKind } from '@last-lesson/scenario';
import { validateQuestionContent } from '@last-lesson/validation/question';
import { Area, Choice, confirmed, Dialog, download, Empty, Load, Page, Pager, Status, Tag, Text, useAction } from '../../components/ui';
import { emptyBody, QuestionBody, QuestionPreview, SubjectTopic } from '../../components/QuestionFields';
import { del, get, post, put, useAuth } from '../../lib/api';
import { words } from '../../lib/format';
import { errorText, tr } from '../../lib/i18n';

export const useSubjects = () => useQuery({ queryKey: ['subjects'], queryFn: () => get<any[]>('/subjects') });
const DIFF: Array<[string, string]> = [['EASY', tr('Easy')], ['MEDIUM', tr('Medium')], ['HARD', tr('Hard')]];
const isSuper = () => useAuth.getState().me?.role === 'SUPER_ADMIN';

export function Questions() {
  const superAdmin = isSuper();
  const [f, setF] = useState({ page: 1, search: '', subjectId: '', difficulty: '', type: '', status: '', scope: superAdmin ? 'official' : 'all' });
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const subjects = useSubjects();
  const q = useQuery({ queryKey: ['questions', f], queryFn: () => get<any>('/questions', f) });
  const remove = useAction((id: string) => del<any>(`/questions/${id}`), { ok: 'Question removed', keys: ['questions'] });
  const filter = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, page: 1 });
  const canEdit = (x: any) => superAdmin || x.organizationId;
  return (
    <Page
      title={superAdmin ? tr('Question bank') : tr('Questions')}
      note={superAdmin ? tr('Official questions are available to every center.') : tr('Your own questions, and the official bank you can draw from.')}
      action={<><button className="btn-line" onClick={async () => download('last-lesson-questions.json', JSON.stringify(await get('/questions/export'), null, 2))}>{tr('Export')}</button><button className="btn-line" onClick={() => setImporting(true)}>{tr('Import')}</button><button className="btn-main" onClick={() => setEdit({})}>{tr('New question')}</button></>}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <input className="field lg:col-span-2" placeholder={tr('Search in questions')} aria-label={tr('Search')} value={f.search} onChange={filter('search')} />
        <select className="field" aria-label={tr('Subject')} value={f.subjectId} onChange={filter('subjectId')}><option value="">{tr('All subjects')}</option>{subjects.data?.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}</select>
        <select className="field" aria-label={tr('Difficulty')} value={f.difficulty} onChange={filter('difficulty')}><option value="">{tr('Any difficulty')}</option>{DIFF.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <select className="field" aria-label={tr('Type')} value={f.type} onChange={filter('type')}><option value="">{tr('Any type')}</option>{QUESTION_TYPES.map((t) => <option key={t} value={t}>{tr(QUESTION_TYPE_LABELS[t])}</option>)}</select>
        {superAdmin ? <select className="field" aria-label={tr('Status')} value={f.status} onChange={filter('status')}><option value="">{tr('Any status')}</option><option value="PUBLISHED">{tr('Published')}</option><option value="DRAFT">{tr('Draft')}</option></select> : <select className="field" aria-label={tr('Source')} value={f.scope} onChange={filter('scope')}><option value="all">{tr('All sources')}</option><option value="own">{tr('Our questions')}</option><option value="official">{tr('Official bank')}</option></select>}
      </div>
      <Load q={q}>
        {(d) =>
          d.items.length ? (
            <div className="sheet overflow-x-auto">
              <table className="reg min-w-[760px]">
                <thead><tr><th>{tr('Question')}</th><th>{tr('Subject')}</th><th>{tr('Type')}</th><th>{tr('Difficulty')}</th><th>{tr('Status')}</th><th /></tr></thead>
                <tbody>
                  {d.items.map((x: any) => (
                    <tr key={x.id}>
                      <td className="max-w-[380px]"><button className="text-left font-medium hover:underline" onClick={() => setView(x)}>{x.prompt}</button>{!x.organizationId && !superAdmin && <> <Tag tone="blue">{tr('Official')}</Tag></>}</td>
                      <td>{tr(x.subject.name)}<span className="block text-[13px] text-soft">{x.topic && tr(x.topic.name)}</span></td>
                      <td>{tr(QUESTION_TYPE_LABELS[x.type as QuestionKind])}</td>
                      <td>{tr(words(x.difficulty))}</td>
                      <td><Status value={x.status} /></td>
                      <td className="whitespace-nowrap text-right">
                        {canEdit(x) ? <><button className="btn-quiet" onClick={() => setEdit(x)}>{tr('Edit')}</button><button className="btn-quiet hover:!text-pencil" onClick={() => confirmed(tr('Remove this question?')) && remove.mutate(x.id)}>{tr('Remove')}</button></> : <button className="btn-quiet" onClick={() => setEdit({ ...x, id: undefined, organizationId: undefined })}>{tr('Copy')}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title={tr('No questions match')}>{tr('Change the filters, or write the first question of your own.')}</Empty>
        }
      </Load>
      {q.data && <Pager {...q.data} onPage={(page) => setF({ ...f, page })} />}
      {edit && <QuestionDialog initial={edit} subjects={subjects.data ?? []} onClose={() => setEdit(null)} />}
      <Dialog title={tr('As the student sees it')} open={Boolean(view)} onClose={() => setView(null)} wide>{view && <QuestionPreview q={view} />}</Dialog>
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </Page>
  );
}

function QuestionDialog({ initial, subjects, onClose }: { initial: any; subjects: any[]; onClose: () => void }) {
  const [q, setQ] = useState<any>({ subjectId: '', topicId: '', type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM', prompt: '', hint: '', explanation: '', points: 15, status: 'PUBLISHED', ...emptyBody('MULTIPLE_CHOICE'), ...initial });
  const issues = validateQuestionContent(q.type, q.options, q.correctAnswer);
  const save = useAction(
    (status: string) => {
      const body = { subjectId: q.subjectId, topicId: q.topicId || null, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, correctAnswer: q.correctAnswer, hint: q.hint || null, explanation: q.explanation || null, points: Number(q.points), status };
      return initial.id ? put(`/questions/${initial.id}`, body) : post('/questions', body);
    },
    { ok: 'Question saved', keys: ['questions'], then: onClose },
  );
  const ready = q.subjectId && q.prompt.trim().length > 2;
  return (
    <Dialog title={initial.id ? tr('Edit question') : tr('New question')} open onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <SubjectTopic subjects={subjects} subjectId={q.subjectId} topicId={q.topicId ?? ''} onChange={(s, t) => setQ({ ...q, subjectId: s, topicId: t })} />
          <Area label={tr('Question')} maxLength={600} value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} required />
          <QuestionBody value={q} onChange={(d) => setQ({ ...q, ...d })} />
          <Text label={tr('Hint (optional)')} maxLength={300} value={q.hint ?? ''} onChange={(e) => setQ({ ...q, hint: e.target.value })} />
          <Area label={tr('Explanation shown after the answer')} rows={2} maxLength={800} value={q.explanation ?? ''} onChange={(e) => setQ({ ...q, explanation: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice label={tr('Difficulty')} value={q.difficulty} options={DIFF} onChange={(e) => setQ({ ...q, difficulty: e.target.value })} />
            <Text label={tr('Points')} type="number" min={1} max={100} value={q.points} onChange={(e) => setQ({ ...q, points: e.target.value })} />
          </div>
        </form>
        <div>
          <p className="lbl">{tr('Preview')}</p>
          <QuestionPreview key={q.type} q={q} />
          {issues.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-pencil-dark">{issues.map((i) => <li key={i.message}>{i.message}</li>)}</ul>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-rule pt-4">
        <button className="btn-main" disabled={!ready || issues.length > 0 || save.isPending} onClick={() => save.mutate('PUBLISHED')}>{tr('Publish')}</button>
        <button className="btn-line" disabled={!ready || save.isPending} onClick={() => save.mutate('DRAFT')}>{tr('Save as draft')}</button>
      </div>
    </Dialog>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [problem, setProblem] = useState('');
  const check = useAction((questions: unknown[]) => post<any>('/questions/import', { questions, dryRun: true }));
  const run = useAction((questions: unknown[]) => post<any>('/questions/import', { questions }), { keys: ['questions'], then: (r) => r.imported && onClose(), ok: 'Import finished' });
  const read = async (file?: File) => {
    if (!file) return;
    setProblem('');
    try {
      if (file.size > 900_000) throw new Error('The file is larger than 900 KB');
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(list)) throw new Error('The file has no list of questions');
      setRows(list);
      check.mutate(list);
    } catch (e) {
      setProblem(e instanceof SyntaxError ? tr('This is not a valid JSON file') : errorText(e));
    }
  };
  return (
    <Dialog title={tr('Import questions')} open onClose={onClose}>
      <p className="mb-3 text-soft">{tr('Choose a JSON file in the same format as Export. It is checked before anything is saved.')}</p>
      <input type="file" accept="application/json,.json" aria-label={tr('Question file')} onChange={(e) => read(e.target.files?.[0])} />
      {problem && <p className="mt-3 font-semibold text-pencil-dark" role="alert">{problem}</p>}
      {check.data && (
        <div className="mt-4">
          <p><b>{check.data.valid}</b>{' '}{tr('ready,')}{' '}<b>{check.data.errors.length}</b>{' '}{tr('with problems.')}</p>
          <ul className="mt-2 max-h-48 list-disc overflow-auto pl-5 text-sm text-pencil-dark">{check.data.errors.map((e: any) => <li key={e.row}>{tr('Row')}{' '}{e.row}: {e.message}</li>)}</ul>
          <button className="btn-main mt-4" disabled={check.data.errors.length > 0 || run.isPending} onClick={() => rows && run.mutate(rows)}>{tr('Import')}{' '}{check.data.valid}{' '}{tr('questions')}</button>
        </div>
      )}
    </Dialog>
  );
}

export function Collections() {
  const q = useQuery({ queryKey: ['collections'], queryFn: () => get<any[]>('/collections') });
  const [edit, setEdit] = useState<any | null>(null);
  const superAdmin = isSuper();
  const remove = useAction((id: string) => del(`/collections/${id}`), { ok: 'Collection removed', keys: ['collections'] });
  return (
    <Page title={tr('Collections')} note={tr('Reusable sets of questions. A campaign can draw from one or several.')} action={<button className="btn-main" onClick={() => setEdit({})}>{tr('New collection')}</button>}>
      <Load q={q}>
        {(d) => d.length ? (
          <table className="reg sheet"><thead><tr><th>{tr('Name')}</th><th>{tr('Questions')}</th><th /></tr></thead><tbody>
            {d.map((c) => <tr key={c.id}><td><b>{c.name}</b> {c.official && !superAdmin && <Tag tone="blue">{tr('Official')}</Tag>}<span className="block text-soft">{c.description}</span></td><td>{c.questionCount}</td><td className="text-right">{(superAdmin || !c.official) && <><button className="btn-quiet" onClick={() => setEdit(c)}>{tr('Edit')}</button><button className="btn-quiet hover:!text-pencil" onClick={() => confirmed(tr('Remove "{0}"? The questions stay.', { 0: c.name })) && remove.mutate(c.id)}>{tr('Remove')}</button></>}</td></tr>)}
          </tbody></table>
        ) : <Empty title={tr('No collections yet')}>{tr('Group questions by unit, exam or homework and reuse them in campaigns.')}</Empty>}
      </Load>
      {edit && <CollectionDialog initial={edit} onClose={() => setEdit(null)} />}
    </Page>
  );
}

function CollectionDialog({ initial, onClose }: { initial: any; onClose: () => void }) {
  const full = useQuery({ queryKey: ['collection', initial.id], queryFn: () => get<any>(`/collections/${initial.id}`), enabled: Boolean(initial.id) });
  if (initial.id && !full.data) return <Dialog title={tr('Collection')} open onClose={onClose}><Load q={full}>{() => null}</Load></Dialog>;
  return <CollectionForm key={initial.id ?? 'new'} initial={full.data ?? { name: '', description: '', questions: [] }} onClose={onClose} />;
}
function CollectionForm({ initial, onClose }: { initial: any; onClose: () => void }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [picked, setPicked] = useState<Map<string, string>>(new Map(initial.questions.map((q: any) => [q.id, q.prompt])));
  const [search, setSearch] = useState('');
  const list = useQuery({ queryKey: ['questions', 'pick', search], queryFn: () => get<any>('/questions', { search, pageSize: 50, status: 'PUBLISHED' }) });
  const save = useAction(() => { const body = { name, description: description || null, questionIds: [...picked.keys()] }; return initial.id ? put(`/collections/${initial.id}`, body) : post('/collections', body); }, { ok: 'Collection saved', keys: ['collections', 'collection'], then: onClose });
  const toggle = (q: any) => { const m = new Map(picked); if (!m.delete(q.id)) m.set(q.id, q.prompt); setPicked(m); };
  return (
    <Dialog title={initial.id ? tr('Edit collection') : tr('New collection')} open onClose={onClose} wide>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(undefined as never); }}>
        <div className="grid gap-3 sm:grid-cols-2"><Text label={tr('Name')} required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /><Text label={tr('Description')} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="mt-4 flex items-center justify-between"><b>{picked.size}{' '}{tr('questions chosen')}</b><input className="field !w-64" placeholder={tr('Search questions')} aria-label={tr('Search questions')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <ul className="mt-2 max-h-72 overflow-auto border-y border-rule">
          {[...picked].filter(([id]) => !list.data?.items.some((i: any) => i.id === id)).map(([id, p]) => <li key={id} className="border-b border-rule px-2 py-1.5"><label className="flex gap-2"><input type="checkbox" className="accent-[rgb(var(--accent))]" checked onChange={() => toggle({ id, prompt: p })} />{p}</label></li>)}
          {list.data?.items.map((q: any) => <li key={q.id} className="border-b border-rule px-2 py-1.5"><label className="flex gap-2"><input type="checkbox" className="accent-[rgb(var(--accent))]" checked={picked.has(q.id)} onChange={() => toggle(q)} /><span className="flex-1">{q.prompt}</span><span className="text-[13px] text-soft">{tr(q.subject.name)}, {tr(words(q.difficulty))}</span></label></li>)}
        </ul>
        <button className="btn-main mt-4" disabled={save.isPending}>{tr('Save collection')}</button>
      </form>
    </Dialog>
  );
}

export function Materials() {
  const superAdmin = isSuper();
  const subjects = useSubjects();
  const q = useQuery({ queryKey: ['materials'], queryFn: () => get<any[]>('/materials') });
  const [edit, setEdit] = useState<any | null>(null);
  const remove = useAction((id: string) => del(`/materials/${id}`), { ok: 'Note removed', keys: ['materials'] });
  const save = useAction((m: any) => { const body = { subjectId: m.subjectId, topicId: m.topicId || null, title: m.title, body: m.body, examples: m.examplesText.split('\n').map((s: string) => s.trim()).filter(Boolean), status: m.status }; return m.id ? put(`/materials/${m.id}`, body) : post('/materials', body); }, { ok: 'Note saved', keys: ['materials'], then: () => setEdit(null) });
  return (
    <Page title={tr('Learning notes')} note={tr('Students read these before they play. They also work when no AI service is connected.')} action={<button className="btn-main" onClick={() => setEdit({ subjectId: '', topicId: '', title: '', body: '', examplesText: '', status: 'PUBLISHED' })}>{tr('New note')}</button>}>
      <Load q={q}>
        {(d) => d.length ? (
          <div className="sheet overflow-x-auto"><table className="reg min-w-[640px]"><thead><tr><th>{tr('Title')}</th><th>{tr('Subject')}</th><th>{tr('Status')}</th><th /></tr></thead><tbody>
            {d.map((m) => <tr key={m.id}><td><b>{m.title}</b> {m.official && !superAdmin && <Tag tone="blue">{tr('Official')}</Tag>}<span className="line-clamp-1 block max-w-[56ch] text-soft">{m.body}</span></td><td>{tr(m.subject.name)}<span className="block text-[13px] text-soft">{m.topic && tr(m.topic.name)}</span></td><td><Status value={m.status} /></td><td className="whitespace-nowrap text-right">{superAdmin || !m.official ? <><button className="btn-quiet" onClick={() => setEdit({ ...m, examplesText: m.examples.join('\n') })}>{tr('Edit')}</button><button className="btn-quiet hover:!text-pencil" onClick={() => confirmed(tr('Remove this note?')) && remove.mutate(m.id)}>{tr('Remove')}</button></> : <button className="btn-quiet" onClick={() => setEdit({ ...m, id: undefined, examplesText: m.examples.join('\n') })}>{tr('Copy')}</button>}</td></tr>)}
          </tbody></table></div>
        ) : <Empty title={tr('No notes yet')}>{tr('Write a short explanation for a topic, with one or two worked examples.')}</Empty>}
      </Load>
      <Dialog title={edit?.id ? tr('Edit note') : tr('New note')} open={Boolean(edit)} onClose={() => setEdit(null)} wide>
        {edit && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }}>
            <SubjectTopic subjects={subjects.data ?? []} subjectId={edit.subjectId} topicId={edit.topicId ?? ''} onChange={(s, t) => setEdit({ ...edit, subjectId: s, topicId: t })} />
            <Text label={tr('Title')} required minLength={2} maxLength={120} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <Area label={tr('Explanation')} required minLength={10} maxLength={6000} rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            <Area label={tr('Examples, one per line (up to 6)')} value={edit.examplesText} onChange={(e) => setEdit({ ...edit, examplesText: e.target.value })} />
            <Choice label={tr('Status')} value={edit.status} options={[['PUBLISHED', tr('Published')], ['DRAFT', tr('Draft')]]} onChange={(e) => setEdit({ ...edit, status: e.target.value })} />
            <button className="btn-main" disabled={save.isPending}>{tr('Save note')}</button>
          </form>
        )}
      </Dialog>
    </Page>
  );
}
