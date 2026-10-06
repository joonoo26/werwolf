// Rollen-Direktor: gewichteter Zufall mit Guardrails (GAME_DESIGN §13/§14).
import { Rng } from './rng';
import {
  ROLES,
  SPECIAL_ROLES,
  sizeBand,
  startSpecialDistribution,
  wolfCount,
} from './rules';
import type { GameState, PlayerId, RoleId, Rules } from './types';

export type DirectorTrigger = 'start' | 'quest_reward' | 'after_first_council' | 'day_start';

export interface Assignment {
  playerId: PlayerId;
  role: RoleId;
}

function living(state: GameState) {
  return Object.values(state.players).filter((p) => p.alive);
}

/** Bereits vergebene (auch ausgeschiedene) Rollen – jede Sonderrolle existiert höchstens einmal. */
function roleTaken(state: GameState, role: RoleId): boolean {
  return Object.values(state.players).some((p) => p.role === role);
}

function activeInfoWeight(state: GameState, rules: Rules): { used: number; budget: number } {
  const used = living(state).reduce((sum, p) => sum + ROLES[p.role].infoWeight, 0);
  return { used, budget: rules.infoBudget[sizeBand(Object.keys(state.players).length)] };
}

/** Wie viele Sonderrollen wurden insgesamt schon vergeben (Start + später)? */
export function specialsGiven(state: GameState): number {
  return Object.values(state.players).filter((p) => ROLES[p.role].special).length;
}

export interface EligibleContext {
  /** Beim Start existiert der Zustand noch nicht vollständig. */
  isStart: boolean;
  /** Beim Start bereits ausgewählte Rollen (für Budget-/Einzigartigkeitsprüfungen). */
  chosen?: RoleId[];
  playerCount: number;
  aliveCount: number;
  packAlive: number;
}

/** Prüft die Guardrails für eine Rolle (ohne Zufall). */
export function isRoleEligible(
  role: RoleId,
  ctx: EligibleContext,
  state: GameState | null,
  rules: Rules,
): boolean {
  const meta = ROLES[role];
  if (!meta.special) return false;
  if (ctx.playerCount < rules.roleMinPlayers[role]) return false;
  if (!ctx.isStart && meta.startOnly) return false;
  if (ctx.chosen?.includes(role)) return false;
  if (state && roleTaken(state, role)) return false;

  // Im Finale keine neue Rolle mehr einführen.
  if (!ctx.isStart && ctx.aliveCount <= rules.finaleAlive) return false;

  // Starke Informationsrollen nicht stapeln.
  if (meta.infoWeight > 0) {
    const existing = state ? activeInfoWeight(state, rules).used : 0;
    const chosen = (ctx.chosen ?? []).reduce((s, r) => s + ROLES[r].infoWeight, 0);
    const budget = rules.infoBudget[sizeBand(ctx.playerCount)];
    if (existing + chosen + meta.infoWeight > budget) return false;
  }

  if (!ctx.isStart) {
    const others = ctx.aliveCount - ctx.packAlive;
    const balance = others > 0 ? ctx.packAlive / others : 1;
    // Fast entschiedene Partie nicht unnötig kippen.
    if (meta.faction === 'pack' && balance >= 0.6) return false;
    if (meta.faction === 'village' && balance <= 0.25) return false;
    if (ctx.packAlive >= others) return false;
  }
  return true;
}

function recipientsFor(state: GameState, role: RoleId): PlayerId[] {
  const wantRole: RoleId = ROLES[role].faction === 'pack' ? 'wolf' : 'villager';
  return living(state)
    .filter((p) => p.role === wantRole)
    .map((p) => p.id);
}

/**
 * Zusätzliche Rolle zu einem dramaturgischen Zeitpunkt. Gibt null zurück, wenn
 * Guardrails oder Zufall dagegensprechen.
 */
export function maybeSpawnRole(
  state: GameState,
  trigger: DirectorTrigger,
  rng: Rng,
): Assignment | null {
  const { rules } = state;
  const playerCount = Object.keys(state.players).length;
  const band = sizeBand(playerCount);

  const laterGiven = specialsGiven(state) - state.startSpecials;
  if (laterGiven >= rules.maxLaterSpecials[band]) return null;

  if (trigger === 'day_start' && !rng.chance(rules.laterRoleChanceDayStart)) return null;
  if (trigger === 'after_first_council' && !rng.chance(rules.laterRoleChanceAfterFirstCouncil)) return null;

  const alive = living(state);
  const packAlive = alive.filter((p) => p.faction === 'pack').length;
  const ctx: EligibleContext = { isStart: false, playerCount, aliveCount: alive.length, packAlive };

  const candidates = SPECIAL_ROLES.filter(
    (r) => isRoleEligible(r, ctx, state, rules) && recipientsFor(state, r).length > 0,
  );
  const role = rng.weighted(candidates, (r) => rules.roleWeights[r]);
  if (!role) return null;
  const recipient = rng.pick(recipientsFor(state, role));
  return { playerId: recipient, role };
}

/** Initiale Rollenverteilung (Seed-deterministisch). */
export function assignStartRoles(
  playerIds: PlayerId[],
  rules: Rules,
  rng: Rng,
): { assignments: Assignment[]; startSpecials: number } {
  const n = playerIds.length;
  const order = rng.shuffle(playerIds);
  const wolves = wolfCount(n, rules);

  const dist = startSpecialDistribution(n);
  const picked = rng.weighted(dist, (d) => d.weight)!;
  const chosen: RoleId[] = [];
  let shadowWolf = false;

  for (let i = 0; i < picked.count; i++) {
    const ctx: EligibleContext = {
      isStart: true,
      chosen,
      playerCount: n,
      aliveCount: n,
      packAlive: wolves,
    };
    const options = SPECIAL_ROLES.filter((r) => isRoleEligible(r, ctx, null, rules));
    const role = rng.weighted(options, (r) => rules.roleWeights[r]);
    if (!role) break;
    chosen.push(role);
    if (role === 'shadowwolf') shadowWolf = true;
  }

  const assignments: Assignment[] = [];
  let cursor = 0;
  for (let i = 0; i < wolves; i++) {
    const id = order[cursor++]!;
    assignments.push({ playerId: id, role: i === 0 && shadowWolf ? 'shadowwolf' : 'wolf' });
  }
  for (const role of chosen) {
    if (role === 'shadowwolf') continue;
    assignments.push({ playerId: order[cursor++]!, role });
  }
  while (cursor < order.length) assignments.push({ playerId: order[cursor++]!, role: 'villager' });

  const startSpecials = chosen.length;
  return { assignments, startSpecials };
}
