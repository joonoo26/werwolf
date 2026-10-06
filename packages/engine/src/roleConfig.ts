// Empfehlungen/Warnungen zur Rollenkonfiguration (Host: aus / möglich / garantiert).
// Bewusst OHNE Siegquoten oder Stärkebewertung – nur strukturelle Hinweise aus Spielerzahl und Konfiguration.
import { mergeRules, sizeBand, wolfCount } from './rules';
import type { DeepPartial, RoleId, RoleMode, Rules } from './types';

export type ConfigWarningCode =
  | 'role_below_min_players'
  | 'role_above_max_players'
  | 'role_unreachable'
  | 'guaranteed_not_startable'
  | 'guaranteed_exceeds_start_range'
  | 'guaranteed_combo_conflict'
  | 'too_many_pack_roles'
  | 'small_group_guaranteed'
  | 'guaranteed_exceeds_budget'
  | 'no_role_available_for_quest';

export interface ConfigWarning {
  code: ConfigWarningCode;
  roles: RoleId[];
}

export function validateRoleConfig(
  playerCount: number,
  modes: Partial<Record<RoleId, RoleMode>> = {},
  overrides?: DeepPartial<Rules>,
): ConfigWarning[] {
  const rules = mergeRules(overrides);
  const out: ConfigWarning[] = [];
  const band = sizeBand(playerCount);
  const active = (Object.keys(modes) as RoleId[]).filter((r) => rules.roles[r]?.special && modes[r] !== 'off');
  const guaranteed = active.filter((r) => modes[r] === 'guaranteed');

  for (const r of active) {
    const def = rules.roles[r];
    if (playerCount < def.minPlayers) out.push({ code: 'role_below_min_players', roles: [r] });
    if (def.maxPlayers !== null && playerCount > def.maxPlayers) out.push({ code: 'role_above_max_players', roles: [r] });
    if (def.unlock.triggers.length === 0) out.push({ code: 'role_unreachable', roles: [r] });
  }
  for (const r of guaranteed) {
    if (!rules.roles[r].unlock.triggers.includes('start')) out.push({ code: 'guaranteed_not_startable', roles: [r] });
  }
  const maxStart = Math.max(...rules.startSpecials[band].map((d) => d.count));
  if (guaranteed.length > maxStart) out.push({ code: 'guaranteed_exceeds_start_range', roles: guaranteed });
  for (const combo of rules.comboLimits) {
    const hit = guaranteed.filter((r) => combo.roles.includes(r));
    if (hit.length > combo.max[band]) out.push({ code: 'guaranteed_combo_conflict', roles: hit });
  }
  const packRoles = guaranteed.filter((r) => rules.roles[r].faction === 'pack');
  if (packRoles.length > wolfCount(playerCount, rules)) out.push({ code: 'too_many_pack_roles', roles: packRoles });
  if (guaranteed.length > Math.floor(playerCount / Math.max(1, rules.roleRewards.budgetDivisor))) out.push({ code: 'guaranteed_exceeds_budget', roles: guaranteed });
  // Die erste erfolgreiche Quest hat keine Rolle zur Auswahl (z. B. 4–5 Spieler: alle Mindestspielerzahlen höher).
  const questPool = (Object.keys(rules.roles) as RoleId[]).filter((r) => { const d = rules.roles[r]; const m = modes[r]; return d.special && (m ? m !== 'off' : d.enabled) && d.unlock.triggers.includes('quest_reward') && playerCount >= d.minPlayers && (d.maxPlayers === null || playerCount <= d.maxPlayers); });
  if (questPool.length === 0) out.push({ code: 'no_role_available_for_quest', roles: [] });
  if (playerCount <= 6 && guaranteed.length > 0) out.push({ code: 'small_group_guaranteed', roles: guaranteed });
  return out;
}

/** Verständliche Balance-Hinweise für das Host-Setup (Warnung statt hartem Blockieren). */
export function warningText(w: ConfigWarning): string {
  const r = w.roles.join(', ');
  switch (w.code) {
    case 'role_below_min_players': return `${r}: Für diese Gruppengröße nicht empfohlen (zu wenige Spieler). Du kannst sie trotzdem aktivieren – die Balance ist ungetestet.`;
    case 'role_above_max_players': return `${r}: Für diese Gruppengröße nicht empfohlen (zu viele Spieler).`;
    case 'role_unreachable': return `${r}: Diese Rolle kann in dieser Konfiguration nie vergeben werden.`;
    case 'guaranteed_not_startable': return `${r}: Kann nicht zum Spielstart garantiert werden.`;
    case 'guaranteed_exceeds_start_range': return 'Mehr garantierte Startrollen, als für diese Gruppengröße vorgesehen sind.';
    case 'guaranteed_combo_conflict': return `${r}: Diese Kombination ist für diese Gruppengröße nicht vorgesehen.`;
    case 'too_many_pack_roles': return 'Mehr garantierte Rudelrollen als Rudelplätze.';
    case 'small_group_guaranteed': return 'In kleinen Gruppen können garantierte Rollen das Spiel stark verschieben.';
    case 'guaranteed_exceeds_budget': return 'Mehr garantierte Rollen als das Rollenbudget (Hälfte der Spieler) vorsieht.';
    case 'no_role_available_for_quest': return 'Für die erste Quest ist keine Rolle verfügbar – es gibt stattdessen die Fallback-Belohnung.';
  }
}
