import { describe, expect, it } from 'vitest';
import { applyCommand, checkWin, tick } from '../src/engine';
import { packChannelMembers, privateView } from '../src/views';
import type { GameState } from '../src/types';
import { UNLIMITED } from '../src/types';
import { alive, electSpeaker, forceNight, must, newGame, T0, withRoles } from './helpers';

/** Setzt eine laufende Quest direkt (Testhilfe) und beendet sie per Frist. */
function runQuest(s: GameState, questId: string, doneBy: string[]): GameState {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  if (c.phase.kind !== 'day') throw new Error('Tag erwartet');
  c.phase.quest = { id: questId, startedAt: T0, endsAt: T0 + 1000, doneBy };
  c.phase.questTimes = [];
  return tick(c, T0 + 5000);
}

const day = (rules?: object, n = 10) => electSpeaker(withRoles(newGame(n, 'q', { rules: rules as never }), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9');
const impulses = (s: GameState) => s.events.filter((e) => e.kind === 'impulse');

describe('Quest-Belohnungen', () => {
  it('Eine Quest ohne konfigurierte Belohnung erzeugt auch bei Erfolg nichts', () => {
    const s = day();
    const before = impulses(s).length;
    const r = runQuest(s, 'q-tabu-1', alive(s).map((p) => p.id));
    expect(r.events.at(-1)!.kind).toBe('quest_ended');
    expect(r.events.at(-1)!.data).toMatchObject({ success: true });
    expect(impulses(r)).toHaveLength(before);
    expect(Object.values(r.players).map((p) => p.role)).toEqual(Object.values(s.players).map((p) => p.role));
  });
  it('Nur ausdrücklich konfigurierte Quests lösen bei ERFOLG etwas aus: Hinweis', () => {
    const s = day();
    const before = impulses(s).length;
    const ok = runQuest(s, 'q-wissen-1', alive(s).map((p) => p.id));
    expect(impulses(ok)).toHaveLength(before + 1);
    expect(ok.impulse?.kind).toBe('hint');
    const fail = runQuest(s, 'q-wissen-1', ['p1', 'p2']);
    expect(impulses(fail)).toHaveLength(before);
    expect(fail.events.at(-1)!.data).toMatchObject({ success: false });
  });
  it('Rollen-Belohnung: Impuls immer bei Erfolg, Vergabe nur nach noRoleChance', () => {
    const none = day({ moments: { quest_reward: { noRoleChance: 1 } } });
    const r0 = runQuest(none, 'q-koordination-1', alive(none).map((p) => p.id));
    expect(r0.impulse?.kind).toBe('change');
    expect(Object.values(r0.players).map((p) => p.role)).toEqual(Object.values(none.players).map((p) => p.role));

    const some = day({ moments: { quest_reward: { noRoleChance: 0 } } });
    const r1 = runQuest(some, 'q-koordination-1', alive(some).map((p) => p.id));
    expect(r1.impulse?.kind).toBe('change');
    expect(Object.values(r1.players).filter((p) => p.role !== 'villager' && p.role !== 'wolf').length)
      .toBeGreaterThan(Object.values(some.players).filter((p) => p.role !== 'villager' && p.role !== 'wolf').length);
    // Nicht erfüllt → nichts
    const failed = runQuest(some, 'q-koordination-1', ['p1']);
    expect(impulses(failed)).toHaveLength(impulses(some).length);
  });
  it('Impuls ist in beiden Fällen identisch (gleicher Text, gleiche Dauer)', () => {
    const a = runQuest(day({ moments: { quest_reward: { noRoleChance: 1 } } }), 'q-koordination-1', ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']);
    const b = runQuest(day({ moments: { quest_reward: { noRoleChance: 0 } } }), 'q-koordination-1', ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']);
    expect(a.impulse?.textKey).toBe(b.impulse?.textKey);
    expect(a.impulse!.showUntil - a.impulse!.at).toBe(b.impulse!.showUntil - b.impulse!.at);
  });
});

describe('Grenzgänger im Rudel', () => {
  function pack() {
    let s = withRoles(newGame(10, 'bw'), { p1: 'wolf', p2: 'wolf', p3: 'borderwalker', p4: 'scout' });
    s = electSpeaker(s, T0 + 1, 'p9');
    return must(s, 'p3', { type: 'choose_side', side: 'pack' }, T0 + 2);
  }
  it('hat Rudelrechte: Kenntnis der Wölfe, Rudelkanal, Rudelziel', () => {
    const s = pack();
    expect(packChannelMembers(s)).toContain('p3');
    expect(privateView(s, 'p3')!.packMates.map((m) => m.id).sort()).toEqual(['p1', 'p2']);
    expect(privateView(s, 'p1')!.packMates.map((m) => m.id)).toContain('p3');
    must(s, 'p3', { type: 'pack_target', target: 'p5' }, T0 + 3);
  });
  it('zählt für die Siegbedingung als Wolf und wird als Rudel erkannt', () => {
    let s = pack();
    for (const id of ['p5', 'p6', 'p7', 'p8']) s.players[id]!.alive = false; // 3 Rudel vs p4,p9,p10
    expect(checkWin(s)).toBe('pack');
    s = pack();
    s.players.p1!.alive = false;
    s.players.p2!.alive = false;
    expect(checkWin(s)).toBeNull(); // Dorf braucht auch ihn
    s.players.p3!.alive = false;
    expect(checkWin(s)).toBe('village');
    // Späher sieht ihn als Rudel
    let n = forceNight(pack());
    n = must(n, 'p4', { type: 'night_action', ability: 'scout', target: 'p3' }, T0 + 5_000_000);
    n = tick(n, T0 + 9_000_000);
    expect(privateView(n, 'p4')!.notes.find((x) => x.kind === 'inspect_result')!.data.faction).toBe('pack');
  });
});

describe('Fähigkeiten sind datengetrieben konfigurierbar', () => {
  it('Nutzungszahl ändern: Späher mit 1 Nutzung', () => {
    const rules = { roles: { scout: { abilities: [{ id: 'scout', kind: 'inspect', uses: 1 }] } } };
    let s = withRoles(newGame(10, 'c1', { rules: rules as never }), { p1: 'wolf', p2: 'wolf', p3: 'scout' });
    s = forceNight(s);
    expect(s.players.p3!.uses.scout).toBe(1);
    s = must(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p3!.uses.scout).toBe(0);
    expect(privateView(forceNight(s, T0 + 20_000_000), 'p3')!.abilities).toHaveLength(0);
  });
  it('unbegrenzte Nutzung', () => {
    const rules = { roles: { scout: { abilities: [{ id: 'scout', kind: 'inspect', uses: null }] } } };
    let s = withRoles(newGame(10, 'c2', { rules: rules as never }), { p1: 'wolf', p2: 'wolf', p3: 'scout' });
    expect(s.players.p3!.uses.scout).toBe(UNLIMITED);
    for (let i = 0; i < 3; i++) {
      s = forceNight(s, T0 + 5_000_000 + i * 1_000_000);
      s = must(s, 'p1', { type: 'pack_target', target: `p${5 + i}` }, T0 + 5_000_000 + i * 1_000_000);
      s = must(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' }, T0 + 5_000_000 + i * 1_000_000);
      s = tick(s, T0 + 5_000_000 + i * 1_000_000 + 200_000);
      s = JSON.parse(JSON.stringify(s));
      s.phase = { kind: 'day', startedAt: 0, councilBy: null, nightAt: null, quest: null, questTimes: [], councilQueued: false };
    }
    expect(privateView(s, 'p3')!.notes.filter((n) => n.kind === 'inspect_result')).toHaveLength(3);
  });
  it('Wächter-Wiederholungssperre abschaltbar', () => {
    const rules = { roles: { guardian: { abilities: [{ id: 'protect', kind: 'protect', uses: null, noRepeatTarget: false }] } } };
    let s = withRoles(newGame(10, 'c3', { rules: rules as never }), { p1: 'wolf', p2: 'wolf', p3: 'guardian' });
    s = forceNight(s);
    s = must(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    s = forceNight(s, T0 + 20_000_000);
    expect(applyCommand(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 20_000_000).ok).toBe(true);
  });
  it('Jäger ohne last_shot-Fähigkeit hinterlässt keinen Schuss', () => {
    const rules = { roles: { hunter: { abilities: [] } } };
    let s = withRoles(newGame(10, 'c4', { rules: rules as never }), { p1: 'wolf', p2: 'wolf', p3: 'hunter' });
    s = forceNight(s);
    s = must(s, 'p1', { type: 'pack_target', target: 'p3' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p3!.alive).toBe(false);
    expect(s.hunterShots).toEqual({});
  });
  it('Unbekannte oder fremde Fähigkeiten werden abgelehnt', () => {
    let s = withRoles(newGame(10, 'c5'), { p1: 'wolf', p2: 'wolf', p3: 'scout' });
    s = forceNight(s);
    expect(applyCommand(s, 'p3', { type: 'night_action', ability: 'potion_strike', target: 'p1' }, T0 + 5_000_000).ok).toBe(false);
    expect(applyCommand(s, 'p3', { type: 'night_action', ability: 'last_shot', target: 'p1' }, T0 + 5_000_000).ok).toBe(false);
  });
});
