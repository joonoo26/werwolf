// Gibt die aktuelle Rollen-/Rudel-Konfiguration als Markdown aus: `npm run balance:table`
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'dorf-'));
const out = join(dir, 'engine.mjs');
await build({ entryPoints: [join(root, 'packages/engine/src/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const { DEFAULT_RULES, describeBalance, describeAbility } = await import(pathToFileURL(out).href);

const r = DEFAULT_RULES;
const L = [];
L.push('## Sonderrollen (aktuelle Konfiguration)\n');
L.push('| Rolle | Seite | Gewicht | ab Spielern | Freischaltung | Fähigkeiten |');
L.push('|---|---|---|---|---|---|');
for (const d of Object.values(r.roles).filter((x) => x.special)) {
  L.push(`| ${d.id}${d.enabled ? "" : " (deaktiviert)"} | ${d.faction === 'pack' ? 'Rudel' : 'Dorf'} | ${d.weight} | ${d.minPlayers} | ${d.unlock.triggers.join(', ')}${d.unlock.latestDay ? ` (bis Tag ${d.unlock.latestDay})` : ''} | ${d.abilities.map(describeAbility).join('<br>') || (d.startChoice ? 'geheime Fraktionswahl vor der ersten Nacht' : '–')} |`);
}
L.push('\n## Spielerzahl → Wölfe → Startrollen → spätere Rollen\n');
L.push('| Spieler | Wölfe | Sonderrollen beim Start (Anzahl: %) | mögliche Startrollen (Anteil der Partien) | max. spätere | mögliche spätere Rollen (Auslöser) |');
L.push('|---|---|---|---|---|---|');
for (const row of describeBalance(r)) {
  L.push(`| ${row.players} | ${row.wolves} | ${row.startSpecialCount.map((c) => `${c.count}: ${c.pct}%`).join(', ')} | ${row.startRoles.map((x) => `${x.role} (${x.pctOfGames}%)`).join(', ')} | ${row.maxLater} | ${row.laterRoles.map((x) => `${x.role} (${x.triggers.join('/')})`).join(', ')} |`);
}
console.log(L.join('\n'));
