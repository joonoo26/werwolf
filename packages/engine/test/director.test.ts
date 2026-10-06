import { describe, expect, it } from 'vitest';
import { assignStartRoles, isRoleAllowed, pickLateAssignment } from '../src/director';
import { Rng, seedToState } from '../src/rng';
import { DEFAULT_RULES, mergeRules, wolfCount } from '../src/rules';
import { applyCommand, createGame } from '../src/engine';
import type { GameState, RoleId } from '../src/types';
import { alive, newGame, roster, T0, withRoles } from './helpers';

const ctx = (over: Partial<Parameters<typeof isRoleAllowed>[1]> = {}) => ({
  trigger: 'quest_reward' as const, day: 2, playerCount: 10, assigned: [] as RoleId[], aliveCount: 10, ...over,
});

describe('Rollen-Pools und Freischaltung (vorab konfiguriert)', () => {
  it('Grenzgänger ist reine Startrolle', () => {
    expect(isRoleAllowed(DEFAULT_RULES.roles.borderwalker, ctx({ trigger: 'start', day: 1 }), DEFAULT_RULES)).toBe(true);
    expect(isRoleAllowed(DEFAULT_RULES.roles.borderwalker, ctx({ trigger: 'quest_reward' }), DEFAULT_RULES)).toBe(false);
    expect(isRoleAllowed(DEFAULT_RULES.roles.borderwalker, ctx({ trigger: 'day_start' }), DEFAULT_RULES)).toBe(false);
  });
  it('respektiert Mindestspielerzahl, Aktivierung und Gewicht aus der Konfiguration', () => {
    expect(isRoleAllowed(DEFAULT_RULES.roles.hunter, ctx({ playerCount: 7 }), DEFAULT_RULES)).toBe(false);
    const off = mergeRules({ roles: { hunter: { enabled: false } } } as never);
    expect(isRoleAllowed(off.roles.hunter, ctx(), off)).toBe(false);
    const zero = mergeRules({ roles: { hunter: { weight: 0 } } } as never);
    expect(isRoleAllowed(zero.roles.hunter, ctx(), zero)).toBe(false);
  });
  it('respektiert Freischaltzeitpunkte (frühester/spätester Tag)', () => {
    const r = mergeRules({ roles: { guardian: { unlock: { earliestDay: 3 } } } } as never);
    expect(isRoleAllowed(r.roles.guardian, ctx({ day: 2 }), r)).toBe(false);
    expect(isRoleAllowed(r.roles.guardian, ctx({ day: 3 }), r)).toBe(true);
  });
  it('wendet vorab definierte Kombinationslimits an (Späher + Fährtenleser)', () => {
    expect(isRoleAllowed(DEFAULT_RULES.roles.tracker, ctx({ assigned: ['scout'], playerCount: 9 }), DEFAULT_RULES)).toBe(false);
    expect(isRoleAllowed(DEFAULT_RULES.roles.tracker, ctx({ assigned: ['scout'], playerCount: 12 }), DEFAULT_RULES)).toBe(true);
  });
  it('vergibt jede Sonderrolle höchstens einmal', () => {
    expect(isRoleAllowed(DEFAULT_RULES.roles.guardian, ctx({ assigned: ['guardian'] }), DEFAULT_RULES)).toBe(false);
  });
  it('führt im Finale (konfigurierbar) keine neue Rolle ein', () => {
    expect(isRoleAllowed(DEFAULT_RULES.roles.guardian, ctx({ aliveCount: 5 }), DEFAULT_RULES)).toBe(false);
    const off = mergeRules({ finaleAlive: 0 });
    expect(isRoleAllowed(off.roles.guardian, ctx({ aliveCount: 3 }), off)).toBe(true);
  });
});

describe('Kein verstecktes Dynamic Difficulty Balancing', () => {
  /** Dieselbe Besetzung, nur andere Stärkeverhältnisse der Parteien → identische Vergabe bei identischem Seed. */
  it('die Vergabe hängt nicht von der aktuellen Stärke der Parteien ab', () => {
    const base = withRoles(newGame(13, 'ddb'), { p1: 'wolf', p2: 'wolf', p3: 'wolf', p4: 'wolf' });
    base.startSpecialCount = 0;
    base.day = 3;
    const outcomes = (kill: string[]) => {
      const s = JSON.parse(JSON.stringify(base)) as GameState;
      for (const id of kill) s.players[id]!.alive = false;
      const res: (string | null)[] = [];
      for (let i = 0; i < 40; i++) {
        const a = pickLateAssignment(s, 'quest_reward', new Rng(seedToState('seed' + i)));
        res.push(a ? a.role : null);
      }
      return res;
    };
    // Rudel stark (viele Dorfbewohner tot) vs. Dorf stark (Wölfe teilweise tot): identische Vergabe bei gleichem Seed
    const packStrong = outcomes(['p6', 'p7', 'p8']);
    const villageStrong = outcomes(['p3', 'p4']);
    expect(packStrong).toEqual(villageStrong);
    expect(packStrong.some((r) => r !== null)).toBe(true);
  });

  it('der Quellcode des Direktors enthält keinen Stärkevergleich der Parteien', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/director.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/packAlive|balance|faction === 'pack'.*alive|alive.*faction/);
  });
});

describe('Startverteilung', () => {
  it('Rudelgröße kommt aus der zentralen Tabelle und ist überschreibbar', () => {
    expect(wolfCount(10, DEFAULT_RULES)).toBe(3);
    const r = mergeRules({ wolvesByPlayers: { 10: 2 } } as never);
    expect(wolfCount(10, r)).toBe(2);
    const s = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'x', now: T0, rules: { wolvesByPlayers: { 10: 2 } } as never });
    expect(Object.values(s.players).filter((p) => p.faction === 'pack')).toHaveLength(2);
  });
  it('die Startverteilung ist konfigurierbar (z. B. immer 2 Sonderrollen)', () => {
    const rules = mergeRules({ startSpecials: { medium: [{ count: 2, weight: 1 }] } } as never);
    for (let i = 0; i < 30; i++) {
      const { assignments, startSpecialCount } = assignStartRoles(roster(10).map((r) => r.id), rules, new Rng(seedToState('d' + i)));
      expect(startSpecialCount).toBe(2);
      expect(assignments.filter((a) => rules.roles[a.role].special)).toHaveLength(2);
    }
  });
  it('deaktivierte Rollen werden nie vergeben', () => {
    const roles = Object.fromEntries(['scout', 'tracker', 'alchemist', 'guardian', 'borderwalker', 'shadowwolf'].map((r) => [r, { enabled: false }]));
    for (let i = 0; i < 100; i++) {
      const s = createGame({ roster: roster(12), hostId: 'p1', mode: 'classic', seed: 'off' + i, now: T0, rules: { roles } as never });
      for (const p of Object.values(s.players)) expect(['villager', 'wolf', 'hunter']).toContain(p.role);
    }
  });
});

describe('Rollen-Momente: Impulse verraten nicht, ob eine Rolle vergeben wurde', () => {
  it('bei jedem Moment erscheint derselbe Impuls – auch wenn keine Rolle vergeben wird', () => {
    const rules = { moments: { day_start: { momentChance: 1, grantChance: 0 } } } as never;
    const none = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'm', now: T0, rules });
    // Zwei Partien mit identischem Ablauf, aber grantChance 0 vs 1: öffentliche Sicht ist identisch strukturiert
    const rules1 = { moments: { day_start: { momentChance: 1, grantChance: 1 } } } as never;
    const some = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'm', now: T0, rules: rules1 });
    expect(none.impulse?.textKey).toBe(some.impulse?.textKey);
  });
});
