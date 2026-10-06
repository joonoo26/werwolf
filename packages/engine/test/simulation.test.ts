import { describe, expect, it } from 'vitest';
import { applyCommand, checkWin, tick } from '../src/engine';
import { privateView, publicView } from '../src/views';
import type { GameState } from '../src/types';
import { newGame, simulate, T0 } from './helpers';

const ROLE_WORDS = /villager|wolf|scout|tracker|alchemist|guardian|borderwalker|hunter|shadowwolf|"faction"|"role"/;

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

describe('Zufallsspiele (Invarianten)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => `sim-${i}`);

  for (const mode of ['classic', 'evening'] as const) {
    it(`${mode}: jede Partie endet, Siegerlogik stimmt, jeder Dorfrat endet mit genau einer Verbannung`, () => {
      for (const seed of seeds) {
        const n = 6 + (seed.length % 9);
        const deadSeen = new Set<string>();
        const { state } = simulate(seed + mode, n, mode, (s) => {
          for (const p of Object.values(s.players)) {
            if (!p.alive) deadSeen.add(p.id);
            else expect(deadSeen.has(p.id)).toBe(false); // niemand kehrt zurück
          }
          const pack = Object.values(s.players).filter((p) => p.alive && p.faction === 'pack').length;
          expect(pack).toBeLessThanOrEqual(Object.values(s.players).filter((p) => p.alive).length);
        });
        expect(state.phase.kind).toBe('ended');
        expect(state.winner).toBe(checkWin(state));
        const started = state.events.filter((e) => e.kind === 'council_started').length;
        const banished = state.events.filter((e) => e.kind === 'banished').length;
        expect(banished).toBe(started);
      }
    });
  }

  it('öffentliche Sicht verrät vor Spielende nie Rollen oder Fraktionen', () => {
    for (const seed of seeds.slice(0, 25)) {
      simulate(seed, 9 + (seed.length % 5), 'classic', (s) => {
        if (s.phase.kind === 'ended') return;
        const json = JSON.stringify(publicView(s));
        expect(json).not.toMatch(ROLE_WORDS);
      });
    }
  });

  it('Privatsichten enthalten nie Rollen oder Fraktionen anderer Spieler (außer erlaubte Rudelkenntnis)', () => {
    for (const seed of seeds.slice(0, 25)) {
      simulate(seed, 10, 'evening', (s) => {
        for (const me of Object.values(s.players)) {
          const view = privateView(s, me.id)!;
          // Eigene Rolle ist erlaubt; fremde Rollennamen dürfen nirgends stehen.
          const copy = JSON.parse(JSON.stringify(view));
          delete copy.role;
          delete copy.faction;
          delete copy.nightAction; // eigene Aktionsbeschreibung nennt die eigene Rolle
          delete copy.currentNightChoice;
          for (const n of copy.notes) if (n.kind === 'role' || n.kind === 'role_gained') delete n.data.role;
          const json = JSON.stringify(copy);
          expect(json).not.toMatch(/"(villager|wolf|scout|tracker|alchemist|guardian|borderwalker|hunter|shadowwolf)"/);
          if (!(me.alive && me.faction === 'pack')) {
            expect(view.packMates).toEqual([]);
            expect(view.packTarget).toBeNull();
            expect(view.hasPackChannel).toBe(false);
          } else {
            for (const mate of view.packMates) expect(s.players[mate.id]!.faction).toBe('pack');
          }
        }
      });
    }
  });

  it('Befehle verändern den übergebenen Zustand nicht (reine Funktionen)', () => {
    const s = deepFreeze(newGame(10, 'frozen'));
    const r = applyCommand(s, 'p3', { type: 'vote_speaker', target: 'p4' }, T0 + 1);
    expect(r.ok).toBe(true);
    expect(() => tick(s, T0 + 10 * 60_000)).not.toThrow();
  });

  it('Zustand ist vollständig JSON-serialisierbar (Postgres jsonb)', () => {
    const { state } = simulate('json', 10, 'classic');
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('Ergebnis ist bei gleichem Seed und gleichen Eingaben reproduzierbar', () => {
    const a = simulate('repro', 11, 'evening');
    const b = simulate('repro', 11, 'evening');
    expect(a.state).toEqual(b.state);
  });
});
