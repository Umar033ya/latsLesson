import { DEFAULT_GAMEPLAY, type GameplayConfig } from '@last-lesson/scenario';
import { Choice, Text } from './ui';
import { tr } from '../lib/i18n';

const TENSION: Record<string, string> = { CALM: tr('Calm: slow, keeps to corridors (from about 9 years)'), STANDARD: tr('Standard (from about 12 years)'), TENSE: tr('Tense: faster and more attentive') };

/** Shared by center defaults and campaign overrides. With `inherit`, an empty choice keeps the center default. */
export function GameplayFields({ value, onChange, policy, inherit }: { value: Partial<GameplayConfig>; onChange: (v: Partial<GameplayConfig>) => void; policy?: { allowedTensions: string[]; maxSessionMinutes: number }; inherit?: boolean }) {
  const v = (k: keyof GameplayConfig) => (value[k] === undefined ? '' : String(value[k]));
  const set = (k: keyof GameplayConfig, raw: string, parse: (s: string) => unknown) => {
    const next: any = { ...value };
    if (raw === '' && inherit) delete next[k];
    else next[k] = parse(raw === '' ? String(DEFAULT_GAMEPLAY[k]) : raw);
    onChange(next);
  };
  const opts = (list: Array<[string, string]>): Array<[string, string]> => (inherit ? [['', tr('Center default')], ...list] : list);
  const pick = (k: keyof GameplayConfig, label: string, list: Array<[string, string]>, parse: (s: string) => unknown = (s) => s, hint?: string) => <Choice label={label} hint={hint} value={v(k) || (inherit ? '' : String(DEFAULT_GAMEPLAY[k]))} options={opts(list)} onChange={(e) => set(k, e.target.value, parse)} />;
  const num = (from: number, to: number, unit = '') => Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), `${from + i}${unit}`] as [string, string]);
  const max = policy?.maxSessionMinutes ?? 60;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pick('mode', tr('Mode'), [['STORY', tr('Story: the Invigilator walks the school')], ['STUDY', tr('Study: nobody else is there')]])}
      {pick('tension', tr('Intensity'), (policy?.allowedTensions ?? ['CALM', 'STANDARD', 'TENSE']).map((t) => [t, TENSION[t]]))}
      {pick('lives', tr('Chances before detention'), num(1, 5), Number)}
      {pick('attemptsPerQuestion', tr('Tries per question'), num(1, 5), Number)}
      {pick('hintsPerSession', tr('Hints per session'), num(0, 10), Number)}
      {pick('wrongAnswer', tr('A wrong answer'), [['NONE', tr('Has no other effect')], ['NOISE', tr('Makes noise')], ['BATTERY', tr('Costs battery')], ['NOISE_AND_BATTERY', tr('Makes noise and costs battery')]])}
      {pick('batteryDrain', tr('Torch battery'), [['0', tr('Never runs out')], ['0.5', tr('Lasts long')], ['1', tr('Normal')], ['1.5', tr('Runs out sooner')], ['2', tr('Runs out fast')]], Number)}
      {pick('questionTimeLimit', tr('Time per question'), [['0', tr('Unlimited')], ['30', '30 seconds'], ['60', '1 minute'], ['90', '90 seconds'], ['120', '2 minutes'], ['300', '5 minutes']], Number)}
      {pick('hidingQuestions', tr('Questions while hiding'), [['true', tr('Yes, every time')], ['false', tr('No')]], (s) => s === 'true')}
      {pick('lessonCards', tr('Short lesson before a question'), [['true', tr('Yes, once per topic')], ['false', tr('No')]], (s) => s === 'true')}
      {pick('pauseOnQuestion', tr('While a question is open'), [['true', tr('The school waits')], ['false', tr('The school keeps moving, slowly')]], (s) => s === 'true')}
      <Text label={tr('Session length in minutes (10 to {0})', { 0: max })} type="number" min={10} max={max} placeholder={inherit ? tr('Center default') : undefined} value={v('sessionMinutes')} onChange={(e) => set('sessionMinutes', e.target.value, (s) => Math.min(max, Math.max(1, Number(s))))} onBlur={(e) => e.target.value && set('sessionMinutes', e.target.value, (s) => Math.min(max, Math.max(10, Number(s))))} />
    </div>
  );
}
