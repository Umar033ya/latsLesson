/** Line icons, drawn with one stroke so that they stay readable at any scale of the stage. */
const PATHS = {
  jump: 'M3 18h4l3-6 3 4h5l3-7 M4 7h4 M6 5v4 M16 4l2-2 2 2',
  use: 'M8 12V5a2 2 0 014 0v6 M12 11V8a2 2 0 014 0v4 M16 12v-2a2 2 0 014 0v5a7 7 0 01-13 3l-4-6a2 2 0 013-2l2 2',
  torch: 'M6 3h12l-2 7v11H8V10z M12 13v3',
  battery: 'M3 7h15v10H3z M18 10h3v4h-3 M9 9l-2 3h4l-2 3',
  chalk: 'M4 20L17 7l3 3L7 23z M15 4l2-2',
  notebook: 'M5 3h14v18H5z M9 3v18 M12 8h4 M12 12h4',
  talk: 'M3 4h18v12H11l-5 5v-5H3z',
  pause: 'M7 4h3v16H7z M14 4h3v16h-3z',
  full: 'M3 9V3h6 M21 9V3h-6 M3 15v6h6 M21 15v6h-6',
  play: 'M7 4l13 8-13 8z',
  key: 'M8 11a4 4 0 110 8 4 4 0 010-8z M11 13l9-9 M16 8l3 3 M19 5l2 2',
  room: 'M4 21V5l9-3v22l-9-3z M13 5h6v16h-6 M10 12v1',
  gear: 'M12 9a3 3 0 110 6 3 3 0 010-6z M12 2v4 M12 18v4 M2 12h4 M18 12h4 M5 5l3 3 M16 16l3 3 M19 5l-3 3 M8 16l-3 3',
  help: 'M9 9a3 3 0 116 0c0 2-3 2-3 5 M12 18v1',
  user: 'M12 4a4 4 0 110 8 4 4 0 010-8z M4 21c0-4 3-6 8-6s8 2 8 6',
  close: 'M5 5l14 14 M19 5L5 19',
} as const;
export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 'h-15 w-15'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `${size} shrink-0 fill-none stroke-current`);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PATHS[name]);
  svg.append(path);
  return svg;
}
