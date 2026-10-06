// Balance-Simulation: `npm run simulate -- [--games 20000] [--sizes 6,7,8,9,10,12,14] [--out docs/balance]`
// Spielt vollständige Partien mit Bots (packages/engine/sim/policy.ts) und schreibt Rohdaten + Markdown-Tabellen.
import { build } from 'esbuild';
import { Worker } from 'node:worker_threads';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const games = Number(arg('games', 20000));
const sizes = arg('sizes', '6,7,8,9,10,12,14').split(',').map(Number);
const outDir = join(root, arg('out', 'docs/balance'));
const configs = ['none', 'director', 'bw_village', 'bw_pack', 'bw_village_norepl', 'bw_pack_norepl'];

const dir = mkdtempSync(join(tmpdir(), 'dorf-sim-'));
const workerFile = join(dir, 'worker.mjs');
await build({ entryPoints: [join(root, 'packages/engine/sim/worker.ts')], bundle: true, format: 'esm', platform: 'node', outfile: workerFile, logLevel: 'silent' });
const runFile = join(dir, 'run.mjs');
await build({ entryPoints: [join(root, 'packages/engine/sim/run.ts')], bundle: true, format: 'esm', platform: 'node', outfile: runFile, logLevel: 'silent' });
const { CONFIG_LABELS } = await import(runFile);

const tasks = sizes.flatMap((n) => configs.map((cfg) => ({ n, cfg })));
const results = [];
const started = Date.now();
let next = 0;
async function lane() {
  while (next < tasks.length) {
    const t = tasks[next++];
    const res = await new Promise((resolve, reject) => {
      const w = new Worker(workerFile, { workerData: { ...t, games } });
      w.once('message', resolve); w.once('error', reject);
    });
    results.push(res);
    console.error(`[${((Date.now() - started) / 60000).toFixed(1)} min] n=${t.n} ${t.cfg} fertig (${results.length}/${tasks.length})`);
  }
}
await Promise.all(Array.from({ length: Math.min(cpus().length, 4) }, lane));

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sim-results.json'), JSON.stringify({ games, sizes, results }, null, 1));

const pct = (x, d = 1) => (100 * x).toFixed(d) + ' %';
const get = (n, cfg) => results.find((r) => r.n === n && r.cfg === cfg);
const L = [`# Balance-Simulation (${games.toLocaleString('de-DE')} Partien je Zelle)\n`];
L.push('Bot-Verhaltensmodell: siehe `packages/engine/sim/policy.ts` (stark vereinfacht, symmetrisch; **kein Ersatz für Playtests**). Klassisch-Modus, Quest-Erfolg 50 %, Jäger deaktiviert.\n');
for (const n of sizes) {
  L.push(`## ${n} Spieler\n`);
  L.push('| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const cfg of configs) {
    const r = get(n, cfg);
    L.push(`| ${CONFIG_LABELS[cfg]}${(cfg.startsWith('bw') && n < 8) ? ' (hypothetisch: Rolle erst ab 8 erlaubt)' : ''} | ${pct(r.villageWins / r.games)} | ${pct(1 - r.villageWins / r.games)} | ${(r.sumRounds / r.games).toFixed(2)} | ${pct(r.rounds1 / r.games)} | ${pct(r.rounds2 / r.games)} | ${(r.sumAlive / r.games).toFixed(2)} | ${(r.sumPackStart / r.games).toFixed(2)} |`);
  }
  const d = get(n, 'director');
  L.push('\nEinfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):\n');
  L.push('| Fall | Partien | Dorf-Siegquote |');
  L.push('|---|---|---|');
  L.push(`| keine Sonderrolle | ${d.noSpecial.games} | ${d.noSpecial.games ? pct(d.noSpecial.villageWins / d.noSpecial.games) : '–'} |`);
  L.push(`| mindestens eine Sonderrolle | ${d.withSpecial.games} | ${d.withSpecial.games ? pct(d.withSpecial.villageWins / d.withSpecial.games) : '–'} |`);
  for (const [role, b] of Object.entries(d.byRole).sort()) L.push(`| ${role} | ${b.games} | ${pct(b.villageWins / b.games)} |`);
  L.push('');
}
writeFileSync(join(outDir, 'BALANCE_SIMULATION.md'), L.join('\n'));
console.error(`Fertig in ${((Date.now() - started) / 60000).toFixed(1)} min → ${outDir}`);
