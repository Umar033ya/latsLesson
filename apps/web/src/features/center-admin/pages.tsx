import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, GraduationCap, KeyRound, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi, invitationApi, membershipApi, orgApi, questionApi, subjectApi } from '../../services/endpoints';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner, StatCard } from '../../components/ui';
import { InvitationsPage } from '../super-admin/pages';
import { useAuthStore } from '../../store/auth.store';

const useOrgId = () => useAuthStore((s) => s.user?.organizations?.find((o) => o.relation === 'ADMIN')?.id ?? s.user?.organizations?.[0]?.id ?? '');

export function CenterDashboard() {
  const orgId = useOrgId();
  const { data: org } = useQuery({ queryKey: ['org', orgId], queryFn: () => orgApi.get(orgId), enabled: !!orgId });
  const { data: stats, isLoading, isError, refetch } = useQuery({ queryKey: ['org-stats', orgId], queryFn: () => analyticsApi.organization(orgId), enabled: !!orgId });
  const { data: students } = useQuery({ queryKey: ['students', orgId], queryFn: () => membershipApi.students(orgId), enabled: !!orgId });
  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message="Could not load organization data" onRetry={() => refetch()} />;
  return (
    <>
      <PageHeader title={`${org?.name ?? 'Organization'} overview`} subtitle="Your students, codes and learning results." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={students?.length ?? 0} icon={<Users />} />
        <StatCard label="Completed games" value={stats?.completedSessions ?? 0} icon={<Activity />} tone="blue" />
        <StatCard label="Average accuracy" value={`${stats?.averageAccuracy ?? 0}%`} icon={<GraduationCap />} tone="green" />
        <StatCard label="Invitations" value={org?.stats?.activeCodes ?? 0} icon={<KeyRound />} tone="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-semibold text-white">Subject performance</h2>{stats?.subjectPerformance?.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={stats.subjectPerformance}><XAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #334155' }} /><Bar dataKey="averageAccuracy" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No results yet" description="Results appear after students finish a game." />}</Card>
        <Card><h2 className="mb-4 font-semibold text-white">Topics needing improvement</h2>{stats?.improvementTopics?.length ? <div className="space-y-2">{stats.improvementTopics.map((t: any) => <div key={t.topic} className="flex justify-between rounded bg-white/5 px-3 py-2 text-sm"><span className="text-slate-300">{t.topic}</span><Badge tone="amber">{t.count} misses</Badge></div>)}</div> : <EmptyState title="No weak topics identified" />}</Card>
      </div>
    </>
  );
}

export function StudentsPage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['students', orgId], queryFn: () => membershipApi.students(orgId), enabled: !!orgId });
  const [email, setEmail] = useState('');
  const add = useMutation({ mutationFn: () => membershipApi.addStudent(orgId, email), onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setEmail(''); toast.success('Student added'); }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed') });
  const remove = useMutation({ mutationFn: (id: string) => membershipApi.removeStudent(orgId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
  return (
    <>
      <PageHeader title="Students" subtitle="Manage gamers registered to your organization." />
      <Card className="mb-5"><form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}><Input className="max-w-sm" placeholder="Student email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><Button>Add student</Button></form></Card>
      <Card className="p-0">{isLoading ? <Spinner /> : !data?.length ? <EmptyState title="No students yet" description="Share an invitation code to enroll students." /> : <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>{data.map((s: any) => <tr key={s.id}><td className="text-white">{s.firstName} {s.lastName}</td><td>{s.email}</td><td>{new Date(s.joinedAt).toLocaleDateString()}</td><td><Badge tone={s.status === 'ACTIVE' ? 'green' : 'red'}>{s.status}</Badge></td><td><Button variant="ghost" className="px-2 py-1" onClick={() => remove.mutate(s.id)}>Remove</Button></td></tr>)}</tbody></table></div>}</Card>
    </>
  );
}

export function CenterInvitationsPage() {
  const orgId = useOrgId();
  return <InvitationsPage organizationId={orgId} />;
}

export function CenterSubjectsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['subjects'], queryFn: subjectApi.list });
  return (
    <>
      <PageHeader title="Subjects & topics" subtitle="Available learning content for your students." />
      {isLoading ? <Spinner /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.map((s: any) => <Card key={s.id}><div className="flex items-center justify-between"><h2 className="font-bold text-white" style={{ color: s.color ?? undefined }}>{s.name}</h2><Badge>{s.questionCount} questions</Badge></div><p className="mt-2 text-sm text-slate-400">{s.description}</p><div className="mt-4 flex flex-wrap gap-2">{s.topics.map((t: any) => <span key={t.id} className="badge bg-white/5 text-slate-300">{t.name}</span>)}</div></Card>)}</div>}
    </>
  );
}

export function CenterQuestionsPage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectApi.list });
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [difficulty, setDifficulty] = useState('EASY');
  const { data, isLoading } = useQuery({ queryKey: ['questions', orgId], queryFn: () => questionApi.list({ organizationId: orgId }) });
  const create = useMutation({
    mutationFn: () => questionApi.create({ subjectId, topicId: topicId || null, organizationId: orgId, type: 'MULTIPLE_CHOICE', difficulty, prompt, options: [{ id: 'a', text: correct }, { id: 'b', text: wrong }], correctAnswer: 'a', points: 10 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['questions'] }); setPrompt(''); setCorrect(''); setWrong(''); toast.success('Question added'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  const toggle = useMutation({ mutationFn: ({ id, active }: any) => questionApi.setActive(id, active), onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }) });
  return (
    <>
      <PageHeader title="Question collections" subtitle="Questions you add belong only to your organization." />
      <Card className="mb-5"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Select label="Subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}><option value="">Choose…</option>{subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select label="Topic (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">General</option>{subjects?.find((s: any) => s.id === subjectId)?.topics.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>EASY</option><option>MEDIUM</option><option>HARD</option></Select>
        <div className="md:col-span-3"><Input label="Question prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
        <Input label="Correct answer" value={correct} onChange={(e) => setCorrect(e.target.value)} />
        <Input label="Incorrect answer" value={wrong} onChange={(e) => setWrong(e.target.value)} />
        <div className="flex items-end"><Button className="w-full" disabled={!subjectId || !prompt || !correct || !wrong} onClick={() => create.mutate()}>Add question</Button></div>
      </div></Card>
      <Card className="p-0">{isLoading ? <Spinner /> : !data?.length ? <EmptyState title="No custom questions" description="Global questions are always available to your students." /> : <div className="table-wrap"><table className="table"><thead><tr><th>Prompt</th><th>Type</th><th>Difficulty</th><th>Status</th><th></th></tr></thead><tbody>{data.map((q: any) => <tr key={q.id}><td className="text-white">{q.prompt}</td><td>{q.type}</td><td>{q.difficulty}</td><td><Badge tone={q.isActive ? 'green' : 'red'}>{q.isActive ? 'Active' : 'Inactive'}</Badge></td><td><Button variant="ghost" className="px-2 py-1" onClick={() => toggle.mutate({ id: q.id, active: !q.isActive })}>{q.isActive ? 'Disable' : 'Enable'}</Button></td></tr>)}</tbody></table></div>}</Card>
    </>
  );
}

export function CenterAnalyticsPage() {
  const orgId = useOrgId();
  const { data: stats, isLoading } = useQuery({ queryKey: ['org-stats', orgId], queryFn: () => analyticsApi.organization(orgId), enabled: !!orgId });
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard', orgId], queryFn: () => import('../../services/endpoints').then((m) => m.resultsApi.leaderboard(orgId)) });
  if (isLoading) return <Spinner />;
  return (
    <>
      <PageHeader title="Educational analytics" subtitle="Results and leaderboard for your center." />
      <div className="grid gap-4 md:grid-cols-3"><StatCard label="Students" value={stats?.students ?? 0} /><StatCard label="Sessions" value={stats?.completedSessions ?? 0} tone="blue" /><StatCard label="Accuracy" value={`${stats?.averageAccuracy ?? 0}%`} tone="green" /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-semibold">Leaderboard</h2>{!leaderboard?.length ? <EmptyState title="No scores yet" /> : <div className="space-y-2">{leaderboard.map((r: any) => <div key={r.rank} className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-sm"><span className="text-slate-300">#{r.rank} {r.user?.firstName} {r.user?.lastName}</span><span className="font-bold text-white">{r.score} pts · {r.accuracy}%</span></div>)}</div>}</Card>
        <Card><h2 className="mb-4 font-semibold">Weak topics</h2>{!stats?.improvementTopics?.length ? <EmptyState title="Nothing to report" /> : stats.improvementTopics.map((t: any) => <div key={t.topic} className="mb-2 flex justify-between text-sm text-slate-300"><span>{t.topic}</span><span className="text-amber-300">{t.count}</span></div>)}</Card>
      </div>
    </>
  );
}

export function CenterSettingsPage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const { data: org } = useQuery({ queryKey: ['org', orgId], queryFn: () => orgApi.get(orgId), enabled: !!orgId });
  const update = useMutation({ mutationFn: () => orgApi.update(orgId, { name: name || org?.name }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['org'] }); toast.success('Organization updated'); } });
  return <><PageHeader title="Organization settings" subtitle="Basic center information." /><Card className="max-w-xl"><div className="space-y-4"><Input label="Center name" defaultValue={org?.name} onChange={(e) => setName(e.target.value)} /><Button onClick={() => update.mutate()}>Save changes</Button></div></Card></>;
}
