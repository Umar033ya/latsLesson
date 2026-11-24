import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Building2, ClipboardCheck, CreditCard, DoorOpen, FolderOpen, Gamepad2, GraduationCap, HelpCircle, KeyRound, LayoutDashboard, Layers, Library, LogOut, Map as MapIcon, Menu, Settings, Shield, UserCog, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { signOut, useAuth } from '../lib/api';
import { Avatar } from './ui';
import { LanguageSwitch, ThemeSwitch } from './Preferences';
import { tr } from '../lib/i18n';

type Item = [to: string, label: string, icon: LucideIcon];
const CENTER: Array<[string, Item[]]> = [
  [tr('Today'), [['/center', tr('Overview'), LayoutDashboard], ['/center/rooms', tr('Rooms'), DoorOpen], ['/center/results', tr('Results'), ClipboardCheck], ['/center/analytics', tr('Analytics'), BarChart3]]],
  [tr('Class'), [['/center/students', tr('Students'), Users], ['/center/teachers', tr('Teachers'), GraduationCap], ['/center/groups', tr('Groups'), Layers], ['/center/codes', tr('Access codes'), KeyRound]]],
  [tr('Content'), [['/center/campaigns', tr('Campaigns'), MapIcon], ['/center/questions', tr('Questions'), HelpCircle], ['/center/collections', tr('Collections'), FolderOpen], ['/center/materials', tr('Learning notes'), BookOpen]]],
  [tr('Center'), [['/center/game', tr('Game and branding'), Gamepad2], ['/center/profile', tr('Profile and plan'), Building2], ['/center/activity', tr('Activity log'), Activity], ['/center/account', tr('My settings'), Settings]]],
];
const ADMIN: Array<[string, Item[]]> = [
  [tr('Business'), [['/admin', tr('Overview'), LayoutDashboard], ['/admin/centers', tr('Education centers'), Building2], ['/admin/admins', tr('Center admins'), UserCog], ['/admin/plans', tr('Plans'), CreditCard]]],
  [tr('Content'), [['/admin/campaigns', tr('Official campaigns'), MapIcon], ['/admin/questions', tr('Question bank'), HelpCircle], ['/admin/collections', tr('Collections'), FolderOpen], ['/admin/materials', tr('Learning notes'), BookOpen], ['/admin/subjects', tr('Subjects and topics'), Library]]],
  [tr('Platform'), [['/admin/settings', tr('Settings'), Settings], ['/admin/security', tr('Security'), Shield], ['/admin/activity', tr('Activity log'), Activity], ['/admin/account', tr('My settings'), UserRound]]],
];
const TEACHER: Array<[string, Item[]]> = [[tr('Class'), [['/teacher', tr('Rooms'), DoorOpen], ['/teacher/account', tr('My settings'), Settings]]]];
const MENU = { center: CENTER, admin: ADMIN, teacher: TEACHER };

export function Wordmark({ className }: { className?: string }) {
  return <span className={clsx('font-jac leading-none', className)}>Last Lesson</span>;
}

export function Shell({ kind }: { kind: keyof typeof MENU }) {
  const [open, setOpen] = useState(false);
  const me = useAuth((s) => s.me)!;
  const nav = useNavigate();
  const { pathname } = useLocation();
  const org = me.organizations[0];
  const groups = MENU[kind];
  const center = kind !== 'admin';
  const fullName = `${me.firstName} ${me.lastName}`.trim();
  const here = groups.flatMap(([, items]) => items).filter(([to]) => pathname === to || pathname.startsWith(`${to}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  const days = org?.subscriptionEndsAt ? Math.ceil((new Date(org.subscriptionEndsAt).getTime() - Date.now()) / 86_400_000) : null;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-sheet focus:p-2">{tr('Skip to content')}</a>
      {open && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label={tr('Close menu')} onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col overflow-y-auto bg-board text-board-chalk transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-5 pb-3 pt-5"><Wordmark className="text-[34px]" /><button className="p-1 lg:hidden" aria-label={tr('Close menu')} onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className="mx-3 flex items-center gap-3 rounded-xl bg-board-2 px-3 py-2">
          {center && org?.logoUrl ? <img src={org.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-md bg-white object-contain" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-lamp font-jac text-2xl text-board">{(center ? (org?.name ?? '?') : 'L').charAt(0)}</span>}
          <p className="min-w-0 truncate text-sm font-semibold">{center ? (org?.name ?? tr('No center')) : tr('Platform owner')}</p>
        </div>
        <nav className="flex-1 px-3 py-3" aria-label={tr('Main')}>
          {groups.map(([heading, items]) => (
            <div key={heading} className="mb-3">
              <p className="px-3 pb-0.5 text-xs text-board-dim">{heading}</p>
              {items.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} end={to.split('/').length === 2} onClick={() => setOpen(false)} className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-[7px] text-[14.5px] leading-tight transition-colors', isActive ? 'bg-lamp font-semibold text-board' : 'text-board-chalk/90 hover:bg-board-2')}>
                  <Icon size={17} className="shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-board-2 bg-board px-4 py-3">
          <Avatar name={fullName} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{fullName}</p><p className="truncate text-xs text-board-dim">{me.email}</p></div>
          <button className="rounded-lg p-2 hover:bg-board-2" aria-label={tr('Sign out')} title={tr('Sign out')} onClick={async () => { await signOut(); nav('/login'); }}><LogOut size={18} /></button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-rule bg-paper/95 px-4 py-2.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3"><button className="btn-line !px-2.5 lg:hidden" aria-label={tr('Menu')} aria-expanded={open} onClick={() => setOpen(true)}><Menu size={18} /></button><span className="truncate text-sm text-soft">{here?.[1]}</span></div>
          <div className="flex items-center gap-2"><LanguageSwitch /><ThemeSwitch /></div>
        </header>
        {kind === 'center' && days !== null && days <= 14 && <p className="bg-amber-pale px-4 py-2 text-sm text-amber-dark sm:px-8">{days > 0 ? tr('Your subscription ends in {0} days. Contact the platform to renew it.', { 0: days }) : tr('Your subscription has ended. Students cannot play until it is renewed.')}</p>}
        <main id="main" className="min-w-0 flex-1">
          <Suspense fallback={<p className="p-8 text-soft" role="status">{tr('Opening...')}</p>} key={pathname.split('/')[2]}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
