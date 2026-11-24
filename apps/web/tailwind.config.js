/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0f1a', panel: '#111827', line: '#1f2937', blood: '#ef4444', ember: '#f97316', mint: '#22c55e',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['ui-monospace', 'monospace'] },
      boxShadow: { glow: '0 0 30px rgba(239,68,68,0.25)' },
      keyframes: { flicker: { '0%,100%': { opacity: '1' }, '48%': { opacity: '.86' }, '50%': { opacity: '.55' }, '52%': { opacity: '.9' } } },
      animation: { flicker: 'flicker 4s infinite' },
    },
  },
  plugins: [],
};
