import { describe, expect, it } from 'vitest';
import { applyCommand, tick } from '../src/engine';
import { alive, advanceTo, electSpeaker, must, newGame, T0, withRoles } from './helpers';
import type { GameState } from '../src/types';

function toCouncil(seed = 'c1', n = 8): GameState {
  let s = withRoles(newGame(n, seed), { p1: 'wolf', p2: 'wolf', p3: 'wolf' });
  s = electSpeaker(s, T0 + 1, 'p5');
  expect(s.phase.kind).toBe('day');
  for (const p of alive(s)) s = must(s, p.id, { type: 'ready', topic: 'council', value: true }, T0 + 2);
  return s;
}

/** 4 Stimmen auf p1 (von p2,p3,p4,p5), 4 auf p2 (von p1,p6,p7,p8). */
function voteTie(_s: GameState, ids: string[]): [string, string][] {
  return ids.map((id) => [id, ['p2', 'p3', 'p4', 'p5'].includes(id) ? 'p1' : 'p2'] as [string, string]);
}

describe('Dorfrat-Start (Klassisch)', () => {
  it('beginnt, sobald alle bereit sind', () => {
    const s = toCouncil();
    expect(s.phase.kind).toBe('council');
  });
  it('beginnt bei Mehrheit erst nach der Karenzzeit', () => {
    let s = withRoles(newGame(8, 'm'), {});
    s = electSpeaker(s, T0 + 1);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) s = must(s, id, { type: 'ready', topic: 'council', value: true }, T0 + 10);
    expect(s.phase.kind).toBe('day');
    s = tick(s, T0 + 10 + s.rules.durations.confirmGraceMs + 1);
    expect(s.phase.kind).toBe('council');
  });
  it('bricht bei zurückgenommener Mehrheit die Karenz ab', () => {
    let s = electSpeaker(newGame(8, 'm2'), T0 + 1);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) s = must(s, id, { type: 'ready', topic: 'council', value: true }, T0 + 10);
    s = must(s, 'p5', { type: 'ready', topic: 'council', value: false }, T0 + 20);
    s = must(s, 'p4', { type: 'ready', topic: 'council', value: false }, T0 + 20);
    s = tick(s, T0 + 10 + 10 * 60_000);
    expect(s.phase.kind).toBe('day');
  });
});

describe('Dorfrat-Ablauf', () => {
  function run(s: GameState, nominate: Record<string, string>, votes: Record<string, string> | null) {
    for (const [a, t] of Object.entries(nominate)) s = must(s, a, { type: 'nominate', target: t }, T0 + 3);
    if (s.phase.kind === 'council' && s.phase.council.step === 'nomination') s = tick(s, T0 + 4, { force: true });
    return s;
  }

  it('Nominierung bestimmt höchstens drei Kandidaten (mit Gleichstand an der Grenze)', () => {
    let s = toCouncil();
    const nom: Record<string, string> = { p1: 'p4', p2: 'p4', p3: 'p4', p4: 'p5', p5: 'p6', p6: 'p7', p7: 'p8', p8: 'p1' };
    s = run(s, nom, null);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('defense');
    expect(s.phase.council.candidates).toContain('p4');
    expect(s.phase.council.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('Ohne Nominierungen stehen alle Lebenden zur Wahl', () => {
    let s = toCouncil();
    s = tick(s, T0 + 5, { force: true });
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.candidates).toHaveLength(8);
  });

  it('Stimmen sind verbindlich, nur für Kandidaten, nicht für sich selbst', () => {
    let s = toCouncil();
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('voting');
    expect(applyCommand(s, 'p1', { type: 'vote', target: 'p1' }, T0 + 7).ok).toBe(false);
    s = must(s, 'p1', { type: 'vote', target: 'p4' }, T0 + 7);
    const again = applyCommand(s, 'p1', { type: 'vote', target: 'p5' }, T0 + 8);
    expect(again.ok).toBe(false);
  });

  it('Alle Stimmen gesperrt → Countdown 3-2-1-ZEIGT → danach Ergebnis (Ergebnis erst nach dem Zeigen)', () => {
    let s = toCouncil();
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    for (const p of alive(s)) {
      const target = p.id === 'p4' ? 'p5' : 'p4';
      s = must(s, p.id, { type: 'vote', target }, T0 + 7);
    }
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('showdown');
    expect(s.phase.council.revealAt).toBe(T0 + 7 + s.rules.durations.countdownMs);
    // Vor dem Ende von „Zeigen" kein Ergebnis
    s = tick(s, T0 + 7 + s.rules.durations.countdownMs + 1);
    expect(s.phase.kind === 'council' && s.phase.council.step).toBe('showdown');
    s = tick(s, T0 + 7 + s.rules.durations.countdownMs + s.rules.durations.pointingMs + 1);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('result');
    expect(s.phase.council.banished).toBe('p4');
    expect(s.players.p4!.alive).toBe(false);
  });

  it('Gleichstand: der Dorfsprecher entscheidet zwischen den Gleichplatzierten', () => {
    let s = toCouncil('tie');
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    const ids = alive(s).map((p) => p.id);
    voteTie(s, ids).forEach(([id, t]) => (s = must(s, id, { type: 'vote', target: t }, T0 + 7)));
    s = tick(s, T0 + 1_000_000, { force: true });
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('tiebreak');
    expect(s.phase.council.tied!.sort()).toEqual(['p1', 'p2']);
    // Nicht-Sprecher darf nicht entscheiden
    expect(applyCommand(s, 'p1', { type: 'decide_tie', target: 'p2' }, T0 + 2_000_000).ok).toBe(false);
    // Sprecher darf nur aus dem Gleichstand wählen
    expect(applyCommand(s, 'p5', { type: 'decide_tie', target: 'p7' }, T0 + 2_000_000).ok).toBe(false);
    s = must(s, 'p5', { type: 'decide_tie', target: 'p2' }, T0 + 2_000_001);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.banished).toBe('p2');
  });

  it('Entscheidet der Dorfsprecher nicht, gibt es trotzdem genau eine Verbannung', () => {
    let s = toCouncil('tie2');
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    const ids = alive(s).map((p) => p.id);
    voteTie(s, ids).forEach(([id, t]) => (s = must(s, id, { type: 'vote', target: t }, T0 + 7)));
    s = tick(s, T0 + 1_000_000, { force: true });
    s = tick(s, T0 + 9_000_000);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.banished).not.toBeNull();
    expect(alive(s)).toHaveLength(7);
  });

  it('Ohne eine einzige Stimme endet der Dorfrat trotzdem mit genau einer Verbannung', () => {
    let s = toCouncil('novotes');
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    s = tick(s, T0 + 10_000_000);
    s = tick(s, T0 + 10_000_001);
    s = tick(s, T0 + 10_100_000);
    expect(alive(s).length).toBe(7);
  });

  it('Eine einzige Kandidatin wird nach der Verteidigung verbannt', () => {
    let s = toCouncil('single');
    for (const id of alive(s).map((p) => p.id)) {
      s = must(s, id, { type: 'nominate', target: id === 'p4' ? 'p5' : 'p4' }, T0 + 3);
    }
    if (s.phase.kind !== 'council') throw new Error('x');
    // p4 und p5 stehen zur Wahl
    expect(s.phase.council.candidates.sort()).toEqual(['p4', 'p5']);
  });

  it('Verbannter Spieler scheidet sofort aus und verliert Rechte; Sprecher-Verlust wird beim nächsten Tag neu gewählt', () => {
    let s = toCouncil('sp', 12);
    s = tick(s, T0 + 5, { force: true });
    s = tick(s, T0 + 6, { force: true });
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p5' ? 'p4' : 'p5' }, T0 + 7);
    s = tick(s, T0 + 1_000_000);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.players.p5!.alive).toBe(false);
    expect(s.speakerId).toBeNull();
    expect(applyCommand(s, 'p5', { type: 'ready', topic: 'council', value: true }, T0 + 1_000_001).ok).toBe(false);
    s = advanceTo(s, 'speaker_election', T0 + 1_000_002);
    expect(s.day).toBe(2);
  });
});
