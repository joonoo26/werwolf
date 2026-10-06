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

/** Anzahl vergebener Sonderrollen (auch ausgeschiedener Träger). */
export function specialsGiven(s: GameState): number {
  return Object.values(s.players).filter((p) => s.rules.roles[p.role].special).length;
}

function roleTaken(s: GameState, role: RoleId): boolean {
  return Object.values(s.players).some((p) => p.role === role);
}

/** Statische Prüfung, ob eine Rolle in diesem Kontext vergeben werden darf (ohne Zufall, ohne Stärkevergleich). */
export function isRoleAllowed(
  def: RoleDef,
  ctx: { trigger: Trigger; day: number; playerCount: number; assigned: RoleId[]; aliveCount: number },
  rules: Rules,
): boolean {
  if (!def.special || !def.enabled || def.weight <= 0) return false;
  if (ctx.assigned.includes(def.id)) return false; // jede Sonderrolle höchstens einmal
  if (ctx.playerCount < def.minPlayers) return false;
  if (def.maxPlayers !== null && ctx.playerCount > def.maxPlayers) return false;
  if (!def.unlock.triggers.includes(ctx.trigger)) return false;
  if (ctx.day < def.unlock.earliestDay) return false;
  if (def.unlock.latestDay !== null && ctx.day > def.unlock.latestDay) return false;
  if (ctx.trigger !== 'start' && rules.finaleAlive > 0 && ctx.aliveCount <= rules.finaleAlive) return false;
  const band = sizeBand(ctx.playerCount);
  for (const combo of rules.comboLimits) {
    if (!combo.roles.includes(def.id)) continue;
    const have = ctx.assigned.filter((r) => combo.roles.includes(r)).length;
    if (have + 1 > combo.max[band]) return false;
  }
  return true;
}

function recipients(s: GameState, def: RoleDef): PlayerId[] {
  const want: RoleId = def.recipient === 'wolf' ? 'wolf' : 'villager';
  return living(s).filter((p) => p.role === want).map((p) => p.id);
}

/**
 * Versucht, später im Spiel eine Rolle zu vergeben. Der Aufrufer (Engine) hat den öffentlichen
 * Impuls bereits unabhängig vom Ergebnis ausgelöst – das Ergebnis bleibt unsichtbar.
 */
export function pickLateAssignment(s: GameState, trigger: Exclude<Trigger, 'start'>, rng: Rng): Assignment | null {
  const { rules } = s;
  const playerCount = Object.keys(s.players).length;
  const band = sizeBand(playerCount);
  if (specialsGiven(s) - s.startSpecialCount >= rules.maxLaterSpecials[band]) return null;

  const assigned = Object.values(s.players).map((p) => p.role);
  const ctx = { trigger, day: s.day, playerCount, assigned, aliveCount: living(s).length };
  const defs = (Object.values(rules.roles) as RoleDef[]).filter(
    (d) => isRoleAllowed(d, ctx, rules) && !roleTaken(s, d.id) && recipients(s, d).length > 0,
  );
  const def = rng.weighted(defs, (d) => d.weight);
  if (!def) return null;
  return { playerId: rng.pick(recipients(s, def)), role: def.id };
}

/** Initiale Rollenverteilung (Seed-deterministisch). */
export function assignStartRoles(
  playerIds: PlayerId[],
  rules: Rules,
  rng: Rng,
): { assignments: Assignment[]; startSpecialCount: number } {
  const n = playerIds.length;
  const order = rng.shuffle(playerIds);
  const wolves = wolfCount(n, rules);

  const dist = rules.startSpecials[sizeBand(n)];
  const picked = rng.weighted(dist, (d) => d.weight);
  const chosen: RoleId[] = [];
  for (let i = 0; i < (picked?.count ?? 0); i++) {
    const options = (Object.values(rules.roles) as RoleDef[]).filter((d) =>
      isRoleAllowed(d, { trigger: 'start', day: 1, playerCount: n, assigned: chosen, aliveCount: n }, rules),
    );
    const def = rng.weighted(options, (d) => d.weight);
    if (!def) break;
    chosen.push(def.id);
  }

  const assignments: Assignment[] = [];
  let cursor = 0;
  const packRoles = chosen.filter((r) => rules.roles[r].faction === 'pack');
  // Rudelrollen ersetzen einen der Wölfe; die übrigen Wölfe bleiben einfache Wölfe.
  for (let i = 0; i < wolves; i++) {
    assignments.push({ playerId: order[cursor++]!, role: packRoles[i] ?? 'wolf' });
  }
  for (const r of chosen.filter((x) => rules.roles[x].faction !== 'pack')) {
    assignments.push({ playerId: order[cursor++]!, role: r });
  }
  while (cursor < order.length) assignments.push({ playerId: order[cursor++]!, role: 'villager' });
  return { assignments, startSpecialCount: chosen.length };
}
