import { getLanguage } from './i18n';
import { settings } from './settings';

/**
 * Reads lines aloud with the voices installed in the browser. There are no recorded actors:
 * when no voice exists for the language, the game stays with its text sounds.
 */
const CODES = { en: ['en'], ru: ['ru'], uz: ['uz'] } as const;
const PITCH: Record<string, [pitch: number, rate: number]> = { me: [1.15, 1.02], voice: [1.4, 1.05], invigilator: [0.35, 0.8], narration: [0.95, 0.98], question: [1, 0.95] };

function voice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const codes = CODES[getLanguage()] as readonly string[];
  const list = speechSynthesis.getVoices().filter((v) => codes.some((c) => v.lang.toLowerCase().startsWith(c)));
  return list.find((v) => /natural|neural|google|premium/i.test(v.name)) ?? list[0] ?? null;
}
// Chrome fills the list asynchronously.
if ('speechSynthesis' in window) speechSynthesis.getVoices();

export const canSpeak = () => voice() !== null;

export function speak(text: string, who = 'narration'): boolean {
  if (!settings.voice) return false;
  const v = voice();
  if (!v) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.volume = Math.min(1, settings.sfx + 0.1);
  [u.pitch, u.rate] = PITCH[who] ?? PITCH.narration;
  speechSynthesis.speak(u);
  return true;
}

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
