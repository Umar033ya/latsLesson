import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Gamepad2, HelpCircle, Shield, Target, Users } from 'lucide-react';
import { FEATURES, TENSIONS, THEMES } from '@last-lesson/scenario';
import { LanguagePicker, ThemeSwitch } from '../../components/Preferences';
import { Area, Bars, Check, Choice, confirmed, copy, DayChart, Dialog, Empty, Feed, fieldError, Figures, Hero, Load, Page, Pager, Section, Split, Status, Tag, Text, useAction } from '../../components/ui';
import { del, get, patch, post, put, startSession, useAuth } from '../../lib/api';
import { tr } from '../../lib/i18n';
import { day, fromDateInput, mins, pct, toDateInput, when, words } from '../../lib/format';
import { FLAGS } from '../center/results';

const FEATURE_LABEL: Record<string, string> = { branding: tr('Own branding and logo'), customNotes: tr('Custom notes in the game'), campaigns: tr('Own campaigns'), questionImport: tr('Question import'), aiPreparation: 'AI study guides', analytics: tr('Analytics') };
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: () => get<any[]>('/admin/plans') });

export function Dashboard() {
  const q = useQuery({ queryKey: ['platform'], queryFn: () => get<any>('/analytics/platform') });
  const feed = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => get<any>('/audit-logs', { pageSize: 8, category: 'ADMIN' }) });
  const me = useAuth((s) => s.me);
  return (
    <Load q={q}>
      {(d) => {
        const idle = (d.centers.SUSPENDED ?? 0) + (d.centers.INACTIVE ?? 0);
        return (
          <Page title={tr('Platform overview')} bare>
            <Hero title={tr('Welcome, {0}', { 0: me?.firstName ?? '' })} text={tr('{0} students played this week in {1} active centers.', { 0: d.activeStudents7d, 1: d.centers.ACTIVE ?? 0 })}>
              <Link className="btn bg-lamp text-night hover:opacity-90" to="/admin/centers"><Building2 size={16} />{tr('Education centers')}</Link>
              <Link className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" to="/admin/questions"><HelpCircle size={16} />{tr('Question bank')}</Link>
              <Link className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" to="/admin/security"><Shield size={16} />{tr('Security')}</Link>
            </Hero>
            <Figures items={[
              { label: tr('Education centers'), value: d.centers.total, sub: tr('{0} active, {1} not active', { 0: d.centers.ACTIVE ?? 0, 1: idle }), icon: Building2 },
              { label: tr('Students'), value: d.students, sub: tr('{0} played this week', { 0: d.activeStudents7d }), icon: Users },
              { label: tr('Games launched'), value: d.sessions.total, icon: Gamepad2, trend: d.sessionsPerDay.map((x: any) => x.started) },
              { label: tr('Correct answers'), value: pct(d.averageAccuracy), sub: mins(d.averageDurationSeconds), icon: Target },
              { label: tr('Needs a look'), value: d.flaggedSessions30d, sub: tr('flagged sessions, 30 days'), icon: Shield, tone: d.flaggedSessions30d ? 'warn' : 'plain' },
            ]} />
            <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
              <Section title={tr('Sessions, last 30 days')}><DayChart data={d.sessionsPerDay} /></Section>
              <Section title={tr('How sessions end')}><Split parts={[{ label: tr('Completed'), value: d.sessions.COMPLETED ?? 0, tone: 'good' }, { label: tr('In progress'), value: d.sessions.IN_PROGRESS ?? 0, tone: 'plain' }, { label: tr('Left early'), value: d.sessions.ABANDONED ?? 0, tone: 'warn' }]} /><dl className="mt-5 grid grid-cols-2 gap-y-1.5 border-t border-rule pt-4 text-sm"><dt className="text-soft">{tr('Published questions')}</dt><dd className="text-right font-semibold">{d.publishedQuestions}</dd><dt className="text-soft">{tr('Published campaigns')}</dt><dd className="text-right font-semibold">{d.publishedCampaigns}</dd></dl></Section>
              <Section title={tr('Most active centers')} action={<Link className="text-sm text-accent hover:underline" to="/admin/centers">{tr('All centers')}</Link>}>{d.topCenters.length ? <Bars unit="" max={Math.max(...d.topCenters.map((c: any) => c.sessions))} rows={d.topCenters.map((c: any) => ({ key: c.id, label: <Link className="hover:underline" to={`/admin/centers/${c.id}`}>{c.name}</Link>, value: c.sessions }))} /> : <p className="text-soft">{tr('No sessions in the last 30 days.')}</p>}</Section>
              <Section title={tr('Activity')} action={<Link className="text-sm text-accent hover:underline" to="/admin/activity">{tr('Activity log')}</Link>}>{feed.data?.items.length ? <Feed items={feed.data.items.map((x: any) => ({ key: x.id, text: <>{tr(words(x.action))} <span className="text-soft">{x.organization?.name ?? ''}</span></>, who: x.actor ? `${x.actor.firstName} ${x.actor.lastName}`.trim() : undefined, at: x.createdAt }))} /> : <p className="text-soft">{tr('Nothing recorded')}</p>}</Section>
            </div>
          </Page>
        );
      }}
    </Load>
  );
}

export function Centers() {
  const [f, setF] = useState({ page: 1, search: '', status: '', planId: '' });
  const plans = usePlans();
  const [make, setMake] = useState(false);
  const q = useQuery({ queryKey: ['centers', f], queryFn: () => get<any>('/organizations', f) });
  const on = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, page: 1 });
  return (
    <Page title={tr('Education centers')} action={<button className="btn-main" onClick={() => setMake(true)}>{tr('New center')}</button>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><input className="field" placeholder={tr('Name or city')} aria-label={tr('Search')} value={f.search} onChange={on('search')} /><select className="field" aria-label={tr('Status')} value={f.status} onChange={on('status')}><option value="">{tr('Any status')}</option>{['ACTIVE', 'SUSPENDED', 'INACTIVE'].map((s) => <option key={s} value={s}>{tr(words(s))}</option>)}</select><select className="field" aria-label={tr('Plan')} value={f.planId} onChange={on('planId')}><option value="">{tr('Any plan')}</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <Load q={q}>{(d) => d.items.length ? <div className="sheet overflow-x-auto"><table className="reg min-w-[760px]"><thead><tr><th>{tr('Center')}</th><th>{tr('Plan')}</th><th>{tr('Students')}</th><th>{tr('Sessions')}</th><th>{tr('Paid until')}</th><th>{tr('Status')}</th></tr></thead><tbody>{d.items.map((c: any) => <tr key={c.id}><td><Link className="font-semibold hover:underline" to={`/admin/centers/${c.id}`}>{c.name}</Link><span className="block text-[13px] text-soft">{c.city}</span></td><td>{c.plan?.name ?? tr('Trial limits')}</td><td>{c.students}{c.plan && ` / ${c.plan.maxStudents}`}</td><td>{c.sessions}</td><td>{c.subscriptionEndsAt ? <span className={new Date(c.subscriptionEndsAt) < new Date() ? 'font-semibold text-pencil-dark' : ''}>{day(c.subscriptionEndsAt)}</span> : tr('No end date')}</td><td><Status value={c.status} /></td></tr>)}</tbody></table></div> : <Empty title={tr('No centers match')} />}</Load>
      {q.data && <Pager {...q.data} onPage={(page) => setF({ ...f, page })} />}
      {make && <NewCenter plans={plans.data ?? []} onClose={() => setMake(false)} />}
    </Page>
  );
}

function NewCenter({ plans, onClose }: { plans: any[]; onClose: () => void }) {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', slug: '', city: '', contactName: '', contactEmail: '', planId: '', until: '' });
  const save = useAction(() => post<any>('/organizations', { name: f.name, slug: f.slug || slugify(f.name), city: f.city || null, contactName: f.contactName || null, contactEmail: f.contactEmail || null, planId: f.planId || null, subscriptionEndsAt: fromDateInput(f.until) }), { ok: 'Center created', keys: ['centers', 'platform'], then: (c) => nav(`/admin/centers/${c.id}`) });
  return (
    <Dialog title={tr('New education center')} open onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined as never); }}>
        <Text label={tr('Name')} required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: slugify(e.target.value) })} />
        <Text label={tr('Short name for addresses')} required value={f.slug} error={fieldError(save.error, 'slug')} onChange={(e) => setF({ ...f, slug: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2"><Text label={tr('City')} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /><Choice label={tr('Plan')} value={f.planId} options={[['', tr('Trial limits')], ...plans.map((p) => [p.id, p.name] as [string, string])]} onChange={(e) => setF({ ...f, planId: e.target.value })} /><Text label={tr('Contact person')} value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} /><Text label={tr('Contact e-mail')} type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /><Text label={tr('Paid until')} type="date" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></div>
        <button className="btn-main" disabled={save.isPending}>{tr('Create center')}</button>
      </form>
    </Dialog>
  );
}

export function CenterPage() {
  const { id } = useParams();
  const plans = usePlans();
  const q = useQuery({ queryKey: ['center', id], queryFn: () => get<any>(`/organizations/${id}`) });
  const [edit, setEdit] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const keys = ['center', 'centers', 'platform'];
  const save = useAction((b: any) => patch(`/organizations/${id}`, b), { ok: 'Saved', keys, then: () => setEdit(null) });
  const status = useAction((b: any) => patch(`/organizations/${id}/status`, b), { ok: 'Status changed', keys });
  return (
    <Load q={q}>
      {(c) => (
        <Page title={c.name} note={<><Status value={c.status} /> {c.city}</>} action={<><button className="btn-line" onClick={() => setEdit({ name: c.name, city: c.city ?? '', contactName: c.contactName ?? '', contactEmail: c.contactEmail ?? '', contactPhone: c.contactPhone ?? '', internalNote: c.internalNote ?? '', planId: c.planId ?? '', subscriptionEndsAt: c.subscriptionEndsAt })}>{tr('Edit')}</button>{c.status !== 'ACTIVE' && <button className="btn-main" onClick={() => status.mutate({ status: 'ACTIVE' })}>{tr('Activate')}</button>}{c.status === 'ACTIVE' && <button className="btn-red" onClick={() => { const reason = window.prompt(tr('Reason for suspending (kept in the log)')); if (reason !== null) status.mutate({ status: 'SUSPENDED', reason }); }}>{tr('Suspend')}</button>}{c.status !== 'INACTIVE' && <button className="btn-red" onClick={() => confirmed(tr('Deactivate this center? Students and staff lose access.')) && status.mutate({ status: 'INACTIVE' })}>{tr('Deactivate')}</button>}</>}>
          <Figures items={[{ label: tr('Students'), value: c.usage.students, sub: tr('of {0}', { 0: c.limits.maxStudents }) }, { label: tr('Groups'), value: c.usage.groups, sub: tr('of {0}', { 0: c.limits.maxGroups }) }, { label: tr('Campaigns'), value: c.usage.campaigns, sub: tr('of {0}', { 0: c.limits.maxCampaigns }) }, { label: tr('Finished games'), value: c.stats.sessions.COMPLETED ?? 0 }, { label: tr('Correct'), value: pct(c.stats.averageAccuracy) }]} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title={tr('Subscription')}><dl className="grid grid-cols-2 gap-y-1.5"><dt className="text-soft">{tr('Plan')}</dt><dd>{c.plan?.name ?? tr('Trial limits')}</dd><dt className="text-soft">{tr('Paid until')}</dt><dd>{c.subscriptionEndsAt ? day(c.subscriptionEndsAt) : tr('No end date')}</dd>{FEATURES.map((k) => <div key={k} className="contents"><dt className="text-soft">{FEATURE_LABEL[k]}</dt><dd>{c.features[k] ? tr('Included') : tr('Off')}</dd></div>)}</dl></Section>
            <Section title={tr('Administrators')} action={<button className="btn-line" onClick={() => setAdding(true)}>{tr('Add')}</button>}>{c.admins.length ? <ul className="divide-y divide-rule">{c.admins.map((a: any) => <li key={a.id} className="flex items-center justify-between py-2"><span>{a.firstName} {a.lastName}<span className="block text-[13px] text-soft">{a.email}</span></span><Status value={a.status} /></li>)}</ul> : <p className="text-soft">{tr('Nobody can sign in for this center yet.')}</p>}</Section>
            <Section title={tr('Contact')}><p>{c.contactName || tr('No contact person')}</p><p className="text-soft">{c.contactEmail} {c.contactPhone}</p>{c.internalNote && <p className="mt-2 border-l-4 border-rule pl-3 text-soft">{c.internalNote}</p>}</Section>
            <Section title={tr('Activity')}><ul className="divide-y divide-rule">{c.activity.map((a: any) => <li key={a.id} className="flex justify-between gap-3 py-1.5 text-sm"><span>{tr(words(a.action))}</span><span className="whitespace-nowrap text-soft">{when(a.createdAt)}</span></li>)}</ul></Section>
          </div>
          <Dialog title={tr('Edit center')} open={Boolean(edit)} onClose={() => setEdit(null)}>{edit && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ ...edit, city: edit.city || null, contactName: edit.contactName || null, contactEmail: edit.contactEmail || null, contactPhone: edit.contactPhone || null, internalNote: edit.internalNote || null, planId: edit.planId || null }); }}><Text label={tr('Name')} required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><Choice label={tr('Plan')} value={edit.planId} options={[['', tr('Trial limits')], ...(plans.data ?? []).map((p) => [p.id, p.name] as [string, string])]} onChange={(e) => setEdit({ ...edit, planId: e.target.value })} /><Text label={tr('Paid until')} type="date" value={toDateInput(edit.subscriptionEndsAt)} onChange={(e) => setEdit({ ...edit, subscriptionEndsAt: fromDateInput(e.target.value) })} /><Text label={tr('City')} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /><Text label={tr('Contact person')} value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} /><Text label={tr('Contact e-mail')} type="email" value={edit.contactEmail} onChange={(e) => setEdit({ ...edit, contactEmail: e.target.value })} /><Text label={tr('Phone')} value={edit.contactPhone} onChange={(e) => setEdit({ ...edit, contactPhone: e.target.value })} /></div><Area label={tr('Internal note')} value={edit.internalNote} onChange={(e) => setEdit({ ...edit, internalNote: e.target.value })} /><button className="btn-main" disabled={save.isPending}>{tr('Save')}</button></form>}</Dialog>
          {adding && <NewAdmin organizationId={c.id} onClose={() => setAdding(false)} />}
        </Page>
      )}
    </Load>
  );
}

function NewAdmin({ organizationId, onClose }: { organizationId?: string; onClose: () => void }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', organizationId: organizationId ?? '' });
  const centers = useQuery({ queryKey: ['centers', 'pick'], queryFn: () => get<any>('/organizations', { pageSize: 100 }), enabled: !organizationId });
  const save = useAction(() => post<any>('/users/admins', f), { ok: 'Administrator created', keys: ['admins', 'center'] });
  return (
    <Dialog title={tr('New center administrator')} open onClose={onClose}>
      {save.data ? <><p>{tr('Give these details to the administrator. The password is shown only now.')}</p><dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"><dt className="text-soft">{tr('E-mail')}</dt><dd>{save.data.user.email}</dd><dt className="text-soft">{tr('Password')}</dt><dd className="select-all font-dot text-lg">{save.data.initialPassword}</dd></dl><button className="btn-main" onClick={() => copy(`${save.data.user.email}\n${save.data.initialPassword}`)}>{tr('Copy')}</button></> : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined as never); }}><div className="grid gap-3 sm:grid-cols-2"><Text label={tr('First name')} required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /><Text label={tr('Last name')} required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div><Text label={tr('E-mail')} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />{!organizationId && <Choice label={tr('Center')} required value={f.organizationId} options={[['', tr('Choose a center')], ...(centers.data?.items ?? []).map((c: any) => [c.id, c.name] as [string, string])]} onChange={(e) => setF({ ...f, organizationId: e.target.value })} />}<button className="btn-main" disabled={save.isPending || !f.organizationId}>{tr('Create')}</button></form>
      )}
    </Dialog>
  );
}

export function Admins() {
  const [search, setSearch] = useState('');
  const [make, setMake] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const q = useQuery({ queryKey: ['admins', search], queryFn: () => get<any[]>('/users/admins', { search }) });
  const status = useAction((u: any) => patch(`/users/${u.id}/status`, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }), { ok: 'Status changed', keys: ['admins'] });
  const reset = useAction((u: any) => post<any>(`/users/${u.id}/reset-password`), { then: (r, u) => setSecret({ email: u.email, password: r.temporaryPassword }) });
  return (
    <Page title={tr('Center admins')} action={<button className="btn-main" onClick={() => setMake(true)}>{tr('New administrator')}</button>}>
      <input className="field mb-4 max-w-sm" placeholder={tr('Name or e-mail')} aria-label={tr('Search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      <Load q={q}>{(d) => d.length ? <div className="sheet overflow-x-auto"><table className="reg min-w-[680px]"><thead><tr><th>{tr('Name')}</th><th>{tr('Centers')}</th><th>{tr('Status')}</th><th /></tr></thead><tbody>{d.map((u) => <tr key={u.id}><td><b>{u.firstName} {u.lastName}</b><span className="block text-[13px] text-soft">{u.email}</span></td><td>{u.organizations.map((o: any) => <Link key={o.id} className="mr-2 hover:underline" to={`/admin/centers/${o.id}`}>{o.name}</Link>)}</td><td><Status value={u.status} /></td><td className="whitespace-nowrap text-right"><button className="btn-quiet" onClick={() => confirmed(tr('Issue a new password for {0}? Open sessions are closed.', { 0: u.email })) && reset.mutate(u)}>{tr('Reset password')}</button><button className="btn-quiet" onClick={() => status.mutate(u)}>{u.status === 'ACTIVE' ? tr('Suspend') : tr('Activate')}</button></td></tr>)}</tbody></table></div> : <Empty title={tr('No administrators found')} />}</Load>
      {make && <NewAdmin onClose={() => setMake(false)} />}
      <Dialog title={tr('Temporary password')} open={Boolean(secret)} onClose={() => setSecret(null)}>{secret && <><p>{secret.email}</p><p className="my-3 select-all font-dot text-2xl">{secret.password}</p><button className="btn-main" onClick={() => copy(secret.password)}>{tr('Copy')}</button></>}</Dialog>
    </Page>
  );
}

export function Plans() {
  const q = usePlans();
  const [edit, setEdit] = useState<any | null>(null);
  const save = useAction((p: any) => { const body = { key: p.key, name: p.name, description: p.description || null, maxStudents: Number(p.maxStudents), maxGroups: Number(p.maxGroups), maxCampaigns: Number(p.maxCampaigns), maxQuestions: Number(p.maxQuestions), features: p.features, isActive: p.isActive, sortOrder: Number(p.sortOrder) }; return p.id ? put(`/admin/plans/${p.id}`, body) : post('/admin/plans', body); }, { ok: 'Plan saved', keys: ['plans'], then: () => setEdit(null) });
  const remove = useAction((id: string) => del(`/admin/plans/${id}`), { ok: 'Plan removed', keys: ['plans'] });
  return (
    <Page title={tr('Plans')} note={tr('Limits and features a center receives.')} action={<button className="btn-main" onClick={() => setEdit({ key: '', name: '', description: '', maxStudents: 100, maxGroups: 10, maxCampaigns: 10, maxQuestions: 500, features: {}, isActive: true, sortOrder: 10 })}>{tr('New plan')}</button>}>
      <Load q={q}>{(d) => <div className="sheet overflow-x-auto"><table className="reg min-w-[680px]"><thead><tr><th>{tr('Plan')}</th><th>{tr('Students')}</th><th>{tr('Groups')}</th><th>{tr('Campaigns')}</th><th>{tr('Questions')}</th><th>{tr('Centers')}</th><th /></tr></thead><tbody>{d.map((p) => <tr key={p.id}><td><b>{p.name}</b><span className="block text-[13px] text-soft">{p.description && tr(p.description)}</span></td><td>{p.maxStudents}</td><td>{p.maxGroups}</td><td>{p.maxCampaigns}</td><td>{p.maxQuestions}</td><td>{p.centers}</td><td className="whitespace-nowrap text-right"><button className="btn-quiet" onClick={() => setEdit(p)}>{tr('Edit')}</button>{!p.centers && <button className="btn-quiet hover:!text-pencil" onClick={() => confirmed(tr('Remove plan "{0}"?', { 0: p.name })) && remove.mutate(p.id)}>{tr('Remove')}</button>}</td></tr>)}</tbody></table></div>}</Load>
      <Dialog title={edit?.id ? tr('Edit plan') : tr('New plan')} open={Boolean(edit)} onClose={() => setEdit(null)}>{edit && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }}><div className="grid gap-3 sm:grid-cols-2"><Text label={tr('Name')} required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, key: edit.id ? edit.key : slugify(e.target.value) })} /><Text label={tr('Key')} required disabled={Boolean(edit.id)} value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value })} />{(['maxStudents', 'maxGroups', 'maxCampaigns', 'maxQuestions'] as const).map((k) => <Text key={k} label={{ maxStudents: tr('Students'), maxGroups: tr('Groups'), maxCampaigns: tr('Campaigns'), maxQuestions: tr('Own questions') }[k]} type="number" min={0} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />)}</div><Text label={tr('Description')} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /><fieldset className="space-y-1"><legend className="lbl">{tr('Features')}</legend>{FEATURES.map((k) => <Check key={k} label={FEATURE_LABEL[k]} checked={edit.features[k] !== false} onChange={(v) => setEdit({ ...edit, features: { ...edit.features, [k]: v } })} />)}</fieldset><button className="btn-main" disabled={save.isPending}>{tr('Save plan')}</button></form>}</Dialog>
    </Page>
  );
}

export function Subjects() {
  const q = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => get<any[]>('/subjects', { all: 'true' }) });
  const [name, setName] = useState('');
  const create = useAction(() => post('/subjects', { name, slug: slugify(name) }), { ok: 'Subject added', keys: ['subjects'], then: () => setName('') });
  const update = useAction((v: { id: string; body: any }) => patch(`/subjects/${v.id}`, v.body), { keys: ['subjects'] });
  const addTopic = useAction((v: { id: string; name: string }) => post(`/subjects/${v.id}/topics`, { name: v.name, slug: slugify(v.name) }), { ok: 'Topic added', keys: ['subjects'] });
  const topic = useAction((v: { id: string; body: any }) => patch(`/subjects/topics/${v.id}`, v.body), { keys: ['subjects'] });
  const removeTopic = useAction((id: string) => del(`/subjects/topics/${id}`), { ok: 'Topic removed', keys: ['subjects'] });
  return (
    <Page title={tr('Subjects and topics')} note={tr('Shared by every center.')}>
      <form className="mb-5 flex max-w-md gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(undefined as never); }}><input className="field" aria-label={tr('New subject')} placeholder={tr('New subject')} required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-main">{tr('Add')}</button></form>
      <Load q={q}>{(d) => <div className="grid gap-5 md:grid-cols-2">{d.map((s) => <Section key={s.id} title={tr(s.name)} action={<span className="flex items-center gap-2">{!s.isActive && <Tag>{tr('Hidden')}</Tag>}<button className="btn-quiet" onClick={() => update.mutate({ id: s.id, body: { isActive: !s.isActive } })}>{s.isActive ? tr('Hide') : tr('Show')}</button></span>}><p className="mb-2 text-soft">{s.description && tr(s.description)} {tr('Official questions: {0}.', { 0: s.questionCount })}</p><ul className="divide-y divide-rule">{s.topics.map((t: any) => <li key={t.id} className="flex items-center justify-between py-1"><span className={t.isActive ? '' : 'text-soft line-through'}>{tr(t.name)} <span className="text-[13px] text-soft">{t.questionCount}</span></span><span>{t.questionCount === 0 && <button className="btn-quiet !py-0.5" onClick={() => removeTopic.mutate(t.id)}>{tr('Remove')}</button>}<button className="btn-quiet !py-0.5" onClick={() => topic.mutate({ id: t.id, body: { isActive: !t.isActive } })}>{t.isActive ? tr('Hide') : tr('Show')}</button></span></li>)}</ul><form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const i = e.currentTarget.elements.namedItem('t') as HTMLInputElement; if (i.value.trim()) addTopic.mutate({ id: s.id, name: i.value.trim() }); e.currentTarget.reset(); }}><input name="t" className="field" aria-label={tr('New topic in {0}', { 0: s.name })} placeholder={tr('New topic')} minLength={2} /><button className="btn-line">{tr('Add')}</button></form></Section>)}</div>}</Load>
    </Page>
  );
}

export function PlatformSettings() {
  const q = useQuery({ queryKey: ['platform-settings'], queryFn: () => get<any>('/admin/settings') });
  return <Load q={q}>{(s) => <SettingsForm key={JSON.stringify(s)} initial={s} />}</Load>;
}
function SettingsForm({ initial }: { initial: any }) {
  const [s, setS] = useState<any>(initial);
  const save = useAction(() => put('/admin/settings', { ...s, maxSessionMinutes: Number(s.maxSessionMinutes), codeExpiryDays: Number(s.codeExpiryDays), trialDays: Number(s.trialDays) }), { ok: 'Settings saved', keys: ['platform-settings', 'game-config'] });
  const flip = (k: string, v: string) => setS({ ...s, [k]: s[k].includes(v) ? s[k].filter((x: string) => x !== v) : [...s[k], v] });
  return (
    <Page title={tr('Settings')} note={tr('Platform policy. It always wins over center and campaign settings.')} action={<button className="btn-main" disabled={save.isPending || !s.allowedTensions.length || !s.allowedThemes.length} onClick={() => save.mutate(undefined as never)}>{tr('Save changes')}</button>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={tr('Game')}><div className="space-y-3"><Check label={tr('Centers may register by themselves')} checked={s.centerSignup} onChange={(v) => setS({ ...s, centerSignup: v })} /><Check label={tr('Students may register with e-mail')} checked={s.studentSignup} onChange={(v) => setS({ ...s, studentSignup: v })} /><Text label={tr('Trial length, days')} type="number" min={1} max={365} value={s.trialDays} onChange={(e) => setS({ ...s, trialDays: e.target.value })} /><Check label={tr('The game is open')} hint={tr('When off, students see the message below and cannot start.')} checked={s.gameEnabled} onChange={(v) => setS({ ...s, gameEnabled: v })} /><Text label={tr('Maintenance message')} maxLength={300} value={s.maintenanceMessage} onChange={(e) => setS({ ...s, maintenanceMessage: e.target.value })} /><Text label={tr('Longest session, minutes')} type="number" min={10} max={120} value={s.maxSessionMinutes} onChange={(e) => setS({ ...s, maxSessionMinutes: e.target.value })} /><Text label={tr('Codes are valid for, days')} type="number" min={1} max={730} value={s.codeExpiryDays} onChange={(e) => setS({ ...s, codeExpiryDays: e.target.value })} /></div></Section>
        <Section title={tr('What centers may choose')}><p className="lbl">{tr('Intensity')}</p><div className="mb-4 space-y-1">{TENSIONS.map((t) => <Check key={t} label={tr(words(t))} checked={s.allowedTensions.includes(t)} onChange={() => flip('allowedTensions', t)} />)}</div><p className="lbl">{tr('Themes')}</p><div className="space-y-1">{THEMES.map((t) => <Check key={t.id} label={tr(t.name)} checked={s.allowedThemes.includes(t.id)} onChange={() => flip('allowedThemes', t.id)} />)}</div></Section>
        <Section title={tr('Features for everyone')}><p className="mb-2 text-soft">{tr('Switching a feature off here disables it for every plan.')}</p><div className="space-y-1">{FEATURES.map((k) => <Check key={k} label={FEATURE_LABEL[k]} checked={s.features[k] !== false} onChange={(v) => setS({ ...s, features: { ...s.features, [k]: v } })} />)}</div></Section>
        <Section title={tr('Platform')}><div className="space-y-3"><Text label={tr('Name')} value={s.platformName} onChange={(e) => setS({ ...s, platformName: e.target.value })} /><Text label={tr('Support e-mail')} type="email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /></div></Section>
      </div>
    </Page>
  );
}

export function Security() {
  const q = useQuery({ queryKey: ['security'], queryFn: () => get<any>('/admin/security') });
  return (
    <Page title={tr('Security')} note={tr('Failed sign-ins, rejected codes, locked accounts and unusual results.')}>
      <Load q={q}>{(d) => <><Figures items={[{ label: tr('Failed sign-ins, 7 days'), value: d.last7Days.LOGIN_FAILED ?? 0 }, { label: tr('Rejected codes'), value: d.last7Days.CODE_REJECTED ?? 0 }, { label: tr('Rate limits reached'), value: d.last7Days.RATE_LIMIT_REACHED ?? 0 }, { label: tr('Locked accounts'), value: d.lockedAccounts.length }]} /><div className="grid gap-5 lg:grid-cols-[2fr_3fr]"><Section title={tr('Flagged sessions')}>{d.flaggedSessions.length ? <ul className="divide-y divide-rule">{d.flaggedSessions.map((s: any) => <li key={s.id} className="py-2">{s.organization?.name}<span className="block text-[13px] text-soft">{s.flags.map((f: string) => FLAGS[f] ?? f).join('. ')}, {when(s.startedAt)}</span></li>)}</ul> : <p className="text-soft">{tr('None.')}</p>}</Section><Section title={tr('Events')} className="overflow-x-auto">{d.feed.length ? <table className="reg min-w-[480px]"><tbody>{d.feed.map((e: any) => <tr key={e.id}><td>{tr(words(e.action))}<span className="block text-[13px] text-soft">{e.actor?.email ?? e.organization?.name ?? ''}</span></td><td className="text-soft">{e.ip}</td><td className="whitespace-nowrap text-right text-soft">{when(e.createdAt)}</td></tr>)}</tbody></table> : <p className="text-soft">{tr('No security events recorded.')}</p>}</Section></div></>}</Load>
    </Page>
  );
}

export function Activity() {
  const superAdmin = useAuth((s) => s.me?.role) === 'SUPER_ADMIN';
  const [f, setF] = useState({ page: 1, category: '', search: '' });
  const q = useQuery({ queryKey: ['audit', f], queryFn: () => get<any>('/audit-logs', { ...f, pageSize: 40 }) });
  return (
    <Page title={tr('Activity log')}>
      <div className="mb-4 flex flex-wrap gap-3"><input className="field !w-64" placeholder={tr('Search actions')} aria-label={tr('Search actions')} value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} /><select className="field !w-auto" aria-label={tr('Category')} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })}><option value="">{tr('Everything')}</option><option value="ADMIN">{tr('Administration')}</option><option value="AUTH">{tr('Sign-ins')}</option><option value="ACTIVITY">{tr('Students')}</option><option value="SECURITY">{tr('Security')}</option></select></div>
      <Load q={q}>{(d) => d.items.length ? <div className="sheet overflow-x-auto"><table className="reg min-w-[640px]"><thead><tr><th>{tr('Action')}</th><th>{tr('Who')}</th>{superAdmin && <th>{tr('Center')}</th>}<th>{tr('When')}</th></tr></thead><tbody>{d.items.map((a: any) => <tr key={a.id}><td>{tr(words(a.action))} {a.metadata?.title || a.metadata?.name || a.metadata?.reason ? <span className="text-soft">{a.metadata.title ?? a.metadata.name ?? a.metadata.reason}</span> : null}</td><td>{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : tr('System')}</td>{superAdmin && <td>{a.organization?.name}</td>}<td className="whitespace-nowrap text-soft">{when(a.createdAt)}</td></tr>)}</tbody></table></div> : <Empty title={tr('Nothing recorded')} />}</Load>
      {q.data && <Pager {...q.data} onPage={(page) => setF({ ...f, page })} />}
    </Page>
  );
}

export function PasswordForm() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const save = useAction(() => post<any>('/auth/change-password', f), { ok: 'Password changed. Other devices were signed out.', then: async (r) => { setF({ currentPassword: '', newPassword: '' }); await startSession(r.accessToken); } });
  return <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined as never); }}><Text label={tr('Current password')} type="password" autoComplete="current-password" required value={f.currentPassword} error={fieldError(save.error, 'currentPassword')} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /><Text label={tr('New password, at least 8 characters')} type="password" autoComplete="new-password" required minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /><button className="btn-line" disabled={save.isPending}>{tr('Change password')}</button></form>;
}

export function Account() {
  const me = useAuth((s) => s.me)!;
  return (
    <Page title={tr('My settings')} note={`${me.firstName} ${me.lastName}, ${me.email}`}>
      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <Section title={tr('Language')}><p className="mb-3 text-soft">{tr('Saved in your account and used on every device.')}</p><LanguagePicker /></Section>
        <Section title={tr('Theme')}><p className="mb-3 text-soft">{tr('Day or night, only for this device.')}</p><ThemeSwitch /></Section>
        <Section title={tr('Password')}><PasswordForm /></Section>
      </div>
    </Page>
  );
}
