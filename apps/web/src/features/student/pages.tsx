import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { THEMES } from '@last-lesson/scenario';
import { AnswerControl } from '../../components/QuestionFields';
import { Review } from '../../components/Review';
import { LanguagePicker, LanguageSwitch } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
import { get, post, signOut, startSession, useAuth } from '../../lib/api';
import { errorText, plural, tr } from '../../lib/i18n';
import { OUTCOME, day, mins, when } from '../../lib/format';

const useHome = () => useQuery({ queryKey: ['student-home'], queryFn: () => get<any>('/student/home') });

function State({ q, children }: { q: any; children: (d: any) => React.ReactNode }) {
  if (q.isPending) return <p className="py-10 font-dot text-fog" role="status">{tr('Looking for your name in the register...')}</p>;
  if (q.isError) return <div className="npanel p-5"><p className="text-[#f09a86]">{errorText(q.error)}</p><button className="nbtn-line mt-4" onClick={() => q.refetch()}>{tr('Try again')}</button></div>;
  return <>{children(q.data)}</>;
}

export function StudentLayout() {
  const home = useHome();
  const nav = useNavigate();
  const link = ({ isActive }: { isActive: boolean }) => clsx('border-b-2 pb-1 font-dot text-lg', isActive ? 'border-lamp text-bone' : 'border-transparent text-fog hover:text-bone');
  return (
    <div className="night">
      <header className="border-b border-night-4 bg-night-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
          <Link to="/student" className="flex items-center gap-3">{home.data?.center.logoUrl && <img src={home.data.center.logoUrl} alt="" className="h-9 w-9 bg-white object-contain rounded-md" />}<span><Wordmark className="block text-3xl text-bone" /><span className="text-sm text-fog">{home.data?.center.displayName}</span></span></Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-1" aria-label={tr('Student')}><NavLink end to="/student" className={link}>{tr('Campaigns')}</NavLink><NavLink to="/student/prepare" className={link}>{tr('Prepare')}</NavLink><NavLink to="/student/results" className={link}>{tr('Results')}</NavLink><NavLink to="/student/progress" className={link}>{tr('Progress')}</NavLink><NavLink to="/student/settings" className={link}>{tr('Settings')}</NavLink></nav>
          <div className="flex items-center gap-4"><LanguageSwitch dark /><button className="text-fog hover:text-bone" onClick={async () => { await signOut(); nav('/'); }}>{tr('Sign out')}</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><Suspense fallback={<p className="font-dot text-fog">{tr('Opening...')}</p>}><Outlet /></Suspense></main>
    </div>
  );
}

export function useLaunch() {
  return useMutation({
    mutationFn: (v: { campaignId?: string; sessionId?: string; preparationId?: string }) => (v.sessionId ? post<any>(`/game-sessions/${v.sessionId}/resume`) : post<any>('/game-sessions/launch', { campaignId: v.campaignId, preparationId: v.preparationId ?? null })),
    onSuccess: (r) => window.location.assign(r.launchUrl),
  });
}

const LEVEL: Record<string, string> = { EASY: tr('Easy'), MEDIUM: tr('Medium'), HARD: tr('Hard') };

export function Home() {
  const q = useHome();
  const launch = useLaunch();
  const [params] = useSearchParams();
  const preparationId = params.get('guide') ?? undefined;
  return (
    <State q={q}>
      {(d) => (
        <>
          <h1 className="font-dot text-3xl">{tr('Good evening, {0}.', { 0: d.student.firstName })}</h1>
          <p className="mt-1 text-fog">{d.student.group ? `${d.student.group}. ` : ''}{d.summary.finished ? tr('Finished nights: {0}. Correct answers: {1}%.', { 0: d.summary.finished, 1: d.summary.averageAccuracy }) : tr('Your name is in the register. Choose where to start.')}</p>
          {d.maintenance && <p className="mt-4 border-l-4 border-lamp bg-night-2 p-3">{d.maintenance}</p>}
          {d.announcement && <p className="mt-4 border-l-4 border-lamp bg-night-2 p-3">{d.announcement}</p>}
          {preparationId && <p className="mt-4 border-l-4 border-[#4c7763] bg-night-2 p-3">{tr('You are prepared. The questions inside will not repeat your practice.')}</p>}
          {launch.error && <p className="mt-4 text-[#f09a86]" role="alert">{errorText(launch.error)}</p>}
          <div className="mt-7 space-y-5">
            {d.campaigns.map((c: any) => {
              const theme = THEMES.find((t) => t.id === c.theme) ?? THEMES[0];
              return (
                <article key={c.id} className="npanel grid overflow-hidden sm:grid-cols-[220px_1fr]">
                  <div className="relative h-32 sm:h-auto" aria-hidden="true">
                    <div className="absolute inset-0 bg-cover bg-center [image-rendering:pixelated]" style={{ backgroundImage: `url(/art/${c.best?.outcome === 'DISMISSED' ? 'dawn' : 'title'}.png)` }} />
                    <div className="absolute inset-0 mix-blend-color" style={{ background: theme.accent, opacity: theme.id === 'MIDNIGHT' ? 0 : 0.4 }} />
                  </div>
                  <div className="p-5">
                    <h2 className="font-jac text-3xl leading-none">{c.title}</h2>
                    {c.description && <p className="mt-2 max-w-[60ch] text-fog">{c.description}</p>}
                    <p className="mt-2 text-sm text-fog">{c.subjects.map((s: any) => tr(s.name)).join(', ')}. {LEVEL[c.difficulty]}. {plural(c.questionCount, 'question|questions')}, {tr('up to {0} minutes', { 0: c.gameplay.sessionMinutes })}. {c.gameplay.mode === 'STUDY' ? tr('Study mode.') : ''} {c.availableTo ? tr('Open until {0}.', { 0: day(c.availableTo) }) : ''}</p>
                    {c.objectives.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-fog">{c.objectives.map((o: string) => <li key={o}>{o}</li>)}</ul>}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button className="nbtn" disabled={launch.isPending || Boolean(d.maintenance)} onClick={() => launch.mutate({ campaignId: c.id, preparationId })}>{c.inProgress ? tr('Continue') : c.attempts ? tr('Play again') : tr('Start')}</button>
                      <Link className="nbtn-line" to="/student/prepare">{tr('Prepare first')}</Link>
                      {c.best && <span className="text-sm text-lamp">{tr('Best: {0} of {1}', { 0: c.best.score, 1: c.best.maxScore })}, {OUTCOME[c.best.outcome]?.toLowerCase()}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
            {!d.campaigns.length && <div className="npanel p-8 text-center text-fog">{tr('No campaign is open for your group right now. Your teacher can assign one.')}</div>}
          </div>
        </>
      )}
    </State>
  );
}

export function Prepare() {
  const q = useHome();
  const nav = useNavigate();
  const past = useQuery({ queryKey: ['guides'], queryFn: () => get<any[]>('/ai-preparation/mine') });
  const [subjectId, setSubject] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const make = useMutation({ mutationFn: () => post<any>('/ai-preparation', { subjectId, topics, difficulty }), onSuccess: (g) => nav(`/student/prepare/${g.id}`) });
  const chip = (on: boolean) => clsx('border px-3 py-1.5 font-dot', on ? 'border-lamp bg-lamp text-night' : 'border-night-4 text-fog hover:border-lamp');
  return (
    <State q={q}>
      {(d) => {
        const subject = d.subjects.find((s: any) => s.id === subjectId);
        return (
          <>
            <h1 className="font-dot text-3xl">{tr('Prepare')}</h1>
            <p className="mt-1 max-w-[60ch] text-fog">{tr('Choose what to revise. You get short notes, examples and a few practice questions. Practice is not graded.')}</p>
            <section className="npanel mt-6 space-y-5 p-5">
              <div><p className="mb-2 text-fog">{tr('Subject')}</p><div className="flex flex-wrap gap-2">{d.subjects.map((s: any) => <button key={s.id} aria-pressed={s.id === subjectId} className={chip(s.id === subjectId)} onClick={() => { setSubject(s.id); setTopics([]); }}>{tr(s.name)}</button>)}</div></div>
              {subject && <div><p className="mb-2 text-fog">{tr('Topics')}</p><div className="flex flex-wrap gap-2">{subject.topics.map((t: any) => <button key={t.id} aria-pressed={topics.includes(t.name)} className={chip(topics.includes(t.name))} onClick={() => setTopics(topics.includes(t.name) ? topics.filter((x) => x !== t.name) : [...topics, t.name])}>{tr(t.name)}</button>)}</div></div>}
              {subject && <div><p className="mb-2 text-fog">{tr('Difficulty')}</p><div className="flex flex-wrap gap-2">{Object.entries(LEVEL).map(([v, t]) => <button key={v} aria-pressed={difficulty === v} className={chip(difficulty === v)} onClick={() => setDifficulty(v)}>{t}</button>)}</div></div>}
              {make.error && <p className="text-[#f09a86]" role="alert">{errorText(make.error)}</p>}
              <button className="nbtn" disabled={!topics.length || make.isPending} onClick={() => make.mutate()}>{make.isPending ? tr('Preparing your notes...') : tr('Make my study guide')}</button>
            </section>
            {Boolean(past.data?.length) && <section className="mt-8"><h2 className="mb-2 font-dot text-xl">{tr('Earlier guides')}</h2><ul className="divide-y divide-night-4 border-y border-night-4">{past.data!.map((g) => <li key={g.id}><Link className="flex flex-wrap justify-between gap-2 py-2.5 hover:text-lamp" to={`/student/prepare/${g.id}`}><span>{tr(g.subject.name)}: {g.topics.map((x: string) => tr(x)).join(', ')}</span><span className="text-fog">{when(g.createdAt)}</span></Link></li>)}</ul></section>}
          </>
        );
      }}
    </State>
  );
}

export function Guide() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['guide', id], queryFn: () => get<any>(`/ai-preparation/${id}`) });
  return (
    <State q={q}>
      {(g) => (
        <article>
          <h1 className="font-dot text-3xl">{tr(g.subject.name)}: {g.topics.map((x: string) => tr(x)).join(', ')}</h1>
          <p className="mt-1 max-w-[64ch] text-fog">{tr(g.summary)}</p>
          {g.provider !== 'local' && <p className="mt-2 text-sm text-fog">{tr('These notes were written with the help of AI. If something looks wrong, ask your teacher.')}</p>}
          <div className="mt-6 space-y-4">{g.explanations.map((e: any, i: number) => <section key={i} className="border border-[#b9ad8c] bg-bone p-5 text-[#2a2420]"><h2 className="font-jac text-2xl text-[#6f2430]">{e.topic}</h2><p className="mt-1 max-w-[68ch] whitespace-pre-line">{e.text}</p></section>)}</div>
          {g.examples.length > 0 && <section className="mt-8"><h2 className="mb-2 font-dot text-xl">{tr('Examples')}</h2><ul className="list-disc space-y-1 pl-5 text-fog">{g.examples.map((e: any, i: number) => <li key={i}>{e.text}</li>)}</ul></section>}
          {g.practice.length > 0 && <section className="mt-8"><h2 className="mb-3 font-dot text-xl">{tr('Practice')}</h2><ol className="space-y-4">{g.practice.map((p: any, i: number) => <Practice key={p.id} guideId={g.id} p={p} n={i + 1} />)}</ol></section>}
          <div className="mt-8"><Link className="nbtn" to={`/student?guide=${g.id}`}>{tr('I am ready')}</Link></div>
        </article>
      )}
    </State>
  );
}

function Practice({ guideId, p, n }: { guideId: string; p: any; n: number }) {
  const [value, setValue] = useState<any>(p.type === 'ORDERING' ? p.options.items.map((i: any) => i.id) : p.type === 'PUZZLE' ? p.options.dials.map((d: string[]) => d[0]) : undefined);
  const send = useMutation({ mutationFn: () => post<any>(`/ai-preparation/${guideId}/practice`, { questionId: p.id, answer: value ?? null }) });
  return (
    <li className="npanel p-5">
      <p className="mb-3 text-lg">{n}. {p.prompt}</p>
      <AnswerControl dark type={p.type} options={p.options} value={value} onChange={(v) => { setValue(v); send.reset(); }} />
      <div className="mt-3 flex flex-wrap items-center gap-3"><button className="nbtn-line" disabled={value === undefined || send.isPending} onClick={() => send.mutate()}>{tr('Check')}</button>{send.data && <span role="status" className={send.data.correct ? 'text-[#a9d0a2]' : 'text-[#f09a86]'}>{send.data.correct ? tr('Correct.') : tr('Not yet.')} {send.data.explanation}</span>}{send.error && <span className="text-[#f09a86]">{errorText(send.error)}</span>}</div>
      {p.hint && !send.data?.correct && <details className="mt-2 text-fog"><summary className="cursor-pointer">{tr('Show a hint')}</summary>{p.hint}</details>}
    </li>
  );
}

export function MyResults() {
  const q = useQuery({ queryKey: ['my-results'], queryFn: () => get<any[]>('/game-results/mine') });
  return (
    <State q={q}>
      {(d) => (
        <>
          <h1 className="font-dot text-3xl">{tr('Results')}</h1>
          {d.length ? (
            <ul className="mt-5 divide-y divide-night-4 border-y border-night-4">
              {d.map((r: any) => <li key={r.id}><Link to={`/student/results/${r.id}`} className="grid gap-x-6 gap-y-1 py-3.5 hover:bg-night-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:px-3"><span><b className="font-dot text-lg font-normal">{r.campaign?.title ?? tr('Removed campaign')}</b><span className="block text-sm text-fog">{when(r.endedAt)}, {mins(r.durationSeconds)}</span></span><span className="text-fog">{OUTCOME[r.outcome] ?? r.outcome}</span><span>{tr('{0}% correct', { 0: Math.round(r.accuracy) })}</span><span className="font-dot text-xl text-lamp">{r.score}/{r.maxScore}</span></Link></li>)}
            </ul>
          ) : <p className="npanel mt-5 p-8 text-center text-fog">{tr('Nothing here yet. Your first finished night will appear on this page.')}</p>}
        </>
      )}
    </State>
  );
}

export function MyReview() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['review', id], queryFn: () => get<any>(`/game-results/${id}/review`) });
  return (
    <State q={q}>
      {(r) => (
        <>
          <Link to="/student/results" className="text-fog hover:text-bone">{tr('All results')}</Link>
          <h1 className="mt-1 font-dot text-3xl">{r.campaign?.title}</h1>
          <p className="mb-6 mt-1 text-fog">{OUTCOME[r.outcome]}. {tr('{0} of {1} points, {2}% correct', { 0: r.score, 1: r.maxScore, 2: Math.round(r.accuracy) })}, {mins(r.durationSeconds)}.</p>
          <Review dark answers={r.answers} />
        </>
      )}
    </State>
  );
}

export function MyProgress() {
  const q = useQuery({ queryKey: ['my-progress'], queryFn: () => get<any>('/student/progress') });
  return (
    <State q={q}>
      {(d) => (
        <>
          <h1 className="font-dot text-3xl">{tr('Progress')}</h1>
          <p className="mt-1 text-fog">{tr('Finished: {0} of {1}.', { 0: d.completed, 1: d.sessions })} {d.averageAccuracy !== null ? tr('Correct on average: {0}%.', { 0: d.averageAccuracy }) : ''} {tr('Time in the school: {0}.', { 0: mins(d.timeSeconds) })}</p>
          <div className="mt-7 grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-3 font-dot text-xl">{tr('By topic')}</h2>
              {d.topics.length ? <ul className="space-y-3">{d.topics.map((t: any) => <li key={t.topic}><div className="flex justify-between"><span>{tr(t.topic)} <span className="text-fog">{tr(t.subject)}</span></span><span>{t.correct} / {t.answered}</span></div><div className="mt-1 h-2 bg-night-3"><div className={t.accuracy < 70 ? 'h-full bg-[#b23a3f]' : 'h-full bg-[#4c7763]'} style={{ width: `${t.accuracy}%` }} /></div></li>)}</ul> : <p className="text-fog">{tr('Topics appear after your first answers.')}</p>}
            </section>
            <section>
              <h2 className="mb-3 font-dot text-xl">{tr('Over time')}</h2>
              {d.timeline.length ? <div className="flex h-40 items-end gap-1 border-b border-night-4" role="img" aria-label={tr('Accuracy of each session')}>{d.timeline.slice(-24).map((t: any) => <div key={t.id} title={`${day(t.date)}: ${Math.round(t.accuracy)}%`} className="flex-1 bg-lamp" style={{ height: `${Math.max(3, t.accuracy)}%`, maxWidth: 36 }} />)}</div> : <p className="text-fog">{tr('Each session adds a column here.')}</p>}
              {d.weakTopics.length > 0 && <div className="mt-6"><h2 className="mb-1 font-dot text-xl">{tr('Worth revising')}</h2><p className="text-fog">{d.weakTopics.map((t: any) => tr(t.topic)).join(', ')}</p><Link to="/student/prepare" className="nbtn-line mt-3">{tr('Prepare')}</Link></div>}
            </section>
          </div>
        </>
      )}
    </State>
  );
}

export function MySettings() {
  const me = useAuth((s) => s.me)!;
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const save = useMutation({ mutationFn: () => post<any>('/auth/change-password', f), onSuccess: async (r) => { setF({ currentPassword: '', newPassword: '' }); await startSession(r.accessToken); } });
  return (
    <>
      <h1 className="font-dot text-3xl">{tr('Settings')}</h1>
      <p className="mt-1 text-fog">{me.firstName} {me.lastName}{me.email ? `, ${me.email}` : ''}</p>
      <section className="npanel mt-6 p-5"><h2 className="mb-1 font-dot text-xl">{tr('Language')}</h2><p className="mb-4 text-fog">{tr('The panel, the game and the official questions change together.')}</p><LanguagePicker dark /></section>
      {me.email ? (
        <form className="npanel mt-5 max-w-md space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <h2 className="font-dot text-xl">{tr('Password')}</h2>
          <input className="nfield" type="password" aria-label={tr('Current password')} placeholder={tr('Current password')} autoComplete="current-password" required value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
          <input className="nfield" type="password" aria-label={tr('New password')} placeholder={tr('New password')} autoComplete="new-password" required minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
          {save.error && <p className="text-[#f09a86]" role="alert">{errorText(save.error)}</p>}
          {save.isSuccess && <p className="text-[#a9d0a2]" role="status">{tr('Password changed')}</p>}
          <button className="nbtn-line" disabled={save.isPending}>{tr('Change password')}</button>
        </form>
      ) : (
        <section className="npanel mt-5 max-w-md p-5"><h2 className="mb-1 font-dot text-xl">{tr('Add an e-mail')}</h2><p className="mb-4 text-fog">{tr('You play with a code. Register with the same personal code to also sign in with an e-mail. Your results stay.')}</p><Link className="nbtn-line" to="/register" onClick={() => signOut()}>{tr('Create account')}</Link></section>
      )}
    </>
  );
}
