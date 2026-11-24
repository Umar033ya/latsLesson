import Phaser from 'phaser';
import { COLS, Grid, PROPS, ROWS, TILE } from './map';

export const MAX_LIGHTS = 12;
export interface Light {
  x: number;
  y: number;
  r: number;
  color: [number, number, number];
  power: number;
  /** Cone: direction and half angle in radians. Omit for a round light. */
  dir?: [number, number];
  angle?: number;
}

const FRAG = `
precision mediump float;
#define LIGHTS ${MAX_LIGHTS}
uniform sampler2D uMainSampler;
uniform sampler2D uOcc;
uniform vec2 uCam;
uniform vec2 uView;
uniform vec2 uWorld;
uniform vec4 uLight[LIGHTS];
uniform vec4 uColor[LIGHTS];
uniform vec4 uCone[LIGHTS];
uniform vec3 uAmbient;
uniform vec3 uTint;
uniform float uTime;
uniform float uFlash;
uniform float uDread;
uniform float uSteps;
uniform float uBright;
uniform vec4 uRoom;
varying vec2 outTexCoord;

float bayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float a = mod(q.x * 2.0 + q.y * 3.0 + q.x * q.y * 5.0, 16.0);
  return (a + 0.5) / 16.0;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float shadow(vec2 from, vec2 to) {
  vec2 d = to - from;
  float lit = 1.0;
  for (int i = 1; i < 26; i++) {
    float f = float(i) / uSteps;
    if (f >= 1.0) break;
    float o = texture2D(uOcc, (from + d * f) / uWorld).r;
    lit *= 1.0 - o * 0.85;
    if (lit < 0.03) return 0.0;
  }
  return lit;
}

void main() {
  vec2 screen = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uView;
  vec2 pos = uCam + floor(screen) + 0.5;
  vec4 tex = texture2D(uMainSampler, outTexCoord);
  vec2 off = max(max(uRoom.xy - pos, pos - uRoom.zw), vec2(0.0));
  float outside = smoothstep(0.0, 20.0, length(off));
  vec3 light = (uAmbient + vec3(0.55, 0.62, 0.75) * uFlash) * (1.0 - outside * 0.8);
  for (int i = 0; i < LIGHTS; i++) {
    float r = uLight[i].z;
    if (r <= 0.0) continue;
    vec2 d = pos - uLight[i].xy;
    float dist = length(d * vec2(1.0, 1.12));
    if (dist > r) continue;
    float a = 1.0 - dist / r;
    a = a * a * (1.6 - 0.6 * a);
    if (uCone[i].z > -1.5) {
      float c = dot(d / max(dist, 0.001), uCone[i].xy);
      a *= smoothstep(uCone[i].z, uCone[i].w, c) + 0.1 * (1.0 - smoothstep(0.0, 26.0, dist));
      if (dist < 12.0) a = max(a, 0.28);
    }
    a *= uLight[i].w;
    if (a < 0.015) continue;
    light += uColor[i].rgb * a * shadow(pos, uLight[i].xy);
  }
  // Quantised light with ordered dithering keeps the falloff in the pixel-art language.
  float lum = max(max(light.r, light.g), light.b);
  float levels = 11.0;
  float q = floor(lum * levels + bayer(floor(screen)) ) / levels;
  light *= mix(1.0, q / max(lum, 0.001), 0.75);
  light = min(light, vec3(1.5));
  vec3 col = tex.rgb * light * uTint * uBright;
  float grey = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(grey), uDread * 0.45);
  vec2 v = outTexCoord - 0.5;
  col *= 1.0 - dot(v, v) * (0.75 + uDread * 0.8);
  col += (hash(floor(screen) + floor(uTime * 12.0)) - 0.5) * (0.018 + uDread * 0.05);
  gl_FragColor = vec4(col, 1.0);
}`;

export class LightPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  lights: Light[] = [];
  cam = { x: 0, y: 0 };
  ambient: [number, number, number] = [0.15, 0.18, 0.26];
  tint: [number, number, number] = [1, 1, 1];
  flash = 0;
  dread = 0;
  steps = 22;
  bright = 1;
  /** The room the player is in; everything else keeps only a hint of ambient light. */
  room: [number, number, number, number] = [0, 0, 4000, 4000];
  occluder: Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper | null = null;
  private l = new Float32Array(MAX_LIGHTS * 4);
  private c = new Float32Array(MAX_LIGHTS * 4);
  private k = new Float32Array(MAX_LIGHTS * 4);

  constructor(game: Phaser.Game) {
    super({ game, name: 'Light', fragShader: FRAG });
  }

  onPreRender() {
    this.l.fill(0);
    this.lights.slice(0, MAX_LIGHTS).forEach((x, i) => {
      this.l.set([x.x, x.y, x.r, x.power], i * 4);
      this.c.set([...x.color, 1], i * 4);
      this.k.set(x.dir && x.angle ? [x.dir[0], x.dir[1], Math.cos(x.angle), Math.cos(x.angle * 0.45)] : [0, 0, -2, -2], i * 4);
    });
    this.set4fv('uLight', this.l);
    this.set4fv('uColor', this.c);
    this.set4fv('uCone', this.k);
    this.set2f('uCam', this.cam.x, this.cam.y);
    this.set2f('uView', this.renderer.width, this.renderer.height);
    this.set2f('uWorld', COLS * TILE, ROWS * TILE);
    this.set3f('uAmbient', ...this.ambient);
    this.set3f('uTint', ...this.tint);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uFlash', this.flash);
    this.set1f('uDread', this.dread);
    this.set1f('uSteps', this.steps);
    this.set1f('uBright', this.bright);
    this.set4f('uRoom', ...this.room);
    this.set1i('uOcc', 1);
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget) {
    if (this.occluder) this.bindTexture(this.occluder, 1);
    this.bindAndDraw(target);
  }
}

/** One texel per 4 px: walls, closed doors and tall furniture stop light. */
export class Occluders {
  private readonly tex: Phaser.Textures.CanvasTexture;
  constructor(
    scene: Phaser.Scene,
    private readonly grid: Grid,
  ) {
    if (scene.textures.exists('occ')) scene.textures.remove('occ');
    this.tex = scene.textures.createCanvas('occ', COLS * 4, ROWS * 4)!;
    this.tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.redraw();
  }

  redraw() {
    const g = this.tex.getContext();
    g.fillStyle = '#000';
    g.fillRect(0, 0, COLS * 4, ROWS * 4);
    g.fillStyle = '#fff';
    const face = (x: number, y: number) => this.grid.isFloor(x, y + 1) || this.grid.isFloor(x, y + 2);
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) if (!this.grid.isFloor(x, y) && !face(x, y)) g.fillRect(x * 4, y * 4, 4, 4);
    for (const i of this.grid.closedCells()) g.fillRect((i % COLS) * 4, Math.floor(i / COLS) * 4, 4, 4);
    g.fillStyle = '#bbb';
    for (const p of PROPS) if (p.tall && p.solid && (p.id !== 'secret_shelf' || this.grid.solids.some((s) => s.id === p.id))) g.fillRect((p.x - p.solid[0] / 2) / 4 + 0.5, (p.y - p.solid[1]) / 4, p.solid[0] / 4 - 1, p.solid[1] / 4 - 0.5);
    this.tex.refresh();
  }

  get gl() {
    return this.tex.source[0].glTexture!;
  }
}
