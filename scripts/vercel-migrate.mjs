/** Applies migrations and fills an empty database with the official content on production deploys. Without a database the build still succeeds and says what is missing. */
import { execSync } from 'node:child_process';

if (process.env.VERCEL_ENV !== 'production') process.exit(0);
const missing = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'].filter((name) => !process.env[name]);
if (missing.length) {
  console.warn(`\nMigrations skipped: ${missing.join(' and ')} not set. Connect Neon to this Vercel project (Storage) and deploy again.\n`);
  process.exit(0);
}
execSync('npx prisma migrate deploy --schema prisma/schema.prisma', { stdio: 'inherit', cwd: new URL('..', import.meta.url) });
execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: new URL('..', import.meta.url), env: { ...process.env, NODE_ENV: 'production' } });
