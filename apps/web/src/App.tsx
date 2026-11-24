import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { homeOf, useAuth, type Me } from './lib/api';
import { CodePage, LoginPage, RegisterPage } from './features/auth/pages';
import { tr } from './lib/i18n';

const named = (load: () => Promise<any>, name: string) => lazy(() => load().then((m) => ({ default: m[name] })));
const student = (n: string) => named(() => import('./features/student/pages'), n);
const center = (n: string) => named(() => import('./features/center/pages'), n);
const admin = (n: string) => named(() => import('./features/admin/pages'), n);
const content = (n: string) => named(() => import('./features/content/pages'), n);
const campaigns = (n: string) => named(() => import('./features/content/campaigns'), n);
const results = (n: string) => named(() => import('./features/center/results'), n);

const [StudentLayout, Home, Prepare, Guide, MyResults, MyReview, MyProgress, MySettings] = ['StudentLayout', 'Home', 'Prepare', 'Guide', 'MyResults', 'MyReview', 'MyProgress', 'MySettings'].map(student);
const [CenterDashboard, Students, StudentPage, Groups, GroupPage, Codes, GameSettings, Profile] = ['Dashboard', 'Students', 'StudentPage', 'Groups', 'GroupPage', 'Codes', 'GameSettings', 'Profile'].map(center);
const [Results, ReviewPage, Analytics] = ['Results', 'ReviewPage', 'Analytics'].map(results);
const [AdminDashboard, Centers, CenterPage, Admins, Plans, Subjects, PlatformSettings, Security, Activity, Account] = ['Dashboard', 'Centers', 'CenterPage', 'Admins', 'Plans', 'Subjects', 'PlatformSettings', 'Security', 'Activity', 'Account'].map(admin);
const [Questions, Collections, Materials] = ['Questions', 'Collections', 'Materials'].map(content);
const [Rooms, RoomPage] = ['Rooms', 'RoomPage'].map((n) => named(() => import('./features/rooms/host'), n));
const [JoinRoom, RoomPlayer] = ['JoinRoom', 'RoomPlayer'].map((n) => named(() => import('./features/rooms/player'), n));
const Teachers = named(() => import('./features/center/teachers'), 'Teachers');
const [Campaigns, CampaignPage] = ['Campaigns', 'CampaignPage'].map(campaigns);

/** Convenience only: every permission is checked again by the API. */
function Only({ role, children }: { role: Me['role']; children: ReactNode }) {
  const { me, ready } = useAuth();
  if (!ready)
    return (
      <p className="p-10 text-soft" role="status">{tr('Opening...')}</p>
    );
  if (!me) return <Navigate to={role === 'GAMER' ? '/' : '/login'} replace />;
  return me.role === role ? <>{children}</> : <Navigate to={homeOf(me)} replace />;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">{tr('This page stopped working')}</h1>
          <p className="mb-4 mt-1 text-soft">{tr('Your data is safe. Reload to continue.')}</p>
          <button className="btn-main" onClick={() => window.location.reload()}>{tr('Reload')}</button>
        </div>
      </div>
    );
  }
}

export function App() {
  const me = useAuth((s) => s.me);
  const qc = useQueryClient();
  // Never show one account's cached data to the next one on a shared computer.
  useEffect(() => () => qc.clear(), [me?.id, qc]);
  const shared = (
    <>
      <Route path="questions" element={<Questions />} />
      <Route path="collections" element={<Collections />} />
      <Route path="materials" element={<Materials />} />
      <Route path="campaigns" element={<Campaigns />} />
      <Route path="campaigns/:id" element={<CampaignPage />} />
      <Route path="activity" element={<Activity />} />
      <Route path="account" element={<Account />} />
    </>
  );
  return (
    <Boundary>
      <Suspense
        fallback={
          <p className="p-10 text-soft" role="status">{tr('Opening...')}</p>
        }
      >
        <Routes>
          <Route path="/" element={<CodePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/staff" element={<Navigate to="/login" replace />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/room" element={<RoomPlayer />} />
          <Route
            path="/teacher"
            element={
              <Only role="TEACHER">
                <Shell kind="teacher" />
              </Only>
            }
          >
            <Route index element={<Rooms />} />
            <Route path="rooms" element={<Navigate to="/teacher" replace />} />
            <Route path="rooms/:id" element={<RoomPage />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route
            path="/student"
            element={
              <Only role="GAMER">
                <StudentLayout />
              </Only>
            }
          >
            <Route index element={<Home />} />
            <Route path="prepare" element={<Prepare />} />
            <Route path="prepare/:id" element={<Guide />} />
            <Route path="results" element={<MyResults />} />
            <Route path="results/:id" element={<MyReview />} />
            <Route path="progress" element={<MyProgress />} />
            <Route path="settings" element={<MySettings />} />
          </Route>
          <Route
            path="/center"
            element={
              <Only role="CENTER_ADMIN">
                <Shell kind="center" />
              </Only>
            }
          >
            <Route index element={<CenterDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentPage />} />
            <Route path="groups" element={<Groups />} />
            <Route path="groups/:id" element={<GroupPage />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="rooms/:id" element={<RoomPage />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="codes" element={<Codes />} />
            <Route path="results" element={<Results />} />
            <Route path="results/:id" element={<ReviewPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="game" element={<GameSettings />} />
            <Route path="profile" element={<Profile />} />
            {shared}
          </Route>
          <Route
            path="/admin"
            element={
              <Only role="SUPER_ADMIN">
                <Shell kind="admin" />
              </Only>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="centers" element={<Centers />} />
            <Route path="centers/:id" element={<CenterPage />} />
            <Route path="admins" element={<Admins />} />
            <Route path="plans" element={<Plans />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="settings" element={<PlatformSettings />} />
            <Route path="security" element={<Security />} />
            {shared}
          </Route>
          <Route
            path="*"
            element={
              <div className="grid min-h-screen place-items-center text-center">
                <div>
                  <h1 className="font-jac text-5xl">{tr('Absent')}</h1>
                  <p className="mb-4 mt-2 text-soft">{tr('There is no page at this address.')}</p>
                  <Link className="btn-main" to="/">{tr('Back to the entrance')}</Link>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Boundary>
  );
}
