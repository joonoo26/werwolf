import type { AbilityDef, DeepPartial, RoleDef, RoleId, Rules, SizeBand, Trigger } from './types';

/**
 * ALLE Balance- und Rollenwerte leben hier und sind Startwerte für Simulation und Playtests.
 * Nichts davon ist eine festgeschriebene Produktregel (siehe docs/OPEN_DECISIONS.md).
 * Rollen sind datengetrieben: Wirkung (abilities), Häufigkeit (weight), Aktivierung (enabled, minPlayers,
 * unlock) lassen sich ohne Codeänderung anpassen.
 */
const LATE: Trigger[] = ['start', 'quest_reward', 'after_first_council', 'day_start'];

function role(def: Partial<RoleDef> & Pick<RoleDef, 'id' | 'faction'>): RoleDef {
  return {
    special: true,
    enabled: true,
    weight: 1,
    minPlayers: 6,
    maxPlayers: null,
    unlock: { triggers: LATE, earliestDay: 1, latestDay: null },
    recipient: def.faction === 'pack' ? 'wolf' : 'villager',
    startChoice: false,
    abilities: [],
    maxAbilitiesPerNight: null,
    ...def,
  };
}

const ab = (a: AbilityDef): AbilityDef => a;

export const DEFAULT_RULES: Rules = {
  minPlayers: 6,
  maxPlayers: 14,
  wolvesByPlayers: { 6: 1, 7: 2, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3, 13: 4, 14: 4 },
  borderwalkerReplacesWolf: true,
  roles: {
    villager: role({ id: 'villager', faction: 'village', special: false, weight: 0, minPlayers: 1, unlock: { triggers: [], earliestDay: 1, latestDay: null } }),
    wolf: role({ id: 'wolf', faction: 'pack', special: false, weight: 0, minPlayers: 1, unlock: { triggers: [], earliestDay: 1, latestDay: null } }),
    scout: role({
      id: 'scout', faction: 'village', weight: 1, minPlayers: 6,
      abilities: [ab({ id: 'scout', kind: 'inspect', uses: 2 })],
    }),
    tracker: role({
      id: 'tracker', faction: 'village', weight: 2, minPlayers: 6,
      abilities: [ab({ id: 'track', kind: 'inspect_group', uses: 2, groupSize: 3 })],
    }),
    guardian: role({
      id: 'guardian', faction: 'village', weight: 3, minPlayers: 7,
      abilities: [ab({ id: 'protect', kind: 'protect', uses: null, noRepeatTarget: true, allowSelf: true })],
    }),
    alchemist: role({
      id: 'alchemist', faction: 'village', weight: 2, minPlayers: 8, maxAbilitiesPerNight: 1,
      abilities: [
        ab({ id: 'potion_protect', kind: 'protect', uses: 1, allowSelf: true }),
        ab({ id: 'potion_strike', kind: 'strike', uses: 1 }),
      ],
    }),
    borderwalker: role({
      id: 'borderwalker', faction: 'village', weight: 1, minPlayers: 8,
      startChoice: true, unlock: { triggers: ['start'], earliestDay: 1, latestDay: 1 },
    }),
    hunter: role({
      id: 'hunter', faction: 'village', weight: 2, minPlayers: 8, enabled: false, // technisch vorhanden, standardmäßig deaktiviert
      abilities: [ab({ id: 'last_shot', kind: 'last_shot', uses: 1 })],
    }),
    shadowwolf: role({
      id: 'shadowwolf', faction: 'pack', weight: 1, minPlayers: 9,
      abilities: [ab({ id: 'veil', kind: 'veil', uses: 1 })],
    }),
  },
  startSpecials: {
    small: [{ count: 0, weight: 50 }, { count: 1, weight: 50 }],
    medium: [{ count: 0, weight: 25 }, { count: 1, weight: 45 }, { count: 2, weight: 30 }],
    large: [{ count: 1, weight: 50 }, { count: 2, weight: 50 }],
  },
  maxLaterSpecials: { small: 1, medium: 2, large: 3 },
  comboLimits: [{ roles: ['scout', 'tracker'], max: { small: 1, medium: 1, large: 2 } }],
  finaleAlive: 5,
  moments: {
    quest_reward: { noRoleChance: 0.3 },
    after_first_council: { noRoleChance: 0.5 },
    day_start: { days: [3], noRoleChance: 0.5 },
  },
  durations: {
    speakerElectionMs: 60_000,
    discussionTargetMs: 8 * 60_000,
    discussionGraceMs: 3 * 60_000,
    countdownMs: 4_500,
    pointingMs: 8_000,
    tiebreakMs: 60_000,
    resultMs: 30_000,
    nightMs: 150_000,
    morningMs: 30_000,
    questMs: 5 * 60_000,
    confirmGraceMs: 60_000,
    impulseMs: 8_000,
  },
  evening: {
    minDayMs: 10 * 60_000,
    councilBudgetMs: 18 * 60_000,
    questSpacingMs: 25 * 60_000,
    maxQuestsPerDay: 3,
  },
};

export function mergeRules(overrides?: DeepPartial<Rules>): Rules {
  const base = JSON.parse(JSON.stringify(DEFAULT_RULES)) as Rules;
  if (!overrides) return base;
  return deepMerge(base as unknown as Record<string, unknown>, overrides as Record<string, unknown>) as unknown as Rules;
}

function deepMerge(target: Record<string, unknown>, src: Record<string, unknown>): Record<string, unknown> {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
  return target;
}

export function sizeBand(playerCount: number): SizeBand {
  if (playerCount <= 7) return 'small';
  if (playerCount <= 10) return 'medium';
  return 'large';
}

export function wolfCount(playerCount: number, rules: Rules): number {
  return rules.wolvesByPlayers[playerCount] ?? Math.max(2, Math.round(playerCount / 3.5));
}

export const ROLE_IDS: RoleId[] = ['villager', 'wolf', 'scout', 'tracker', 'alchemist', 'guardian', 'borderwalker', 'hunter', 'shadowwolf'];
export const SPECIAL_ROLE_IDS: RoleId[] = ROLE_IDS.filter((r) => DEFAULT_RULES.roles[r].special);
