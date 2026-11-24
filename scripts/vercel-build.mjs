/** Builds API, web and game, applies migrations on production deploys, and assembles one static output. */
import { execSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

run('npx prisma generate --schema prisma/schema.prisma');
run('pnpm build:packages');
run('pnpm --filter @last-lesson/backend build');
run('pnpm --filter @last-lesson/web build');
run('pnpm --filter @last-lesson/game build', { VITE_PLATFORM_URL: '/student' });
run('node scripts/vercel-migrate.mjs');

rmSync('vercel-dist', { recursive: true, force: true });
cpSync('apps/web/dist', 'vercel-dist', { recursive: true });
cpSync('game/dist', 'vercel-dist/play', { recursive: true });
