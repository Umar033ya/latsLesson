import Phaser from 'phaser';
import { MUSIC, SFX } from '../audio';
import { LightPipeline } from '../world/lighting';

/** Loads everything behind a plain DOM progress bar. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = document.createElement('div');
    bar.id = 'loading';
    bar.append(document.createElement('i'));
    document.querySelector('#ui')!.append(bar);
    this.load.on('progress', (p: number) => ((bar.firstChild as HTMLElement).style.width = `${p * 100}%`));
    this.load.on('complete', () => bar.remove());
    this.load.setPath('assets/');
    this.load.atlas('world', 'world.png', 'world.json');
    this.load.spritesheet('player', 'player.png', { frameWidth: 18, frameHeight: 26 });
    this.load.spritesheet('invigilator', 'invigilator.png', { frameWidth: 36, frameHeight: 64 });
    this.load.image('glow', 'glow.png');
    for (const key of [...SFX, ...MUSIC]) this.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.m4a`]);
  }

  create() {
    if (this.game.renderer.type === Phaser.WEBGL) {
      const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      renderer.pipelines.addPostPipeline('Light', LightPipeline);
    }
    const anim = (key: string, texture: string, start: number, rate: number) => this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start, end: start + 3 }), frameRate: rate, repeat: -1 });
    ['down', 'side', 'up'].forEach((d, i) => {
      anim(`walk_${d}`, 'player', i * 4, 8);
      anim(`inv_${d}`, 'invigilator', i * 8, 5);
      anim(`mark_${d}`, 'invigilator', i * 8 + 4, 8);
    });
    this.game.events.emit('assets-ready');
  }
}
