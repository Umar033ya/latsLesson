import Phaser from 'phaser';
import { Audio } from './audio';
import { onLink } from './platform/http';
import { DemoSession } from './platform/demo';
import { RemoteSession } from './platform/remote';
import type { GameSession, SessionError } from './platform/session';
import { Boot } from './scenes/Boot';
import { School, type SchoolResult } from './scenes/School';
import { errorText, tr } from './i18n';
import { Overlay } from './ui/overlay';
import { boardScreen, homeUrl, resultScreen, titleScreen } from './ui/screens';
import { mountTouch } from './ui/touch';
import './styles.css';

const VIEW = { w: 480, h: 270 };
const stage = document.querySelector<HTMLDivElement>('#stage')!;

/** Canvas and DOM share one 16:9 box; --u is the size of one game pixel. */
function fit() {
  const s = Math.min(innerWidth / VIEW.w, innerHeight / VIEW.h);
  const w = Math.floor(VIEW.w * s);
  const h = Math.floor(VIEW.h * s);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  document.documentElement.style.setProperty('--u', `${w / VIEW.w}px`);
}
fit();
addEventListener('resize', fit);

async function main() {
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: VIEW.w,
    height: VIEW.h,
    pixelArt: true,
    antialias: false,
    backgroundColor: '#05060a',
    scale: { mode: Phaser.Scale.NONE },
    fps: { target: 60, min: 20 },
    input: { keyboard: false, mouse: false, touch: false },
    disableContextMenu: false,
    banner: false,
    scene: [Boot, School],
  });
  const audio = new Audio(game);
  const overlay = new Overlay(audio);
  onLink((s) => overlay.setLink(s));
  mountTouch(() => dispatchEvent(new Event('phrase-wheel')));
  game.events.on('step', (_t: number, dt: number) => audio.update(dt / 1000));
  await new Promise<void>((resolve) => game.events.once('assets-ready', () => resolve()));
  document.body.classList.add('ready');

  let error: string | undefined;
  let session: GameSession | null = null;
  try {
    session = await RemoteSession.open();
  } catch (e) {
    error = errorText(e as SessionError);
  }
  const params = new URLSearchParams(location.search);

  for (;;) {
    const unlockMusic = () => audio.music('music_title');
    addEventListener('pointerdown', unlockMusic, { once: true });
    addEventListener('keydown', unlockMusic, { once: true });
    const choice = await titleScreen({ session, error, onSound: () => audio.play('slam', 0.4) });
    error = undefined;
    const active: GameSession = choice === 'demo' || !session ? new DemoSession(params.get('name') ?? 'Student') : session;
    document.documentElement.style.setProperty('--accent', active.data.branding.accent);
    const result = await new Promise<SchoolResult>((resolve) => {
      game.scene.start('School', { session: active, audio, overlay, done: resolve });
    });
    game.scene.stop('School');
    audio.stopAll();
    if (result.lost) {
      await overlay.message(tr('The session has ended'), result.lost, tr('Back to my page'));
      location.assign(homeUrl(active));
      return;
    }
    audio.music('music_ending');
    const next = result.summary ? await resultScreen(result.summary, active, result.pages) : 'home';
    if (active.room) await boardScreen(active, active.room);
    if (next === 'home') {
      location.assign(homeUrl(active));
      return;
    }
    session = null;
    await overlay.fade(false, 0);
  }
}

main().catch((e) => {
  console.error(e);
  document.querySelector('#ui')!.textContent = tr('The game could not start on this device. It needs WebGL.');
});

// Lets automated checks reach the running scene in development builds only.
export {};
