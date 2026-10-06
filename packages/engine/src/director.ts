// Rollen-Direktor: gewichteter Zufall INNERHALB vorab konfigurierter Pools, Kombinationen und
// Freischaltzeitpunkte (Rules.roles[*].unlock, comboLimits, startSpecials, maxLaterSpecials).
// Bewusst KEIN Dynamic Difficulty Balancing: Die aktuelle Stärke einer Partei fließt nirgends ein.
import { Rng } from './rng';
import { sizeBand, wolfCount } from './rules';
import type { GameState, PlayerId, RoleDef, RoleId, Rules, Trigger } from './types';

export interface Assignment {
  playerId: PlayerId;
  role: RoleId;
}

const living = (s: GameState) => Object.values(s.players).filter((p) => p.alive);

export interface AllowCtx {
  trigger: Trigger;
  day: number;
  playerCount: number;
  /** Rollen der aktuell LEBENDEN Träger (bzw. beim Start bereits gewählte Rollen). */
  held: RoleId[];
  /** Bisherige Vergaben je Rolle. */
  grants?: Partial<Record<RoleId, number>>;
  aliveCount: number;
  /** Anzahl bereits vergebener Sonderrollen je Art in dieser Partie (Start + später, auch ausgeschiedene Träger). */
  assigned?: Partial<Record<RoleId, number>>;
}

/** Gesamtbudget Sonderrollen je Partie: floor(Startspieler / Divisor). Obergrenze, kein Zielwert. */
export const roleBudget = (playerCount: number, rules: Rules): number =>
  rules.roleRewards.budgetDivisor > 0 ? Math.floor(playerCount / rules.roleRewards.budgetDivisor) : Infinity;

/** Spielphase für die Timing-Präferenzen (rein tagesbasiert, keine Stärkelogik). */
export function gamePhase(day: number, rules: Rules): 'early' | 'mid' | 'late' {
  const p = rules.roleRewards.phases;
  return day <= p.earlyUntilDay ? 'early' : day <= p.midUntilDay ? 'mid' : 'late';
}

/** Bereits vergebene Sonderrollen (jede Person hat höchstens eine; auch Ausgeschiedene zählen). */
export function assignedSpecials(s: GameState): Partial<Record<RoleId, number>> {
  const out: Partial<Record<RoleId, number>> = {};
  for (const p of Object.values(s.players)) if (s.rules.roles[p.role].special) out[p.role] = (out[p.role] ?? 0) + 1;
  return out;
}

/** Statische Prüfung, ob eine Rolle in diesem Kontext vergeben werden darf (ohne Zufall, ohne Stärkevergleich). */
export function isRoleAllowed(def: RoleDef, ctx: AllowCtx, rules: Rules): boolean {
  if (!def.special || !def.enabled || def.weight <= 0) return false;
  // Höchstens eine Sonderrolle pro Spieler ist Teil der Empfängerwahl; hier: Träger-/Vergabelimits der Rolle.
  const holders = ctx.held.filter((r) => r === def.id).length;
  if (def.maxLivingHolders !== null && holders >= def.maxLivingHolders) return false;
  if (def.maxGrants !== null && (ctx.grants?.[def.id] ?? 0) >= def.maxGrants) return false;
  if (def.maxPerGame !== null && (ctx.assigned?.[def.id] ?? 0) >= def.maxPerGame) return false;
  if (ctx.assigned && Object.values(ctx.assigned).reduce((a, b) => a + (b ?? 0), 0) >= roleBudget(ctx.playerCount, rules)) return false;
  if (ctx.playerCount < def.minPlayers) return false;
  if (def.maxPlayers !== null && ctx.playerCount > def.maxPlayers) return false;
  if (!def.unlock.triggers.includes(ctx.trigger)) return false;
  if (ctx.day < def.unlock.earliestDay) return false;
  if (def.unlock.latestDay !== null && ctx.day > def.unlock.latestDay) return false;
  if (ctx.trigger !== 'start') {
    // Kleingruppen (≤ smallGroup.maxStartPlayers Startspieler): Mindestzahl Lebender statt der Finale-Regel.
    const sg = rules.roleRewards.smallGroup;
    if (ctx.playerCount <= sg.maxStartPlayers) {
      if (ctx.aliveCount < sg.minAlive) return false;
    } else if (rules.finaleAlive > 0 && ctx.aliveCount <= rules.finaleAlive) return false;
  }
  const band = sizeBand(ctx.playerCount);
  for (const combo of rules.comboLimits) {
    if (!combo.roles.includes(def.id)) continue;
    const have = ctx.held.filter((r) => combo.roles.includes(r)).length;
    if (have + 1 > combo.max[band]) return false;
  }
  return true;
}

function recipients(s: GameState, def: RoleDef): PlayerId[] {
  // Höchstens eine Sonderrolle gleichzeitig: nur Spieler ohne Sonderrolle (villager/wolf) kommen infrage.
  const want: RoleId = def.recipient === 'wolf' ? 'wolf' : 'villager';
  return living(s).filter((p) => p.role === want).map((p) => p.id);
}

/**
 * Vergibt später im Spiel eine Rolle. `fixedRole` (Quest-Freischaltung) erzwingt eine bestimmte Rolle,
 * sonst wird gewichtet aus dem erlaubten Pool gezogen. Gibt null zurück, wenn nichts vergeben werden darf.
 */
export function pickLateAssignment(
  s: GameState,
  trigger: Exclude<Trigger, 'start'>,
  rng: Rng,
  fixedRole?: RoleId,
): Assignment | null {
  const { rules } = s;
  const playerCount = s.playerCount;
  const band = sizeBand(playerCount);
  // Der für die erste erfolgreiche Quest reservierte Slot steht Rollen-Momenten nicht zur Verfügung.
  const reserved = s.questSlotReserved && trigger !== 'quest_reward' ? 1 : 0;
  if (s.laterGrants >= rules.maxLaterSpecials[band] - reserved) return null;
  // Tageslimit: höchstens maxNewRolesPerDay neue Sonderrollen pro Spieltag.
  if ((s.grantsByDay[s.day] ?? 0) >= rules.roleRewards.maxNewRolesPerDay) return null;

  const held = living(s).map((p) => p.role);
  const ctx: AllowCtx = { trigger, day: s.day, playerCount, held, grants: s.grantsByRole, aliveCount: living(s).length, assigned: assignedSpecials(s) };
  const candidates = (Object.values(rules.roles) as RoleDef[]).filter(
    (d) => (fixedRole ? d.id === fixedRole : true) && isRoleAllowed(d, ctx, rules) && recipients(s, d).length > 0,
  );
  const phase = gamePhase(s.day, rules);
  // Zeit-/Phasenpräferenz: konfigurierbarer Faktor je Rolle; 0 = in dieser Phase nicht.
  const pool = candidates.filter((d) => d.timing[phase] > 0);
  const def = fixedRole ? candidates[0] ?? null : rng.weighted(pool, (d) => d.weight * d.timing[phase]);
  if (!def) return null;
  return { playerId: rng.pick(recipients(s, def)), role: def.id };
}

/** Initiale Rollenverteilung (Seed-deterministisch). `guaranteed` sind vom Host garantierte Startrollen. */
export function assignStartRoles(
  playerIds: PlayerId[],
  rules: Rules,
  rng: Rng,
  guaranteed: RoleId[] = [],
): { assignments: Assignment[]; startSpecialCount: number } {
  const n = playerIds.length;
  const order = rng.shuffle(playerIds);
  let wolves = wolfCount(n, rules);

  const dist = rules.startSpecials[sizeBand(n)];
  const picked = rng.weighted(dist, (d) => d.weight);
  const assigned = (chosen: RoleId[]) => chosen.reduce<Partial<Record<RoleId, number>>>((a, r) => ({ ...a, [r]: (a[r] ?? 0) + 1 }), {});
  const startCtx = (chosen: RoleId[]): AllowCtx => ({ trigger: 'start', day: 1, playerCount: n, held: chosen, aliveCount: n, assigned: assigned(chosen) });
  const chosen: RoleId[] = [];
  // Garantierte Rollen zuerst (nur, wenn zum Start erlaubt).
  for (const r of guaranteed) {
    const def = rules.roles[r];
    if (def && isRoleAllowed(def, startCtx(chosen), rules)) chosen.push(r);
  }
  const target = Math.max(picked?.count ?? 0, chosen.length);
  while (chosen.length < target) {
    const options = (Object.values(rules.roles) as RoleDef[]).filter((d) => isRoleAllowed(d, startCtx(chosen), rules));
    const def = rng.weighted(options, (d) => d.weight);
    if (!def) break;
    chosen.push(def.id);
  }

  // Grenzgänger ersetzt einen Wolf-Platz (Rudelgröße der Tabelle = Maximum bei Rudelwahl).
  if (chosen.includes('borderwalker') && rules.borderwalkerReplacesWolf) wolves = Math.max(1, wolves - 1);
  const assignments: Assignment[] = [];
  let cursor = 0;
  const packRoles = chosen.filter((r) => rules.roles[r].faction === 'pack');
  for (let i = 0; i < wolves; i++) assignments.push({ playerId: order[cursor++]!, role: packRoles[i] ?? 'wolf' });
  for (const r of chosen.filter((x) => rules.roles[x].faction !== 'pack')) assignments.push({ playerId: order[cursor++]!, role: r });
  while (cursor < order.length) assignments.push({ playerId: order[cursor++]!, role: 'villager' });
  return { assignments, startSpecialCount: chosen.length };
}
