// Bündelt Engine + Server-Kern zu einer einzigen JS-Datei für die Supabase Edge Function.
// `--check` bricht ab, wenn das eingecheckte Bundle veraltet ist (CI).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'supabase/functions/_shared/dorf.js');
const res = await build({
  entryPoints: [join(root, 'packages/server/src/bundle.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['main'],
  resolveExtensions: ['.ts', '.js'],
  target: 'es2022',
  write: false,
  legalComments: 'none',
  banner: { js: '// GENERIERT von scripts/build-functions.mjs – nicht von Hand ändern.' },
});
const text = res.outputFiles[0].text;
if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== text) {
    console.error('supabase/functions/_shared/dorf.js ist veraltet: `npm run build:functions` ausführen.');
    process.exit(1);
  }
  console.log('Bundle aktuell.');
} else {
  writeFileSync(out, text);
  console.log(`Bundle geschrieben (${text.length} Bytes).`);
}
