import { defineConfig, type Plugin } from 'vite';

/** In development the game and the panels have different ports. A panel address opened here leads to the panels. */
const panels: Plugin = {
  name: 'panels-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!/^\/(login|staff|register|admin|center|teacher|student|join|room)(\/|\?|$)/.test(req.url ?? '')) return next();
      res.writeHead(302, { Location: `${process.env.WEB_URL ?? 'http://localhost:5173'}${req.url}` });
      res.end();
    });
  },
};

export default defineConfig({
  base: './',
  plugins: [panels],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target: process.env.API_PROXY ?? 'http://localhost:3000', changeOrigin: false } },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
