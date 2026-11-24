import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity, BookOpen, ClipboardList, FileBarChart, Gamepad2, GraduationCap, LayoutDashboard,
  LogOut, Menu, Settings, ShieldCheck, Users, X, KeyRound, HelpCircle, Trophy, UserRound,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { OfflineIndicator } from '../../features/pwa/components';
import type { Role } from '../../types';

const NAV: Record<Role, Array<{ to: string; label: string; icon: any }>> = {
  SUPER_ADMIN: [
    { to: '/super-admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/super-admin/organizations', label: 'Organizations', icon: GraduationCap },
    { to: '/super-admin/organizations/create', label: 'Create center', icon: ShieldCheck },
    { to: '/super-admin/admins', label: 'Center admins', icon: Users },
    { to: '/super-admin/users', label: 'Users', icon: UserRound },
    { to: '/super-admin/invitations', label: 'Invitations', icon: KeyRound },
    { to: '/super-admin/analytics', label: 'Analytics', icon: FileBarChart },
    { to: '/super-admin/settings', label: 'Settings', icon: Settings },
  ],
  CENTER_ADMIN: [
    { to: '/center/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/center/students', label: 'Students', icon: Users },
    { to: '/center/invitations', label: 'Invitations', icon: KeyRound },
    { to: '/center/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/center/questions', label: 'Questions', icon: HelpCircle },
    { to: '/center/analytics', label: 'Analytics', icon: FileBarChart },
    { to: '/center/settings', label: 'Settings', icon: Settings },
  ],
  GAMER: [
    { to: '/player/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/player/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/player/preparation', label: 'Preparation', icon: ClipboardList },
    { to: '/player/game', label: 'Enter the school', icon: Gamepad2 },
    { to: '/player/history', label: 'History', icon: Activity },
    { to: '/player/results', label: 'Results', icon: Trophy },
    { to: '/player/profile', label: 'Profile', icon: UserRound },
  ],
};

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const links = NAV[user?.role ?? 'GAMER'];
  const org = user?.organizations?.[0];

  const logout = async () => {
    try { await api.post('/auth/logout', { refreshToken: useAuthStore.getState().refreshToken }); } catch { /* ignore */ }
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:flex">
      {open && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0d1220] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded bg-blood/20 font-mono text-sm font-black text-red-400">LL</span>
            <span className="font-mono text-sm font-black tracking-widest text-white">LAST LESSON</span>
          </NavLink>
          <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        {org && (
          <div className="mx-3 mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-500/20 font-bold text-red-300">{org.name.charAt(0)}</div>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{org.name}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{org.relation ?? 'organization'}</p></div>
          </div>
        )}
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">{user?.role?.replace('_', ' ')}</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-blood/15 text-red-300' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 truncate px-2 text-xs text-slate-400">{user?.firstName} {user?.lastName}</div>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-red-300"><LogOut size={17} />Sign out</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#0b0f1a]/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="text-slate-300 lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
            <span className="hidden text-sm text-slate-500 sm:block">Educational horror survival platform</span>
          </div>
          <div className="flex items-center gap-3"><OfflineIndicator /><div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-center text-sm font-bold leading-8 text-white">{user?.firstName?.[0] ?? '?'}</div></div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
