import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Gamepad2, DoorOpen, KeyRound, Map as MapIcon, Target, Users } from 'lucide-react';
import { THEMES } from '@last-lesson/scenario';
import { GameplayFields } from '../../components/Gameplay';
import { Area, Avatar, Bars, Check, Choice, confirmed, copy, DayChart, Dialog, download, Empty, Feed, Figures, Hero, Load, Meter, Page, Pager, Section, Split, Status, Text, useAction } from '../../components/ui';
import { del, get, patch, post, put, useAuth } from '../../lib/api';
import { plural, tr } from '../../lib/i18n';
import { OUTCOME, ago, day, fromDateInput, mins, pct, toDateInput, when, words } from '../../lib/format';
import { PasswordForm } from '../admin/pages';

const useGroups = () => useQuery({ queryKey: ['groups'], queryFn: () => get<any[]>('/center/groups') });
const entryLink = (code: string) => `${window.location.origin}/?code=${encodeURIComponent(code)}`;

/** Shown once after codes are issued: the server keeps only a keyed hash. */
export function IssuedCodes({ list, onClose }: { list: Array<{ name: string; code: string }>; onClose: () => void }) {
  return (
    <Dialog title={list.length > 1 ? tr('Access codes') : tr('Access code')} open onClose={onClose}>
      <p className="mb-3 text-soft">{tr('Codes are shown only now. Copy or print them before you close this window.')}</p>
      <ul className="max-h-80 divide-y divide-rule overflow-auto border-y border-rule">{list.map((i) => <li key={i.code} className="flex items-center justify-between gap-3 py-2"><span>{i.name}</span><code className="select-all font-dot text-xl">{i.code}</code></li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn-main" onClick={() => copy(list.map((i) => `${i.name}: ${i.code}`).join('\n'))}>{tr('Copy all')}</button>{list.length === 1 && <button className="btn-line" onClick={() => copy(entryLink(list[0].code))}>{tr('Copy entry link')}</button>}<button className="btn-line" onClick={() => download('access-codes.txt', list.map((i) => `${i.name}\t${i.code}`).join('\n'), 'text/plain')}>{tr('Download list')}</button></div>
    </Dialog>
  );
}

export function Dashboard() {
  const q = useQuery({ queryKey: ['center-dashboard'], queryFn: () => get<any>('/center/dashboard') });
  const me = useAuth((s) => s.me);
  return (
    <Load q={q}>
      {(d) => {
        const a = d.analytics;
        const steps = [['hasGroups', tr('Create a group'), '/center/groups'], ['hasStudents', tr('Add students and hand out codes'), '/center/students'], ['hasQuestions', tr('Write your own questions'), '/center/questions'], ['hasCampaign', tr('Publish a campaign'), '/center/campaigns'], ['hasResults', tr('See the first result'), '/center/results']] as const;
        const done = steps.filter(([k]) => d.setup[k]).length;
        const week = a.perDay.slice(-7);
        const weekSessions = week.reduce((s: number, x: any) => s + x.started, 0);
        return (
          <Page title={d.center.name} bare>
            <Hero title={tr('Welcome, {0}', { 0: me?.firstName ?? '' })} text={weekSessions ? tr('{0} sessions this week. {1}', { 0: weekSessions, 1: a.weakTopics[0] ? tr('The topic that needs you most is below.') : tr('No weak topics right now.') }) : tr('The school is quiet this week. Give a group a campaign to start.')} aside={<div className="text-right"><p className="text-sm text-fog">{d.center.plan}</p>{d.center.subscriptionEndsAt && <p className="font-dot text-lamp">{tr('until {0}', { 0: day(d.center.subscriptionEndsAt) })}</p>}</div>}>
              <Link className="btn bg-lamp text-night hover:opacity-90" to="/center/rooms"><DoorOpen size={16} />{tr('Open a room')}</Link>
              <Link className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" to="/center/campaigns"><MapIcon size={16} />{tr('Campaigns')}</Link>
              <Link className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" to="/center/codes"><KeyRound size={16} />{tr('Access codes')}</Link>
              <Link className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" to="/center/students"><Users size={16} />{tr('Add students')}</Link>
            </Hero>
            <Figures items={[
              { label: tr('Students'), value: d.usage.students, sub: tr('of {0}', { 0: d.limits.maxStudents }), icon: Users },
              { label: tr('Sessions, 30 days'), value: a.sessions.total, sub: tr('{0} finished', { 0: a.sessions.completed }), icon: Gamepad2, trend: a.perDay.map((x: any) => x.started) },
              { label: tr('Correct answers'), value: pct(a.averageAccuracy), icon: Target, sub: tr('{0} groups', { 0: d.usage.groups }) },
              { label: tr('Average time'), value: mins(a.averageDurationSeconds), icon: Clock, sub: a.completionRate === null ? undefined : tr('{0}% completion', { 0: a.completionRate }) },
              { label: tr('Active codes'), value: d.activeCodes, icon: KeyRound },
            ]} />
            {done < steps.length && (
              <Section title={tr('Getting started')} className="mb-5" action={<span className="text-sm text-soft">{tr('{0} of {1}', { 0: done, 1: steps.length })}</span>}>
                <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{steps.map(([k, label, to]) => <li key={k}><Link to={to} className={`flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${d.setup[k] ? 'border-transparent bg-well text-soft' : 'border-rule font-semibold hover:border-accent'}`}>{d.setup[k] ? <CheckCircle2 size={18} className="shrink-0 text-moss" /> : <Circle size={18} className="shrink-0 text-soft" />}{label}</Link></li>)}</ol>
              </Section>
            )}
            <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
              <Section title={tr('Sessions per day')}><DayChart data={a.perDay} /></Section>
              <Section title={tr('Needs your attention')} action={<Link className="text-sm text-accent hover:underline" to="/center/analytics">{tr('All analytics')}</Link>}>{a.weakTopics.length ? <Bars warnBelow={70} rows={a.weakTopics.slice(0, 5).map((x: any) => ({ key: x.topic, label: <>{tr(x.topic)} <span className="text-soft">{tr(x.subject)}</span></>, value: x.accuracy, note: `(${x.answered})` }))} /> : <p className="text-soft">{tr('No topic is below 70% yet.')}</p>}</Section>
              <Section title={tr('Latest sessions')} action={<Link className="text-sm text-accent hover:underline" to="/center/results">{tr('All results')}</Link>}>{d.recent.length ? <table className="reg"><tbody>{d.recent.map((r: any) => <tr key={r.id}><td><Link className="font-semibold hover:underline" to={r.status === 'IN_PROGRESS' ? `/center/students/${r.user.id}` : `/center/results/${r.id}`}>{r.user.firstName} {r.user.lastName}</Link><span className="block text-[13px] text-soft">{r.campaign?.title}</span></td><td>{r.outcome ? OUTCOME[r.outcome] : <Status value={r.status} />}</td><td className="text-right font-semibold">{r.status === 'IN_PROGRESS' ? '' : pct(r.accuracy)}</td><td className="whitespace-nowrap text-right text-soft">{ago(r.startedAt)}</td></tr>)}</tbody></table> : <p className="text-soft">{tr('Nobody has played yet.')}</p>}</Section>
              <div className="space-y-5">
                <Section title={tr('How sessions end')}><Split parts={[{ label: tr('Completed'), value: a.sessions.completed, tone: 'good' }, { label: tr('In progress'), value: a.sessions.inProgress, tone: 'plain' }, { label: tr('Left early'), value: a.sessions.abandoned, tone: 'warn' }]} /></Section>
                <Section title={tr('Common mistakes')}>{a.mistakes.length ? <ol className="divide-y divide-rule">{a.mistakes.slice(0, 4).map((m: any) => <li key={m.id} className="py-2">{m.prompt}<span className="block text-[13px] text-pencil-dark">{tr('{0} of {1} wrong', { 0: m.wrong, 1: m.answered })}</span></li>)}</ol> : <p className="text-soft">{tr('Nothing to show yet.')}</p>}</Section>
                <Section title={tr('Activity')}>{d.activity.length ? <Feed items={d.activity.slice(0, 6).map((x: any) => ({ key: x.id, text: tr(words(x.action)), who: x.actor ? `${x.actor.firstName} ${x.actor.lastName}`.trim() : undefined, at: x.createdAt }))} /> : <p className="text-soft">{tr('Nothing recorded')}</p>}</Section>
              </div>
            </div>
          </Page>
        );
      }}
    </Load>
  );
}

export function Students() {
  const [f, setF] = useState({ page: 1, search: '', groupId: '', status: '' });
  const [adding, setAdding] = useState(false);
  const [codes, setCodes] = useState<Array<{ name: string; code: string }> | null>(null);
  const groups = useGroups();
  const q = useQuery({ queryKey: ['students', f], queryFn: () => get<any>('/center/students', f) });
  const newCode = useAction((s: any) => post<any>(`/center/students/${s.id}/code`), { keys: ['students'], then: (r, s) => setCodes([{ name: `${s.firstName} ${s.lastName}`, code: r.code }]) });
  const on = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, page: 1 });
  return (
    <Page title={tr('Students')} note={tr('Students sign in with a personal code. No e-mail and no password.')} action={<button className="btn-main" onClick={() => setAdding(true)}>{tr('Add students')}</button>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><input className="field" placeholder={tr('Search by name')} aria-label={tr('Search by name')} value={f.search} onChange={on('search')} /><select className="field" aria-label={tr('Group')} value={f.groupId} onChange={on('groupId')}><option value="">{tr('All groups')}</option>{groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select className="field" aria-label={tr('Status')} value={f.status} onChange={on('status')}><option value="">{tr('Any status')}</option><option value="ACTIVE">{tr('Active')}</option><option value="INACTIVE">{tr('Inactive')}</option></select></div>
      <Load q={q}>
        {(d) => d.items.length ? (
          <div className="sheet overflow-x-auto"><table className="reg min-w-[760px]"><thead><tr><th>{tr('Student')}</th><th>{tr('Group')}</th><th>{tr('Code')}</th><th>{tr('Finished')}</th><th>{tr('Correct')}</th><th>{tr('Last seen')}</th><th /></tr></thead><tbody>
            {d.items.map((s: any) => <tr key={s.id} className={s.status === 'INACTIVE' ? 'opacity-60' : ''}><td><span className="flex items-center gap-3"><Avatar name={`${s.firstName} ${s.lastName}`} /><span><Link className="font-semibold hover:underline" to={`/center/students/${s.id}`}>{s.firstName} {s.lastName}</Link> {s.status === 'INACTIVE' && <Status value="INACTIVE" />}</span></span></td><td>{s.group?.name ?? tr('No group')}</td><td className="font-dot">{s.code && `...${s.code.hint}`}</td><td>{s.completed}</td><td><Meter value={s.accuracy} /></td><td>{s.lastActiveAt ? day(s.lastActiveAt) : tr('Never')}</td><td className="text-right"><button className="btn-quiet" onClick={() => (!s.code || confirmed(tr('The current code will stop working. Issue a new one?'))) && newCode.mutate(s)}>{tr('New code')}</button></td></tr>)}
          </tbody></table></div>
        ) : <Empty title={tr('No students here')}>{tr('Add a list of names, or share a group code and let students sign the register themselves.')}</Empty>}
      </Load>
      {q.data && <Pager {...q.data} onPage={(page) => setF({ ...f, page })} />}
      {adding && <AddStudents groups={groups.data ?? []} onClose={() => setAdding(false)} onCodes={(l) => { setAdding(false); setCodes(l); }} />}
      {codes && <IssuedCodes list={codes} onClose={() => setCodes(null)} />}
    </Page>
  );
}

function AddStudents({ groups, onClose, onCodes }: { groups: any[]; onClose: () => void; onCodes: (l: Array<{ name: string; code: string }>) => void }) {
  const [names, setNames] = useState('');
  const [groupId, setGroup] = useState('');
  const [until, setUntil] = useState('');
  const list = names.split('\n').map((l) => l.trim()).filter(Boolean);
  const add = useAction(
    () => post<any>('/center/students/bulk', { students: list.map((l) => { const [firstName, ...rest] = l.split(/\s+/); return { firstName, lastName: rest.join(' '), groupId: groupId || null, accessExpiresAt: fromDateInput(until) }; }) }),
    { ok: 'Students added', keys: ['students', 'groups', 'center-dashboard'], then: (r) => onCodes(r.students.map((s: any) => ({ name: `${s.firstName} ${s.lastName}`.trim(), code: s.code }))) },
  );
  return (
    <Dialog title={tr('Add students')} open onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(undefined as never); }}>
        <Area label={tr('Names, one student per line')} rows={7} required placeholder={tr('Malika Yusupova\nJasur Rahimov')} value={names} onChange={(e) => setNames(e.target.value)} hint={tr('{0} of up to 200', { 0: list.length })} />
        <div className="grid gap-3 sm:grid-cols-2"><Choice label={tr('Group')} value={groupId} options={[['', tr('No group')], ...groups.map((g) => [g.id, g.name] as [string, string])]} onChange={(e) => setGroup(e.target.value)} /><Text label={tr('Access until (optional)')} type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
        <button className="btn-main" disabled={!list.length || list.length > 200 || add.isPending}>{tr('Add and create codes')}</button>
      </form>
    </Dialog>
  );
}

export function StudentPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const groups = useGroups();
  const q = useQuery({ queryKey: ['student', id], queryFn: () => get<any>(`/center/students/${id}`) });
  const [edit, setEdit] = useState<any | null>(null);
  const [codes, setCodes] = useState<Array<{ name: string; code: string }> | null>(null);
  const keys = ['student', 'students'];
  const save = useAction((s: any) => patch(`/center/students/${id}`, s), { ok: 'Saved', keys, then: () => setEdit(null) });
  const code = useAction(() => post<any>(`/center/students/${id}/code`), { keys, then: (r) => setCodes([{ name: `${q.data.firstName} ${q.data.lastName}`, code: r.code }]) });
  const remove = useAction(() => del(`/center/students/${id}`), { ok: 'Student removed', keys: ['students'], then: () => nav('/center/students') });
  return (
    <Load q={q}>
      {(s) => (
        <Page title={`${s.firstName} ${s.lastName}`} note={<>{s.group?.name ?? tr('No group')}. <Status value={s.status} /> {s.accessExpiresAt && tr('Access until {0}.', { 0: day(s.accessExpiresAt) })}</>} action={<><button className="btn-line" onClick={() => setEdit({ firstName: s.firstName, lastName: s.lastName, groupId: s.group?.id ?? '', accessExpiresAt: s.accessExpiresAt, note: s.note ?? '' })}>{tr('Edit')}</button><button className="btn-line" onClick={() => code.mutate(undefined as never)}>{tr('New code')}</button><button className="btn-line" onClick={() => save.mutate({ status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{s.status === 'ACTIVE' ? tr('Deactivate') : tr('Activate')}</button><button className="btn-red" onClick={() => confirmed(tr('Remove this student from the center? Results stay in your statistics.')) && remove.mutate(undefined as never)}>{tr('Remove')}</button></>}>
          <Figures items={[{ label: tr('Finished'), value: s.progress.completed, sub: tr('of {0}', { 0: s.progress.sessions }) }, { label: tr('Correct'), value: pct(s.progress.averageAccuracy) }, { label: tr('Best score'), value: s.progress.bestScore ?? 'None' }, { label: tr('Time'), value: mins(s.progress.timeSeconds) }]} />
          {s.note && <p className="mb-5 border-l-4 border-rule pl-3 text-soft">{s.note}</p>}
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title={tr('Topics')}>{s.progress.topics.length ? <Bars warnBelow={70} rows={s.progress.topics.map((t: any) => ({ key: t.topic, label: <>{tr(t.topic)} <span className="text-soft">{tr(t.subject)}</span></>, value: t.accuracy, note: `(${t.answered})` }))} /> : <p className="text-soft">{tr('No answers yet.')}</p>}</Section>
            <Section title={tr('Access codes')}><ul className="divide-y divide-rule">{s.codes.map((c: any) => <li key={c.id} className="flex justify-between py-2"><span className="font-dot">...{c.hint}</span><span className="text-soft">{c.revokedAt ? tr('Revoked') : tr('Until {0}', { 0: day(c.expiresAt) })}{c.lastUsedAt ? ` (${when(c.lastUsedAt)})` : ''}</span></li>)}</ul>{!s.codes.length && <p className="text-soft">{tr('No code yet.')}</p>}</Section>
            <Section title={tr('Sessions')} className="overflow-x-auto lg:col-span-2">{s.sessions.length ? <table className="reg min-w-[520px]"><thead><tr><th>{tr('Campaign')}</th><th>{tr('Result')}</th><th>{tr('Score')}</th><th>{tr('Correct')}</th><th>{tr('Started')}</th></tr></thead><tbody>{s.sessions.map((r: any) => <tr key={r.id}><td>{r.status === 'IN_PROGRESS' ? r.campaign?.title : <Link className="font-semibold hover:underline" to={`/center/results/${r.id}`}>{r.campaign?.title ?? tr('Removed')}</Link>}</td><td>{r.outcome ? OUTCOME[r.outcome] : <Status value={r.status} />}</td><td>{r.score}</td><td>{pct(r.accuracy)}</td><td>{when(r.startedAt)}</td></tr>)}</tbody></table> : <p className="text-soft">{tr('This student has not played yet.')}</p>}</Section>
          </div>
          <Dialog title={tr('Edit student')} open={Boolean(edit)} onClose={() => setEdit(null)}>
            {edit && (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ ...(s.editable ? { firstName: edit.firstName, lastName: edit.lastName } : {}), groupId: edit.groupId || null, accessExpiresAt: edit.accessExpiresAt, note: edit.note || null }); }}>
                <div className="grid gap-3 sm:grid-cols-2"><Text label={tr('First name')} required disabled={!s.editable} value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} /><Text label={tr('Last name')} disabled={!s.editable} value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} /></div>
                <Choice label={tr('Group')} value={edit.groupId} options={[['', tr('No group')], ...(groups.data ?? []).map((g) => [g.id, g.name] as [string, string])]} onChange={(e) => setEdit({ ...edit, groupId: e.target.value })} />
                <Text label={tr('Access until')} type="date" value={toDateInput(edit.accessExpiresAt)} onChange={(e) => setEdit({ ...edit, accessExpiresAt: fromDateInput(e.target.value) })} />
                <Area label={tr('Note for teachers')} maxLength={500} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                <button className="btn-main" disabled={save.isPending}>{tr('Save')}</button>
              </form>
            )}
          </Dialog>
          {codes && <IssuedCodes list={codes} onClose={() => setCodes(null)} />}
        </Page>
      )}
    </Load>
  );
}

export function Groups() {
  const q = useGroups();
  const [name, setName] = useState('');
  const create = useAction(() => post('/center/groups', { name }), { ok: 'Group created', keys: ['groups', 'center-dashboard'], then: () => setName('') });
  return (
    <Page title={tr('Groups')} note={tr('Classes or courses. Campaigns and codes can be given to a group.')}>
      <form className="mb-5 flex max-w-md gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(undefined as never); }}><input className="field" aria-label={tr('New group name')} placeholder={tr('New group, for example 9-A evening')} required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-main" disabled={create.isPending}>{tr('Create')}</button></form>
      <Load q={q}>{(d) => d.length ? <div className="sheet overflow-x-auto"><table className="reg min-w-[600px]"><thead><tr><th>{tr('Group')}</th><th>{tr('Students')}</th><th>{tr('Active codes')}</th><th>{tr('Campaigns')}</th><th>{tr('Finished')}</th><th>{tr('Correct')}</th></tr></thead><tbody>{d.map((g) => <tr key={g.id}><td><Link className="font-semibold hover:underline" to={`/center/groups/${g.id}`}>{g.name}</Link></td><td>{g.students}</td><td>{g.activeCodes}</td><td>{g.campaigns.length ? g.campaigns.map((c: any) => c.title).join(', ') : tr('Those open to everyone')}</td><td>{g.completed}</td><td>{pct(g.accuracy)}</td></tr>)}</tbody></table></div> : <Empty title={tr('No groups yet')}>{tr('Create the first one above.')}</Empty>}</Load>
    </Page>
  );
}

export function GroupPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['group', id], queryFn: () => get<any>(`/center/groups/${id}`) });
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => get<any[]>('/campaigns') });
  const [codes, setCodes] = useState<Array<{ name: string; code: string }> | null>(null);
  const [uses, setUses] = useState('40');
  const keys = ['group', 'groups', 'campaigns', 'campaign'];
  const assign = useAction((campaignIds: string[]) => put(`/center/groups/${id}/campaigns`, { campaignIds }), { ok: 'Campaigns updated', keys });
  const code = useAction(() => post<any>('/invitations', { groupId: id, maxUses: Number(uses) }), { keys: ['group', 'groups', 'codes'], then: (r) => setCodes([{ name: q.data.name, code: r.code }]) });
  const rename = useAction((name: string) => patch(`/center/groups/${id}`, { name }), { ok: 'Renamed', keys });
  const remove = useAction(() => del(`/center/groups/${id}`), { ok: 'Group removed', keys: ['groups'], then: () => nav('/center/groups') });
  return (
    <Load q={q}>
      {(g) => {
        const own = (campaigns.data ?? []).filter((c) => !c.official);
        const ids = g.campaigns.map((c: any) => c.id);
        return (
          <Page title={g.name} note={plural(g.students, 'student|students')} action={<><button className="btn-line" onClick={() => { const n = window.prompt(tr('Group name'), g.name); if (n?.trim()) rename.mutate(n.trim()); }}>{tr('Rename')}</button><button className="btn-red" onClick={() => confirmed(tr('Remove this group? Students stay in the center.')) && remove.mutate(undefined as never)}>{tr('Remove')}</button></>}>
            <Figures items={[{ label: tr('Finished, 90 days'), value: g.analytics.sessions.completed }, { label: tr('Completion'), value: pct(g.analytics.completionRate) }, { label: tr('Correct'), value: pct(g.analytics.averageAccuracy) }, { label: tr('Average time'), value: mins(g.analytics.averageDurationSeconds) }]} />
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title={tr('Group code')}><p className="mb-3 text-soft">{tr('Anyone with this code can join the group by typing a name. Each joiner gets a personal code.')}</p><div className="flex items-end gap-2"><Text label={tr('How many students may join')} type="number" min={1} max={1000} value={uses} onChange={(e) => setUses(e.target.value)} /><button className="btn-main" disabled={code.isPending} onClick={() => code.mutate(undefined as never)}>{tr('Create code')}</button></div></Section>
              <Section title={tr('Campaigns for this group')}>{own.length ? <div className="space-y-1.5">{own.map((c) => <Check key={c.id} label={c.title} hint={tr(words(c.status))} checked={ids.includes(c.id)} onChange={(on) => assign.mutate(on ? [...ids, c.id] : ids.filter((x: string) => x !== c.id))} />)}</div> : <p className="text-soft">{tr('You have no campaigns of your own yet.')}</p>}</Section>
              <Section title={tr('Topics')}>{g.analytics.topics.length ? <Bars warnBelow={70} rows={g.analytics.topics.slice(0, 10).map((t: any) => ({ key: t.topic, label: tr(t.topic), value: t.accuracy, note: `(${t.answered})` }))} /> : <p className="text-soft">{tr('No answers yet.')}</p>}</Section>
              <Section title={tr('Students')}>{g.analytics.students.length ? <Bars rows={g.analytics.students.slice(0, 12).map((s: any) => ({ key: s.id, label: s.name, value: Math.round(s.accuracy), note: `(${s.completed})` }))} /> : <p className="text-soft">{tr('Nobody has finished a campaign yet.')}</p>}<Link className="mt-3 inline-block text-sm underline" to="/center/students">{tr('All students')}</Link></Section>
            </div>
            {codes && <IssuedCodes list={codes} onClose={() => setCodes(null)} />}
          </Page>
        );
      }}
    </Load>
  );
}

export function Codes() {
  const [kind, setKind] = useState('');
  const groups = useGroups();
  const q = useQuery({ queryKey: ['codes', kind], queryFn: () => get<any[]>('/invitations', { kind }) });
  const [make, setMake] = useState<any | null>(null);
  const [codes, setCodes] = useState<Array<{ name: string; code: string }> | null>(null);
  const keys = ['codes', 'groups', 'students', 'center-dashboard'];
  const create = useAction((m: any) => post<any>('/invitations', { groupId: m.groupId || null, label: m.label || null, maxUses: Number(m.maxUses), expiresAt: fromDateInput(m.expiresAt) }), { keys, then: (r) => { setMake(null); setCodes([{ name: r.group?.name ?? r.label ?? 'Center code', code: r.code }]); } });
  const regen = useAction((c: any) => post<any>(`/invitations/${c.id}/regenerate`), { keys, then: (r) => setCodes([{ name: r.student ? `${r.student.firstName} ${r.student.lastName}` : (r.group?.name ?? 'Center code'), code: r.code }]) });
  const revoke = useAction((id: string) => post(`/invitations/${id}/revoke`), { ok: 'Code revoked', keys });
  const toggle = useAction((c: any) => patch(`/invitations/${c.id}`, { isActive: !c.isActive }), { keys });
  return (
    <Page title={tr('Access codes')} note={tr('Codes are stored encrypted. You can recognise one by its last four characters.')} action={<button className="btn-main" onClick={() => setMake({ groupId: '', label: '', maxUses: '40', expiresAt: '' })}>{tr('New group code')}</button>}>
      <select className="field mb-4 !w-auto" aria-label={tr('Kind')} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">{tr('All codes')}</option><option value="GROUP">{tr('Group codes')}</option><option value="PERSONAL">{tr('Personal codes')}</option></select>
      <Load q={q}>{(d) => d.length ? <div className="sheet overflow-x-auto"><table className="reg min-w-[780px]"><thead><tr><th>{tr('Code')}</th><th>{tr('For')}</th><th>{tr('Used')}</th><th>{tr('Until')}</th><th>{tr('State')}</th><th /></tr></thead><tbody>{d.map((c) => <tr key={c.id}><td className="font-dot">...{c.hint}</td><td>{c.student ? `${c.student.firstName} ${c.student.lastName}` : (c.group?.name ?? c.label ?? tr('Whole center'))}</td><td>{c.kind === 'GROUP' ? `${c.usesCount} / ${c.maxUses}` : c.lastUsedAt ? when(c.lastUsedAt) : tr('Never')}</td><td>{day(c.expiresAt)}</td><td><Status value={c.state} /></td><td className="whitespace-nowrap text-right">{!c.revokedAt && <><button className="btn-quiet" onClick={() => toggle.mutate(c)}>{c.isActive ? tr('Pause') : tr('Resume')}</button><button className="btn-quiet hover:!text-pencil" onClick={() => confirmed(tr('Revoke this code for good?')) && revoke.mutate(c.id)}>{tr('Revoke')}</button></>}<button className="btn-quiet" onClick={() => confirmed(tr('The old code stops working. Issue a new one?')) && regen.mutate(c)}>{tr('Regenerate')}</button></td></tr>)}</tbody></table></div> : <Empty title={tr('No codes yet')}>{tr('Create a group code, or add students to get personal ones.')}</Empty>}</Load>
      <Dialog title={tr('New group code')} open={Boolean(make)} onClose={() => setMake(null)}>{make && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(make); }}><Choice label={tr('Group')} value={make.groupId} options={[['', tr('Whole center')], ...(groups.data ?? []).map((g) => [g.id, g.name] as [string, string])]} onChange={(e) => setMake({ ...make, groupId: e.target.value })} /><Text label={tr('Label (optional)')} maxLength={80} value={make.label} onChange={(e) => setMake({ ...make, label: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><Text label={tr('Students who may join')} type="number" min={1} max={10000} value={make.maxUses} onChange={(e) => setMake({ ...make, maxUses: e.target.value })} /><Text label={tr('Valid until (optional)')} type="date" value={make.expiresAt} onChange={(e) => setMake({ ...make, expiresAt: e.target.value })} /></div><button className="btn-main" disabled={create.isPending}>{tr('Create code')}</button></form>}</Dialog>
      {codes && <IssuedCodes list={codes} onClose={() => setCodes(null)} />}
    </Page>
  );
}

export function GameSettings() {
  const q = useQuery({ queryKey: ['center-profile'], queryFn: () => get<any>('/center/profile') });
  return <Load q={q}>{(p) => <GameSettingsForm key={JSON.stringify(p.settings)} profile={p} />}</Load>;
}
function GameSettingsForm({ profile }: { profile: any }) {
  const [s, setS] = useState<any>(profile.settings);
  const game = useQuery({ queryKey: ['game-config'], queryFn: () => get<any>('/games/config') });
  const save = useAction(() => put('/center/settings', s), { ok: 'Settings saved', keys: ['center-profile'] });
  const b = s.branding;
  const theme = THEMES.find((t) => t.id === b.theme) ?? THEMES[0];
  const f = profile.features;
  const setB = (p: any) => setS({ ...s, branding: { ...b, ...p } });
  const setT = (p: any) => setS({ ...s, content: { ...s.content, ...p } });
  const notes: any[] = s.content.notes;
  return (
    <Page title={tr('Game and branding')} note={tr('Defaults for every campaign. A campaign can override how it plays.')} action={<button className="btn-main" disabled={save.isPending} onClick={() => save.mutate(undefined as never)}>{tr('Save changes')}</button>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Section title={tr('Branding')}>
            {!f.branding && <p className="mb-3 text-soft">{tr('Your plan uses the standard look.')}</p>}
            <fieldset disabled={!f.branding} className="grid gap-3 sm:grid-cols-2"><Text label={tr('Name shown to students')} maxLength={60} placeholder={profile.name} value={b.displayName} onChange={(e) => setB({ displayName: e.target.value })} /><Text label={tr('Accent colour')} type="color" className="!h-10 !p-1" value={b.accent} onChange={(e) => setB({ accent: e.target.value })} /><Choice label={tr('Visual theme')} value={b.theme} options={THEMES.filter((t) => game.data?.policy.allowedThemes.includes(t.id) ?? true).map((t) => [t.id, tr(t.name)])} onChange={(e) => setB({ theme: e.target.value })} /></fieldset>
          </Section>
          <Section title={tr('How the night plays')}><GameplayFields value={s.gameplay} policy={game.data?.policy} onChange={(gameplay) => setS({ ...s, gameplay })} /></Section>
          <Section title={tr('Your texts in the game')}><div className="space-y-3"><Text label={tr('Opening line on the intercom')} maxLength={160} value={s.content.openingLine} onChange={(e) => setT({ openingLine: e.target.value })} /><Text label={tr('Notice board in the corridor, also shown on the student page')} maxLength={280} value={s.content.announcement} onChange={(e) => setT({ announcement: e.target.value })} /><Text label={tr('Closing line on the report')} maxLength={200} value={s.content.closingLine} onChange={(e) => setT({ closingLine: e.target.value })} /></div></Section>
          <Section title={tr('Notes to find in the school')} action={f.customNotes && notes.length < 4 && <button className="btn-line" onClick={() => setT({ notes: [...notes, { title: '', body: '' }] })}>{tr('Add a note')}</button>}>
            {!f.customNotes ? <p className="text-soft">{tr('Custom notes are not part of your plan.')}</p> : notes.length ? <ul className="space-y-4">{notes.map((n, i) => <li key={i} className="space-y-2 border-l-4 border-rule pl-3"><Text label={tr('Title')} maxLength={60} value={n.title} onChange={(e) => setT({ notes: notes.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} /><Area label={tr('Text')} rows={2} maxLength={600} value={n.body} onChange={(e) => setT({ notes: notes.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)) })} /><button className="btn-quiet" onClick={() => setT({ notes: notes.filter((_, k) => k !== i) })}>{tr('Remove note')}</button></li>)}</ul> : <p className="text-soft">{tr('Up to four notes lie in the corridor, the assembly hall and the biology lab. Use them for rules, formulas or reminders.')}</p>}
          </Section>
          <Section title={tr('Campaigns')}><Check label={tr('Show official campaigns to our students')} checked={s.allowOfficialCampaigns} onChange={(v) => setS({ ...s, allowOfficialCampaigns: v })} /></Section>
        </div>
        <div><p className="lbl">{tr('Title screen')}</p><div className="sticky top-5 overflow-hidden border border-rule"><div className="relative aspect-video bg-cover [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)', filter: `brightness(${(theme.tint[0] + theme.tint[1] + theme.tint[2]) / 3})` }}><div className="absolute inset-0 mix-blend-soft-light" style={{ background: theme.accent, opacity: theme.id === 'MIDNIGHT' ? 0 : 0.45 }} /><div className="absolute inset-0 flex flex-col justify-between p-4"><div><p className="font-jac text-4xl text-bone">Last Lesson</p><p className="font-dot" style={{ color: b.accent }}>{tr('Knowledge is your only way out.')}</p></div><p className="text-right font-dot text-sm text-bone">{b.displayName || profile.name}</p></div></div></div></div>
      </div>
    </Page>
  );
}

export function Profile() {
  const q = useQuery({ queryKey: ['center-profile'], queryFn: () => get<any>('/center/profile') });
  return <Load q={q}>{(p) => <ProfileForm key={p.id + p.logoUrl} p={p} />}</Load>;
}
function ProfileForm({ p }: { p: any }) {
  const [f, setF] = useState({ name: p.name, city: p.city ?? '', contactName: p.contactName ?? '', contactEmail: p.contactEmail ?? '', contactPhone: p.contactPhone ?? '', logoUrl: p.logoUrl });
  const [problem, setProblem] = useState('');
  const save = useAction(() => patch('/center/profile', { ...f, city: f.city || null, contactName: f.contactName || null, contactEmail: f.contactEmail || null, contactPhone: f.contactPhone || null, logoUrl: f.logoUrl === p.logoUrl ? undefined : f.logoUrl }), { ok: 'Saved. The menu shows a new logo after the next sign-in.', keys: ['center-profile'] });
  const pick = (file?: File) => {
    setProblem('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setProblem(tr('Use a PNG, JPEG or WebP file'));
    if (file.size > 140_000) return setProblem(tr('The logo must be smaller than 140 KB'));
    const r = new FileReader();
    r.onload = () => setF({ ...f, logoUrl: String(r.result) });
    r.readAsDataURL(file);
  };
  const usage = [['students', 'maxStudents', tr('Students')], ['groups', 'maxGroups', tr('Groups')], ['campaigns', 'maxCampaigns', tr('Campaigns')], ['questions', 'maxQuestions', tr('Own questions')]] as const;
  return (
    <Page title={tr('Profile and plan')}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={tr('Center')}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined as never); }}>
            <Text label={tr('Name')} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2"><Text label={tr('City')} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /><Text label={tr('Contact person')} value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} /><Text label={tr('Contact e-mail')} type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /><Text label={tr('Phone')} value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></div>
            <div><p className="lbl">{tr('Logo')}</p><div className="flex items-center gap-3">{f.logoUrl && <img src={f.logoUrl} alt={tr('Current logo')} className="h-14 w-14 border border-rule bg-white object-contain rounded-md" />}<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={tr('Logo file')} disabled={!p.features.branding} onChange={(e) => pick(e.target.files?.[0])} />{f.logoUrl && <button type="button" className="btn-quiet" onClick={() => setF({ ...f, logoUrl: null })}>{tr('Remove')}</button>}</div>{problem && <p className="mt-1 text-[13px] font-semibold text-pencil-dark">{problem}</p>}</div>
            <button className="btn-main" disabled={save.isPending}>{tr('Save')}</button>
          </form>
        </Section>
        <div className="space-y-5">
          <Section title={p.plan.name}><p className="mb-3 text-soft">{p.plan.description && tr(p.plan.description)} {p.subscriptionEndsAt && tr('Paid until {0}.', { 0: day(p.subscriptionEndsAt) })}</p><ul className="space-y-3">{usage.map(([u, l, t]) => <li key={u}><div className="flex justify-between text-sm"><span>{t}</span><span>{p.usage[u]} / {p.limits[l]}</span></div><div className="mt-1 h-2 bg-track"><div className={p.usage[u] / p.limits[l] > 0.9 ? 'h-full bg-pencil' : 'h-full bg-s1'} style={{ width: `${Math.min(100, (p.usage[u] / p.limits[l]) * 100)}%` }} /></div></li>)}</ul></Section>
          <Section title={tr('My password')}><PasswordForm /></Section>
        </div>
      </div>
    </Page>
  );
}
