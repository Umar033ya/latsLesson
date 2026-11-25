import { useState } from 'react';
import { levelName } from '../student/LevelMap';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ALL_SECTIONS, gatesFor, SECTIONS, THEMES, type SectionId } from '@last-lesson/scenario';
import { GameplayFields } from '../../components/Gameplay';
import { QuestionPreview } from '../../components/QuestionFields';
import { Area, Check, Choice, confirmed, Dialog, Empty, Load, Page, Section, Status, Tag, Text, useAction } from '../../components/ui';
import { del, get, post, put, useAuth } from '../../lib/api';
import { plural, tr } from '../../lib/i18n';
import { words, day, fromDateInput, toDateInput } from '../../lib/format';
import { useSubjects } from './pages';

const useBase = () => (useAuth((s) => s.me?.role) === 'SUPER_ADMIN' ? '/admin' : '/center');

export function Campaigns() {
  const base = useBase();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['campaigns'], queryFn: () => get<any[]>('/campaigns') });
  const create = useAction(() => post<any>('/campaigns', { title: tr('New campaign'), config: {} }), { keys: ['campaigns'], then: (c) => nav(`${base}/campaigns/${c.id}`) });
  const copy = useAction((id: string) => post<any>(`/campaigns/${id}/duplicate`), { ok: 'Copied', keys: ['campaigns'], then: (c) => nav(`${base}/campaigns/${c.id}`) });
  return (
    <Page title={base === '/admin' ? tr('Official campaigns') : tr('Campaigns')} note={tr('A campaign decides which rooms are open, which questions are behind the doors, and how the night plays.')} action={<button className="btn-main" disabled={create.isPending} onClick={() => create.mutate(undefined as never)}>{tr('New campaign')}</button>}>
      <Load q={q}>
        {(d) => d.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {d.map((c) => (
              <article key={c.id} className="sheet flex flex-col overflow-hidden">
                <div className="h-28 bg-cover bg-[60%_62%] [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
                <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold">{c.title}</h2><span className="flex gap-1.5">{c.config.level && <Tag tone="amber">{tr('Level {0}', { 0: c.config.level.number })}</Tag>}{c.official && base === '/center' && <Tag tone="blue">{tr('Official')}</Tag>}<Status value={c.status} /></span></div>
                <p className="mt-1 flex-1 text-soft">{c.description || tr('No description yet.')}</p>
                <p className="mt-3 text-[13px] text-soft">{[plural(gatesFor(c.config.sections).length, 'question|questions'), plural(c.config.sections.length, 'room|rooms'), plural(c.sessionCount, 'session|sessions'), ...c.groups.map((g: any) => g.name), c.availableTo && day(c.availableTo)].filter(Boolean).join(', ')}</p>
                <div className="mt-4 flex flex-wrap gap-2">{!c.official || base === '/admin' ? <Link className="btn-line" to={`${base}/campaigns/${c.id}`}>{tr('Open')}</Link> : <Link className="btn-line" to={`${base}/campaigns/${c.id}`}>{tr('Preview')}</Link>}<button className="btn-quiet" disabled={copy.isPending} onClick={() => copy.mutate(c.id)}>{tr('Make a copy')}</button></div>
                </div>
              </article>
            ))}
          </div>
        ) : <Empty title={tr('No campaigns yet')}>{tr('Start with a copy of an official campaign or build your own.')}</Empty>}
      </Load>
    </Page>
  );
}

export function CampaignPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['campaign', id], queryFn: () => get<any>(`/campaigns/${id}`) });
  return <Load q={q}>{(c) => <Editor key={c.id} campaign={c} />}</Load>;
}

function Editor({ campaign }: { campaign: any }) {
  const base = useBase();
  const nav = useNavigate();
  const readOnly = campaign.official && base === '/center';
  const [c, setC] = useState<any>({ ...campaign, groupIds: campaign.groups.map((g: any) => g.id) });
  const [preview, setPreview] = useState(false);
  const cfg = c.config;
  const setCfg = (p: any) => setC({ ...c, config: { ...cfg, ...p } });
  const setSrc = (p: any) => setCfg({ source: { ...cfg.source, ...p } });
  const subjects = useSubjects();
  const collections = useQuery({ queryKey: ['collections'], queryFn: () => get<any[]>('/collections') });
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => get<any[]>('/center/groups'), enabled: base === '/center' });
  const game = useQuery({ queryKey: ['game-config'], queryFn: () => get<any>('/games/config') });
  const check = useQuery({ queryKey: ['campaign-check', cfg.sections, cfg.source], queryFn: () => post<any>('/campaigns/check', cfg), placeholderData: (p) => p });
  const body = () => ({ title: c.title, description: c.description || null, config: cfg, groupIds: base === '/center' ? c.groupIds : [], availableFrom: c.availableFrom ?? null, availableTo: c.availableTo ?? null });
  const keys = ['campaigns', 'campaign'];
  const save = useAction(() => put(`/campaigns/${c.id}`, body()), { ok: 'Saved', keys });
  const publish = useAction(async () => { await put(`/campaigns/${c.id}`, body()); return post<any>(`/campaigns/${c.id}/publish`); }, { ok: 'Published', keys, then: () => setC({ ...c, status: 'PUBLISHED' }) });
  const unpublish = useAction(() => post(`/campaigns/${c.id}/unpublish`), { ok: 'Back to draft', keys, then: () => setC({ ...c, status: 'DRAFT' }) });
  const remove = useAction(() => del(`/campaigns/${c.id}`), { ok: 'Removed', keys: ['campaigns'], then: () => nav(`${base}/campaigns`) });
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const gates = gatesFor(cfg.sections);
  const enough = check.data && check.data.available >= check.data.required;
  return (
    <Page
      title={c.title || tr('Campaign')}
      note={<><Status value={c.status} /> {readOnly && tr('Official campaigns are read-only. Make a copy to change it.')}</>}
      action={
        <>
          <button className="btn-line" onClick={async () => { if (!readOnly) await save.mutateAsync(undefined as never).catch(() => undefined); setPreview(true); }}>{tr('Preview')}</button>
          {!readOnly && <><button className="btn-line" disabled={save.isPending} onClick={() => save.mutate(undefined as never)}>{tr('Save')}</button>{c.status === 'PUBLISHED' ? <button className="btn-line" onClick={() => unpublish.mutate(undefined as never)}>{tr('Unpublish')}</button> : <button className="btn-main" disabled={publish.isPending} onClick={() => publish.mutate(undefined as never)}>{tr('Publish')}</button>}</>}
        </>
      }
    >
      <fieldset disabled={readOnly} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Section title={tr('About')}>
            <div className="space-y-3">
              <Text label={tr('Title')} maxLength={100} value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
              <Area label={tr('Description for students')} rows={2} maxLength={500} value={c.description ?? ''} onChange={(e) => setC({ ...c, description: e.target.value })} />
              <Area label={tr('Learning objectives, one per line (up to 5)')} rows={2} value={cfg.objectives.join('\n')} onChange={(e) => setCfg({ objectives: e.target.value.split('\n').slice(0, 5) })} onBlur={() => setCfg({ objectives: cfg.objectives.map((s: string) => s.trim()).filter(Boolean) })} />
            </div>
          </Section>
          <Section title={tr('Level map')}>
            <p className="mb-3 text-soft">{tr('Makes this campaign a step on the student’s map. The next level opens after this one is passed.')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice label={tr('Subject of the level')} value={cfg.level?.subjectId ?? ''} options={[['', tr('Not a level')], ...(subjects.data ?? []).map((s): [string, string] => [s.id, tr(s.name)])]} onChange={(e) => setCfg({ level: e.target.value ? { subjectId: e.target.value, number: cfg.level?.number ?? 1 } : null })} />
              {cfg.level && <Choice label={tr('Level number')} value={String(cfg.level.number)} options={Array.from({ length: 5 }, (_, i): [string, string] => [String(i + 1), `${i + 1}. ${levelName(i + 1)}`])} onChange={(e) => setCfg({ level: { ...cfg.level, number: Number(e.target.value) } })} />}
            </div>
          </Section>
          <Section title={tr('Rooms')}>
            <ul className="divide-y divide-rule">
              {SECTIONS.map((s) => (
                <li key={s.id} className="py-2.5"><Check label={tr(s.name)} disabled={s.required} checked={cfg.sections.includes(s.id)} hint={[tr(s.summary), plural(gatesFor([s.id]).length, 'question|questions')].join(' ')} onChange={(on) => setCfg({ sections: ALL_SECTIONS.filter((x: SectionId) => (x === s.id ? on : cfg.sections.includes(x))) })} /></li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-soft">{tr('A room that is switched off stays in the building, but its door needs no answer.')}</p>
          </Section>
          <Section title={tr('Questions')}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice label={tr('Difficulty')} value={cfg.difficulty} options={[['EASY', tr('Easy')], ['MEDIUM', tr('Medium')], ['HARD', tr('Hard')]]} onChange={(e) => setCfg({ difficulty: e.target.value })} />
                <Choice label={tr('Progression')} value={cfg.progression} options={[['RISING', tr('Gets harder room by room')], ['FLAT', tr('Same level throughout')]]} onChange={(e) => setCfg({ progression: e.target.value })} />
              </div>
              <div>
                <p className="lbl">{tr('Subjects (none chosen means all)')}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">{subjects.data?.map((s) => <Check key={s.id} label={tr(s.name)} checked={cfg.source.subjectIds.includes(s.id)} onChange={() => setSrc({ subjectIds: toggle(cfg.source.subjectIds, s.id), topicIds: cfg.source.topicIds.filter((t: string) => !s.topics.some((x: any) => x.id === t) || !cfg.source.subjectIds.includes(s.id)) })} />)}</div>
              </div>
              {subjects.data?.filter((s) => cfg.source.subjectIds.includes(s.id)).map((s) => (
                <div key={s.id}><p className="lbl"><span>{tr(s.name)}</span>: <span>{tr('topics (none chosen means all)')}</span></p><div className="flex flex-wrap gap-x-5 gap-y-2">{s.topics.map((t: any) => <Check key={t.id} label={tr(t.name)} checked={cfg.source.topicIds.includes(t.id)} onChange={() => setSrc({ topicIds: toggle(cfg.source.topicIds, t.id) })} />)}</div></div>
              ))}
              {Boolean(collections.data?.length) && <div><p className="lbl">{tr('Collections')}</p><div className="flex flex-wrap gap-x-5 gap-y-2">{collections.data!.map((x) => <Check key={x.id} label={`${x.name} (${x.questionCount})`} checked={cfg.source.collectionIds.includes(x.id)} onChange={() => setSrc({ collectionIds: toggle(cfg.source.collectionIds, x.id) })} />)}</div></div>}
              {base === '/center' && <Check label={tr('Also use the official question bank')} checked={cfg.source.includeOfficial} onChange={(v) => setSrc({ includeOfficial: v })} />}
            </div>
          </Section>
          <Section title={tr('Fixed questions')}>
            <p className="mb-3 text-soft">{tr('Leave a gate on automatic, or put one exact question behind it.')}</p>
            <FixedQuestions gates={gates} overrides={cfg.overrides} onChange={(overrides) => setCfg({ overrides })} />
          </Section>
          <Section title={tr('How the night plays')}><GameplayFields value={cfg.gameplay} policy={game.data?.policy} onChange={(gameplay) => setCfg({ gameplay })} inherit /></Section>
          <Section title={tr('Texts in the game')}>
            <div className="space-y-3">
              <Text label={tr('Opening line on the intercom')} maxLength={160} value={cfg.content.openingLine ?? ''} onChange={(e) => setCfg({ content: { ...cfg.content, openingLine: e.target.value } })} />
              <Text label={tr('Notice board in the corridor')} maxLength={280} value={cfg.content.announcement ?? ''} onChange={(e) => setCfg({ content: { ...cfg.content, announcement: e.target.value } })} />
              <Text label={tr('Closing line on the report')} maxLength={200} value={cfg.content.closingLine ?? ''} onChange={(e) => setCfg({ content: { ...cfg.content, closingLine: e.target.value } })} />
            </div>
          </Section>
        </div>
        <div className="space-y-5">
          <Section title={tr('Ready to publish?')}>
            {check.data ? (
              <>
                <p className={enough ? 'text-moss' : 'font-semibold text-pencil-dark'}>{tr('{0} matching questions, {1} needed.', { 0: check.data.available, 1: check.data.required })} {enough ? '' : tr('Add questions or widen the selection.')}</p>
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">{Object.entries(check.data.byDifficulty).map(([k, v]) => <div key={k} className="contents"><dt className="text-soft">{tr(words(k))}</dt><dd>{v as number}</dd></div>)}</dl>
              </>
            ) : <p className="text-soft">{tr('Counting questions...')}</p>}
          </Section>
          <Section title={tr('Look')}>
            <Choice label={tr('Theme')} value={cfg.theme ?? ''} options={[['', tr('Center default')], ...THEMES.filter((t) => game.data?.policy.allowedThemes.includes(t.id) ?? true).map((t) => [t.id, tr(t.name)] as [string, string])]} onChange={(e) => setCfg({ theme: e.target.value || null })} />
          </Section>
          <Section title={tr('Availability')}>
            <div className="space-y-3">
              <Text label={tr('From')} type="date" value={toDateInput(c.availableFrom)} onChange={(e) => setC({ ...c, availableFrom: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              <Text label={tr('Until')} type="date" value={toDateInput(c.availableTo)} onChange={(e) => setC({ ...c, availableTo: fromDateInput(e.target.value) })} />
              {base === '/center' && <div><p className="lbl">{tr('Groups (none chosen means everyone)')}</p>{groups.data?.map((g) => <Check key={g.id} label={g.name} checked={c.groupIds.includes(g.id)} onChange={() => setC({ ...c, groupIds: toggle(c.groupIds, g.id) })} />)}</div>}
            </div>
          </Section>
          {!readOnly && <button type="button" className="btn-red" onClick={() => confirmed(tr('Remove this campaign? Past results are kept.')) && remove.mutate(undefined as never)}>{tr('Remove campaign')}</button>}
        </div>
      </fieldset>
      {preview && <PreviewDialog id={c.id} onClose={() => setPreview(false)} />}
    </Page>
  );
}

function FixedQuestions({ gates, overrides, onChange }: { gates: ReturnType<typeof gatesFor>; overrides: Record<string, any>; onChange: (o: Record<string, any>) => void }) {
  const [picking, setPicking] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const list = useQuery({ queryKey: ['questions', 'fixed', search], queryFn: () => get<any>('/questions', { search, pageSize: 40, status: 'PUBLISHED' }), enabled: Boolean(picking) });
  const names = useQuery({ queryKey: ['fixed-names', Object.values(overrides).map((o) => o.questionId)], queryFn: async () => Object.fromEntries(await Promise.all(Object.values(overrides).filter((o) => o.questionId).map(async (o) => [o.questionId, (await get<any>(`/questions/${o.questionId}`).catch(() => null))?.prompt ?? 'Question no longer available']))) });
  return (
    <>
      <ul className="divide-y divide-rule">
        {gates.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0"><b className="font-semibold">{tr(g.title)}</b><span className="block truncate text-[13px] text-soft">{overrides[g.id]?.questionId ? (names.data?.[overrides[g.id].questionId] ?? '...') : tr('Automatic')}</span></span><span className="whitespace-nowrap">{overrides[g.id]?.questionId && <button type="button" className="btn-quiet" onClick={() => { const { [g.id]: _, ...rest } = overrides; onChange(rest); }}>{tr('Reset')}</button>}<button type="button" className="btn-quiet" onClick={() => setPicking(g.id)}>{tr('Choose')}</button></span></li>
        ))}
      </ul>
      <Dialog title={tr(gates.find((g) => g.id === picking)?.title ?? '')} open={Boolean(picking)} onClose={() => setPicking(null)} wide>
        <input className="field mb-3" placeholder={tr('Search questions')} aria-label={tr('Search questions')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <ul className="max-h-96 divide-y divide-rule overflow-auto">{list.data?.items.map((q: any) => <li key={q.id}><button type="button" className="w-full px-2 py-2 text-left hover:bg-well" onClick={() => { onChange({ ...overrides, [picking!]: { questionId: q.id } }); setPicking(null); }}>{q.prompt}<span className="block text-[13px] text-soft">{tr(q.subject.name)}</span></button></li>)}</ul>
      </Dialog>
    </>
  );
}

function PreviewDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['campaign-preview', id], queryFn: () => get<any>(`/campaigns/${id}/preview`), gcTime: 0, staleTime: 0 });
  return (
    <Dialog title={tr('A sample night')} open onClose={onClose} wide>
      <p className="mb-4 text-soft">{tr('Questions are chosen again for every session, by the same rules.')}</p>
      <Load q={q}>{(d) => <ol className="space-y-5">{d.gates.map(({ gate, question }: any) => <li key={gate.id}><p className="mb-1"><b>{tr(gate.title)}</b> <span className="text-soft">{question ? [tr(question.subject.name), tr(words(question.difficulty)).toLowerCase()].join(', ') : tr('no question, opens by itself')}</span></p>{question && <QuestionPreview q={question} />}</li>)}</ol>}</Load>
    </Dialog>
  );
}
