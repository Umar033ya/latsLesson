import clsx from 'clsx';
import { LOBBY_COLORS, type LobbyStanding } from '@last-lesson/scenario';
import { OUTCOME } from '../../lib/format';
import { tr } from '../../lib/i18n';

export const colorOf = (index: number) => LOBBY_COLORS[index] ?? LOBBY_COLORS[0];
export const escaped = (s: LobbyStanding) => s.outcome === 'ESCAPED' || s.outcome === 'DISMISSED';

export function raceTime(ms: number | null): string {
  if (ms === null) return '';
  const minutes = Math.floor(ms / 60_000);
  const seconds = ((ms % 60_000) / 1000).toFixed(1);
  return minutes ? tr('{0} min {1} s', { 0: minutes, 1: seconds }) : tr('{0} s', { 0: seconds });
}

export const Dot = ({ color, className }: { color: number; className?: string }) => <i className={clsx('inline-block h-3 w-3 shrink-0 rounded-[3px]', className)} style={{ background: colorOf(color) }} aria-hidden="true" />;

/** First three places. Only players who reached the door stand here. */
export function Podium({ standings, dark }: { standings: LobbyStanding[]; dark?: boolean }) {
  const top = standings.filter(escaped).slice(0, 3);
  if (!top.length) return null;
  const order = [top[1], top[0], top[2]];
  const height = ['h-24', 'h-32', 'h-20'];
  return (
    <ol className="mx-auto mb-6 flex max-w-xl items-end justify-center gap-3" aria-label={tr('First places')}>
      {order.map((s, i) =>
        s ? (
          <li key={s.id} className="min-w-0 flex-1 text-center">
            <p className="flex items-center justify-center gap-2 truncate font-semibold"><Dot color={s.color} />{s.nickname}</p>
            <p className={clsx('mb-2 text-sm tabular-nums', dark ? 'text-lamp' : 'text-soft')}>{raceTime(s.durationMs)}</p>
            <div className={clsx('grid place-items-center rounded-t-xl font-jac text-5xl', height[i], i === 1 ? 'bg-lamp text-night' : dark ? 'bg-night-3 text-bone' : 'bg-accent-soft text-accent')}>{s.place}</div>
          </li>
        ) : (
          <li key={i} className="flex-1" aria-hidden="true" />
        ),
      )}
    </ol>
  );
}

/** Places, times and points of a room. While the game runs it shows how far everybody is. */
export function Standings({ standings, steps, meId, dark, onKick }: { standings: LobbyStanding[]; steps: number; meId?: string; dark?: boolean; onKick?: (s: LobbyStanding) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full border-collapse text-left', dark ? 'text-bone [&_td]:border-night-4 [&_th]:border-night-4' : '[&_td]:border-rule [&_th]:border-rule')}>
        <thead>
          <tr className={clsx('text-[13px] [&>th]:border-b [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold', dark ? 'text-fog' : 'text-soft')}>
            <th className="w-16">{tr('Place')}</th><th>{tr('Player')}</th><th>{tr('Time')}</th><th>{tr('Path')}</th><th className="text-right">{tr('Points')}</th>{onKick && <th />}
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className={clsx('[&>td]:border-b [&>td]:px-3 [&>td]:py-2.5', s.id === meId && (dark ? 'bg-night-3' : 'bg-accent-soft'))}>
              <td className={clsx('font-jac text-2xl leading-none', s.place === 1 && escaped(s) && 'text-lamp')}>{s.place ?? <span className="text-base opacity-40">{i + 1}</span>}</td>
              <td><span className="flex items-center gap-2.5"><Dot color={s.color} /><b className="font-semibold">{s.nickname}</b>{!s.online && !s.outcome && <span className="text-[13px] opacity-60">{tr('offline')}</span>}</span></td>
              <td className="whitespace-nowrap tabular-nums">{!s.outcome ? <span className="opacity-60">{tr('in the school')}</span> : escaped(s) ? raceTime(s.durationMs) : OUTCOME[s.outcome]}</td>
              <td className="min-w-[120px]">
                <div className="flex items-center gap-2">
                  <div className={clsx('h-2 flex-1 rounded-full', dark ? 'bg-night-4' : 'bg-track')}><div className="h-full rounded-full transition-[width]" style={{ width: `${steps ? (s.progress / steps) * 100 : 0}%`, background: colorOf(s.color) }} /></div>
                  <span className="text-[13px] tabular-nums opacity-70">{s.progress}/{steps}</span>
                </div>
              </td>
              <td className="text-right font-semibold tabular-nums">{s.score}</td>
              {onKick && <td className="text-right">{!s.outcome && <button className="btn-quiet hover:!text-pencil-dark" onClick={() => onKick(s)}>{tr('Remove')}</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
