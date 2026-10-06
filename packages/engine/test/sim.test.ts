import { describe, expect, it } from 'vitest';
import { simulateGame } from '../sim/policy';
import { applyCommand, applyCommandMut, createGame } from '../src/engine';
import { newGame, roster, T0 } from './helpers';

describe('Simulations-Harness', () => {
  it('spielt vollständige Partien aller Größen ohne Fehler und mit konsistentem Ergebnis', () => {
    for (let n = 6; n <= 14; n++) {
      for (let i = 0; i < 25; i++) {
        const r = simulateGame({ n, seed: `t${n}-${i}` });
        expect(['village', 'pack']).toContain(r.winner);
        expect(r.rounds).toBeGreaterThanOrEqual(1);
        expect(r.aliveAtEnd).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('applyCommandMut liefert dasselbe Ergebnis wie applyCommand', () => {
    const a = newGame(10, 'mut');
    const b = JSON.parse(JSON.stringify(a));
    const r1 = applyCommand(a, 'p3', { type: 'vote_speaker', target: 'p4' }, T0 + 1);
    const r2 = applyCommandMut(b, 'p3', { type: 'vote_speaker', target: 'p4' }, T0 + 1);
    expect(r1.ok && r2.ok && JSON.stringify(r1.state) === JSON.stringify(r2.state)).toBe(true);
    void createGame; void roster;
  });
  it('ist deterministisch', () => {
    expect(simulateGame({ n: 10, seed: 'det' })).toEqual(simulateGame({ n: 10, seed: 'det' }));
  });
});
