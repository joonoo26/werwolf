import { describe, expect, it } from 'vitest';
import { isRoleEligible, maybeSpawnRole } from '../src/director';
import { Rng, seedToState } from '../src/rng';
import { DEFAULT_RULES } from '../src/rules';
import { alive, newGame, withRoles } from './helpers';

const ctx = (over: Partial<Parameters<typeof isRoleEligible>[1]> = {}) => ({
  isStart: false,
  playerCount: 10,
  aliveCount: 10,
  packAlive: 3,
  ...over,
});

describe('Rollen-Direktor / Guardrails', () => {
  it('führt im Finale keine neue Rolle mehr ein', () => {
    const s = withRoles(newGame(10, 'f'), { p1: 'wolf', p2: 'wolf' });
    for (const id of ['p4', 'p5', 'p6', 'p7', 'p8']) s.players[id]!.alive = false; // 5 leben
    expect(isRoleEligible('guardian', ctx({ aliveCount: 5, packAlive: 2 }), s, DEFAULT_RULES)).toBe(false);
    const rng = new Rng(seedToState('x'));
    for (let i = 0; i < 50; i++) expect(maybeSpawnRole(s, 'quest_reward', rng)).toBeNull();
  });
  it('Grenzgänger ist nur beim Start vergebbar', () => {
    const s = newGame(10, 'bw');
    expect(isRoleEligible('borderwalker', ctx({ isStart: false }), withRoles(s, {}), DEFAULT_RULES)).toBe(false);
    expect(isRoleEligible('borderwalker', ctx({ isStart: true }), null, DEFAULT_RULES)).toBe(true);
  });
  it('stapelt keine starken Informationsrollen', () => {
    const s = withRoles(newGame(10, 'info'), { p1: 'wolf', p2: 'wolf', p3: 'scout' });
    expect(isRoleEligible('tracker', ctx(), s, DEFAULT_RULES)).toBe(false); // 2 + 1 > Budget 2
  });
  it('vergibt eine Rolle nie doppelt', () => {
    const s = withRoles(newGame(10, 'dup'), { p1: 'wolf', p2: 'wolf', p3: 'guardian' });
    expect(isRoleEligible('guardian', ctx(), s, DEFAULT_RULES)).toBe(false);
  });
  it('gibt kleine Gruppen höchstens eine weitere Sonderrolle', () => {
    let given = 0;
    for (let i = 0; i < 100; i++) {
      const s = withRoles(newGame(7, `sm${i}`), { p1: 'wolf', p2: 'wolf' });
      s.startSpecials = 0;
      const rng = new Rng(seedToState('sm' + i));
      const a = maybeSpawnRole(s, 'quest_reward', rng);
      if (a) {
        given++;
        s.players[a.playerId]!.role = a.role;
        expect(maybeSpawnRole(s, 'quest_reward', rng)).toBeNull();
      }
    }
    expect(given).toBeGreaterThan(0);
  });
  it('Schattenwolf geht nur an einen Wolf, Dorfrollen nur an Dorfbewohner ohne Rolle', () => {
    for (let i = 0; i < 300; i++) {
      const s = withRoles(newGame(13, `rc${i}`), { p1: 'wolf', p2: 'wolf', p3: 'wolf', p4: 'scout' });
      s.startSpecials = 1;
      const a = maybeSpawnRole(s, 'quest_reward', new Rng(seedToState(`rc${i}`)));
      if (!a) continue;
      const before = s.players[a.playerId]!.role;
      if (a.role === 'shadowwolf') expect(before).toBe('wolf');
      else expect(before).toBe('villager');
      expect(alive(s).some((p) => p.id === a.playerId)).toBe(true);
    }
  });
  it('kippt keine fast entschiedene Partie zugunsten des Rudels', () => {
    const s = withRoles(newGame(12, 'bal'), { p1: 'wolf', p2: 'wolf', p3: 'wolf', p4: 'wolf', p5: 'wolf' });
    expect(isRoleEligible('shadowwolf', ctx({ playerCount: 12, aliveCount: 9, packAlive: 5 }), s, DEFAULT_RULES)).toBe(false);
  });
});
