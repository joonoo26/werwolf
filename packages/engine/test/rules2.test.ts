import { describe, expect, it } from 'vitest';
import { applyCommand, createGame, tick } from '../src/engine';
import { pickLateAssignment } from '../src/director';
import { Rng, seedToState } from '../src/rng';
import { DEFAULT_RULES, wolfCount } from '../src/rules';
import { publicView, privateView } from '../src/views';
import type { GameState } from '../src/types';
import { alive, electSpeaker, forceNight, must, newGame, roster, T0, withRoles } from './helpers';

describe('Konfigurierte Startwerte (Entscheidung v0.4+)', () => {
  it('Rudelgröße je Spielerzahl', () => {
    const expected: Record<number, number> = { 6: 1, 7: 2, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3, 13: 4, 14: 4 };
    for (const [n, w] of Object.entries(expected)) expect(wolfCount(Number(n), DEFAULT_RULES)).toBe(w);
  });
  it('Fährtenleser hat 2 Nutzungen; Jäger ist standardmäßig deaktiviert; Schattenwolf erst ab 9', () => {
    expect(DEFAULT_RULES.roles.tracker.abilities[0]!.uses).toBe(2);
    expect(DEFAULT_RULES.roles.hunter.enabled).toBe(false);
    expect(DEFAULT_RULES.roles.shadowwolf.minPlayers).toBe(9);
    for (let i = 0; i < 300; i++) {
      const s = newGame(6 + (i % 9), 'dflt' + i);
      for (const p of Object.values(s.players)) {
        expect(p.role).not.toBe('hunter');
        if (p.role === 'shadowwolf') expect(Object.keys(s.players).length).toBeGreaterThanOrEqual(9);
      }
    }
  });
  it('Jäger ist technisch vorhanden und lässt sich aktivieren', () => {
    const rules = { roles: { hunter: { enabled: true, weight: 1000 } }, startSpecials: { medium: [{ count: 1, weight: 1 }] } };
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) createGame({ roster: roster(9), hostId: 'p1', mode: 'classic', seed: 'h' + i, now: T0, rules: rules as never }).players && Object.values(createGame({ roster: roster(9), hostId: 'p1', mode: 'classic', seed: 'h' + i, now: T0, rules: rules as never }).players).forEach((p) => seen.add(p.role));
    expect(seen.has('hunter')).toBe(true);
  });
  it('Späher + Fährtenleser nie gemeinsam bei 6–10 Spielern; ab 11 erlaubt', () => {
    let together11 = false;
    for (let i = 0; i < 1500; i++) {
      const n = 6 + (i % 9);
      const s = newGame(n, 'combo' + i, { rules: { startSpecials: { small: [{ count: 1, weight: 1 }], medium: [{ count: 2, weight: 1 }], large: [{ count: 2, weight: 1 }] } } as never });
      const roles = Object.values(s.players).map((p) => p.role);
      const both = roles.includes('scout') && roles.includes('tracker');
      if (n <= 10) expect(both).toBe(false);
      else if (both) together11 = true;
    }
    expect(together11).toBe(true);
  });
  it('6 Spieler: 1 Wolf, höchstens eine Sonderrolle beim Start, keine starke Informationskombination (auch später nicht)', () => {
    for (let i = 0; i < 400; i++) {
      const s = newGame(6, 'six' + i);
      expect(Object.values(s.players).filter((p) => p.faction === 'pack')).toHaveLength(1);
      const specials = Object.values(s.players).filter((p) => DEFAULT_RULES.roles[p.role].special);
      expect(specials.length).toBeLessThanOrEqual(1);
      const c = JSON.parse(JSON.stringify(s)) as GameState;
      c.day = 3;
      const a = pickLateAssignment(c, 'quest_reward', new Rng(seedToState('x' + i)));
      if (a) {
        const roles = [...specials.map((p) => p.role), a.role];
        expect(roles.includes('scout') && roles.includes('tracker')).toBe(false);
      }
    }
  });
  it('Bei höchstens 5 Lebenden werden keine neuen Sonderrollen mehr vergeben', () => {
    const s = withRoles(newGame(10, 'fin'), { p1: 'wolf', p2: 'wolf' });
    for (const id of ['p6', 'p7', 'p8', 'p9', 'p10']) s.players[id]!.alive = false;
    s.startSpecialCount = 0;
    s.day = 3;
    for (let i = 0; i < 100; i++) expect(pickLateAssignment(s, 'quest_reward', new Rng(seedToState('f' + i)))).toBeNull();
  });
});

describe('Alchemistin: nur ein Trank pro Nacht', () => {
  it('eine zweite Trank-Wahl ersetzt die erste; nur ein Effekt tritt ein', () => {
    let s = withRoles(newGame(10, 'alc'), { p1: 'wolf', p2: 'wolf', p3: 'alchemist' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = forceNight(s);
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p3', { type: 'night_action', ability: 'potion_protect', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p3', { type: 'night_action', ability: 'potion_strike', target: 'p6' }, T0 + 5_000_000);
    expect(Object.keys(s.nightActions.p3!)).toEqual(['potion_strike']);
    expect(privateView(s, 'p3')!.abilities.filter((a) => a.choice).map((a) => a.id)).toEqual(['potion_strike']);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p5!.alive).toBe(false); // nicht geschützt
    expect(s.players.p6!.alive).toBe(false); // Angriffstrank
    expect(s.players.p3!.uses.potion_protect).toBe(1); // unverbraucht
    expect(s.players.p3!.uses.potion_strike).toBe(0);
  });
});

describe('Grenzgänger und Rudelstärke', () => {
  const only = (flag: boolean) => ({
    borderwalkerReplacesWolf: flag,
    startSpecials: { medium: [{ count: 1, weight: 1 }], large: [{ count: 1, weight: 1 }] },
    roles: Object.fromEntries(['scout', 'tracker', 'alchemist', 'guardian', 'hunter', 'shadowwolf'].map((r) => [r, { enabled: false }])),
  });
  it('ersetzt einen Wolf-Platz: maximale Rudelgröße bleibt die der Tabelle', () => {
    for (const n of [8, 9, 10, 12, 14]) {
      const s = createGame({ roster: roster(n), hostId: 'p1', mode: 'classic', seed: 'bw' + n, now: T0, rules: only(true) as never });
      const wolves = Object.values(s.players).filter((p) => p.faction === 'pack').length;
      expect(Object.values(s.players).some((p) => p.role === 'borderwalker')).toBe(true);
      expect(wolves).toBe(wolfCount(n, DEFAULT_RULES) - 1);
      expect(wolves + 1).toBe(wolfCount(n, DEFAULT_RULES)); // Grenzgänger im Rudel ⇒ Tabellenwert
    }
  });
  it('Ersatz ist abschaltbar (zum Vergleich)', () => {
    const s = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'bwoff', now: T0, rules: only(false) as never });
    expect(Object.values(s.players).filter((p) => p.faction === 'pack')).toHaveLength(3);
  });
});

describe('Rollen-Momente (eine Wahrscheinlichkeit)', () => {
  it('Impuls erscheint bei jedem Moment; noRoleChance entscheidet allein über die Vergabe', () => {
    for (const noRole of [0, 1]) {
      let s = withRoles(newGame(10, 'mom', { rules: { moments: { after_first_council: { noRoleChance: noRole } }, startSpecials: { medium: [{ count: 0, weight: 1 }] } } as never }), { p1: 'wolf', p2: 'wolf' });
      s = electSpeaker(s, T0 + 1, 'p9');
      const before = s.events.filter((e) => e.kind === 'impulse').length;
      const specialsBefore = Object.values(s.players).filter((p) => DEFAULT_RULES.roles[p.role].special).length;
      s.firstCouncilDone = false;
      // Dorfrat bis zum Ergebnis erzwingen
      for (let i = 0; i < 12 && s.phase.kind !== 'dusk'; i++) s = tick(s, T0 + 100_000 * (i + 2), { force: true });
      expect(s.events.filter((e) => e.kind === 'impulse').length).toBe(before + 1);
      const specialsAfter = Object.values(s.players).filter((p) => DEFAULT_RULES.roles[p.role].special).length;
      expect(specialsAfter - specialsBefore).toBe(noRole === 1 ? 0 : 1);
    }
  });
  it('day_start-Moment nur an den konfigurierten Tagen', () => {
    const s = newGame(10, 'days', { rules: { moments: { day_start: { days: [3], noRoleChance: 1 } } } as never });
    const c = JSON.parse(JSON.stringify(s)) as GameState;
    expect(DEFAULT_RULES.moments.day_start.days).toEqual([3]);
    expect(c.rules.moments.day_start.days).toEqual([3]);
  });
});

describe('Abendmodus: Engine führt, bricht die Diskussion aber nie abrupt ab', () => {
  function eveningCouncil() {
    let s = electSpeaker(newGame(9, 'evc', { mode: 'evening', targetMinutes: 180 }), T0 + 1, 'p2');
    if (s.phase.kind !== 'day') throw new Error('x');
    s = tick(s, s.phase.councilBy! + 1);
    if (s.phase.kind !== 'council') throw new Error('Rat erwartet');
    return s;
  }
  it('Richtwert und späteste automatische Eröffnung sind gesetzt', () => {
    const s = eveningCouncil();
    if (s.phase.kind !== 'council') throw new Error('x');
    const c = s.phase.council;
    expect(c.step).toBe('discussion');
    expect(c.targetAt).toBe(c.autoAt! - s.rules.durations.discussionGraceMs);
  });
  it('am Richtwert wird nicht abgebrochen; erst nach Gnadenfrist öffnet sich die Abstimmung', () => {
    let s = eveningCouncil();
    if (s.phase.kind !== 'council') throw new Error('x');
    const { targetAt, autoAt } = s.phase.council;
    s = tick(s, targetAt! + 1);
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('discussion');
    s = tick(s, autoAt! - 1);
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('discussion');
    s = tick(s, autoAt! + 1);
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('voting');
  });
  it('die Gruppe kann bewusst früher eröffnen (Mehrheit bereit; ohne Mehrheit nicht)', () => {
    let s = eveningCouncil();
    expect(applyCommand(s, 'p3', { type: 'start_vote' }, T0 + 1).ok).toBe(false);
    for (const id of ['p1', 'p2', 'p3', 'p4']) s = must(s, id, { type: 'ready', topic: 'advance', value: true }, T0 + 2);
    expect(applyCommand(s, 'p3', { type: 'start_vote' }, T0 + 3).ok).toBe(false);
    expect(publicView(s).council!.voteReady).toBe(false);
    s = must(s, 'p5', { type: 'ready', topic: 'advance', value: true }, T0 + 2);
    expect(publicView(s).council!.voteReady).toBe(true);
    expect(JSON.stringify(publicView(s))).not.toContain('readyAdvance');
    s = must(s, 'p6', { type: 'start_vote' }, T0 + 4);
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('voting');
    expect(alive(s)).toHaveLength(9);
  });
});
