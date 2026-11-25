import Phaser from 'phaser';
import { Audio } from './audio';
import { onLink } from './platform/http';
import { RemoteSession } from './platform/remote';
import type { GameSession, SessionError } from './platform/session';
import { Boot } from './scenes/Boot';
import { School, type SchoolResult } from './scenes/School';
import { errorText, tr } from './i18n';
import { Overlay } from './ui/overlay';
import { boardScreen, homeUrl, resultScreen, titleScreen } from './ui/screens';
import { mountTouch } from './ui/touch';
import './styles.css';

/** The school is always 270 pixels high on a wide screen and 360 wide on a narrow one; the other side follows the window. */
const BASE = { h: 270, w: 360 };
const LIMIT = { w: 760, h: 480 };
const stage = document.querySelector<HTMLDivElement>('#stage')!;

/** Canvas and DOM share one box that fills the window; --u is the size of one game pixel. */
function view() {
  const wide = innerWidth / innerHeight >= BASE.w / BASE.h;
  const u = wide ? innerHeight / BASE.h : innerWidth / BASE.w;
  return { u, w: Math.min(LIMIT.w, Math.ceil(innerWidth / u)), h: Math.min(LIMIT.h, Math.ceil(innerHeight / u)) };
}

function fit(game?: Phaser.Game) {
  const { u, w, h } = view();
  stage.style.width = `${Math.min(innerWidth, w * u)}px`;
  stage.style.height = `${Math.min(innerHeight, h * u)}px`;
  document.documentElement.style.setProperty('--u', `${u}px`);
  // The canvas may be a fraction of a pixel larger than the stage, so that its pixels stay square.
  const canvas = game?.canvas;
  if (canvas) Object.assign(canvas.style, { width: `${w * u}px`, height: `${h * u}px` });
  if (game && (game.scale.width !== w || game.scale.height !== h)) game.scale.resize(w, h);
}
fit();

async function main() {
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: view().w,
    height: view().h,
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
  addEventListener('resize', () => fit(game));
  game.events.once('ready', () => fit(game));
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

  for (;;) {
    const unlockMusic = () => audio.music('music_title');
    addEventListener('pointerdown', unlockMusic, { once: true });
    addEventListener('keydown', unlockMusic, { once: true });
    const choice = await titleScreen({ session, error, onSound: () => audio.play('slam', 0.4) });
    error = undefined;
    let active = session;
    if (choice === 'guest' || !active) {
      try {
        active = await RemoteSession.guest(tr('Student'));
      } catch (e) {
        error = errorText(e as SessionError);
        continue;
      }
    }
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
