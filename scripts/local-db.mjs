/**
 * Project-local PostgreSQL cluster for development without Docker.
 * Uses the PostgreSQL binaries already installed on the machine, stores data in .pgdata
 * and listens on 127.0.0.1:5433, so it never touches another PostgreSQL instance.
 *
 *   node scripts/local-db.mjs start | stop | status | reset
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = join(root, '.pgdata');
const port = process.env.LL_DB_PORT ?? '5433';
const user = 'lastlesson';
const password = 'lastlesson'; // development only; bound to loopback

function binDir() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const bases = ['C:/Program Files/PostgreSQL', '/usr/lib/postgresql', '/opt/homebrew/opt', '/Library/PostgreSQL'];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    const versions = readdirSync(base).sort((a, b) => Number.parseInt(b.replace(/\D/g, ''), 10) - Number.parseInt(a.replace(/\D/g, ''), 10));
    for (const v of versions) {
      const dir = join(base, v, 'bin');
      if (existsSync(join(dir, 'initdb')) || existsSync(join(dir, 'initdb.exe'))) return dir;
    }
  }
  return '';
}
const bin = (name) => (binDir() ? join(binDir(), name) : name);
const run = (name, args, opts = {}) => spawnSync(bin(name), args, { stdio: 'inherit', ...opts });
const running = () => existsSync(data) && spawnSync(bin('pg_ctl'), ['-D', data, 'status']).status === 0;

function init() {
  const dir = mkdtempSync(join(tmpdir(), 'll-db-'));
  const pw = join(dir, 'pw');
  writeFileSync(pw, password);
  const r = run('initdb', ['-D', data, '-U', user, '-A', 'scram-sha-256', `--pwfile=${pw}`, '-E', 'UTF8', '--no-locale']);
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
function ensureDb(name) {
  const env = { ...process.env, PGPASSWORD: password };
  const q = spawnSync(bin('psql'), ['-h', '127.0.0.1', '-p', port, '-U', user, '-d', 'postgres', '-tAc', `select 1 from pg_database where datname='${name}'`], { env });
  if (String(q.stdout).trim() !== '1') run('createdb', ['-h', '127.0.0.1', '-p', port, '-U', user, name], { env });
}

const cmd = process.argv[2] ?? 'start';
if (cmd === 'stop') run('pg_ctl', ['-D', data, 'stop', '-m', 'fast']);
else if (cmd === 'status') console.log(running() ? `running on 127.0.0.1:${port}` : 'stopped');
else if (cmd === 'reset') {
  if (running()) run('pg_ctl', ['-D', data, 'stop', '-m', 'fast']);
  rmSync(data, { recursive: true, force: true });
  console.log('Local cluster removed.');
} else {
  if (!existsSync(join(data, 'PG_VERSION'))) init();
  if (!running()) run('pg_ctl', ['-D', data, '-l', join(data, 'server.log'), '-o', `-p ${port} -c listen_addresses=127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
  ensureDb('lastlesson');
  ensureDb('lastlesson_test');
  console.log(`PostgreSQL ready on 127.0.0.1:${port} (lastlesson, lastlesson_test)`);
}
