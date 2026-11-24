import Phaser from 'phaser';
import { LOBBY_COLORS, type LobbyPeer, type PhraseId } from '@last-lesson/scenario';
import { NameTag } from '../ui/room';

const FRAME = { w: 18, h: 26 };
/** The red scarf of the player sprite: light and shaded pixel. */
const SCARF = ['b23a3f', '6f2430'];
const DIRS = ['down', 'side', 'up'] as const;
/** Farther than this the position is corrected at once instead of walked to. */
const SNAP = 140;

/** Returns a copy of the player sheet with another scarf, creating it and its walk cycles once. */
export function skin(scene: Phaser.Scene, color: number): string {
  const index = color % LOBBY_COLORS.length;
  const key = `player_${index}`;
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get('player').getSourceImage() as HTMLImageElement;
  const sheet = scene.textures.createCanvas(key, source.width, source.height)!;
  const g = sheet.getContext();
  g.drawImage(source, 0, 0);
  const pixels = g.getImageData(0, 0, source.width, source.height);
  const rgb = Phaser.Display.Color.HexStringToColor(LOBBY_COLORS[index]);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const hex = [0, 1, 2].map((n) => pixels.data[i + n].toString(16).padStart(2, '0')).join('');
    const shade = SCARF.indexOf(hex);
    if (shade < 0 || !pixels.data[i + 3]) continue;
    const k = shade ? 0.62 : 1;
    [rgb.red, rgb.green, rgb.blue].forEach((v, n) => (pixels.data[i + n] = Math.round(v * k)));
  }
  g.putImageData(pixels, 0, 0);
  const columns = source.width / FRAME.w;
  for (let n = 0; n < columns * (source.height / FRAME.h); n += 1) sheet.add(n, 0, (n % columns) * FRAME.w, Math.floor(n / columns) * FRAME.h, FRAME.w, FRAME.h);
  sheet.refresh();
  DIRS.forEach((d, i) => scene.anims.create({ key: `walk_${d}_${key}`, frames: scene.anims.generateFrameNumbers(key, { start: i * 4, end: i * 4 + 3 }), frameRate: 8, repeat: -1 }));
  return key;
}

interface Friend {
  sprite: Phaser.GameObjects.Sprite;
  tag: NameTag;
  texture: string;
  peer: LobbyPeer;
  phraseAt: number;
}

/** The other players of the room. Positions arrive about once a second and are walked to smoothly. */
export class Friends {
  private readonly all = new Map<string, Friend>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPhrase: (peer: LobbyPeer, id: PhraseId) => void,
  ) {}

  apply(peers: LobbyPeer[]) {
    const present = new Set(peers.map((p) => p.id));
    for (const [id, f] of this.all) if (!present.has(id)) this.remove(id, f);
    for (const peer of peers) {
      const friend = this.all.get(peer.id) ?? this.create(peer);
      friend.peer = peer;
      if (peer.phrase && peer.phraseAt > friend.phraseAt) {
        friend.tag.say(peer.phrase);
        this.onPhrase(peer, peer.phrase);
      }
      friend.phraseAt = peer.phraseAt;
    }
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, sameRoom: (x: number, y: number) => boolean) {
    for (const { sprite, tag, texture, peer } of this.all.values()) {
      // Until the first report the player stands in the corner of the map and is not shown.
      const shown = !peer.finished && (peer.x > 0 || peer.y > 0);
      const visible = shown && !peer.hidden;
      sprite.setVisible(visible);
      const dx = peer.x - sprite.x;
      const dy = peer.y - sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance > SNAP) sprite.setPosition(peer.x, peer.y);
      else {
        const k = Math.min(1, dt * 3.2);
        sprite.setPosition(sprite.x + dx * k, sprite.y + dy * k);
      }
      const walking = distance > 2;
      const dir = walking ? (Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down') : peer.dir === 'left' || peer.dir === 'right' ? 'side' : peer.dir;
      if (dir === 'side') sprite.setFlipX(walking ? dx < 0 : peer.dir === 'left');
      else sprite.setFlipX(false);
      if (walking) sprite.anims.play(`walk_${dir}_${texture}`, true);
      else {
        sprite.anims.stop();
        sprite.setFrame(DIRS.indexOf(dir) * 4);
      }
      sprite.setDepth(sprite.y);
      tag.place(sprite.x - cam.scrollX, sprite.y - cam.scrollY - FRAME.h, shown ? (peer.hidden ? 0.4 : sameRoom(sprite.x, sprite.y) ? 1 : 0.5) : 0);
    }
  }

  /** Where friends stand, for a little light around them. */
  *spots() {
    for (const { sprite } of this.all.values()) if (sprite.visible) yield { x: sprite.x, y: sprite.y };
  }

  destroy() {
    for (const [id, f] of this.all) this.remove(id, f);
  }

  private create(peer: LobbyPeer): Friend {
    const texture = skin(this.scene, peer.color);
    const friend: Friend = { texture, peer, sprite: this.scene.add.sprite(peer.x, peer.y, texture, 0).setOrigin(0.5, 0.94).setAlpha(0.92), tag: new NameTag(peer.nickname, peer.color), phraseAt: peer.phraseAt };
    this.all.set(peer.id, friend);
    return friend;
  }

  private remove(id: string, f: Friend) {
    f.sprite.destroy();
    f.tag.destroy();
    this.all.delete(id);
  }
}
