import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Bars, DayChart, download, Empty, Figures, Load, Page, Pager, Section, Status, Tag } from '../../components/ui';
import { Review } from '../../components/Review';
import { get } from '../../lib/api';
import { tr } from '../../lib/i18n';
import { OUTCOME, mins, pct, when, words } from '../../lib/format';

const useGroups = () => useQuery({ queryKey: ['groups'], queryFn: () => get<any[]>('/center/groups') });
export const FLAGS: Record<string, string> = { TOO_FAST: tr('Finished unusually fast'), RAPID_ANSWERS: tr('Several answers in under a second'), OUTCOME_REJECTED: tr('Claimed an escape the server did not see') };

export function Results() {
  const [f, setF] = useState({ page: 1, search: '', groupId: '', campaignId: '', flagged: '' });
  const groups = useGroups();
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => get<any[]>('/campaigns') });
  const q = useQuery({ queryKey: ['results', f], queryFn: () => get<any>('/game-results/organization', f) });
  const on = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, page: 1 });
  const csv = async () => {
    const all = await get<any>('/game-results/organization', { ...f, page: 1, pageSize: 100 });
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
    const rows = [['Student', tr('Campaign'), tr('Status'), tr('Outcome'), tr('Score'), tr('Max'), tr('Accuracy'), tr('Seconds'), tr('Started')], ...all.items.map((r: any) => [`${r.user.firstName} ${r.user.lastName}`, r.campaign?.title, r.status, r.outcome, r.score, r.maxScore, r.accuracy, r.durationSeconds, r.startedAt])];
    download('results.csv', `${String.fromCharCode(0xfeff)}${rows.map((r) => r.map(cell).join(',')).join('\n')}`, 'text/csv');
  };
  return (
    <Page title={tr('Results')} note={tr('Every session of your students. Scores are computed on the server.')} action={<button className="btn-line" onClick={csv}>{tr('Download CSV')}</button>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <input className="field" placeholder={tr('Student name')} aria-label={tr('Student name')} value={f.search} onChange={on('search')} />
        <select className="field" aria-label={tr('Group')} value={f.groupId} onChange={on('groupId')}><option value="">{tr('All groups')}</option>{groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className="field" aria-label={tr('Campaign')} value={f.campaignId} onChange={on('campaignId')}><option value="">{tr('All campaigns')}</option>{campaigns.data?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <select className="field" aria-label={tr('Review')} value={f.flagged} onChange={on('flagged')}><option value="">{tr('All sessions')}</option><option value="true">{tr('Needs a look')}</option></select>
      </div>
      <Load q={q}>
        {(d) => d.items.length ? (
          <div className="sheet overflow-x-auto"><table className="reg min-w-[820px]"><thead><tr><th>{tr('Student')}</th><th>{tr('Campaign')}</th><th>{tr('Result')}</th><th>{tr('Score')}</th><th>{tr('Correct')}</th><th>{tr('Time')}</th><th>{tr('Started')}</th></tr></thead><tbody>
            {d.items.map((r: any) => <tr key={r.id}><td><Link className="font-semibold hover:underline" to={`/center/results/${r.id}`}>{r.user.firstName} {r.user.lastName}</Link></td><td>{r.campaign?.title ?? tr('Removed')}</td><td>{r.outcome ? OUTCOME[r.outcome] : <Status value={r.status} />}{r.flags.length > 0 && <span title={r.flags.map((x: string) => FLAGS[x] ?? x).join('. ')}> <Tag tone="amber">{tr('Check')}</Tag></span>}</td><td>{r.score}{r.maxScore ? ` / ${r.maxScore}` : ''}</td><td>{r.correctAnswers + r.incorrectAnswers ? pct(r.accuracy) : tr('None yet')}</td><td>{mins(r.durationSeconds)}</td><td className="whitespace-nowrap">{when(r.startedAt)}</td></tr>)}
          </tbody></table></div>
        ) : <Empty title={tr('No sessions yet')}>{tr('Results appear here as soon as a student starts a campaign.')}</Empty>}
      </Load>
      {q.data && <Pager {...q.data} onPage={(page) => setF({ ...f, page })} />}
    </Page>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['review', id], queryFn: () => get<any>(`/game-results/${id}/review`) });
  return (
    <Load q={q}>
      {(r) => (
        <Page title={`${r.student.firstName} ${r.student.lastName}`} note={<>{r.campaign?.title}, {when(r.startedAt)}</>} action={<Link className="btn-line" to={`/center/students/${r.student.id}`}>{tr('Student page')}</Link>}>
          <Figures items={[{ label: tr('Result'), value: OUTCOME[r.outcome] ?? tr(words(r.status)) }, { label: tr('Score'), value: `${r.score} / ${r.maxScore}` }, { label: tr('Correct'), value: pct(r.accuracy) }, { label: tr('Time'), value: mins(r.durationSeconds) }]} />
          {r.flags.length > 0 && <div className="mb-5 border-l-4 border-amber bg-amber-pale p-4"><b>{tr('Worth a closer look')}</b><ul className="list-disc pl-5">{r.flags.map((x: string) => <li key={x}>{FLAGS[x] ?? x}</li>)}</ul></div>}
          <Review answers={r.answers} />
        </Page>
      )}
    </Load>
  );
}

export function Analytics() {
  const [f, setF] = useState({ days: '30', groupId: '' });
  const groups = useGroups();
  const q = useQuery({ queryKey: ['analytics', f], queryFn: () => get<any>('/analytics/organization', f) });
  return (
    <Page title={tr('Analytics')} note={tr('Where the group stands and what to teach next.')} action={<><select className="field !w-auto" aria-label={tr('Group')} value={f.groupId} onChange={(e) => setF({ ...f, groupId: e.target.value })}><option value="">{tr('All groups')}</option>{groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select className="field !w-auto" aria-label={tr('Period')} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}><option value="7">{tr('7 days')}</option><option value="30">{tr('30 days')}</option><option value="90">{tr('90 days')}</option><option value="365">{tr('One year')}</option></select></>}>
      <Load q={q}>
        {(a) => !a.sessions.total ? <Empty title={tr('Nothing played in this period')}>{tr('Choose a longer period, or give your group a campaign.')}</Empty> : (
          <>
            <Figures items={[{ label: tr('Sessions'), value: a.sessions.total, sub: tr('{0} finished', { 0: a.sessions.completed }) }, { label: tr('Completion'), value: pct(a.completionRate) }, { label: tr('Correct answers'), value: pct(a.averageAccuracy) }, { label: tr('Average time'), value: mins(a.averageDurationSeconds) }]} />
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title={tr('Sessions per day')} className="lg:col-span-2"><DayChart data={a.perDay} /></Section>
              <Section title={tr('Topics')}><Bars warnBelow={70} rows={a.topics.slice(0, 12).map((t: any) => ({ key: t.topic + t.subject, label: <>{tr(t.topic)} <span className="text-soft">{tr(t.subject)}</span></>, value: t.accuracy, note: `(${t.answered})` }))} /></Section>
              <Section title={tr('Most missed questions')}>{a.mistakes.length ? <ol className="divide-y divide-rule">{a.mistakes.map((m: any) => <li key={m.id} className="flex justify-between gap-4 py-2"><span>{m.prompt}<span className="block text-[13px] text-soft">{m.topic && tr(m.topic)}</span></span><span className="whitespace-nowrap text-pencil-dark">{tr('{0} of {1} wrong', { 0: m.wrong, 1: m.answered })}</span></li>)}</ol> : <p className="text-soft">{tr('No mistakes in this period.')}</p>}</Section>
              <Section title={tr('Groups')}><table className="reg"><thead><tr><th>{tr('Group')}</th><th>{tr('Students')}</th><th>{tr('Finished')}</th><th>{tr('Correct')}</th></tr></thead><tbody>{a.groups.map((g: any) => <tr key={g.id}><td><Link className="hover:underline" to={`/center/groups/${g.id}`}>{g.name}</Link></td><td>{g.students}</td><td>{g.completed}</td><td>{pct(g.accuracy)}</td></tr>)}</tbody></table></Section>
              <Section title={tr('Campaigns')}><table className="reg"><thead><tr><th>{tr('Campaign')}</th><th>{tr('Started')}</th><th>{tr('Finished')}</th><th>{tr('Correct')}</th></tr></thead><tbody>{a.campaigns.map((c: any) => <tr key={c.id}><td>{c.title}</td><td>{c.started}</td><td>{c.completed}</td><td>{c.completed ? pct(c.accuracy) : tr('No data')}</td></tr>)}</tbody></table></Section>
              <Section title={tr('Students')} className="overflow-x-auto lg:col-span-2"><table className="reg min-w-[520px]"><thead><tr><th>{tr('Student')}</th><th>{tr('Finished')}</th><th>{tr('Correct')}</th><th>{tr('Best score')}</th><th>{tr('Time')}</th></tr></thead><tbody>{a.students.map((s: any) => <tr key={s.id}><td><Link className="font-semibold hover:underline" to={`/center/students/${s.id}`}>{s.name}</Link></td><td>{s.completed}</td><td>{pct(s.accuracy)}</td><td>{s.bestScore}</td><td>{mins(s.timeSeconds)}</td></tr>)}</tbody></table></Section>
            </div>
          </>
        )}
      </Load>
    </Page>
  );
}
