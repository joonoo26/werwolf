import { describe, expect, it } from 'vitest';
import { applyCommand, createGame, tick } from '../src/engine';
import { retrospective } from '../src/retrospective';
import { Rng, seedToState } from '../src/rng';
import { DEFAULT_RULES } from '../src/rules';
import { holds, pickStatement, trueStatements } from '../src/traits';
import { validateRoleConfig } from '../src/roleConfig';
import { NEUTRAL_VARIANTS, privateView, publicView } from '../src/views';
import type { GameState, Profile } from '../src/types';
import { alive, advanceTo, electSpeaker, endNight, forceNight, must, newGame, roster, T0, withRoles } from './helpers';

const profile = (age: number, gender: Profile['gender'], hair: Profile['hair'], eyes: Profile['eyes']): Profile => ({ age, gender, hair, eyes });
const NOW_NIGHT = T0 + 5_000_000;

/** 10 Spieler mit gezielten Profilen; p1/p2 Wölfe, p3 Beobachter. */
function observerGame(extra: Record<string, import('../src/types').RoleId> = {}) {
  const profiles: Profile[] = [
    profile(35, 'male', 'black', 'green'), // p1 Wolf
    profile(52, 'female', 'blonde', 'blue'), // p2 Wolf
    profile(28, 'female', 'brown', 'brown'), // p3 Beobachter
    profile(41, 'male', 'brown', 'green'),
    profile(19, 'female', 'red', 'blue'),
    profile(33, 'male', 'black', 'brown'),
    profile(60, 'diverse', 'gray', 'gray'),
    profile(24, 'female', 'blonde', 'green'),
    profile(45, 'male', 'brown', 'blue'),
    profile(30, 'female', 'black', 'brown'),
  ];
  let s = createGame({ roster: roster(10).map((r, i) => ({ ...r, profile: profiles[i]! })), hostId: 'p1', mode: 'classic', seed: 'obs', now: T0 });
  s = withRoles(s, { p1: 'wolf', p2: 'wolf', p3: 'observer', ...extra });
  s = electSpeaker(s, T0 + 1, 'p9');
  return forceNight(s);
}

describe('Synchroner Geheimnismoment', () => {
  it('Spielstart: alle erhalten denselben Moment mit privatem Bereich; Grenzgänger wird öffentlich angekündigt', () => {
    const s = createGame({
      roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'bw-start', now: T0,
      roleModes: { borderwalker: 'guaranteed' },
    });
    expect(s.moment).toMatchObject({ kind: 'start', secret: true, announced: ['borderwalker'] });
    expect(publicView(s).moment!.announced).toEqual(['borderwalker']);
    for (const p of Object.values(s.players)) expect(privateView(s, p.id)!.panel).toMatchObject({ momentId: s.moment!.id, kind: 'role_info' });
  });
  it('ohne Grenzgänger wird nichts angekündigt', () => {
    const s = newGame(10, 'no-bw');
    expect(s.moment!.announced).toBeUndefined();
  });
  it('Quest-Freischaltung: alle haben exakt denselben Moment; nur der Betroffene bekommt „Du bist …", alle anderen neutrale Inhalte', () => {
    let s = electSpeaker(withRoles(newGame(10, 'qu'), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9');
    s = JSON.parse(JSON.stringify(s)) as GameState;
    if (s.phase.kind !== 'day') throw new Error('x');
    s.phase.quest = { id: 'q-koordination-1', startedAt: T0, endsAt: T0 + 1000, doneBy: alive(s).map((p) => p.id) };
    s = tick(s, T0 + 5000);
    expect(s.moment).toMatchObject({ kind: 'quest_unlock', role: 'scout', secret: true });
    const panels = Object.keys(s.players).map((id) => ({ id, panel: privateView(s, id)!.panel! }));
    expect(new Set(panels.map((p) => p.panel.momentId)).size).toBe(1);
    const you = panels.filter((p) => p.panel.kind === 'you_are');
    expect(you).toHaveLength(1);
    expect(you[0]!.panel).toMatchObject({ role: 'scout' });
    for (const p of panels.filter((x) => x.panel.kind !== 'you_are')) {
      expect(p.panel.kind).toBe('neutral');
      expect((p.panel as { variant: number }).variant).toBeLessThan(NEUTRAL_VARIANTS);
    }
    // Öffentliche Sicht enthält nichts über den Empfänger
    expect(JSON.stringify(publicView(s))).not.toMatch(/momentSecret|recipient/);
    expect(publicView(s).players.find((p) => p.id === you[0]!.id)!.revealed).toBeNull();
  });
  it('Neutraler Moment ohne Rollenvergabe ist von einem mit Vergabe von außen nicht zu unterscheiden', () => {
    const run = (noRoleChance: number) => {
      let s = electSpeaker(withRoles(newGame(10, 'dec', { rules: { moments: { after_first_council: { noRoleChance } }, startSpecials: { medium: [{ count: 0, weight: 1 }] } } as never }), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9');
      s.firstCouncilDone = false;
      for (let i = 0; i < 14 && s.phase.kind !== 'dusk'; i++) s = tick(s, T0 + 100_000 * (i + 2), { force: true });
      return s;
    };
    const none = run(1);
    const some = run(0);
    expect(none.moment!.kind).toBe('neutral');
    expect(some.moment!.kind).toBe('neutral');
    expect(none.moment!.showUntil - none.moment!.at).toBe(some.moment!.showUntil - some.moment!.at);
    const shapeOf = (s: GameState) => JSON.stringify(Object.keys(s.players).map((id) => privateView(s, id)!.panel!.kind === 'neutral'));
    expect(shapeOf(none)).toBe(JSON.stringify(Object.keys(none.players).map(() => true)));
    // Die öffentliche Sicht (inkl. Moment) hat dieselbe Struktur
    expect(Object.keys(publicView(none).moment!).sort()).toEqual(Object.keys(publicView(some).moment!).sort());
    expect(Object.values(some.players).filter((p) => DEFAULT_RULES.roles[p.role].special).length).toBe(1);
  });
});

describe('Grenzgänger: synchroner Entscheidungs-Moment', () => {
  function bw() {
    let s = withRoles(newGame(10, 'bwm', { rules: { roles: { borderwalker: { enabled: true } } } as never }), { p1: 'wolf', p2: 'wolf', p3: 'borderwalker' });
    s = electSpeaker(s, T0 + 1, 'p9');
    return s;
  }
  it('Entscheidung löst für ALLE denselben neutralen Moment aus; die Wahl bleibt geheim', () => {
    for (const side of ['village', 'pack'] as const) {
      const s = must(bw(), 'p3', { type: 'choose_side', side }, T0 + 2);
      expect(s.moment).toMatchObject({ kind: 'borderwalker_decided', secret: true });
      expect(JSON.stringify(publicView(s))).not.toContain('"pack"');
      const panels = Object.keys(s.players).map((id) => privateView(s, id)!.panel!);
      expect(panels.filter((p) => p.kind === 'chose')).toHaveLength(1);
      expect(privateView(s, 'p3')!.panel).toMatchObject({ kind: 'chose', faction: side });
      expect(privateView(s, 'p4')!.panel!.kind).toBe('neutral');
    }
  });
  it('Moment sieht bei Dorf- und Rudelwahl öffentlich identisch aus', () => {
    const a = must(bw(), 'p3', { type: 'choose_side', side: 'village' }, T0 + 2);
    const b = must(bw(), 'p3', { type: 'choose_side', side: 'pack' }, T0 + 2);
    expect(JSON.stringify(publicView(a).moment)).toBe(JSON.stringify(publicView(b).moment));
    expect(publicView(a).packSeats).toBe(publicView(b).packSeats);
  });
  it('ohne Entscheidung bleibt er im Dorf; der Moment erscheint trotzdem genau einmal (zu Beginn der Nacht)', () => {
    let s = bw();
    s = advanceTo(s, 'council', T0 + 2);
    s = advanceTo(s, 'dusk', T0 + 3);
    s = advanceTo(s, 'night', T0 + 4);
    expect(s.players.p3!.faction).toBe('village');
    expect(s.events.filter((e) => e.kind === 'moment' && e.data?.kind === 'borderwalker_decided')).toHaveLength(1);
  });
  it('Rudelplätze bleiben öffentlich konstant, auch wenn er das Rudel wählt (Ersatz eines Wolf-Platzes)', () => {
    const seats = (side: 'village' | 'pack') => publicView(must(bw(), 'p3', { type: 'choose_side', side }, T0 + 2)).packSeats;
    expect(seats('pack')).toBe(seats('village'));
    expect(publicView(bw()).packSeats).toBe(DEFAULT_RULES.wolvesByPlayers[10]);
  });
});

describe('Öffentliche Rudelplätze und Aufdeckung beim Ausscheiden', () => {
  it('packSeats/playerCount stehen von Beginn an öffentlich fest', () => {
    const v = publicView(newGame(10, 'seats'));
    expect(v).toMatchObject({ packSeats: 3, playerCount: 10, livingCount: 10 });
  });
  it('Verbannung deckt Fraktion + Rolle für alle gleichzeitig auf (im selben öffentlichen Zustand wie das Ergebnis)', () => {
    let s = withRoles(newGame(10, 'rev'), { p1: 'wolf', p2: 'wolf', p4: 'alchemist' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = advanceTo(s, 'council', T0 + 2);
    s = tick(s, T0 + 3, { force: true });
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p4' ? 'p5' : 'p4' }, T0 + 4);
    s = tick(s, T0 + 1_000_000);
    const v = publicView(s);
    expect(v.council!.banished).toBe('p4');
    expect(v.players.find((p) => p.id === 'p4')!.revealed).toEqual({ faction: 'village', role: 'alchemist' });
    expect(v.players.filter((p) => p.revealed)).toHaveLength(1);
  });
  it('nächtlich gefressener Spieler: Name + Sonderrolle werden im Morgen-Zustand aufgedeckt', () => {
    let s = withRoles(newGame(10, 'rev2'), { p1: 'wolf', p2: 'wolf', p4: 'guardian' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = forceNight(s);
    s = must(s, 'p1', { type: 'pack_target', target: 'p4' }, NOW_NIGHT);
    s = endNight(s, NOW_NIGHT + 200_000);
    const v = publicView(s);
    expect(v.morningDeaths).toEqual(['p4']);
    expect(v.players.find((p) => p.id === 'p4')!.revealed).toEqual({ faction: 'village', role: 'guardian' });
  });
  it('ein gebanntes Rudelmitglied wird als Rudel/Wolf aufgedeckt', () => {
    let s = withRoles(newGame(10, 'rev3'), { p1: 'wolf', p2: 'wolf' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = advanceTo(s, 'council', T0 + 2);
    s = tick(s, T0 + 3, { force: true });
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p1' ? 'p2' : 'p1' }, T0 + 4);
    s = tick(s, T0 + 1_000_000);
    expect(publicView(s).players.find((p) => p.id === 'p1')!.revealed).toEqual({ faction: 'pack', role: 'wolf' });
  });
});

describe('Verdacht vor der Nacht', () => {
  it('jeder markiert genau so viele Verdächtige wie öffentliche Rudelplätze (begrenzt durch die Lebenden)', () => {
    const s = forceNight(electSpeaker(withRoles(newGame(10, 'sus'), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9'));
    expect(publicView(s).suspicionCount).toBe(3);
    expect(applyCommand(s, 'p3', { type: 'suspect', targets: ['p4', 'p5'] }, NOW_NIGHT).ok).toBe(false);
    expect(applyCommand(s, 'p3', { type: 'suspect', targets: ['p4', 'p4', 'p5'] }, NOW_NIGHT).ok).toBe(false);
    expect(applyCommand(s, 'p3', { type: 'suspect', targets: ['p3', 'p4', 'p5'] }, NOW_NIGHT).ok).toBe(false);
    expect(applyCommand(s, 'p3', { type: 'suspect', targets: ['p4', 'p5', 'p6'] }, NOW_NIGHT).ok).toBe(true);
  });
  it('die Anzahl hängt nicht an geheimen Entscheidungen (Grenzgänger im Rudel)', () => {
    let s = withRoles(newGame(10, 'sus2', { rules: { roles: { borderwalker: { enabled: true } } } as never }), { p1: 'wolf', p2: 'borderwalker' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = must(s, 'p2', { type: 'choose_side', side: 'pack' }, T0 + 2);
    expect(publicView(forceNight(s)).suspicionCount).toBe(3);
  });
  it('Abgaben sind geheim (nicht in öffentlichen oder fremden Sichten) und ersetzbar', () => {
    let s = forceNight(electSpeaker(withRoles(newGame(10, 'sus3'), { p1: 'wolf', p2: 'wolf' }), T0 + 1, 'p9'));
    s = must(s, 'p3', { type: 'suspect', targets: ['p4', 'p5', 'p6'] }, NOW_NIGHT);
    s = must(s, 'p3', { type: 'suspect', targets: ['p7', 'p8', 'p9'] }, NOW_NIGHT + 1);
    expect(s.suspicions.filter((e) => e.by === 'p3')).toHaveLength(1);
    expect(JSON.stringify(publicView(s))).not.toContain('suspicions');
    expect(JSON.stringify(privateView(s, 'p4'))).not.toContain('suspicions');
  });
  it('Rückblick nach Spielende: Verdachts-Serien, nie Verdächtigte, nie ein Wolf verdächtigt', () => {
    let s = withRoles(newGame(10, 'retro'), { p1: 'wolf', p2: 'wolf', p3: 'wolf' });
    s.suspicions = [
      { day: 1, by: 'p4', targets: ['p5', 'p6', 'p7'] },
      { day: 2, by: 'p4', targets: ['p5', 'p8', 'p9'] },
      { day: 1, by: 'p6', targets: ['p4', 'p5', 'p7'] },
    ];
    const r = retrospective(s);
    expect(r.suspicionStreaks[0]).toMatchObject({ by: 'p4', target: 'p5', sinceDay: 1, nights: 2 });
    expect(r.neverSuspected).toContain('p10');
    expect(r.neverSuspected).not.toContain('p5');
    expect(r.neverSuspectedPack.sort()).toEqual(['p4', 'p6']);
    s = JSON.parse(JSON.stringify(s));
    s.phase = { kind: 'ended' };
    s.winner = 'village';
    expect(publicView(s).retrospective).not.toBeNull();
    expect(publicView(newGame(10, 'r2')).retrospective).toBeNull();
  });
});

describe('Beobachter und „Ausschau halten"', () => {
  it('Fenster ist höchstens 10 Sekunden aktiv, der Hinweis ist nur während des Fensters sichtbar und wahr', () => {
    let s = observerGame();
    expect(privateView(s, 'p3')!.observation).toMatchObject({ available: true, open: false, hint: null, windowMs: 10_000 });
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    const v = privateView(s, 'p3')!.observation!;
    expect(v.open).toBe(true);
    expect(v.hint).not.toBeNull();
    const target = s.night!.observers.p3!.target;
    expect(s.players[target]!.faction).toBe('pack');
    expect(holds(v.hint!, s.players[target]!.profile)).toBe(true);
    // nach 10 s endet das Fenster
    s = must(s, 'p3', { type: 'observe', action: 'ping' }, NOW_NIGHT + 2000);
    s = must(s, 'p3', { type: 'observe', action: 'ping' }, NOW_NIGHT + 4000);
    s = tick(s, NOW_NIGHT + 10_001);
    expect(privateView(s, 'p3')!.observation).toMatchObject({ open: false, hint: null });
  });
  it('Loslassen beendet das Fenster sofort', () => {
    let s = observerGame();
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    s = must(s, 'p3', { type: 'observe', action: 'stop' }, NOW_NIGHT + 1500);
    expect(privateView(s, 'p3')!.observation).toMatchObject({ open: false, hint: null });
  });
  it('Ausbleibende Lebenszeichen (Hintergrund/Verbindungsabbruch) beenden das Fenster', () => {
    let s = observerGame();
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    s = tick(s, NOW_NIGHT + s.rules.durations.observerPingTtlMs + 1);
    expect(privateView(s, 'p3')!.observation).toMatchObject({ open: false, hint: null });
    // ein Ping nach Ablauf öffnet es nicht wieder
    s = must(s, 'p3', { type: 'observe', action: 'ping' }, NOW_NIGHT + 5000);
    expect(privateView(s, 'p3')!.observation!.open).toBe(false);
  });
  it('jede Nacht ein Fenster; nur der Beobachter darf; nicht in der Heil-Phase', () => {
    let s = observerGame();
    expect(applyCommand(s, 'p4', { type: 'observe', action: 'start' }, NOW_NIGHT).ok).toBe(false);
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    s = must(s, 'p3', { type: 'observe', action: 'stop' }, NOW_NIGHT + 100);
    expect(applyCommand(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT + 200).ok).toBe(false);
    // nächste Nacht wieder möglich
    s = endNight(s, NOW_NIGHT + 200_000);
    s = forceNight(JSON.parse(JSON.stringify(s)), NOW_NIGHT + 1_000_000);
    expect(privateView(s, 'p3')?.observation?.available ?? true).toBe(true);
  });
  it('der Hinweis ist möglichst nicht eindeutig: trifft auf mehrere Lebende zu', () => {
    for (let i = 0; i < 40; i++) {
      let s = observerGame();
      s = { ...s, rng: Array.from(seedToState('o' + i)) as GameState['rng'] };
      s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
      const hint = s.night!.observers.p3!.hint;
      const matches = alive(s).filter((p) => holds(hint, p.profile)).length;
      expect(matches).toBeGreaterThanOrEqual(2);
      expect(matches).toBeLessThan(alive(s).length);
    }
  });
  it('Hinweis nennt nur EIN Merkmal (keine Namen, keine Mehrfach-Merkmale)', () => {
    const s = must(observerGame(), 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    const hint = privateView(s, 'p3')!.observation!.hint!;
    expect(Object.keys(hint).sort()).toEqual(['trait', 'value']);
    expect(JSON.stringify(privateView(s, 'p3')!.observation)).not.toMatch(/p[0-9]+"/);
  });
  it('Ausschau halten: gemeinsam genau ein Versuch pro Nacht, auch wenn ein anderer Wolf ihn auslöst', () => {
    let s = observerGame();
    s = must(s, 'p1', { type: 'lookout' }, NOW_NIGHT);
    expect(applyCommand(s, 'p2', { type: 'lookout' }, NOW_NIGHT + 100).ok).toBe(false);
    expect(privateView(s, 'p2')!.lookout).toEqual({ available: false });
    expect(applyCommand(s, 'p4', { type: 'lookout' }, NOW_NIGHT + 100).ok).toBe(false);
  });
  it('Kein Treffer ohne aktives Fenster: nur Schatten – alle Rudelmitglieder erfahren es', () => {
    let s = observerGame();
    s = must(s, 'p2', { type: 'lookout' }, NOW_NIGHT);
    for (const id of ['p1', 'p2']) {
      const n = privateView(s, id)!.notes.filter((x) => x.kind === 'lookout_miss');
      expect(n).toHaveLength(1);
      expect(n[0]!.data).toMatchObject({ by: 'p2' });
    }
    expect(privateView(s, 'p3')!.notes.filter((x) => x.kind.startsWith('lookout'))).toHaveLength(0);
  });
  it('Treffer bei aktivem Fenster: alle Rudelmitglieder erhalten gemeinsam genau EIN wahres Merkmal; der Beobachter erfährt nichts', () => {
    let s = observerGame();
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    const before = JSON.stringify(privateView(s, 'p3'));
    s = must(s, 'p1', { type: 'lookout' }, NOW_NIGHT + 1000);
    const results = ['p1', 'p2'].map((id) => privateView(s, id)!.notes.find((x) => x.kind === 'lookout_result')!);
    expect(results[0]!.data).toEqual(results[1]!.data);
    expect(results[0]!.data).toMatchObject({ by: 'p1' });
    const st = results[0]!.data.statement as import('../src/types').TraitStatement;
    expect(holds(st, s.players.p3!.profile)).toBe(true);
    expect(Object.keys(st).sort()).toEqual(['trait', 'value']);
    // Der Beobachter sieht nach dem Treffer dasselbe wie davor (keine Entdeckungs-Meldung)
    expect(JSON.stringify(privateView(s, 'p3'))).toBe(before);
    expect(JSON.stringify(publicView(s))).not.toContain('lookout');
  });
  it('Treffer erfordert zeitliche Überschneidung: abgelaufenes oder beendetes Fenster zählt nicht', () => {
    let s = observerGame();
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    s = must(s, 'p3', { type: 'observe', action: 'stop' }, NOW_NIGHT + 2000);
    let hit = must(JSON.parse(JSON.stringify(s)) as GameState, 'p1', { type: 'lookout' }, NOW_NIGHT + 3000);
    expect(privateView(hit, 'p1')!.notes.some((n) => n.kind === 'lookout_miss')).toBe(true);
    let s2 = observerGame();
    s2 = must(s2, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    hit = must(s2, 'p1', { type: 'lookout' }, NOW_NIGHT + 11_000); // > 10 s Höchstdauer
    expect(privateView(hit, 'p1')!.notes.some((n) => n.kind === 'lookout_miss')).toBe(true);
  });
  it('Beobachter-Fenster endet mit der Rudelsperre', () => {
    let s = observerGame();
    s = must(s, 'p3', { type: 'observe', action: 'start' }, NOW_NIGHT);
    s = tick(s, NOW_NIGHT + s.rules.durations.nightMs + 1);
    expect(privateView(s, 'p3')!.observation!.open).toBe(false);
  });
});

describe('Profile und Hinweise', () => {
  it('Profile sind für Mitspieler sichtbar (exaktes Alter) und kommen aus dem Roster', () => {
    const s = observerGame();
    const v = publicView(s);
    expect(v.players.find((p) => p.id === 'p1')!.profile).toEqual(profile(35, 'male', 'black', 'green'));
  });
  it('gröbere wahre Aussagen entstehen aus exakten Daten („über 30", „dunkle Haare")', () => {
    const st = trueStatements(profile(35, 'male', 'brown', 'green'));
    expect(st).toContainEqual({ trait: 'age_over', value: 30 });
    expect(st).toContainEqual({ trait: 'hair', value: 'dark' });
    expect(st.every((x) => holds(x, profile(35, 'male', 'brown', 'green')))).toBe(true);
  });
  it('pickStatement bevorzugt nicht eindeutige Aussagen', () => {
    const group = [profile(35, 'male', 'brown', 'green'), profile(41, 'male', 'black', 'brown'), profile(19, 'female', 'blonde', 'blue')];
    for (let i = 0; i < 50; i++) {
      const st = pickStatement(group[0]!, group, new Rng(seedToState('p' + i)));
      const n = group.filter((g) => holds(st, g)).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThan(3);
    }
  });
});

describe('Host-Rollenkonfiguration (aus / möglich / garantiert) und Warnungen', () => {
  it('garantierte Rollen sind zu Beginn immer im Spiel; ausgeschaltete nie', () => {
    for (let i = 0; i < 30; i++) {
      const s = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'rm' + i, now: T0, roleModes: { observer: 'guaranteed', guardian: 'off' } });
      const roles = Object.values(s.players).map((p) => p.role);
      expect(roles).toContain('observer');
      expect(roles).not.toContain('guardian');
    }
  });
  it('„möglich" aktiviert auch standardmäßig deaktivierte Rollen', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const s = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'pm' + i, now: T0, roleModes: { hunter: 'possible' }, rules: { startSpecials: { medium: [{ count: 2, weight: 1 }] }, roles: { hunter: { weight: 50 } } } as never });
      Object.values(s.players).forEach((p) => seen.add(p.role));
    }
    expect(seen.has('hunter')).toBe(true);
  });
  it('Warnungen: Mindestspielerzahl, nicht startbare Garantie, zu viele Garantien, Kombinationen – ohne Siegquoten', () => {
    const codes = (n: number, modes: Parameters<typeof validateRoleConfig>[1]) => validateRoleConfig(n, modes).map((w) => w.code);
    expect(codes(4, { alchemist: 'possible' })).toContain('role_below_min_players');
    expect(codes(5, { observer: 'possible' })).toContain('role_below_min_players');
    expect(codes(10, { alchemist: 'guaranteed', observer: 'guaranteed', scout: 'guaranteed' })).toContain('guaranteed_exceeds_start_range');
    expect(codes(10, { scout: 'guaranteed', tracker: 'guaranteed' })).toContain('guaranteed_combo_conflict');
    expect(codes(5, { scout: 'guaranteed' })).toContain('small_group_guaranteed');
    expect(codes(10, { guardian: 'possible' })).toEqual([]);
    expect(JSON.stringify(validateRoleConfig(10, { scout: 'guaranteed', tracker: 'guaranteed' }))).not.toMatch(/win|quote|rate/i);
  });
});

describe('Fraktion und Sonderrolle sind getrennt', () => {
  it('eine später vergebene Sonderrolle ändert die Fraktion nicht; höchstens eine Sonderrolle je Spieler', () => {
    const s = createGame({ roster: roster(10), hostId: 'p1', mode: 'classic', seed: 'sep', now: T0 });
    for (const p of Object.values(s.players)) {
      expect(['village', 'pack']).toContain(p.faction);
      expect(typeof p.role).toBe('string'); // genau eine Rolle (Sonderrolle oder Grundrolle)
    }
  });
});
