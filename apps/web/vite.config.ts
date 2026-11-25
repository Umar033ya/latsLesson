import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'LAST LESSON',
        short_name: 'LAST LESSON',
        description: 'An educational mystery game for schools and learning centers.',
        theme_color: '#10235c',
        background_color: '#0a0c13',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education', 'games'],
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Only static files are cached. API responses and the game are never stored by the service worker.
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/play(\/|$)/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'] } } },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: process.env.API_PROXY ?? 'http://localhost:3000', changeOrigin: false } },
  },
});
