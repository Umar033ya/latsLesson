import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi, membershipApi } from '../../services/api-shim';
import { useAuthStore } from '../../store/auth.store';
import { Button, Card, Input } from '../../components/ui';

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-12 lg:px-20">
        <Link to="/" className="mb-10 flex items-center gap-2"><span className="rounded bg-blood/20 px-2 py-1 font-mono font-black text-red-400">LL</span><span className="font-mono font-black tracking-widest">LAST LESSON</span></Link>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-black text-white">{title}</h1>
          <p className="mb-8 mt-2 text-sm text-slate-400">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#080b14] lg:block">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,#1f2937 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#1f2937 40px)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-transparent to-red-950/20" />
        <div className="relative flex h-full flex-col justify-end p-16">
          <p className="font-mono text-6xl font-black tracking-tighter text-white/90">THE BELL HAS RUNG.</p>
          <p className="mt-4 max-w-md text-slate-400">Every correct answer is a step closer to the exit. Every mistake makes the dark more aware.</p>
        </div>
      </div>
    </div>
  );
}

function homeFor(role: string) {
  return role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : role === 'CENTER_ADMIN' ? '/center/dashboard' : '/player/dashboard';
}

export function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState('');
  const form = useForm<{ email: string; password: string }>({ resolver: zodResolver(z.object({ email: z.string().email(), password: z.string().min(1) })) });
  const mutation = useMutation({
    mutationFn: (v: { email: string; password: string }) => authApi.login(v.email, v.password),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      const me = await authApi.me();
      setUser(me);
      navigate(homeFor(me.role), { replace: true });
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Invalid email or password'),
  });
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your lesson.">
      <Card>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <Input label="Email" type="email" autoComplete="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <Input label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={form.formState.errors.password?.message} />
          <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <div className="mt-5 flex justify-between text-xs text-slate-500">
          <Link to="/forgot-password" className="hover:text-red-300">Forgot password?</Link>
          <Link to="/register" className="hover:text-red-300">Create account</Link>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-slate-600">Demo: student@lastlesson.dev / Admin123!</p>
    </AuthLayout>
  );
}

const registerSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(),
  password: z.string().min(8), invitationCode: z.string().optional(),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState('');
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const mutation = useMutation({
    mutationFn: (v: z.infer<typeof registerSchema>) => authApi.register(v),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(await authApi.me());
      toast.success('Account created. Welcome to LAST LESSON.');
      navigate('/player/dashboard', { replace: true });
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Registration failed'),
  });
  return (
    <AuthLayout title="Create your account" subtitle="Public registration always creates a student account.">
      <Card>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" {...form.register('firstName')} />
            <Input label="Last name" {...form.register('lastName')} />
          </div>
          <Input label="Email" type="email" {...form.register('email')} />
          <Input label="Password" type="password" {...form.register('password')} />
          <Input label="Center invitation code (optional)" placeholder="LL-XXXX-XXXX" {...form.register('invitationCode')} />
          <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create account'}</Button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Already registered? <Link to="/login" className="text-red-300">Sign in</Link></p>
      </Card>
    </AuthLayout>
  );
}

export function JoinCenterPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: (value: string) => membershipApi.join(value),
    onSuccess: async (org) => {
      setUser(await authApi.me());
      toast.success(`Joined ${org.name}`);
      navigate('/player/dashboard', { replace: true });
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Invalid code'),
  });
  const setUser = useAuthStore((s) => s.setUser);
  return (
    <AuthLayout title="Join a center" subtitle="Enter the invitation code given by your school or learning center.">
      <Card>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(code); }}>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Input label="Invitation code" placeholder="LL-DEMO-2026" value={code} onChange={(e) => setCode(e.target.value)} required />
          <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Joining…' : 'Join center'}</Button>
        </form>
      </Card>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ message: string; devToken?: string } | null>(null);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  return (
    <AuthLayout title="Reset password" subtitle="We will create a time-limited reset token for your account.">
      <Card className="space-y-4">
        {!result ? (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setResult(await authApi.forgot(email)); }}>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button className="w-full">Create reset token</Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await authApi.reset(token, newPassword); toast.success('Password updated'); }}>
            <p className="text-sm text-slate-300">{result.message}</p>
            {result.devToken && <p className="break-all rounded bg-white/5 p-2 font-mono text-xs text-amber-300">Dev token: {result.devToken}</p>}
            <Input label="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
            <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            <Button className="w-full">Set new password</Button>
          </form>
        )}
        <Link to="/login" className="block text-center text-xs text-slate-500 hover:text-red-300">Back to login</Link>
      </Card>
    </AuthLayout>
  );
}

export function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}
