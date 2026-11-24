/** One command for a fresh checkout: env file, local database, migrations, seed. */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
if (!existsSync('.env')) {
  let env = readFileSync('.env.example', 'utf8');
  for (const key of ['JWT_ACCESS_SECRET', 'GAME_TOKEN_SECRET', 'CODE_PEPPER']) env = env.replace(`${key}=""`, `${key}="${randomBytes(48).toString('base64url')}"`);
  writeFileSync('.env', env);
  console.log('Created .env with fresh secrets');
}
process.loadEnvFile('.env');
if (process.env.DATABASE_URL?.includes(':5433/')) run('node scripts/local-db.mjs start');
run('npx prisma generate --schema prisma/schema.prisma');
run('npx prisma migrate deploy --schema prisma/schema.prisma');
run('pnpm build:packages');
run('pnpm db:seed');
console.log('\nReady. Start everything with: pnpm dev');
