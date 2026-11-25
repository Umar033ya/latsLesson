import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardCheck, Clock, DoorOpen, LogOut, Map as MapIcon, Moon, Play, Settings, Target, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { THEMES } from '@last-lesson/scenario';
import { AnswerControl } from '../../components/QuestionFields';
import { Review } from '../../components/Review';
import { LevelMap } from './LevelMap';
import { chooseCourse, chosenCourse } from '../../lib/course';
import { GoogleLink } from '../../components/GoogleLink';
import { LanguagePicker } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
import { Avatar } from '../../components/ui';
import { get, post, signOut, startSession, useAuth } from '../../lib/api';
import { errorText, plural, tr } from '../../lib/i18n';
import { OUTCOME, day, mins, pct, when } from '../../lib/format';

const useHome = () => useQuery({ queryKey: ['student-home'], queryFn: () => get<any>('/student/home') });

function State({ q, children }: { q: any; children: (d: any) => React.ReactNode }) {
  if (q.isPending) return <p className="py-10 font-dot text-fog" role="status">{tr('Looking for your name in the register...')}</p>;
  if (q.isError) return <div className="npanel p-5"><p className="text-[#f09a86]">{errorText(q.error)}</p><button className="nbtn-line mt-4" onClick={() => q.refetch()}>{tr('Try again')}</button></div>;
  return <>{children(q.data)}</>;
}

const NAV: Array<[string, string, LucideIcon]> = [['/student', tr('Campaigns'), MapIcon], ['/student/prepare', tr('Prepare'), BookOpen], ['/student/results', tr('Results'), ClipboardCheck], ['/student/progress', tr('Progress'), TrendingUp], ['/student/settings', tr('Settings'), Settings]];

export function StudentLayout() {
  const home = useHome();
  const nav = useNavigate();
  const me = useAuth((s) => s.me)!;
  return (
    <div className="night pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-night/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/student" className="flex min-w-0 items-center gap-3">{home.data?.center.logoUrl && <img src={home.data.center.logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />}<span className="min-w-0"><Wordmark className="text-[26px] text-bone sm:text-[30px]" name="lg:hidden xl:inline" /><span className="block truncate text-[13px] text-fog lg:hidden xl:block">{home.data?.center.displayName}</span></span></Link>
          <nav className="hidden gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 lg:flex" aria-label={tr('Student')}>
            {NAV.map(([to, label, Icon]) => <NavLink key={to} end={to === '/student'} to={to} className={({ isActive }) => clsx('flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition', isActive ? 'bg-lamp text-night' : 'text-fog hover:text-bone')}><Icon size={16} aria-hidden="true" />{label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2.5"><span className="hidden min-w-0 text-right xl:block"><b className="block max-w-44 truncate text-sm text-bone">{me.firstName} {me.lastName}</b><span className="block max-w-44 truncate text-xs text-fog">{home.data?.center.displayName}</span></span><Avatar name={`${me.firstName} ${me.lastName}`} /><button className="rounded-xl p-2 text-fog hover:bg-white/10 hover:text-bone" aria-label={tr('Sign out')} title={tr('Sign out')} onClick={async () => { await signOut(); nav('/'); }}><LogOut size={18} /></button></div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-night-2/95 backdrop-blur lg:hidden" aria-label={tr('Student')}>
        {NAV.map(([to, label, Icon]) => <NavLink key={to} end={to === '/student'} to={to} className={({ isActive }) => clsx('flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold', isActive ? 'text-lamp' : 'text-fog')}><Icon size={20} aria-hidden="true" /><span className="max-w-full truncate">{label}</span></NavLink>)}
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Suspense fallback={<p className="text-fog">{tr('Opening...')}</p>}><Outlet /></Suspense></main>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) => (
  <div className="npanel flex items-center gap-4 p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lamp/15 text-lamp"><Icon size={20} aria-hidden="true" /></span><div className="min-w-0"><p className="text-[13px] text-fog">{label}</p><p className="text-2xl font-bold tabular-nums leading-tight text-bone">{value}</p></div></div>
);

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
          <section className="relative overflow-hidden rounded-3xl border border-white/10">
            <div className="absolute inset-0 bg-cover bg-[70%_65%] [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/10" aria-hidden="true" />
            <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 sm:p-9">
              <div><p className="mb-1 font-semibold text-lamp">{`${d.student.firstName} ${d.student.lastName}`.trim()}, {d.center.displayName}</p><h1 className="ntitle !text-[34px]">{tr('Good evening, {0}.', { 0: d.student.firstName })}</h1><p className="mt-1.5 max-w-[46ch] text-fog">{d.student.group ? `${d.student.group}. ` : ''}{tr('Your name is in the register. Choose where to start.')}</p></div>
              <Link className="nbtn" to="/join"><DoorOpen size={18} />{tr('Join a room')}</Link>
            </div>
          </section>
          <div className="mt-5 grid gap-4 sm:grid-cols-3"><Stat icon={Moon} label={tr('Finished nights')} value={d.summary.finished} /><Stat icon={Target} label={tr('Correct answers')} value={d.summary.averageAccuracy === null ? '0%' : `${d.summary.averageAccuracy}%`} /><Stat icon={Users} label={tr('Group')} value={d.student.group ?? tr('No group')} /></div>
          {d.maintenance && <p className="npanel mt-4 border-l-4 !border-l-lamp p-4">{d.maintenance}</p>}
          {d.announcement && <p className="npanel mt-4 border-l-4 !border-l-lamp p-4">{d.announcement}</p>}
          {preparationId && <p className="npanel mt-4 border-l-4 !border-l-[#5a86f0] p-4">{tr('You are prepared. The questions inside will not repeat your practice.')}</p>}
          {launch.error && <p className="mt-4 text-[#f09a86]" role="alert">{errorText(launch.error)}</p>}
          <LevelMap paths={d.paths} busy={launch.isPending || Boolean(d.maintenance)} onPlay={(l) => launch.mutate({ campaignId: l.campaignId, preparationId })} />
          <h2 className="mb-4 mt-9 text-xl font-bold">{tr('Campaigns')}</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {d.campaigns.map((c: any, i: number) => {
              const theme = THEMES.find((t) => t.id === c.theme) ?? THEMES[0];
              return (
                <article key={c.id} className="npanel flex flex-col overflow-hidden transition hover:border-lamp/40">
                  <div className="relative h-40" aria-hidden="true">
                    <div className="absolute inset-0 bg-cover bg-center [image-rendering:pixelated]" style={{ backgroundImage: `url(/art/${c.best?.outcome === 'DISMISSED' ? 'dawn' : 'title'}.png)`, filter: `hue-rotate(${(i % 4) * 38}deg)` }} />
                    <div className="absolute inset-0 mix-blend-color" style={{ background: theme.accent, opacity: theme.id === 'MIDNIGHT' ? 0 : 0.4 }} />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="text-[22px] font-bold leading-tight text-bone">{c.title}</h3>
                    {c.description && <p className="mt-2 text-fog">{c.description}</p>}
                    <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">{[...c.subjects.map((x: any) => tr(x.name)), LEVEL[c.difficulty], plural(c.questionCount, 'question|questions'), tr('up to {0} minutes', { 0: c.gameplay.sessionMinutes }), ...(c.gameplay.mode === 'STUDY' ? [tr('Study mode.')] : []), ...(c.availableTo ? [tr('Open until {0}.', { 0: day(c.availableTo) })] : [])].map((t: string) => <li key={t} className="rounded-full bg-white/5 px-3 py-1 text-fog ring-1 ring-inset ring-white/10">{t}</li>)}</ul>
                    {c.objectives.length > 0 && <ul className="mt-4 space-y-1.5 text-[15px] text-fog">{c.objectives.map((o: string) => <li key={o} className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-lamp" aria-hidden="true" />{o}</li>)}</ul>}
                    <div className="flex-1" />
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button className="nbtn" disabled={launch.isPending || Boolean(d.maintenance)} onClick={() => launch.mutate({ campaignId: c.id, preparationId })}><Play size={17} />{c.inProgress ? tr('Continue') : c.attempts ? tr('Play again') : tr('Start')}</button>
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
  const chip = (on: boolean) => clsx('rounded-xl border px-4 py-2 font-semibold transition', on ? 'border-lamp bg-lamp text-night' : 'border-white/15 bg-white/5 text-fog hover:border-lamp/60 hover:text-bone');
  return (
    <State q={q}>
      {(d) => {
        const subject = d.subjects.find((s: any) => s.id === subjectId);
        return (
          <>
            <h1 className="ntitle">{tr('Prepare')}</h1>
            <p className="mt-1 max-w-[60ch] text-fog">{tr('Choose what to revise. You get short notes, examples and a few practice questions. Practice is not graded.')}</p>
            <section className="npanel mt-6 space-y-6 p-6">
              <div><p className="mb-2 text-fog">{tr('Subject')}</p><div className="flex flex-wrap gap-2">{d.subjects.map((s: any) => <button key={s.id} aria-pressed={s.id === subjectId} className={chip(s.id === subjectId)} onClick={() => { setSubject(s.id); setTopics([]); }}>{tr(s.name)}</button>)}</div></div>
              {subject && <div><p className="mb-2 text-fog">{tr('Topics')}</p><div className="flex flex-wrap gap-2">{subject.topics.map((t: any) => <button key={t.id} aria-pressed={topics.includes(t.name)} className={chip(topics.includes(t.name))} onClick={() => setTopics(topics.includes(t.name) ? topics.filter((x) => x !== t.name) : [...topics, t.name])}>{tr(t.name)}</button>)}</div></div>}
              {subject && <div><p className="mb-2 text-fog">{tr('Difficulty')}</p><div className="flex flex-wrap gap-2">{Object.entries(LEVEL).map(([v, t]) => <button key={v} aria-pressed={difficulty === v} className={chip(difficulty === v)} onClick={() => setDifficulty(v)}>{t}</button>)}</div></div>}
              {make.error && <p className="text-[#f09a86]" role="alert">{errorText(make.error)}</p>}
              <button className="nbtn" disabled={!topics.length || make.isPending} onClick={() => make.mutate()}>{make.isPending ? tr('Preparing your notes...') : tr('Make my study guide')}</button>
            </section>
            {Boolean(past.data?.length) && <section className="mt-8"><h2 className="mb-2 text-lg font-bold">{tr('Earlier guides')}</h2><ul className="divide-y divide-night-4 border-y border-night-4">{past.data!.map((g) => <li key={g.id}><Link className="flex flex-wrap justify-between gap-2 py-2.5 hover:text-lamp" to={`/student/prepare/${g.id}`}><span>{tr(g.subject.name)}: {g.topics.map((x: string) => tr(x)).join(', ')}</span><span className="text-fog">{when(g.createdAt)}</span></Link></li>)}</ul></section>}
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
          <h1 className="ntitle">{tr(g.subject.name)}: {g.topics.map((x: string) => tr(x)).join(', ')}</h1>
          <p className="mt-1 max-w-[64ch] text-fog">{tr(g.summary)}</p>
          {g.provider !== 'local' && <p className="mt-2 text-sm text-fog">{tr('These notes were written with the help of AI. If something looks wrong, ask your teacher.')}</p>}
          <div className="mt-6 space-y-4">{g.explanations.map((e: any, i: number) => <section key={i} className="rounded-2xl bg-bone p-6 text-[#2a2420]"><h2 className="text-xl font-bold text-[#6f2430]">{e.topic}</h2><p className="mt-1 max-w-[68ch] whitespace-pre-line">{e.text}</p></section>)}</div>
          {g.examples.length > 0 && <section className="mt-8"><h2 className="mb-2 text-lg font-bold">{tr('Examples')}</h2><ul className="list-disc space-y-1 pl-5 text-fog">{g.examples.map((e: any, i: number) => <li key={i}>{e.text}</li>)}</ul></section>}
          {g.practice.length > 0 && <section className="mt-8"><h2 className="mb-3 text-lg font-bold">{tr('Practice')}</h2><ol className="space-y-4">{g.practice.map((p: any, i: number) => <Practice key={p.id} guideId={g.id} p={p} n={i + 1} />)}</ol></section>}
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
      <div className="mt-3 flex flex-wrap items-center gap-3"><button className="nbtn-line" disabled={value === undefined || send.isPending} onClick={() => send.mutate()}>{tr('Check')}</button>{send.data && <span role="status" className={send.data.correct ? 'text-[#a9c4ff]' : 'text-[#f09a86]'}>{send.data.correct ? tr('Correct.') : tr('Not yet.')} {send.data.explanation}</span>}{send.error && <span className="text-[#f09a86]">{errorText(send.error)}</span>}</div>
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
          <h1 className="ntitle">{tr('Results')}</h1>
          {d.length ? (
            <ul className="mt-6 grid gap-3">
              {d.map((r: any) => <li key={r.id}><Link to={`/student/results/${r.id}`} className="npanel grid gap-x-8 gap-y-1 p-4 transition hover:border-lamp/40 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:px-5"><span><b className="text-[17px]">{r.campaign?.title ?? tr('Removed campaign')}</b><span className="block text-sm text-fog">{when(r.endedAt)}, {mins(r.durationSeconds)}</span></span><span className="text-fog">{OUTCOME[r.outcome] ?? r.outcome}</span><span>{tr('{0}% correct', { 0: Math.round(r.accuracy) })}</span><span className="text-xl font-bold tabular-nums text-lamp">{r.score}<span className="text-sm text-fog">/{r.maxScore}</span></span></Link></li>)}
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
          <h1 className="ntitle mt-1">{r.campaign?.title}</h1>
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
          <h1 className="ntitle">{tr('Progress')}</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-3"><Stat icon={Moon} label={tr('Finished nights')} value={<>{d.completed}<span className="text-base text-fog"> / {d.sessions}</span></>} /><Stat icon={Target} label={tr('Correct answers')} value={pct(d.averageAccuracy)} /><Stat icon={Clock} label={tr('Time in the school')} value={mins(d.timeSeconds)} /></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
            <section className="npanel p-6">
              <h2 className="mb-5 text-lg font-bold">{tr('By topic')}</h2>
              {d.topics.length ? <ul className="space-y-4">{d.topics.map((t: any) => <li key={t.topic}><div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{tr(t.topic)} <span className="text-[13px] font-normal text-fog">{tr(t.subject)}</span></span><span className="whitespace-nowrap tabular-nums"><b className={t.accuracy < 70 ? 'text-[#f09a86]' : 'text-bone'}>{t.accuracy}%</b> <span className="text-[13px] text-fog">{t.correct} / {t.answered}</span></span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className={clsx('h-full rounded-full', t.accuracy < 70 ? 'bg-[#d9695c]' : 'bg-[#5a86f0]')} style={{ width: `${Math.max(2, t.accuracy)}%` }} /></div></li>)}</ul> : <p className="text-fog">{tr('Topics appear after your first answers.')}</p>}
            </section>
            <div className="space-y-5">
              <section className="npanel p-6">
                <h2 className="mb-5 text-lg font-bold">{tr('Accuracy of each session')}</h2>
                {d.timeline.length ? <div className="grid grid-cols-[34px_1fr] gap-2"><div className="flex h-40 flex-col justify-between text-right text-xs text-fog" aria-hidden="true"><span>100%</span><span>50%</span><span>0</span></div><div className="relative flex h-40 items-end gap-1.5 border-b border-white/15 before:absolute before:inset-x-0 before:top-1/2 before:border-t before:border-dashed before:border-white/10" role="img" aria-label={tr('Accuracy of each session')}>{d.timeline.slice(-16).map((t: any) => <div key={t.id} title={`${day(t.date)}: ${Math.round(t.accuracy)}%`} className="relative max-w-9 flex-1 rounded-t-md bg-lamp transition hover:bg-[#f3c069]" style={{ height: `${Math.max(3, t.accuracy)}%` }} />)}</div></div> : <p className="text-fog">{tr('Each session adds a column here.')}</p>}
              </section>
              <section className="npanel p-6">
                <h2 className="mb-2 text-lg font-bold">{tr('Worth revising')}</h2>
                {d.weakTopics.length > 0 ? <p className="text-fog">{d.weakTopics.map((t: any) => tr(t.topic)).join(', ')}</p> : <p className="text-fog">{tr('No weak topics right now.')}</p>}
                <Link to="/student/prepare" className="nbtn-line mt-4"><BookOpen size={17} />{tr('Prepare')}</Link>
              </section>
            </div>
          </div>
        </>
      )}
    </State>
  );
}

/** Changes the subject whose levels open first on the home page. */
function CourseChoice() {
  const home = useHome();
  const [course, setCourse] = useState(chosenCourse());
  const paths: Array<{ subject: { id: string; name: string } }> = home.data?.paths ?? [];
  if (!paths.length) return null;
  const now = paths.some((p) => p.subject.id === course) ? course : paths[0].subject.id;
  return (
    <section className="npanel p-6">
      <h2 className="mb-1 text-lg font-bold">{tr('My course')}</h2>
      <p className="mb-4 text-fog">{tr('Choose the subject you are learning now.')}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('My course')}>
        {paths.map(({ subject }) => <button key={subject.id} role="radio" aria-checked={subject.id === now} onClick={() => { chooseCourse(subject.id); setCourse(subject.id); }} className={clsx('rounded-xl border px-4 py-2 font-semibold transition', subject.id === now ? 'border-lamp bg-lamp text-night' : 'border-white/15 bg-white/5 text-fog hover:border-lamp/60 hover:text-bone')}>{tr(subject.name)}</button>)}
      </div>
    </section>
  );
}

export function MySettings() {
  const me = useAuth((s) => s.me)!;
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const save = useMutation({ mutationFn: () => post<any>('/auth/change-password', f), onSuccess: async (r) => { setF({ currentPassword: '', newPassword: '' }); await startSession(r.accessToken); } });
  return (
    <>
      <h1 className="ntitle">{tr('Settings')}</h1>
      <p className="mt-1 text-fog">{me.firstName} {me.lastName}{me.email ? `, ${me.email}` : ''}</p>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <CourseChoice />
      <section className="npanel p-6"><h2 className="mb-1 text-lg font-bold">{tr('Language')}</h2><p className="mb-4 text-fog">{tr('The panel, the game and the official questions change together.')}</p><LanguagePicker dark /></section>
      {me.email && <div className="text-ink empty:hidden"><GoogleLink /></div>}
      {me.email ? (
        <form className="npanel space-y-3 p-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <h2 className="text-lg font-bold">{tr('Password')}</h2>
          <input className="nfield" type="password" aria-label={tr('Current password')} placeholder={tr('Current password')} autoComplete="current-password" required value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
          <input className="nfield" type="password" aria-label={tr('New password')} placeholder={tr('New password')} autoComplete="new-password" required minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
          {save.error && <p className="text-[#f09a86]" role="alert">{errorText(save.error)}</p>}
          {save.isSuccess && <p className="text-[#a9c4ff]" role="status">{tr('Password changed')}</p>}
          <button className="nbtn-line" disabled={save.isPending}>{tr('Change password')}</button>
        </form>
      ) : null}
      </div>
    </>
  );
}
