import { describe, expect, it } from 'vitest';
import { applyCommand, checkWin, tick } from '../src/engine';
import { packChannelMembers, privateView } from '../src/views';
import type { GameState } from '../src/types';
import { UNLIMITED } from '../src/types';
import { alive, electSpeaker, endNight, forceNight, must, newGame, T0, withRoles } from './helpers';

/** Setzt eine laufende Quest direkt (Testhilfe) und beendet sie per Frist. */
function runQuest(s: GameState, questId: string, doneBy: string[]): GameState {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  if (c.phase.kind !== 'day') throw new Error('Tag erwartet');
  c.phase.quest = { id: questId, startedAt: T0, endsAt: T0 + 1000, doneBy };
  c.phase.questTimes = [];
  return tick(c, T0 + 5000);
}

const day = (rules?: object, n = 10) => electSpeaker(withRoles(newGame(n, 'q', { rules: rules as never }), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9');
/** Zustand nach einer bereits erfolgreichen ersten Quest (ohne Rollenbelohnung), ein späterer Tag. */
const later = (rules?: object, n = 10) => {
  const c = JSON.parse(JSON.stringify(day(rules, n))) as GameState;
  c.questSuccesses = 1;
  c.lastQuestReward = 'other';
  return c;
};
const moments = (s: GameState) => s.events.filter((e) => e.kind === 'moment');
const specials = (s: GameState) => Object.values(s.players).filter((p) => s.rules.roles[p.role].special);
const everyone = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

describe('Quest-Belohnungen', () => {
  it('Eine spätere Quest ohne konfigurierte Belohnung erzeugt auch bei Erfolg nichts', () => {
    const s = later();
    const before = moments(s).length;
    const r = runQuest(s, 'q-tabu-1', alive(s).map((p) => p.id));
    expect(r.events.at(-1)!.kind).toBe('quest_ended');
    expect(r.events.at(-1)!.data).toMatchObject({ success: true });
    expect(moments(r)).toHaveLength(before);
    expect(Object.values(r.players).map((p) => p.role)).toEqual(Object.values(s.players).map((p) => p.role));
  });
  it('Hinweis-Quest: nur bei ERFOLG ein (nicht geheimer) Hinweis-Moment', () => {
    const s = later();
    const before = moments(s).length;
    const ok = runQuest(s, 'q-wissen-1', alive(s).map((p) => p.id));
    expect(moments(ok)).toHaveLength(before + 1);
    expect(ok.moment?.kind).toBe('hint');
    expect(ok.moment?.secret).toBe(false);
    const fail = runQuest(s, 'q-wissen-1', ['p1', 'p2']);
    expect(moments(fail)).toHaveLength(before);
    expect(fail.events.at(-1)!.data).toMatchObject({ success: false });
  });
  it('Freischaltungs-Quest: sagt die Rolle öffentlich an und vergibt sie an genau einen geeigneten Spieler', () => {
    const s = day();
    const ok = runQuest(s, 'q-koordination-1', everyone);
    expect(ok.moment).toMatchObject({ kind: 'quest_unlock', role: 'scout', secret: true });
    const holders = Object.values(ok.players).filter((p) => p.role === 'scout');
    expect(holders).toHaveLength(1);
    expect(holders[0]!.faction).toBe('village'); // Fraktion bleibt Dorf
    expect(ok.momentSecret).toMatchObject({ recipient: holders[0]!.id, role: 'scout' });
    expect(ok.laterGrants).toBe(1);
    // Nicht erfüllt → nichts
    const failed = runQuest(s, 'q-koordination-1', ['p1']);
    expect(moments(failed)).toHaveLength(moments(s).length);
    expect(specials(failed)).toHaveLength(specials(s).length);
  });
  it('Nur Spieler ohne Sonderrolle kommen infrage (höchstens eine Sonderrolle gleichzeitig)', () => {
    let s = day();
    // alle Dorfbewohner haben bereits eine Sonderrolle → keine Freischaltung
    s = JSON.parse(JSON.stringify(s)) as GameState;
    for (const p of Object.values(s.players)) if (p.faction === 'village') p.role = 'guardian';
    const r = runQuest(s, 'q-koordination-1', everyone);
    expect(r.moment?.kind).not.toBe('quest_unlock');
  });
  it('Jede Rollenart höchstens einmal pro Partie – auch nicht nach dem Tod des Trägers', () => {
    let s = day();
    s = runQuest(s, 'q-koordination-1', everyone);
    const first = Object.values(s.players).find((p) => p.role === 'scout')!;
    const dead = JSON.parse(JSON.stringify(s)) as GameState;
    dead.players[first.id]!.alive = false;
    dead.questSuccesses = 2;
    dead.lastQuestReward = 'other';
    dead.day += 1;
    const again = runQuest(dead, 'q-koordination-1', alive(dead).map((p) => p.id));
    expect(Object.values(again.players).filter((p) => p.role === 'scout')).toHaveLength(1);
    expect(again.moment?.kind).toBe('hint'); // Fallback statt Rolle
  });
  it('Das Moment-Format ist für alle gleich: Sound-/Haptik-Zeitpunkt und Dauer identisch', () => {
    const a = runQuest(day(), 'q-koordination-1', everyone);
    expect(a.moment!.showUntil - a.moment!.at).toBe(a.rules.durations.momentMs);
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
    n = endNight(n, T0 + 9_000_000);
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
    s = endNight(s, T0 + 9_000_000);
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
      s = endNight(s, T0 + 5_000_000 + i * 1_000_000 + 200_000);
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
    s = endNight(s, T0 + 9_000_000);
    s = forceNight(s, T0 + 20_000_000);
    expect(applyCommand(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 20_000_000).ok).toBe(true);
  });
  it('Jäger ohne last_shot-Fähigkeit hinterlässt keinen Schuss', () => {
    const rules = { roles: { hunter: { abilities: [] } } };
    let s = withRoles(newGame(10, 'c4', { rules: rules as never }), { p1: 'wolf', p2: 'wolf', p3: 'hunter' });
    s = forceNight(s);
    s = must(s, 'p1', { type: 'pack_target', target: 'p3' }, T0 + 5_000_000);
    s = endNight(s, T0 + 9_000_000);
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
