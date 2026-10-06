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
  | 'small_group_guaranteed';

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
  if (playerCount <= 6 && guaranteed.length > 0) out.push({ code: 'small_group_guaranteed', roles: guaranteed });
  return out;
}
