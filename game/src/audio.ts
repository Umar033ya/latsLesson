import type Phaser from 'phaser';
import { onSettings, settings } from './settings';

export const SFX = ['blip_0', 'blip_1', 'blip_2', 'blip_voice', 'correct', 'wrong', 'noticed', 'heart', 'pen', 'hum', 'static', 'power_up', 'power_down', 'bell', 'tick', 'battery_low', 'step_0', 'step_1', 'step_2', 'step_3', 'door_open', 'door_close', 'creak', 'locked', 'pickup', 'keys', 'paper', 'book', 'locker', 'locker_close', 'switch', 'type', 'wood', 'slam', 'chalk_hit', 'spark', 'cloth', 'thunder', 'rain'] as const;
export const MUSIC = ['music_title', 'music_explore', 'music_tension', 'music_chase', 'music_ending'] as const;
export type Sfx = (typeof SFX)[number];
export type Music = (typeof MUSIC)[number];

type Sound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

/** Two looping music layers that crossfade, plus positional one-shots. */
export class Audio {
  private current: Music | null = null;
  private loops = new Map<string, { sound: Sound; target: number; now: number }>();

  constructor(private readonly game: Phaser.Game) {
    onSettings(() => this.apply());
  }

  private has(key: string) {
    return this.game.cache.audio.exists(key);
  }

  play(key: Sfx, volume = 1, rate = 1) {
    if (!this.has(key) || this.game.sound.locked) return;
    this.game.sound.play(key, { volume: volume * settings.sfx, rate });
  }

  /** Volume falls with distance, so sounds tell where things are. */
  at(key: Sfx, x: number, y: number, lx: number, ly: number, range = 220, volume = 1) {
    const d = Math.hypot(x - lx, y - ly);
    if (d < range) this.play(key, volume * (1 - d / range) ** 1.5, 0.94 + Math.random() * 0.12);
  }

  music(key: Music | null) {
    if (this.current === key) return;
    this.current = key;
    for (const m of MUSIC) if (m !== key && this.loops.has(m)) this.loop(m, 0);
    if (key) this.loop(key, 1);
  }

  /** Sets the wanted level of a loop; the mix moves there smoothly in update(). */
  loop(key: string, target: number) {
    let l = this.loops.get(key);
    if (!l) {
      if (target <= 0 || !this.has(key)) return;
      l = { sound: this.game.sound.add(key, { loop: true, volume: 0 }) as Sound, target, now: 0 };
      this.loops.set(key, l);
    }
    l.target = target;
    if (target > 0 && !l.sound.isPlaying) l.sound.play();
  }

  update(dt: number) {
    for (const [key, l] of this.loops) {
      const rate = key === 'music_chase' ? 2.4 : 0.8;
      l.now += Math.sign(l.target - l.now) * Math.min(Math.abs(l.target - l.now), dt * rate);
      l.sound.setVolume(l.now * this.gain(key));
      if (l.now <= 0.001 && l.target <= 0 && l.sound.isPlaying) l.sound.stop();
    }
  }

  private gain(key: string) {
    return key.startsWith('music') ? settings.music * 0.75 : settings.sfx * 0.8;
  }

  private apply() {
    for (const [key, l] of this.loops) l.sound.setVolume(l.now * this.gain(key));
  }

  stopAll() {
    for (const l of this.loops.values()) l.target = 0;
    this.current = null;
  }
}
