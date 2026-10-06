import { describe, expect, it } from 'vitest';
import { pickLateAssignment, roleBudget } from '../src/director';
import { tick } from '../src/engine';
import { Rng, seedToState } from '../src/rng';
import type { GameState } from '../src/types';
import { alive, electSpeaker, newGame, simulate, T0, withRoles } from './helpers';

const clone = (s: GameState) => JSON.parse(JSON.stringify(s)) as GameState;
function runQuest(s: GameState, questId: string, doneBy: string[]): GameState {
  const c = clone(s);
  if (c.phase.kind !== 'day') throw new Error('Tag erwartet');
  c.phase.quest = { id: questId, startedAt: T0, endsAt: T0 + 1000, doneBy };
  c.phase.questTimes = [];
  return tick(c, T0 + 5000);
}
const day = (n = 10, rules?: object, roles: Record<string, never | string> = {}) =>
  electSpeaker(withRoles(newGame(n, 'rw', { rules: rules as never }), { p1: 'wolf', ...roles } as never), T0 + 1, 'p3');
const ids = (s: GameState) => alive(s).map((p) => p.id);
const specials = (s: GameState) => Object.values(s.players).filter((p) => s.rules.roles[p.role].special);

describe('Gesamtbudget', () => {
  it('floor(Startspieler / 2)', () => {
    const r = newGame(4).rules;
    expect([4, 5, 6, 8, 10, 14].map((n) => roleBudget(n, r))).toEqual([2, 2, 3, 4, 5, 7]);
  });
  it('Obergrenze, kein Ziel: über viele Partien nie darüber, Rollen nie doppelt, höchstens eine neue Rolle pro Tag', () => {
    for (const n of [4, 6, 8, 10, 14]) {
      let below = 0;
      for (let i = 0; i < 12; i++) {
        const r = simulate(`rw-${n}-${i}`, n, 'classic');
        const sp = specials(r.state);
        expect(sp.length).toBeLessThanOrEqual(Math.floor(n / 2));
        const kinds = sp.map((p) => p.role);
        expect(new Set(kinds).size).toBe(kinds.length);
        for (const c of Object.values(r.state.grantsByDay)) expect(c).toBeLessThanOrEqual(1);
        if (sp.length < Math.floor(n / 2)) below++;
      }
      expect(below).toBeGreaterThan(0); // das Budget wird nicht zwanghaft ausgeschöpft
    }
  });
  it('ausgeschöpftes Budget (Startrollen zählen mit) → Fallback statt Rolle', () => {
    const s = day(8, undefined, { p2: 'scout', p3x: 'villager', p4: 'guardian', p5: 'alchemist', p6: 'observer' });
    expect(specials(s)).toHaveLength(4); // = floor(8/2)
    const r = runQuest(s, 'q-tabu-1', ids(s));
    expect(r.moment?.kind).toBe('hint');
    expect(specials(r)).toHaveLength(4);
    expect(r.lastQuestReward).toBe('other');
  });
});

describe('Erste erfolgreiche Quest', () => {
  it('schaltet garantiert genau eine Sonderrolle frei – auch bei einer Quest ohne konfigurierte Belohnung', () => {
    for (let i = 0; i < 20; i++) {
      const s = electSpeaker(withRoles(newGame(10, `first-${i}`), { p1: 'wolf', p2: 'wolf', p3: 'wolf' }), T0 + 1, 'p9');
      const r = runQuest(s, 'q-tabu-1', ids(s));
      expect(r.moment).toMatchObject({ kind: 'quest_unlock', secret: true });
      expect(r.laterGrants).toBe(1);
      expect(specials(r)).toHaveLength(1);
      expect(r.lastQuestReward).toBe('role');
    }
  });
  it('eine gescheiterte Quest zählt nicht als erste erfolgreiche', () => {
    const s = day();
    const f = runQuest(s, 'q-tabu-1', ['p1']);
    expect(f.questSuccesses).toBe(0);
    expect(specials(f)).toHaveLength(0);
    const ok = runQuest(f, 'q-tabu-1', ids(f));
    expect(ok.moment?.kind).toBe('quest_unlock');
  });
  it('wählt nur zulässige Rollen (Pool, Aktivierung, Spielerzahl)', () => {
    for (let i = 0; i < 30; i++) {
      const s = electSpeaker(withRoles(newGame(10, `pool-${i}`), { p1: 'wolf' }), T0 + 1, 'p9');
      const r = runQuest(s, 'q-tabu-1', ids(s));
      const got = specials(r)[0]!;
      expect(r.rules.roles[got.role].enabled).toBe(true);
      expect(['hunter', 'borderwalker', 'shadowwolf']).not.toContain(got.role);
    }
  });
  it('ohne zulässige Rolle greift die konfigurierte Fallbackbelohnung (Standard: Hinweis)', () => {
    const s = day(10, { roles: { scout: { enabled: false }, tracker: { enabled: false }, guardian: { enabled: false }, alchemist: { enabled: false }, observer: { enabled: false } } });
    const r = runQuest(s, 'q-tabu-1', ids(s));
    expect(r.moment?.kind).toBe('hint');
    const ev = day(10, { roles: { scout: { enabled: false }, tracker: { enabled: false }, guardian: { enabled: false }, alchemist: { enabled: false }, observer: { enabled: false } }, roleRewards: { fallback: { kind: 'event', eventKey: 'x' } } });
    const r2 = runQuest(ev, 'q-tabu-1', ids(ev));
    expect(r2.events.some((e) => e.kind === 'quest_event')).toBe(true);
  });
  it('kann per Konfiguration ausgeschaltet werden', () => {
    const s = day(10, { roleRewards: { firstSuccessfulQuestGuaranteed: false } });
    const r = runQuest(s, 'q-tabu-1', ids(s));
    expect(specials(r)).toHaveLength(0);
  });
});

describe('Nach der ersten Rollenfreischaltung', () => {
  it('die direkt folgende erfolgreiche Quest vergibt keine Rolle (Fallback), die danach wieder möglich ist', () => {
    let s = runQuest(day(), 'q-tabu-1', ids(day())); // erste: Rolle
    expect(s.lastQuestReward).toBe('role');
    s = clone(s);
    s.day += 1; // Tageslimit nicht der Grund
    const second = runQuest(s, 'q-koordination-1', ids(s));
    expect(second.moment?.kind).toBe('hint');
    expect(second.laterGrants).toBe(1);
    expect(second.lastQuestReward).toBe('other');
    const t = clone(second);
    t.day += 1;
    const third = runQuest(t, 'q-koordination-1', ids(t));
    // Rolle wieder möglich (scout noch nicht vergeben, sofern die erste keine Späherin war)
    if (!specials(second).some((p) => p.role === 'scout')) expect(third.moment?.kind).toBe('quest_unlock');
  });
  it('eine Quest ohne spielmechanische Belohnung unterbricht ebenfalls', () => {
    let s = runQuest(day(), 'q-tabu-1', ids(day()));
    s = clone(s);
    s.day += 1;
    s = runQuest(s, 'q-tabu-1', ids(s)); // keine Belohnung → 'none'
    expect(s.lastQuestReward).toBe('none');
  });
  it('höchstens eine neue Sonderrolle pro Spieltag (auch Rollen-Momente zählen)', () => {
    const s = runQuest(day(), 'q-tabu-1', ids(day()));
    expect(s.grantsByDay[s.day]).toBe(1);
    expect(pickLateAssignment(s, 'after_first_council', new Rng(seedToState('x')))).toBeNull();
    const next = clone(s);
    next.day += 1;
    // am nächsten Tag wieder möglich (sofern Pool/Budget es erlauben)
    expect(pickLateAssignment(next, 'after_first_council', new Rng(seedToState('x')))).not.toBeNull();
  });
});

describe('Zeit-/Phasenpräferenzen', () => {
  const only = (role: string, timing: object) => ({
    roles: Object.fromEntries(['scout', 'tracker', 'guardian', 'alchemist', 'observer'].map((r) => [r, r === role ? { timing } : { enabled: false }])),
  });
  it('Faktor 0 schließt eine Rolle in dieser Phase aus, in einer anderen ist sie möglich', () => {
    const rules = only('guardian', { early: 0, mid: 1, late: 1 });
    const early = day(10, rules);
    const e = runQuest(early, 'q-tabu-1', ids(early));
    expect(e.moment?.kind).toBe('hint'); // früh nicht erlaubt → Fallback
    const mid = clone(day(10, rules));
    mid.day = 3;
    const m = runQuest(mid, 'q-tabu-1', ids(mid));
    expect(m.moment?.kind).toBe('quest_unlock');
  });
  it('Standardwerte: Späher/Fährtenleser/Beobachter früh bevorzugt, Grenzgänger nur Startrolle', () => {
    const r = newGame(10).rules.roles;
    for (const id of ['scout', 'tracker', 'observer'] as const) expect(r[id].timing.early).toBeGreaterThan(r[id].timing.late);
    expect(r.alchemist.timing.mid).toBeGreaterThan(r.alchemist.timing.late);
    expect(r.borderwalker.unlock.triggers).toEqual(['start']);
  });
  it('Präferenz verschiebt nur Gewichte: kein Zugriff auf Parteistärke', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/director.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/winRate|partyStrength|packAlive|villageAlive/);
  });
});

describe('Kleingruppen (4–6 Startspieler)', () => {
  it('erste Quest darf mit mindestens 4 Lebenden eine Rolle vergeben (Vorrang vor der ≤5-Regel)', () => {
    const s = day(6, undefined, { });
    const four = clone(s);
    for (const id of ['p5', 'p6']) four.players[id]!.alive = false;
    expect(alive(four)).toHaveLength(4);
    const r = runQuest(four, 'q-tabu-1', ids(four));
    expect(r.moment?.kind).toBe('quest_unlock');
    const three = clone(four);
    three.players['p4']!.alive = false;
    const r3 = runQuest(three, 'q-tabu-1', ids(three));
    expect(r3.moment?.kind).toBe('hint');
  });
  it('ab 7 Startspielern gilt weiter: ≤5 Lebende → keine neuen Rollen', () => {
    const s = clone(day(10));
    for (const id of ['p4', 'p5', 'p6', 'p7', 'p8']) s.players[id]!.alive = false;
    expect(alive(s)).toHaveLength(5);
    const r = runQuest(s, 'q-tabu-1', ids(s));
    expect(r.moment?.kind).toBe('hint');
    expect(specials(r)).toHaveLength(0);
  });
});

describe('Konfigurationswarnungen zum Reward Director', () => {
  it('warnt, wenn die erste Quest keine Rolle zur Auswahl hat bzw. das Budget überschritten wird', async () => {
    const { validateRoleConfig } = await import('../src/roleConfig');
    const off = { scout: 'off', tracker: 'off', guardian: 'off', alchemist: 'off', observer: 'off' } as const;
    expect(validateRoleConfig(5, off).map((w) => w.code)).toContain('no_role_available_for_quest');
    expect(validateRoleConfig(4, {}).map((w) => w.code)).not.toContain('no_role_available_for_quest');
    expect(validateRoleConfig(10, {}).map((w) => w.code)).not.toContain('no_role_available_for_quest');
    expect(validateRoleConfig(4, { scout: 'guaranteed', tracker: 'guaranteed', guardian: 'guaranteed' }).map((w) => w.code)).toContain('guaranteed_exceeds_budget');
  });
});

describe('Mindestspielerzahlen / Kleingruppen-Pool (konfigurierbare Defaults)', () => {
  const pool = (n: number) => {
    const roles = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const s = electSpeaker(withRoles(newGame(n, `pool${n}-${i}`), { p1: 'wolf' }), T0 + 1, 'p3');
      const c = clone(s);
      for (const p of Object.values(c.players)) if (c.rules.roles[p.role].special) p.role = 'villager';
      // Alle aktuell erlaubten Rollen für die erste Quest sammeln
      const r = runQuest(c, 'q-tabu-1', ids(c));
      for (const p of specials(r)) roles.add(p.role);
    }
    return [...roles].sort();
  };
  it('4 Spieler: Späher; Alchemistin und Fährtenleser noch nicht', () => {
    expect(pool(4)).toEqual(['scout']);
  });
  it('5 Spieler: Späher, Alchemistin und Fährtenleser verfügbar', () => {
    expect(pool(5)).toEqual(['alchemist', 'scout', 'tracker']);
  });
  it('Beobachter ab 8, Jäger ab 8 (deaktiviert)', () => {
    const r = newGame(8).rules.roles;
    expect(r.observer.minPlayers).toBe(8);
    expect(r.hunter.minPlayers).toBe(8);
    expect(pool(7)).not.toContain('observer');
  });
  it('Späher hat bei 4 Spielern höchstens 1 Nutzung (automatisch), sonst 2 – konfigurierbar', async () => {
    const { initialUses } = await import('../src/engine');
    const r = newGame(4).rules;
    expect(initialUses('scout', r, 4)).toEqual({ scout: 1 });
    expect(initialUses('scout', r, 5)).toEqual({ scout: 2 });
    const cfg = newGame(4, 'x', { rules: { roles: { scout: { abilities: [{ id: 'scout', kind: 'inspect', uses: 2, usesByPlayers: { 4: 2 } }] } } } as never }).rules;
    expect(initialUses('scout', cfg, 4)).toEqual({ scout: 2 });
    // tatsächlich vergebener Späher bei 4 Spielern
    const s = electSpeaker(withRoles(newGame(4, 'sc'), { p1: 'wolf' }), T0 + 1, 'p3');
    const r1 = runQuest(s, 'q-tabu-1', ids(s));
    const sc = specials(r1).find((p) => p.role === 'scout')!;
    expect(sc.uses.scout).toBe(1);
  });
  it('Host darf abweichen: Rolle unter der Mindestgröße wird möglich/garantiert, Warnung statt Blockade; Nutzungszahl-Override entfällt', async () => {
    const { validateRoleConfig } = await import('../src/roleConfig');
    const { createGame } = await import('../src/engine');
    const s = createGame({ roster: Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, name: `S${i + 1}` })), hostId: 'p1', mode: 'classic', seed: 'h', now: T0, roleModes: { observer: 'guaranteed' } });
    expect(Object.values(s.players).some((p) => p.role === 'observer')).toBe(true);
    expect(validateRoleConfig(5, { observer: 'guaranteed' }).map((w) => w.code)).toContain('role_below_min_players');
    const sc = createGame({ roster: Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `S${i + 1}` })), hostId: 'p1', mode: 'classic', seed: 'h2', now: T0, roleModes: { scout: 'guaranteed' } });
    expect(Object.values(sc.players).find((p) => p.role === 'scout')!.uses.scout).toBe(2);
  });
  it('Warnungen sind verständliche deutsche Texte', async () => {
    const { warningText } = await import('../src/roleConfig');
    expect(warningText({ code: 'role_below_min_players', roles: ['observer'] })).toMatch(/empfohlen/);
  });
});

describe('Später-Slot für die erste Quest (reserviert)', () => {
  it('beim Start reserviert; ein Rollen-Moment verbraucht den letzten Slot nicht', () => {
    let s = day(6);
    expect(s.questSlotReserved).toBe(true);
    expect(s.rules.maxLaterSpecials.tiny).toBe(1);
    for (let i = 0; i < 20; i++) expect(pickLateAssignment(s, 'after_first_council', new Rng(seedToState(`r${i}`)))).toBeNull();
    s = runQuest(s, 'q-tabu-1', ids(s));
    expect(s.moment?.kind).toBe('quest_unlock');
    expect(s.questSlotReserved).toBe(false);
  });
  it('mit mehr Slots (groß: 3) bleibt einer frei, bis die erste Quest abgewickelt ist', () => {
    const s = day(12);
    const rng = (i: number) => new Rng(seedToState(`l${i}`));
    let c = clone(s);
    const a1 = pickLateAssignment(c, 'after_first_council', rng(1));
    expect(a1).not.toBeNull();
    c.laterGrants = 1; c.day += 1;
    expect(pickLateAssignment(c, 'day_start', rng(2))).not.toBeNull();
    c.laterGrants = 2; c.day += 1;
    expect(pickLateAssignment(c, 'day_start', rng(3))).toBeNull(); // letzter Slot reserviert
    expect(pickLateAssignment(c, 'quest_reward', rng(4))).not.toBeNull(); // die Quest darf ihn nutzen
  });
  it('wird auch bei legitimem Fallback aufgehoben (keine Rolle zulässig)', () => {
    const s = day(10, { roles: { scout: { enabled: false }, tracker: { enabled: false }, guardian: { enabled: false }, alchemist: { enabled: false }, observer: { enabled: false } } });
    const r = runQuest(s, 'q-tabu-1', ids(s));
    expect(r.moment?.kind).toBe('hint');
    expect(r.questSlotReserved).toBe(false);
  });
  it('eine gescheiterte Quest hebt die Reservierung nicht auf; ohne Garantie gibt es keine', () => {
    const s = day(6);
    expect(runQuest(s, 'q-tabu-1', ['p1']).questSlotReserved).toBe(true);
    expect(day(6, { roleRewards: { firstSuccessfulQuestGuaranteed: false } }).questSlotReserved).toBe(false);
  });
  it('Budget bleibt Obergrenze auch in Kleingruppen: 4 Spieler erzeugen nicht automatisch zwei Rollen', () => {
    let two = 0;
    for (let i = 0; i < 40; i++) {
      const s = electSpeaker(withRoles(newGame(4, `c4-${i}`), {}), T0 + 1, 'p3');
      expect(specials(s).length).toBeLessThanOrEqual(1);
      if (specials(s).length === 1) two++;
    }
    expect(two).toBeLessThan(40); // Startrolle ist Zufall, nicht Ziel
  });
});
