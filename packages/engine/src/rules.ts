import type { DeepPartial, RoleId, Rules } from './types';

/**
 * Startwerte für Balance und Timing. GAME_DESIGN.md nennt diese Werte
 * ausdrücklich als „Startwerte, durch Playtests anzupassen". Alles
 * Tunebare lebt hier – nirgends sonst im Code stehen Balance-Zahlen.
 */
export const DEFAULT_RULES: Rules = {
  minPlayers: 6,
  maxPlayers: 14,
  wolfDivisor: 3.5,
  trackGroupSize: 3,
  scoutUses: 2,
  trackerUses: 3,
  roleMinPlayers: {
    villager: 1,
    wolf: 1,
    scout: 6,
    tracker: 6,
    guardian: 7,
    alchemist: 8,
    borderwalker: 8,
    hunter: 8,
    shadowwolf: 9,
  },
  roleWeights: {
    villager: 0,
    wolf: 0,
    scout: 1,
    tracker: 2,
    guardian: 3,
    alchemist: 2,
    borderwalker: 1,
    hunter: 2,
    shadowwolf: 1,
  },
  maxLaterSpecials: { small: 1, medium: 2, large: 3 },
  infoBudget: { small: 2, medium: 2, large: 3 },
  finaleAlive: 5,
  laterRoleChanceDayStart: 0.35,
  laterRoleChanceAfterFirstCouncil: 0.5,
  durations: {
    speakerElectionMs: 60_000,
    nominationMs: 90_000,
    defenseMs: 120_000,
    votingMs: 120_000,
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
    councilBudgetMs: 10 * 60_000,
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
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object') {
      deepMerge(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
  return target;
}

export type SizeBand = 'small' | 'medium' | 'large';

export function sizeBand(playerCount: number): SizeBand {
  if (playerCount <= 7) return 'small';
  if (playerCount <= 10) return 'medium';
  return 'large';
}

export function wolfCount(playerCount: number, rules: Rules): number {
  return Math.max(2, Math.round(playerCount / rules.wolfDivisor));
}

/** Gewichtung der Anzahl Sonderrollen beim Start (GAME_DESIGN §14 Richtwerte). */
export function startSpecialDistribution(playerCount: number): { count: number; weight: number }[] {
  switch (sizeBand(playerCount)) {
    case 'small':
      return [
        { count: 0, weight: 50 },
        { count: 1, weight: 50 },
      ];
    case 'medium':
      return [
        { count: 0, weight: 25 },
        { count: 1, weight: 45 },
        { count: 2, weight: 30 },
      ];
    case 'large':
      return [
        { count: 1, weight: 50 },
        { count: 2, weight: 50 },
      ];
  }
}

export interface RoleMeta {
  id: RoleId;
  faction: 'village' | 'pack';
  /** Gewicht im Informations-Budget (0 = keine Informationsrolle). */
  infoWeight: number;
  /** Nur beim Spielstart vergebbar (Rollen mit Fraktionswahl). */
  startOnly: boolean;
  /** Sonderrolle im Sinne der Richtwerte (zählt gegen die Obergrenzen). */
  special: boolean;
}

export const ROLES: Record<RoleId, RoleMeta> = {
  villager: { id: 'villager', faction: 'village', infoWeight: 0, startOnly: false, special: false },
  wolf: { id: 'wolf', faction: 'pack', infoWeight: 0, startOnly: false, special: false },
  scout: { id: 'scout', faction: 'village', infoWeight: 2, startOnly: false, special: true },
  tracker: { id: 'tracker', faction: 'village', infoWeight: 1, startOnly: false, special: true },
  alchemist: { id: 'alchemist', faction: 'village', infoWeight: 0, startOnly: false, special: true },
  guardian: { id: 'guardian', faction: 'village', infoWeight: 0, startOnly: false, special: true },
  borderwalker: { id: 'borderwalker', faction: 'village', infoWeight: 0, startOnly: true, special: true },
  hunter: { id: 'hunter', faction: 'village', infoWeight: 0, startOnly: false, special: true },
  shadowwolf: { id: 'shadowwolf', faction: 'pack', infoWeight: 0, startOnly: false, special: true },
};

export const SPECIAL_ROLES: RoleId[] = (Object.keys(ROLES) as RoleId[]).filter((r) => ROLES[r].special);
