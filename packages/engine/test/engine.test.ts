import { describe, expect, it } from 'vitest';
import { applyCommand, checkWin, createGame, nextDeadline, tick } from '../src/engine';
import { Rng, seedToState } from '../src/rng';
import { DEFAULT_RULES, wolfCount } from '../src/rules';
import { newGame, roster, T0, withRoles } from './helpers';

describe('Rng', () => {
  it('ist bei gleichem Seed deterministisch', () => {
    const a = new Rng(seedToState('x'));
    const b = new Rng(seedToState('x'));
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });
  it('liefert Werte in [0,1)', () => {
    const r = new Rng(seedToState('y'));
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('shuffle behält alle Elemente', () => {
    const r = new Rng(seedToState('z'));
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Spielstart', () => {
  it('verweigert zu kleine und zu große Gruppen', () => {
    expect(() => createGame({ roster: roster(5), hostId: 'p1', mode: 'classic', seed: 's', now: T0 })).toThrow();
    expect(() => createGame({ roster: roster(15), hostId: 'p1', mode: 'classic', seed: 's', now: T0 })).toThrow();
  });
  it('verteilt das Rudel gemäß Spielerzahl', () => {
    for (let n = 6; n <= 14; n++) {
      const s = newGame(n, `n${n}`);
      const pack = Object.values(s.players).filter((p) => p.faction === 'pack');
      expect(pack.length).toBe(wolfCount(n, DEFAULT_RULES));
      expect(Object.keys(s.players).length).toBe(n);
    }
  });
  it('vergibt Sonderrollen höchstens einmal und hält die Richtwerte beim Start ein', () => {
    for (let i = 0; i < 300; i++) {
      const n = 6 + (i % 9);
      const s = newGame(n, `r${i}`);
      const specials = Object.values(s.players).filter((p) => !['villager', 'wolf'].includes(p.role));
      const roles = specials.map((p) => p.role);
      expect(new Set(roles).size).toBe(roles.length);
      if (n <= 7) expect(specials.length).toBeLessThanOrEqual(1);
      else if (n <= 10) expect(specials.length).toBeLessThanOrEqual(2);
      else {
        expect(specials.length).toBeGreaterThanOrEqual(1);
        expect(specials.length).toBeLessThanOrEqual(2);
      }
    }
  });
  it('vergibt Jäger/Alchemistin/Grenzgänger/Schattenwolf nie in kleinen Gruppen', () => {
    for (let i = 0; i < 200; i++) {
      const s = newGame(6 + (i % 2), `small${i}`);
      for (const p of Object.values(s.players)) {
        expect(['hunter', 'alchemist', 'borderwalker', 'shadowwolf']).not.toContain(p.role);
      }
    }
  });
  it('erzeugt reproduzierbare Partien', () => {
    expect(newGame(10, 'same')).toEqual(newGame(10, 'same'));
    expect(newGame(10, 'a')).not.toEqual(newGame(10, 'b'));
  });
  it('beginnt mit der Dorfsprecher-Wahl an Tag 1', () => {
    const s = newGame(8);
    expect(s.day).toBe(1);
    expect(s.phase.kind).toBe('speaker_election');
  });
  it('legt für jeden Spieler genau eine eigene Rollennotiz an', () => {
    const s = newGame(8);
    for (const p of Object.values(s.players)) {
      expect(s.notes[p.id]).toHaveLength(1);
      expect(s.notes[p.id]![0]!.data.role).toBe(p.role);
    }
  });
});

describe('Siegbedingungen', () => {
  it('Dorf gewinnt, wenn kein lebender Wolf übrig ist', () => {
    const s = withRoles(newGame(8), { p1: 'wolf', p2: 'wolf' });
    s.players.p1!.alive = false;
    expect(checkWin(s)).toBeNull();
    s.players.p2!.alive = false;
    expect(checkWin(s)).toBe('village');
  });
  it('Rudel gewinnt, wenn Wölfe mindestens so viele sind wie alle übrigen', () => {
    const s = withRoles(newGame(8), { p1: 'wolf', p2: 'wolf' });
    for (const id of ['p3', 'p4', 'p5']) s.players[id]!.alive = false;
    expect(checkWin(s)).toBeNull(); // 2 vs 3
    s.players.p6!.alive = false;
    expect(checkWin(s)).toBe('pack'); // 2 vs 2
  });
  it('Grenzgänger im Rudel zählt als Rudel', () => {
    const s = withRoles(newGame(8), { p1: 'wolf', p2: 'borderwalker' });
    s.players.p2!.faction = 'pack';
    for (const id of ['p3', 'p4', 'p5']) s.players[id]!.alive = false;
    expect(checkWin(s)).toBeNull(); // 2 Rudel vs 3 andere
    s.players.p6!.alive = false;
    expect(checkWin(s)).toBe('pack'); // 2 Rudel vs 2 andere
  });
});

describe('Zeit & Host', () => {
  it('Tick ohne Frist verändert nichts', () => {
    const s = newGame(8);
    expect(tick(s, T0 + 10)).toEqual(s);
  });
  it('nur der Host darf den Ablauf erzwingen', () => {
    const s = newGame(8);
    expect(applyCommand(s, 'p3', { type: 'tick', force: true }, T0 + 5).ok).toBe(false);
    expect(applyCommand(s, 'p1', { type: 'tick', force: true }, T0 + 5).ok).toBe(true);
  });
  it('Force überspringt genau einen Übergang', () => {
    const t = tick(newGame(8), T0 + 5, { force: true });
    expect(t.phase.kind).toBe('day');
  });
  it('liefert die nächste Frist', () => {
    const s = newGame(8);
    expect(nextDeadline(s)).toBe(T0 + s.rules.durations.speakerElectionMs);
  });
  it('lehnt Befehle ab, die nicht zur Phase passen', () => {
    const s = newGame(8);
    const r = applyCommand(s, 'p3', { type: 'vote', target: 'p4' }, T0 + 5);
    expect(r.ok).toBe(false);
  });
});
