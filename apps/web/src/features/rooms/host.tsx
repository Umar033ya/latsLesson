import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Copy, DoorOpen, Flag, Play, Plus, RotateCcw, Timer, Trash2, Users } from 'lucide-react';
import clsx from 'clsx';
import qrcode from 'qrcode-generator';
import type { LobbyState } from '@last-lesson/scenario';
import { Choice, confirmed, copy, Dialog, Empty, Load, Page, Section, Status, Text, useAction } from '../../components/ui';
import { del, get, post } from '../../lib/api';
import { when } from '../../lib/format';
import { tr } from '../../lib/i18n';
import { Dot, escaped, Podium, raceTime, Standings } from './board';

const POLL_MS = 1500;

interface CampaignChoice {
  id: string;
  title: string;
  description: string | null;
  official: boolean;
  difficulty: string;
  sessionMinutes: number;
  tension: string;
}

/** Rooms live under /teacher and under /center; links stay inside the panel that is open. */
const useBase = () => `/${useLocation().pathname.split('/')[1]}/rooms`;
export const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
const joinUrl = (code: string) => `${window.location.origin}/join?code=${code}`;

export function Rooms() {
  const base = useBase();
  const [making, setMaking] = useState(false);
  const q = useQuery({ queryKey: ['rooms'], queryFn: () => get<LobbyState[]>('/lobbies'), refetchInterval: 10_000 });
  const remove = useAction((id: string) => del(`/lobbies/${id}`), { ok: 'Room deleted', keys: ['rooms'] });
  return (
    <Page title={tr('Rooms')} note={tr('Open a room, show the code, and the whole class plays at the same time. The table shows who got out first.')} action={<button className="btn-main" onClick={() => setMaking(true)}><Plus size={16} />{tr('New room')}</button>}>
      <Load q={q}>
        {(rooms) => {
          const open = rooms.filter((r) => r.status !== 'FINISHED');
          const past = rooms.filter((r) => r.status === 'FINISHED');
          return (
            <div className="space-y-6">
              {open.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {open.map((r) => (
                    <Link key={r.id} to={`${base}/${r.id}`} className="sheet block p-5 transition-colors hover:border-accent">
                      <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 truncate text-[17px] font-bold">{r.title}</h2><Status value={r.status} /></div>
                      <p className="mt-3 font-dot text-5xl tracking-wider text-accent">{spaced(r.code)}</p>
                      <p className="mt-3 flex items-center gap-2 text-sm text-soft"><Users size={16} aria-hidden="true" />{tr('{0} of {1} players', { 0: r.standings.length, 1: r.maxPlayers })}</p>
                    </Link>
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <Section title={tr('Finished games')}>
                  <table className="reg min-w-[640px]">
                    <thead><tr><th>{tr('Room')}</th><th>{tr('First place')}</th><th>{tr('Time')}</th><th>{tr('Players')}</th><th>{tr('Date')}</th><th /></tr></thead>
                    <tbody>
                      {past.map((r) => {
                        const first = r.standings.find(escaped);
                        return (
                          <tr key={r.id}>
                            <td><Link className="font-semibold hover:underline" to={`${base}/${r.id}`}>{r.title}</Link><span className="block text-[13px] text-soft">{r.host}</span></td>
                            <td>{first ? <span className="flex items-center gap-2"><Dot color={first.color} />{first.nickname}</span> : <span className="text-soft">{tr('Nobody got out')}</span>}</td>
                            <td className="tabular-nums">{first && raceTime(first.durationMs)}</td>
                            <td>{r.standings.length}</td>
                            <td className="whitespace-nowrap text-soft">{when(r.createdAt)}</td>
                            <td className="text-right"><button className="btn-quiet hover:!text-pencil-dark" aria-label={tr('Delete')} onClick={() => confirmed(tr('Delete this room and the results of its guests?')) && remove.mutate(r.id)}><Trash2 size={16} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Section>
              )}
              {!rooms.length && <Empty title={tr('No rooms yet')}><p>{tr('Open the first room: choose a campaign and show the six digits on the screen.')}</p><button className="btn-main mt-4" onClick={() => setMaking(true)}>{tr('New room')}</button></Empty>}
            </div>
          );
        }}
      </Load>
      {making && <NewRoom onClose={() => setMaking(false)} />}
    </Page>
  );
}

function NewRoom({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const base = useBase();
  const q = useQuery({ queryKey: ['room-campaigns'], queryFn: () => get<CampaignChoice[]>('/lobbies/campaigns') });
  const [f, setF] = useState({ campaignId: '', title: '', maxPlayers: 20 });
  const campaignId = f.campaignId || q.data?.[0]?.id || '';
  const chosen = q.data?.find((c) => c.id === campaignId);
  const create = useAction(() => post<LobbyState>('/lobbies', { campaignId, title: f.title.trim() || undefined, maxPlayers: Number(f.maxPlayers) }), { keys: ['rooms'], then: (r) => nav(`${base}/${r.id}`) });
  return (
    <Dialog title={tr('New room')} open onClose={onClose}>
      <Load q={q}>
        {(list) =>
          list.length ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(undefined as never); }}>
              <Choice label={tr('Campaign')} value={campaignId} options={list.map((c) => [c.id, c.title])} hint={chosen && tr('Up to {0} minutes. Everybody gets the same questions.', { 0: chosen.sessionMinutes })} onChange={(e) => setF({ ...f, campaignId: e.target.value })} />
              <Text label={tr('Room name')} placeholder={chosen?.title} maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <Text label={tr('How many players at most')} type="number" min={1} max={30} value={f.maxPlayers} onChange={(e) => setF({ ...f, maxPlayers: Number(e.target.value) })} />
              <button className="btn-main w-full py-2.5" disabled={create.isPending}>{tr('Open the room')}</button>
            </form>
          ) : (
            <p className="text-soft">{tr('There is no published campaign yet. Ask the center administrator to publish one.')}</p>
          )
        }
      </Load>
    </Dialog>
  );
}

export function RoomPage() {
  const { id } = useParams();
  const base = useBase();
  const nav = useNavigate();
  const qc = useQueryClient();
  const key = ['room', id];
  const q = useQuery({ queryKey: key, queryFn: () => get<LobbyState>(`/lobbies/${id}`), refetchInterval: (x) => (x.state.data?.status === 'FINISHED' ? false : POLL_MS) });
  const store = (r: LobbyState) => qc.setQueryData(key, r);
  const start = useAction(() => post<LobbyState>(`/lobbies/${id}/start`), { then: store });
  const end = useAction(() => post<LobbyState>(`/lobbies/${id}/end`), { keys: ['rooms'], then: store });
  const kick = useAction((playerId: string) => del<LobbyState>(`/lobbies/${id}/players/${playerId}`), { then: store });
  const again = useAction((r: LobbyState) => post<LobbyState>('/lobbies', { campaignId: r.campaignId, title: r.title.slice(0, 60), maxPlayers: r.maxPlayers }), { keys: ['rooms'], then: (r) => nav(`${base}/${r.id}`) });
  const askKick = (playerId: string, name: string) => confirmed(tr('Remove {0} from the room?', { 0: name })) && kick.mutate(playerId);
  return (
    <Load q={q}>
      {(r) => (
        <Page
          title={r.title}
          note={r.title === r.campaign ? undefined : r.campaign}
          action={
            <>
              <Link className="btn-line" to={base}>{tr('All rooms')}</Link>
              {r.status === 'WAITING' && <button className="btn-main" disabled={!r.standings.length || start.isPending} onClick={() => start.mutate(undefined as never)}><Play size={16} />{tr('Start the game')}</button>}
              {r.status === 'RUNNING' && <button className="btn-red" disabled={end.isPending} onClick={() => confirmed(tr('End the game for everybody?')) && end.mutate(undefined as never)}><Flag size={16} />{tr('End the game')}</button>}
              {r.status === 'FINISHED' && r.campaignId && <button className="btn-main" disabled={again.isPending} onClick={() => again.mutate(r)}><RotateCcw size={16} />{tr('One more game')}</button>}
            </>
          }
        >
          {r.status === 'WAITING' && <Waiting room={r} onKick={askKick} onCancel={() => confirmed(tr('Close this room?')) && end.mutate(undefined as never)} />}
          {r.status === 'RUNNING' && (
            <Section title={tr('The game is on')} action={<Clock ms={r.elapsedMs} />}>
              <Standings standings={r.standings} steps={r.steps} onKick={(s) => askKick(s.id, s.nickname)} />
            </Section>
          )}
          {r.status === 'FINISHED' && (
            <Section title={tr('Final table')}>
              {r.standings.length ? <><Podium standings={r.standings} /><Standings standings={r.standings} steps={r.steps} /></> : <p className="text-soft">{tr('Nobody played in this room.')}</p>}
            </Section>
          )}
        </Page>
      )}
    </Load>
  );
}

function Waiting({ room, onKick, onCancel }: { room: LobbyState; onKick: (id: string, name: string) => void; onCancel: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <section className="relative overflow-hidden rounded-2xl bg-night p-6 text-bone sm:p-8">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-fog">{tr('Open this address')}</p>
            <p className="font-dot text-2xl text-lamp">{window.location.host}/join</p>
            <p className="mt-5 text-fog">{tr('and type the code')}</p>
            <p className="select-all font-dot text-[clamp(56px,9vw,104px)] leading-none">{spaced(room.code)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" onClick={() => copy(joinUrl(room.code))}><Copy size={16} />{tr('Copy the link')}</button>
              <button className="btn border border-night-4 bg-night-2/80 text-bone hover:border-lamp" onClick={onCancel}><DoorOpen size={16} />{tr('Close the room')}</button>
            </div>
          </div>
          <Qr text={joinUrl(room.code)} />
        </div>
      </section>
      <Section title={tr('In the room')} action={<span className="text-sm tabular-nums text-soft">{room.standings.length} / {room.maxPlayers}</span>}>
        {room.standings.length ? (
          <ul className="flex flex-wrap gap-2">
            {room.standings.map((s) => (
              <li key={s.id} title={s.online ? undefined : tr('offline')} className={clsx('flex items-center gap-2 rounded-full border border-rule bg-well py-1.5 pl-3 pr-1.5 font-semibold', !s.online && 'opacity-50')}>
                <Dot color={s.color} />{s.nickname}
                <button className="rounded-full px-2 text-soft hover:text-pencil-dark" aria-label={tr('Remove {0}', { 0: s.nickname })} onClick={() => onKick(s.id, s.nickname)}>×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-soft">{tr('Waiting for the first player. No accounts are needed: a code and a name are enough.')}</p>
        )}
      </Section>
    </div>
  );
}

function Qr({ text }: { text: string }) {
  const src = useMemo(() => {
    const code = qrcode(0, 'M');
    code.addData(text);
    code.make();
    return code.createDataURL(6, 2);
  }, [text]);
  return <img src={src} alt={tr('QR code of the room')} width={176} height={176} className="rounded-lg bg-white p-1 [image-rendering:pixelated]" />;
}

/** Runs between two answers of the server, so the seconds never jump. */
function Clock({ ms }: { ms: number }) {
  const [now, setNow] = useState(ms);
  useEffect(() => {
    const from = performance.now() - ms;
    const timer = setInterval(() => setNow(performance.now() - from), 250);
    return () => clearInterval(timer);
  }, [ms]);
  const s = Math.floor(now / 1000);
  return <span className="flex items-center gap-2 font-dot text-2xl tabular-nums text-accent"><Timer size={18} aria-hidden="true" />{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
}
