export interface Settings {
  music: number;
  sfx: number;
  textSpeed: number;
  brightness: number;
  calmFlashes: boolean;
  lowQuality: boolean;
  /** Read dialogue aloud when the browser has a voice for the language. */
  voice: boolean;
  /** Arrow that points to the next task. */
  guide: boolean;
}
const KEY = 'last-lesson-settings';
const base: Settings = { music: 0.7, sfx: 0.8, textSpeed: 1, brightness: 1.2, calmFlashes: false, lowQuality: matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4), voice: true, guide: true };

function load(): Settings {
  try {
    return { ...base, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return { ...base };
  }
}
export const settings: Settings = load();
const listeners = new Set<() => void>();
export const onSettings = (fn: () => void) => listeners.add(fn);
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn());
}
