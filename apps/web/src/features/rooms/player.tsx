import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageSwitch } from '../../components/Preferences';
import { Wordmark } from '../../components/Shell';
import { ApiError, post, useAuth } from '../../lib/api';
import { errorText, tr } from '../../lib/i18n';
import { enterRoom, forgetRoom, isRoomCode, markLaunched, roomCall, roomToken, wasLaunched, type RoomState } from '../../lib/room';
import { Dot, Podium, Standings } from './board';
import { spaced } from './host';

const POLL_MS = 1500;

function Scene({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="night relative flex flex-col">
      <div className="absolute inset-0 bg-cover bg-center opacity-60 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[#05060a]/60" aria-hidden="true" />
      <header className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8"><Link to="/"><Wordmark className="text-4xl text-bone" /></Link><LanguageSwitch dark /></header>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-12"><div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div></main>
    </div>
  );
}

/**
 * Coming back to the same room continues it. Another room is left first: a forgotten player
 * would keep it open until its time is over.
 */
async function alreadyInside(code: string): Promise<boolean> {
  if (!roomToken()) return false;
  const room = await roomCall<RoomState>('GET', '/room').catch(() => null);
  if (room && room.status !== 'FINISHED' && room.code === code.replace(/\D/g, '')) return true;
  if (room && room.status !== 'FINISHED') await roomCall('POST', '/room/leave').catch(() => undefined);
  forgetRoom();
  return false;
}

/** Code and a name: nothing else is needed to play in a room. */
export function JoinRoom() {
  const [params] = useSearchParams();
  const me = useAuth((s) => s.me);
  const ready = useAuth((s) => s.ready);
  const nav = useNavigate();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState<string | null>(null);
  const student = me?.role === 'GAMER';
  const nickname = name ?? (student ? me.firstName.slice(0, 18) : '');
  const join = useMutation({
    mutationFn: async () => ((await alreadyInside(code)) ? null : post<{ token: string }>(student ? '/room/join-as-student' : '/room/join', { code, nickname })),
    onSuccess: (r) => {
      if (r) enterRoom(r.token);
      nav('/room');
    },
  });
  return (
    <Scene>
      <form className="npanel p-7 shadow-[0_24px_80px_-20px_#000]" onSubmit={(e: FormEvent) => { e.preventDefault(); join.mutate(); }}>
        <h1 className="ntitle mb-5">{tr('Join a room')}</h1>
        <label className="mb-2 block text-fog" htmlFor="room-code">{tr('Six digits from the teacher’s screen')}</label>
        <input id="room-code" className="nfield text-center font-dot text-4xl tracking-[0.2em]" inputMode="numeric" autoComplete="off" autoFocus={!code} required maxLength={9} placeholder="000 000" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d\s-]/g, ''))} />
        <label className="mb-2 mt-5 block text-fog" htmlFor="room-name">{tr('Your name in the game')}</label>
        <input id="room-name" className="nfield text-xl font-semibold" required minLength={2} maxLength={18} autoComplete="nickname" autoFocus={Boolean(code)} value={nickname} onChange={(e) => setName(e.target.value)} />
        {join.error && <p className="mt-4 text-[#f09a86]" role="alert">{errorText(join.error)}</p>}
        <button className="nbtn mt-6 w-full" disabled={join.isPending || !ready || !isRoomCode(code)}>{join.isPending ? tr('Entering...') : tr('Enter the room')}</button>
        {student && <p className="mt-4 text-sm text-fog">{tr('You are signed in: in a room of your center the result is saved in your profile.')}</p>}
      </form>
    </Scene>
  );
}

/** Waiting room, way into the game, and the table at the end. */
export function RoomPlayer() {
  const nav = useNavigate();
  const token = roomToken();
  const q = useQuery({
    queryKey: ['my-room', token],
    queryFn: () => roomCall<RoomState>('GET', '/room'),
    enabled: Boolean(token),
    refetchInterval: (x) => (x.state.data?.status === 'FINISHED' || x.state.status === 'error' ? false : POLL_MS),
  });
  const launch = useMutation({
    mutationFn: () => roomCall<{ launchUrl: string }>('POST', '/room/launch'),
    onMutate: markLaunched,
    onSuccess: (r) => window.location.assign(r.launchUrl),
  });
  const leave = useMutation({
    mutationFn: () => roomCall('POST', '/room/leave'),
    onSettled: () => {
      forgetRoom();
      nav('/');
    },
  });
  const room = q.data;
  const inside = room?.status === 'RUNNING' && !room.me.finished;
  const { mutate: enter } = launch;
  useEffect(() => {
    if (inside && !wasLaunched()) enter();
  }, [inside, enter]);

  if (!token) return <Navigate to="/join" replace />;
  if (q.isError) {
    const gone = q.error instanceof ApiError && q.error.status >= 400 && q.error.status < 500;
    return (
      <Scene>
        <div className="npanel p-6" role="alert">
          <p className="mb-5">{errorText(q.error)}</p>
          {gone ? <button className="nbtn" onClick={() => { forgetRoom(); nav('/join'); }}>{tr('Join a room')}</button> : <button className="nbtn" onClick={() => void q.refetch()}>{tr('Try again')}</button>}
        </div>
      </Scene>
    );
  }
  if (!room) return <Scene><p className="text-center font-dot text-xl text-fog" role="status">{tr('Opening...')}</p></Scene>;

  return (
    <Scene wide>
      <div className="npanel p-6 shadow-[0_24px_80px_-20px_#000] sm:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm text-fog">{room.center}. {room.host}</p><h1 className="ntitle">{room.title}</h1></div>
          <p className="font-dot text-2xl text-lamp">{spaced(room.code)}</p>
        </div>
        {room.status === 'WAITING' && (
          <>
            <p className="mb-4 text-fog" role="status">{tr('You are in. The game opens by itself when the teacher starts it.')}</p>
            <ul className="flex flex-wrap gap-2">
              {room.standings.map((s) => <li key={s.id} className={`flex items-center gap-2 rounded-full border px-4 py-2 font-semibold ${s.id === room.me.id ? 'border-lamp bg-lamp/10' : 'border-white/15 bg-white/5'}`}><Dot color={s.color} />{s.nickname}{s.id === room.me.id && <span className="text-sm text-lamp">{tr('you')}</span>}</li>)}
            </ul>
          </>
        )}
        {inside && (
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <button className="nbtn" disabled={launch.isPending} onClick={() => launch.mutate()}>{wasLaunched() ? tr('Return to the game') : tr('Enter the school')}</button>
            {launch.error && <p className="text-[#f09a86]" role="alert">{errorText(launch.error)}</p>}
          </div>
        )}
        {room.status === 'FINISHED' && <Podium standings={room.standings} dark />}
        {room.status !== 'WAITING' && <Standings standings={room.standings} steps={room.steps} meId={room.me.id} dark />}
        <div className="mt-6 flex flex-wrap gap-3">
          {room.status === 'FINISHED' || room.me.finished ? (
            <button className="nbtn-line" onClick={() => { forgetRoom(); nav('/'); }}>{tr('Back to the entrance')}</button>
          ) : (
            <button className="nbtn-line" disabled={leave.isPending} onClick={() => (room.status === 'WAITING' || window.confirm(tr('Leave the game? Your answers so far are handed in.'))) && leave.mutate()}>{tr('Leave the room')}</button>
          )}
        </div>
      </div>
    </Scene>
  );
}
