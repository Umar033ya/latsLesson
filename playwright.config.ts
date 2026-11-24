import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against the running stack (API, web, game) with a seeded database.
 *   pnpm db:start && pnpm db:migrate && pnpm db:seed && pnpm test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  timeout: 150_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:5173',
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    viewport: { width: 1360, height: 800 },
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--mute-audio', '--ignore-gpu-blocklist', '--enable-gpu', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])] },
  },
  webServer: [
    { command: 'pnpm --filter @last-lesson/backend dev', url: 'http://localhost:3000/health', reuseExistingServer: true, timeout: 120_000 },
    { command: 'pnpm --filter @last-lesson/web dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
    { command: 'pnpm --filter @last-lesson/game dev', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60_000 },
  ],
});
