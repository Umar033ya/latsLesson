import Phaser from 'phaser';
import { COLS, Grid, ROWS, TILE, type WallKind } from './map';

/** Draws floors, wall faces, edges and contact shadows once into a single texture. */
export function bakeSchool(scene: Phaser.Scene, grid: Grid): Phaser.GameObjects.Image {
  if (scene.textures.exists('school')) scene.textures.remove('school');
  const tex = scene.textures.createCanvas('school', COLS * TILE, ROWS * TILE)!;
  const g = tex.getContext();
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  const atlas = scene.textures.get('world');
  const draw = (frame: string, x: number, y: number) => {
    const f = atlas.get(frame);
    g.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, x, y, f.cutWidth, f.cutHeight);
  };
  const rnd = (x: number, y: number, n: number) => Math.abs((x * 73856093) ^ (y * 19349663)) % n;
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLS; x += 1) {
      if (!grid.isFloor(x, y)) continue;
      const i = grid.i(x, y);
      const floor = grid.passage[i] ? 'concrete' : (grid.room[i]?.floor ?? 'hall');
      draw(`floor_${floor}_${rnd(x, y, 4)}`, x * TILE, y * TILE);
    }
  // Wall faces: two tiles high above any floor cell whose northern neighbour is solid.
  for (let y = 2; y < ROWS; y += 1)
    for (let x = 0; x < COLS; x += 1) {
      if (!grid.isFloor(x, y) || grid.isFloor(x, y - 1)) continue;
      const i = grid.i(x, y);
      const kind: WallKind = grid.passage[i] ? 'brick' : (grid.room[i]?.wall ?? 'hall');
      const r = rnd(x, y, 11);
      draw(`wall_${kind}_${r === 0 ? 1 : r === 1 ? 2 : 0}`, x * TILE, (y - 2) * TILE);
      const shade = g.createLinearGradient(0, y * TILE, 0, y * TILE + 10);
      shade.addColorStop(0, 'rgba(3,4,8,.62)');
      shade.addColorStop(1, 'rgba(3,4,8,0)');
      g.fillStyle = shade;
      g.fillRect(x * TILE, y * TILE, TILE, 10);
    }
  const solid = (x: number, y: number) => !grid.isFloor(x, y) && !(grid.isFloor(x, y + 1) || grid.isFloor(x, y + 2));
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLS; x += 1) {
      const px = x * TILE;
      const py = y * TILE;
      if (grid.isFloor(x, y)) {
        g.fillStyle = 'rgba(3,4,8,.38)';
        if (!grid.isFloor(x - 1, y)) g.fillRect(px, py, 3, TILE);
        if (!grid.isFloor(x + 1, y)) g.fillRect(px + TILE - 3, py, 3, TILE);
        if (!grid.isFloor(x, y + 1)) g.fillRect(px, py + TILE - 4, TILE, 4);
      }
      if (!solid(x, y)) continue;
      // A thin lit rim separates the black wall tops from the rooms.
      g.fillStyle = '#2a3346';
      if (!solid(x, y + 1) && y + 1 < ROWS) g.fillRect(px, py + TILE - 2, TILE, 1);
      if (!solid(x - 1, y) && x > 0) g.fillRect(px, py, 1, TILE);
      if (!solid(x + 1, y) && x + 1 < COLS) g.fillRect(px + TILE - 1, py, 1, TILE);
      if (y > 0 && grid.isFloor(x, y - 1)) g.fillRect(px, py, TILE, 1);
    }
  tex.refresh();
  return scene.add.image(0, 0, 'school').setOrigin(0).setDepth(-1000);
}
