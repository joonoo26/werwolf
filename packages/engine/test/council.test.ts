import { describe, expect, it } from 'vitest';
import { applyCommand, tick } from '../src/engine';
import { alive, advanceTo, electSpeaker, must, newGame, T0, withRoles } from './helpers';
import type { GameState } from '../src/types';
import { publicView } from '../src/views';

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

describe('Dorfrat-Ablauf (direkte Abstimmung, keine Nominierung)', () => {
  const toVoting = (seed = 'v1', n = 8) => toCouncil(seed, n);

  it('beginnt sofort mit der Abstimmung; alle Lebenden sind wählbar', () => {
    const s = toVoting();
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('voting');
    expect(s.phase.council.candidates).toHaveLength(8);
    expect(applyCommand(s, 'p1', { type: 'nominate', target: 'p2' } as never, T0 + 3).ok).toBe(false);
  });

  it('Jeder darf jeden anderen Lebenden wählen, nicht sich selbst; Stimmen sind verbindlich', () => {
    let s = toVoting();
    expect(applyCommand(s, 'p1', { type: 'vote', target: 'p1' }, T0 + 7).ok).toBe(false);
    expect(applyCommand(s, 'p1', { type: 'vote', target: 'nobody' }, T0 + 7).ok).toBe(false);
    s = must(s, 'p1', { type: 'vote', target: 'p4' }, T0 + 7);
    expect(applyCommand(s, 'p1', { type: 'vote', target: 'p5' }, T0 + 8).ok).toBe(false);
  });

  it('Alle Stimmen gesperrt → Countdown 3-2-1-ZEIGT → danach erst das digitale Ergebnis', () => {
    let s = toVoting();
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p4' ? 'p5' : 'p4' }, T0 + 7);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('showdown');
    expect(s.phase.council.revealAt).toBe(T0 + 7 + s.rules.durations.countdownMs);
    const d = s.rules.durations;
    s = tick(s, T0 + 7 + d.countdownMs + 1);
    expect(publicTally(s)).toBeNull(); // noch kein Ergebnis sichtbar
    s = tick(s, T0 + 7 + d.countdownMs + d.pointingMs + 1);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('result');
    expect(s.phase.council.banished).toBe('p4');
    expect(s.players.p4!.alive).toBe(false);
  });

  it('Gleichstand: der Dorfsprecher entscheidet zwischen den Gleichplatzierten', () => {
    let s = toVoting('tie');
    voteTie(s, alive(s).map((p) => p.id)).forEach(([id, t]) => (s = must(s, id, { type: 'vote', target: t }, T0 + 7)));
    s = tick(s, T0 + 1_000_000, { force: true });
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.step).toBe('tiebreak');
    expect(s.phase.council.tied!.sort()).toEqual(['p1', 'p2']);
    expect(applyCommand(s, 'p1', { type: 'decide_tie', target: 'p2' }, T0 + 2_000_000).ok).toBe(false);
    expect(applyCommand(s, 'p5', { type: 'decide_tie', target: 'p7' }, T0 + 2_000_000).ok).toBe(false);
    s = must(s, 'p5', { type: 'decide_tie', target: 'p2' }, T0 + 2_000_001);
    if (s.phase.kind !== 'council') throw new Error('x');
    expect(s.phase.council.banished).toBe('p2');
  });

  it('Entscheidet der Dorfsprecher nicht, gibt es trotzdem genau eine Verbannung', () => {
    let s = toVoting('tie2');
    voteTie(s, alive(s).map((p) => p.id)).forEach(([id, t]) => (s = must(s, id, { type: 'vote', target: t }, T0 + 7)));
    s = tick(s, T0 + 1_000_000, { force: true });
    s = tick(s, T0 + 9_000_000);
    expect(alive(s)).toHaveLength(7);
  });

  it('Ohne eine einzige Stimme endet der Dorfrat trotzdem mit genau einer Verbannung', () => {
    let s = toVoting('novotes');
    s = tick(s, T0 + 10_000_000);
    s = tick(s, T0 + 10_000_001);
    s = tick(s, T0 + 10_100_000);
    expect(alive(s).length).toBe(7);
  });

  it('Fehlende Stimmen verfallen, die abgegebenen zählen', () => {
    let s = toVoting('partial');
    s = must(s, 'p1', { type: 'vote', target: 'p6' }, T0 + 7);
    s = must(s, 'p2', { type: 'vote', target: 'p6' }, T0 + 7);
    s = must(s, 'p3', { type: 'vote', target: 'p7' }, T0 + 7);
    s = tick(s, T0 + 20_000_000);
    s = tick(s, T0 + 30_000_000);
    expect(s.players.p6!.alive).toBe(false);
  });

  it('Verbannter scheidet sofort aus und verliert Rechte; Sprecher-Verlust wird beim nächsten Tag neu gewählt', () => {
    let s = toVoting('sp', 12);
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p5' ? 'p4' : 'p5' }, T0 + 7);
    s = tick(s, T0 + 1_000_000);
    expect(s.players.p5!.alive).toBe(false);
    expect(s.speakerId).toBeNull();
    expect(applyCommand(s, 'p5', { type: 'ready', topic: 'council', value: true }, T0 + 1_000_001).ok).toBe(false);
    s = advanceTo(s, 'speaker_election', T0 + 1_000_002);
    expect(s.day).toBe(2);
  });
});

function publicTally(s: GameState) {
  return publicView(s).council?.tally ?? null;
}
