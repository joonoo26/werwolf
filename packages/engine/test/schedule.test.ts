import { describe, expect, it } from 'vitest';
import { planDay, roundsLeft } from '../src/schedule';
import { DEFAULT_RULES } from '../src/rules';
import { applyCommand, tick } from '../src/engine';
import { alive, electSpeaker, must, newGame, T0 } from './helpers';

const H = 3_600_000;

describe('Abendmodus-Zeitplan', () => {
  it('Runden im ungünstigsten Fall', () => {
    expect(roundsLeft(5, 2)).toBe(2);
    expect(roundsLeft(7, 3)).toBe(2);
    expect(roundsLeft(3, 2)).toBe(1);
  });
  it('verteilt die Zieldauer auf die verbleibenden Runden', () => {
    const p = planDay({ now: 0, targetEndsAt: 4 * H, nonPackAlive: 8, packAlive: 2, rules: DEFAULT_RULES });
    // 3 Runden → pro Runde ~80 min; Nacht liegt nach dem Tag
    expect(p.nightAt).toBeGreaterThan(60 * 60_000);
    expect(p.nightAt).toBeLessThan(90 * 60_000);
    expect(p.councilBy).toBeLessThan(p.nightAt);
    expect(p.questTimes.length).toBeGreaterThan(0);
    for (const q of p.questTimes) {
      expect(q).toBeGreaterThan(0);
      expect(q).toBeLessThan(p.councilBy);
    }
  });
  it('unterschreitet nie die Mindesttageslänge, auch wenn die Zeit knapp wird', () => {
    const p = planDay({ now: 0, targetEndsAt: 5 * 60_000, nonPackAlive: 8, packAlive: 2, rules: DEFAULT_RULES });
    expect(p.nightAt).toBeGreaterThanOrEqual(DEFAULT_RULES.evening.minDayMs);
    expect(p.councilBy).toBeGreaterThan(0);
  });
});

describe('Abendmodus im Spiel', () => {
  function evening() {
    return electSpeaker(newGame(9, 'ev', { mode: 'evening', targetMinutes: 180 }), T0 + 1, 'p2');
  }
  it('zeigt Phase und Countdown zur nächsten Nacht', () => {
    const s = evening();
    expect(s.phase.kind).toBe('day');
    if (s.phase.kind !== 'day') return;
    expect(s.phase.nightAt).not.toBeNull();
    expect(s.phase.councilBy).not.toBeNull();
  });
  it('Mehrheit bereit → öffentlich „Das Dorf ist bereit", ohne Namen oder Zwischenstand', async () => {
    let s = evening();
    const { publicView } = await import('../src/views');
    for (const id of ['p1', 'p3', 'p4']) s = must(s, id, { type: 'ready', topic: 'council', value: true }, T0 + 10);
    expect(publicView(s).councilReady).toBe(false);
    expect(JSON.stringify(publicView(s))).not.toContain('readyCouncil');
    for (const id of ['p5', 'p6']) s = must(s, id, { type: 'ready', topic: 'council', value: true }, T0 + 10);
    expect(publicView(s).councilReady).toBe(true);
    // Rat wird bewusst gestartet, nicht automatisch
    expect(s.phase.kind).toBe('day');
    s = must(s, 'p7', { type: 'start_council' }, T0 + 11);
    expect(s.phase.kind).toBe('council');
  });
  it('ohne Mehrheit kann der Dorfrat nicht gestartet werden', () => {
    const s = evening();
    expect(applyCommand(s, 'p3', { type: 'start_council' }, T0 + 10).ok).toBe(false);
  });
  it('Dorfrat beginnt automatisch zur spätesten Zeit, wenn niemand startet', () => {
    let s = evening();
    if (s.phase.kind !== 'day') throw new Error('x');
    const by = s.phase.councilBy!;
    s = tick(s, by + 1);
    expect(s.phase.kind).toBe('council');
  });
  it('laufende Quest wird sauber abgeschlossen, bevor der Dorfrat beginnt (keine Überschneidung)', () => {
    let s = evening();
    if (s.phase.kind !== 'day') throw new Error('x');
    const firstQuest = s.phase.questTimes[0]!;
    s = tick(s, firstQuest + 1);
    if (s.phase.kind !== 'day') throw new Error('x');
    expect(s.phase.quest).not.toBeNull();
    const questEnd = s.phase.quest!.endsAt;
    // Dorfrat fällig, während Quest läuft
    for (const p of alive(s)) s = must(s, p.id, { type: 'ready', topic: 'council', value: true }, firstQuest + 2);
    s = must(s, 'p3', { type: 'start_council' }, firstQuest + 3);
    expect(s.phase.kind).toBe('day'); // noch Quest
    s = tick(s, questEnd + 1);
    expect(s.phase.kind).toBe('council');
  });
  it('Nacht startet zur geplanten Zeit, wenn der Dorfrat vorher war', () => {
    let s = evening();
    if (s.phase.kind !== 'day') throw new Error('x');
    const nightAt = s.phase.nightAt!;
    s = tick(s, s.phase.councilBy! + 1); // → Dorfrat
    for (let i = 0; i < 12 && s.phase.kind === 'council'; i++) s = tick(s, nightAt - 1, { force: true });
    expect(['dusk', 'ended']).toContain(s.phase.kind);
    if (s.phase.kind === 'dusk') {
      expect(s.phase.nightAt).toBe(nightAt);
      s = tick(s, nightAt + 1);
      expect(s.phase.kind).toBe('night');
    }
  });
});
