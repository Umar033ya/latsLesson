/** Lists interface texts that have no Russian or Uzbek translation. Exits with 1 when something is missing. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
const text = /\btr\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`)|\bok: '((?:[^'\\]|\\.)*)'/g;
const ternary = /\btr\([^()]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\)/g;
let failed = false;

for (const root of ['apps/web/src', 'game/src']) {
  const sources = files(root).filter((f) => !f.includes('i18n') && !f.includes('.test.'));
  const keys = new Set();
  for (const file of sources) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(text)) keys.add((m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\\n/g, '\n').replace(/\\(['"])/g, '$1'));
    for (const m of code.matchAll(ternary)) [m[1], m[2]].forEach((k) => keys.add(k));
  }
  for (const locale of ['ru', 'uz']) {
    const dict = readFileSync(join(root, 'i18n', `${locale}.ts`), 'utf8');
    const missing = [...keys].filter((k) => k && !dict.includes(`${JSON.stringify(k)}:`));
    if (!missing.length) continue;
    failed = true;
    console.log(`\n${root} ${locale}: ${missing.length} missing`);
    if (locale === 'ru') missing.forEach((k) => console.log(k));
  }
}
process.exit(failed ? 1 : 0);
