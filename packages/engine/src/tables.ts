// Auswertung der aktuellen Konfiguration als Tabellen (für Balancing-Gespräche, keine Spiellogik).
import { assignStartRoles, isRoleAllowed } from './director';
import { Rng, seedToState } from './rng';
import { sizeBand, wolfCount } from './rules';
import type { AbilityDef, RoleDef, RoleId, Rules, Trigger } from './types';

const LATE: Exclude<Trigger, 'start'>[] = ['quest_reward', 'after_first_council', 'day_start'];

export interface BalanceRow {
  players: number;
  wolves: number;
  band: string;
  startSpecialCount: { count: number; pct: number }[];
  startRoles: { role: RoleId; weight: number; pctOfGames: number }[];
  maxLater: number;
  laterRoles: { role: RoleId; weight: number; triggers: string[] }[];
}

export function describeBalance(rules: Rules, samples = 20000): BalanceRow[] {
  const rows: BalanceRow[] = [];
  const defs = Object.values(rules.roles) as RoleDef[];
  for (let n = rules.minPlayers; n <= rules.maxPlayers; n++) {
    const band = sizeBand(n);
    const dist = rules.startSpecials[band];
    const total = dist.reduce((a, d) => a + d.weight, 0);
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const rng = new Rng(seedToState(`table-${n}`));
    const hits: Record<string, number> = {};
    for (let i = 0; i < samples; i++) {
      const { assignments } = assignStartRoles(ids, rules, rng);
      for (const a of assignments) if (rules.roles[a.role].special) hits[a.role] = (hits[a.role] ?? 0) + 1;
    }
    const startCtx = { trigger: 'start' as const, day: 1, playerCount: n, held: [] as RoleId[], aliveCount: n };
    rows.push({
      players: n,
      wolves: wolfCount(n, rules),
      band,
      startSpecialCount: dist.map((d) => ({ count: d.count, pct: Math.round((d.weight / total) * 100) })),
      startRoles: defs
        .filter((d) => isRoleAllowed(d, startCtx, rules))
        .map((d) => ({ role: d.id, weight: d.weight, pctOfGames: Math.round(((hits[d.id] ?? 0) / samples) * 100) })),
      maxLater: rules.maxLaterSpecials[band],
      laterRoles: defs
        .map((d) => ({ d, trig: LATE.filter((t) => isRoleAllowed(d, { trigger: t, day: 2, playerCount: n, held: [], aliveCount: n }, rules)) }))
        .filter((x) => x.trig.length > 0)
        .map((x) => ({ role: x.d.id, weight: x.d.weight, triggers: x.trig })),
    });
  }
  return rows;
}

export function describeAbility(a: AbilityDef): string {
  const uses = a.uses === null ? 'unbegrenzt' : `${a.uses}×`;
  switch (a.kind) {
    case 'inspect': return `${a.id}: prüft die Zugehörigkeit (Dorf/Rudel) einer Person, ${uses}`;
    case 'inspect_group': return `${a.id}: wählt ${a.groupSize} Personen, erfährt nur ob mindestens ein Rudelmitglied dabei ist, ${uses}`;
    case 'protect': return `${a.id}: schützt eine Person vor dem Rudelangriff, ${uses}${a.noRepeatTarget ? ', nicht dieselbe Person zwei Nächte in Folge' : ''}${a.allowSelf === false ? ', nicht sich selbst' : ''}`;
    case 'heal': return `${a.id}: rettet das vom Rudel gewählte Opfer (nach der Rudelsperre), ${uses}`;
    case 'observe': return `${a.id}: Beobachtungsfenster (max. ${(a.windowMs ?? 0) / 1000} s, jede Nacht), erhält einen wahren, möglichst nicht eindeutigen Hinweis auf ein Rudelmitglied`;
    case 'veil': return `${a.id}: Informationsergebnisse dieser Nacht werden „unklar", ${uses}`;
    case 'last_shot': return `${a.id}: nach dem Ausscheiden eine letzte Aktion auf eine lebende Person, ${uses}`;
  }
}
