import { useState } from 'react';
import clsx from 'clsx';
import { Check, Clock, Lock, Play, RotateCcw } from 'lucide-react';
import { tr } from '../../lib/i18n';
import { chooseCourse, chosenCourse } from '../../lib/course';

export interface Level {
  campaignId: string;
  number: number;
  title: string;
  state: 'DONE' | 'OPEN' | 'LOCKED';
  topics: string[];
  minutes: number;
  accuracy: number | null;
  inProgress: string | null;
}
export interface Path {
  subject: { id: string; name: string; slug: string };
  start: number;
  levels: Level[];
}

const NAMES = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate'];
export const levelName = (n: number) => NAMES[n - 1] ?? tr('Level {0}', { 0: n });

/** Where the steps stand on the map, in percent: a path that winds like a corridor. */
const SPOTS = [[10, 72], [30, 34], [51, 66], [71, 30], [90, 62]] as const;
const spot = (i: number, count: number) => (count <= SPOTS.length ? SPOTS[i] : ([8 + (84 * i) / (count - 1), i % 2 ? 32 : 68] as const));

/** Subjects as tabs, levels as a map. Passing a level opens the next one; passed levels can be repeated. */
export function LevelMap({ paths, busy, onPlay }: { paths: Path[]; busy: boolean; onPlay: (level: Level) => void }) {
  const [subjectId, setSubject] = useState(() => chosenCourse());
  const path = paths.find((p) => p.subject.id === subjectId) ?? paths[0];
  const [picked, setPicked] = useState<string | null>(null);
  if (!path) return null;
  const next = path.levels.find((l) => l.state === 'OPEN') ?? path.levels[path.levels.length - 1];
  const level = path.levels.find((l) => l.campaignId === picked) ?? next;
  const done = path.levels.filter((l) => l.state === 'DONE').length;
  const choose = (id: string) => {
    setSubject(id);
    setPicked(null);
    chooseCourse(id);
  };
  return (
    <section className="npanel mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div><h2 className="text-xl font-bold">{tr('My course')}</h2><p className="text-fog">{tr('Passed levels: {0} of {1}', { 0: done, 1: path.levels.length })}</p></div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr('Subject')}>
          {paths.map((p) => <button key={p.subject.id} role="tab" aria-selected={p === path} onClick={() => choose(p.subject.id)} className={clsx('rounded-xl border px-4 py-2 text-sm font-semibold transition', p === path ? 'border-lamp bg-lamp text-night' : 'border-white/15 bg-white/5 text-fog hover:border-lamp/60 hover:text-bone')}>{tr(p.subject.name)}</button>)}
        </div>
      </div>
      <div className="relative h-72 border-y border-white/10 bg-black/30 sm:h-80">
        <div className="absolute inset-0 bg-cover bg-[50%_80%] opacity-40 [image-rendering:pixelated]" style={{ backgroundImage: 'url(/art/title.png)' }} aria-hidden="true" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {path.levels.slice(1).map((l, i) => {
            const [x1, y1] = spot(i, path.levels.length);
            const [x2, y2] = spot(i + 1, path.levels.length);
            return <line key={l.campaignId} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" strokeWidth="5" strokeDasharray={l.state === 'LOCKED' ? '3 11' : undefined} strokeLinecap="round" className={l.state === 'LOCKED' ? 'stroke-fog/40' : 'stroke-lamp'} />;
          })}
        </svg>
        <ol>
          {path.levels.map((l, i) => {
            const [x, y] = spot(i, path.levels.length);
            const Icon = l.state === 'DONE' ? Check : l.state === 'LOCKED' ? Lock : Play;
            return (
              <li key={l.campaignId} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}>
                <button aria-pressed={l === level} aria-label={`${tr('Level {0}', { 0: l.number })}. ${l.state === 'DONE' ? tr('Passed') : l.state === 'LOCKED' ? tr('Locked') : tr('Open now')}`} onClick={() => setPicked(l.campaignId)} className={clsx('mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 shadow-lg transition sm:h-16 sm:w-16', l.state === 'DONE' ? 'border-[#5a86f0] bg-[#1f3f94] text-bone' : l.state === 'OPEN' ? 'border-lamp bg-lamp text-night' : 'border-white/20 bg-night-3 text-fog', l === level && 'scale-110 ring-4 ring-bone/40', l === next && l.state === 'OPEN' && 'animate-pulse')}><Icon size={24} /></button>
                <span className="mt-2 block whitespace-nowrap rounded-full bg-night/80 px-2 py-0.5 text-xs font-semibold">{l.number}<span className="hidden sm:inline">. {levelName(l.number)}</span></span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{tr('Level {0}', { 0: level.number })}. {levelName(level.number)}</h3>
          <p className="mt-1 text-fog">{level.topics.map((t) => tr(t)).join(', ')}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-fog"><span className="flex items-center gap-1.5"><Clock size={15} aria-hidden="true" />{tr('up to {0} minutes', { 0: level.minutes })}</span>{level.accuracy !== null && <span className="text-lamp">{tr('Best: {0}%', { 0: level.accuracy })}</span>}{level.number > 1 && <span>{tr('Some questions repeat earlier levels.')}</span>}</p>
        </div>
        {level.state === 'LOCKED' ? (
          <p className="flex items-center gap-2 text-fog"><Lock size={17} aria-hidden="true" />{tr('Pass the previous level first')}</p>
        ) : (
          <button className="nbtn" disabled={busy} onClick={() => onPlay(level)}>{level.state === 'DONE' ? <RotateCcw size={17} /> : <Play size={17} />}{level.inProgress ? tr('Continue') : level.state === 'DONE' ? tr('Repeat the level') : tr('Start the level')}</button>
        )}
      </div>
    </section>
  );
}
