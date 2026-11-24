/** One spacing unit is one game pixel (`--u`), so the interface scales together with the pixel art. */
const units = (from, to) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, `calc(var(--u) * ${from + i})`]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.ts'],
  // The game has its own base rules; only the variable defaults of Tailwind are needed.
  corePlugins: { preflight: false },
  theme: {
    spacing: { ...units(0, 400), px: '1px' },
    fontSize: units(6, 60),
    borderWidth: { 0: '0', DEFAULT: 'calc(var(--u) * 1)', 2: 'calc(var(--u) * 2)' },
    borderRadius: { none: '0', full: '9999px', DEFAULT: 'calc(var(--u) * 2)' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000',
      white: '#fff',
      ink: '#0a0c13',
      night: '#10141f',
      steel: '#4a5c72',
      paper: '#ece3c8',
      bone: '#cfc6a9',
      fog: '#b4c3cc',
      lamp: '#e0a848',
      wine: '#6f2430',
      red: '#b23a3f',
      coral: '#f09a86',
      leaf: '#79a07c',
      wood: '#6b5c45',
      line: '#b9ad8c',
      accent: 'var(--accent)',
    },
    fontFamily: { dot: ['Dot', 'monospace'], jac: ['Jac', 'serif'] },
    extend: {},
  },
  plugins: [],
};
