import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Activity, Building2, Copy, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyticsApi, auditApi, invitationApi, orgApi, usersApi } from '../../services/endpoints';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Spinner, StatCard } from '../../components/ui';

const useStats = () => useQuery({ queryKey: ['platform-stats'], queryFn: analyticsApi.platform });

export function SuperDashboard() {
  const { data, isLoading, isError, refetch } = useStats();
  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: orgApi.list });
  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message="Could not load platform statistics" onRetry={() => refetch()} />;
  const roleCount = (role: string) => data.usersByRole.find((r: any) => r.role === role)?.count ?? 0;
  return (
    <>
      <PageHeader title="Platform overview" subtitle="Everything happening across LAST LESSON." action={<Link to="/super-admin/organizations/create"><Button>+ New organization</Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizations" value={data.organizationsByStatus.reduce((a: number, s: any) => a + s.count, 0)} icon={<Building2 />} />
        <StatCard label="Center admins" value={roleCount('CENTER_ADMIN')} icon={<ShieldCheck />} tone="blue" />
        <StatCard label="Students" value={roleCount('GAMER')} icon={<Users />} tone="green" />
        <StatCard label="Game sessions" value={data.totalSessions} icon={<Activity />} tone="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-white">Users by role</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.usersByRole}><XAxis dataKey="role" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #334155' }} /><Bar dataKey="count" radius={[6, 6, 0, 0]}>{data.usersByRole.map((_: any, i: number) => <Cell key={i} fill={['#ef4444', '#0ea5e9', '#22c55e'][i % 3]} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-white">Organizations</h2>
          <div className="space-y-3">
            {orgs?.length ? orgs.slice(0, 6).map((o: any) => (
              <Link key={o.id} to={`/super-admin/organizations`} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 hover:border-blood/40">
                <span className="text-sm text-slate-200">{o.name}</span>
                <span className="flex items-center gap-2"><Badge tone={o.status === 'ACTIVE' ? 'green' : 'red'}>{o.status}</Badge><span className="text-xs text-slate-500">{o.studentCount} students</span></span>
              </Link>
            )) : <EmptyState title="No organizations yet" description="Create your first educational center." />}
          </div>
          <p className="mt-4 text-sm text-slate-500">Average accuracy: <span className="font-bold text-white">{data.averageAccuracy}%</span></p>
        </Card>
      </div>
    </>
  );
}

export function OrganizationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['orgs'], queryFn: orgApi.list });
  const [selected, setSelected] = useState<any>(null);
  const status = useMutation({ mutationFn: ({ id, s }: any) => orgApi.status(id, s), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgs'] }); toast.success('Status updated'); } });
  const { data: details } = useQuery({ queryKey: ['org', selected?.id], queryFn: () => orgApi.get(selected.id), enabled: !!selected });
  return (
    <>
      <PageHeader title="Organizations" subtitle="All educational centers on the platform." action={<Link to="/super-admin/organizations/create"><Button>+ Create center</Button></Link>} />
      <Card className="p-0">
        {isLoading ? <Spinner /> : !data?.length ? <EmptyState title="No organizations" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Slug</th><th>Students</th><th>Admins</th><th>Codes</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.map((o: any) => <tr key={o.id}><td className="font-medium text-white">{o.name}</td><td className="font-mono text-xs">{o.slug}</td><td>{o.studentCount}</td><td>{o.adminCount}</td><td>{o.invitationCount}</td><td><Badge tone={o.status === 'ACTIVE' ? 'green' : 'red'}>{o.status}</Badge></td>
              <td className="flex gap-2"><Button variant="ghost" className="px-2 py-1" onClick={() => setSelected(o)}>Details</Button><Button variant="ghost" className="px-2 py-1" onClick={() => status.mutate({ id: o.id, s: o.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{o.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</Button></td></tr>)}</tbody>
          </table></div>
        )}
      </Card>
      <Modal open={!!selected} title={selected?.name ?? ''} onClose={() => setSelected(null)}>
        {details?.stats && <div className="grid grid-cols-2 gap-3">{Object.entries(details.stats).map(([k, v]) => <Card key={k} className="p-3"><p className="text-xs text-slate-500">{k}</p><p className="text-lg font-bold text-white">{String(v)}</p></Card>)}</div>}
        <div className="space-y-2">{details?.admins?.map((a: any) => <p key={a.user.id} className="text-sm text-slate-300">{a.user.firstName} {a.user.lastName} — {a.user.email}</p>)}</div>
      </Modal>
    </>
  );
}

const orgSchema = z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase-with-dashes'), logoUrl: z.string().url().optional().or(z.literal('')) });
export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof orgSchema>>({ resolver: zodResolver(orgSchema) });
  const mutation = useMutation({ mutationFn: (v: any) => orgApi.create({ ...v, logoUrl: v.logoUrl || undefined }), onSuccess: (o) => { toast.success('Organization created'); navigate(`/super-admin/organizations`); } });
  return (
    <>
      <PageHeader title="Create organization" subtitle="A new isolated tenant with its own admins, students and codes." />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          {mutation.isError && <p className="text-sm text-red-400">{(mutation.error as any)?.response?.data?.message || 'Could not create organization'}</p>}
          <Input label="Organization name" {...form.register('name')} error={form.formState.errors.name?.message} />
          <Input label="Slug" placeholder="central-high-school" {...form.register('slug')} error={form.formState.errors.slug?.message} />
          <Input label="Logo URL (optional)" {...form.register('logoUrl')} />
          <Button disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create organization'}</Button>
        </form>
      </Card>
    </>
  );
}
const adminSchema = z.object({ email: z.string().email(), firstName: z.string().min(1), lastName: z.string().min(1), organizationId: z.string().uuid(), password: z.string().min(8).optional().or(z.literal('')) });
export function AdminsPage() {
  const qc = useQueryClient();
  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: orgApi.list });
  const { data: admins, isLoading } = useQuery({ queryKey: ['admins'], queryFn: () => usersApi.list({ role: 'CENTER_ADMIN' }) });
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const form = useForm<z.infer<typeof adminSchema>>({ resolver: zodResolver(adminSchema) });
  const create = useMutation({
    mutationFn: (v: any) => usersApi.createAdmin({ ...v, password: v.password || undefined }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['admins'] }); setPassword(res.initialPassword); setOpen(false); toast.success(`Admin created for ${res.organization}`); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  const assign = useMutation({ mutationFn: ({ id, organizationId }: any) => usersApi.assign(id, organizationId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); toast.success('Admin assigned'); } });
  return (
    <>
      <PageHeader title="Center administrators" subtitle="Create and assign admins to organizations." action={<Button onClick={() => setOpen(true)}>+ Create admin</Button>} />
      {password && <Card className="mb-4 border-amber-500/40"><p className="text-sm text-slate-300">Temporary password (shown once): <code className="font-mono font-bold text-amber-300">{password}</code></p></Card>}
      <Card className="p-0">{isLoading ? <Spinner /> : !admins?.length ? <EmptyState title="No center admins" /> : <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Organizations</th><th>Assign to</th></tr></thead><tbody>{admins.map((a: any) => <tr key={a.id}><td className="text-white">{a.firstName} {a.lastName}</td><td>{a.email}</td><td>{a.organizations?.map((o: any) => o.name).join(', ') || '—'}</td>
        <td><select className="input max-w-[220px] py-1.5 text-xs" defaultValue="" onChange={(e) => e.target.value && assign.mutate({ id: a.id, organizationId: e.target.value })}><option value="">Select center…</option>{orgs?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></td></tr>)}</tbody></table></div>}</Card>
      <Modal open={open} title="Create center admin" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <div className="grid grid-cols-2 gap-3"><Input label="First name" {...form.register('firstName')} /><Input label="Last name" {...form.register('lastName')} /></div>
          <Input label="Email" type="email" {...form.register('email')} />
          <Input label="Password (generated if empty)" type="password" {...form.register('password')} />
          <label className="block"><span className="label">Organization</span><select className="input" {...form.register('organizationId')}><option value="">Choose…</option>{orgs?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          <Button className="w-full" disabled={create.isPending}>Create admin</Button>
        </form>
      </Modal>
    </>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['users', search], queryFn: () => usersApi.list({ search }) });
  const status = useMutation({ mutationFn: ({ id, s }: any) => usersApi.setStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  return (
    <>
      <PageHeader title="Users" subtitle="All accounts across the platform." />
      <div className="mb-4 max-w-sm"><Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card className="p-0">{isLoading ? <Spinner /> : !data?.length ? <EmptyState title="No users found" /> : <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>{data.map((u: any) => <tr key={u.id}><td className="text-white">{u.firstName} {u.lastName}</td><td>{u.email}</td><td><Badge tone="blue">{u.role}</Badge></td><td><Badge tone={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status}</Badge></td><td><Button variant="ghost" className="px-2 py-1" onClick={() => status.mutate({ id: u.id, s: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</Button></td></tr>)}</tbody></table></div>}</Card>
    </>
  );
}

export function InvitationsPage({ organizationId }: { organizationId?: string }) {
  const qc = useQueryClient();
  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: orgApi.list });
  const [org, setOrg] = useState(organizationId ?? '');
  const { data, isLoading } = useQuery({ queryKey: ['invites', org], queryFn: () => invitationApi.list(org || undefined) });
  const [created, setCreated] = useState<string | null>(null);
  const create = useMutation({ mutationFn: () => invitationApi.create(org), onSuccess: (inv) => { setCreated(inv.code ?? null); qc.invalidateQueries({ queryKey: ['invites'] }); toast.success('Invitation generated'); }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed') });
  const revoke = useMutation({ mutationFn: (id: string) => invitationApi.revoke(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }) });
  const copy = (code?: string) => code && navigator.clipboard.writeText(code).then(() => toast.success('Copied'));
  return (
    <>
      <PageHeader title="Invitation codes" subtitle="Codes are stored hashed; plaintext is shown only when generated." />
      <Card className="mb-5"><div className="flex flex-wrap items-end gap-3">
        {!organizationId && <label className="min-w-[240px] flex-1"><span className="label">Organization</span><select className="input" value={org} onChange={(e) => setOrg(e.target.value)}><option value="">All organizations</option>{orgs?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        <Button onClick={() => create.mutate()} disabled={!org && !organizationId}>Generate code</Button>
      </div></Card>
      {created && <Card className="mb-5 border-emerald-500/40"><p className="text-sm text-slate-300">New code: <code className="mx-2 font-mono text-lg font-bold text-emerald-300">{created}</code><Button variant="ghost" className="px-2 py-1" onClick={() => copy(created)}><Copy size={14} /> Copy</Button></p></Card>}
      {isLoading ? <Spinner /> : !data?.length ? <EmptyState title="No invitation codes" /> : <Card className="p-0"><div className="table-wrap"><table className="table"><thead><tr><th>Code</th><th>Organization</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>{data.map((i: any) => <tr key={i.id}><td className="font-mono text-xs text-slate-500">••••{i.id.slice(-6)}</td><td>{i.organization?.name ?? '—'}</td><td>{i.usesCount}/{i.maxUses}</td><td>{new Date(i.expiresAt).toLocaleDateString()}</td><td><Badge tone={i.isActive && !i.revokedAt ? 'green' : 'red'}>{i.isActive && !i.revokedAt ? 'Active' : 'Revoked'}</Badge></td><td>{i.isActive && <Button variant="ghost" className="px-2 py-1" onClick={() => revoke.mutate(i.id)}>Revoke</Button>}</td></tr>)}</tbody></table></div></Card>}
    </>
  );
}

export function SuperAnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-stats'], queryFn: analyticsApi.platform });
  const { data: logs } = useQuery({ queryKey: ['audit'], queryFn: () => auditApi.list() });
  if (isLoading) return <Spinner />;
  return (
    <>
      <PageHeader title="Platform analytics" subtitle="Aggregated, read-only insights." />
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Average accuracy" value={`${data.averageAccuracy}%`} /><StatCard label="Total score" value={data.totalScore} tone="green" /><StatCard label="Active subjects" value={data.activeSubjects} tone="blue" /></div>
      <Card className="mt-6"><h2 className="mb-4 font-semibold">Recent audit events</h2>{!logs?.length ? <EmptyState title="No events yet" /> : <div className="space-y-2">{logs.slice(0, 15).map((l: any) => <div key={l.id} className="flex justify-between border-b border-white/5 pb-2 text-sm"><span className="text-slate-300">{l.action}</span><span className="text-slate-500">{new Date(l.createdAt).toLocaleString()}</span></div>)}</div>}</Card>
    </>
  );
}

export function SuperSettingsPage() {
  return (
    <>
      <PageHeader title="Platform settings" subtitle="Deployment and security reference." />
      <Card className="max-w-2xl space-y-3 text-sm text-slate-300">
        <p><strong className="text-white">API:</strong> configured through <code>VITE_API_URL</code> on the web app.</p>
        <p><strong className="text-white">Secrets:</strong> JWT and AI keys live only in backend environment variables — never in the browser bundle.</p>
        <p><strong className="text-white">HTTPS:</strong> required for PWA installation in production.</p>
        <p><strong className="text-white">Caching:</strong> authenticated API responses and student data are never cached by the service worker.</p>
      </Card>
    </>
  );
}
