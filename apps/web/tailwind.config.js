/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Panels: values switch between the day and night themes (see styles/index.css).
        paper: v('paper'), sheet: v('sheet'), well: v('well'), rule: v('rule'), ink: v('ink'), soft: v('soft'),
        accent: v('accent'), 'accent-ink': v('accent-ink'), 'accent-soft': v('accent-soft'),
        pencil: { DEFAULT: v('pencil'), dark: v('pencil-dark'), pale: v('pencil-pale') },
        amber: { DEFAULT: v('amber'), dark: v('amber-dark'), pale: v('amber-pale') },
        moss: { DEFAULT: v('moss'), pale: v('moss-pale') },
        sky: { DEFAULT: v('sky'), pale: v('sky-pale') },
        s1: v('s1'), s2: v('s2'), track: v('track'),
        // Fixed: the sidebar and the student side look the same in both themes.
        board: { DEFAULT: '#10235c', 2: '#1a337c', 3: '#2f52b4', chalk: '#e6edff', dim: '#a3b6e6' },
        night: { DEFAULT: '#0a0c13', 2: '#131826', 3: '#1e2738', 4: '#2f3c51' },
        bone: '#ece3c8', lamp: '#e0a848', fog: '#b4c3cc',
      },
      fontFamily: { sans: ['Golos', 'system-ui', 'sans-serif'], dot: ['Dot', 'monospace'], jac: ['Jac', 'serif'] },
      boxShadow: { sheet: '0 1px 0 rgb(var(--ink) / 0.04), 0 8px 24px -16px rgb(var(--ink) / 0.25)' },
    },
  },
  plugins: [],
};
