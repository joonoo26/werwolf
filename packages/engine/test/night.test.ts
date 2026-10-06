import { describe, expect, it } from 'vitest';
import { applyCommand, tick } from '../src/engine';
import { privateView, publicView } from '../src/views';
import { alive, advanceTo, electSpeaker, forceNight, must, newGame, T0, withRoles } from './helpers';
import type { GameState, RoleId } from '../src/types';

/** n=10: p1,p2 Wölfe; Rest gemäß roles. Führt Wahl, erzwingt Tag→Dorfrat… bis Nacht. */
function toNight(roles: Record<string, RoleId>, n = 10, seed = 'n1'): GameState {
  let s = withRoles(newGame(n, seed), { p1: 'wolf', p2: 'wolf', ...roles });
  s = electSpeaker(s, T0 + 1, 'p9');
  return forceNight(s);
}

const night = (s: GameState, id: string, action: Parameters<typeof must>[2] extends infer C ? C : never, t = T0 + 5_000_000) =>
  applyCommand(s, id, action, t);

describe('Rudelziel', () => {
  it('Mehrheit der Rudelstimmen entscheidet; Opfer scheidet aus', () => {
    let s = toNight({ p3: 'wolf' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p2', { type: 'pack_target', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p3', { type: 'pack_target', target: 'p6' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.phase.kind).toBe('morning');
    expect(s.players.p5!.alive).toBe(false);
    expect(s.players.p6!.alive).toBe(true);
  });
  it('kann während des Tages vorbereitet werden und bleibt bis zur Nacht erhalten', () => {
    let s = withRoles(newGame(10, 'prep'), { p1: 'wolf', p2: 'wolf' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 2);
    s = must(s, 'p2', { type: 'pack_target', target: 'p5' }, T0 + 2);
    s = forceNight(s);
    s = tick(s, T0 + 20_000_000);
    expect(s.players.p5!.alive).toBe(false);
  });
  it('wird das vorbereitete Ziel verbannt, muss das Rudel neu wählen (Stimme verfällt)', () => {
    let s = withRoles(newGame(10, 'prep2'), { p1: 'wolf', p2: 'wolf' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 2);
    s = must(s, 'p2', { type: 'pack_target', target: 'p5' }, T0 + 2);
    // p5 wird verbannt
    s = JSON.parse(JSON.stringify(s));
    s = advanceTo(s, 'council', T0 + 3);
    s = tick(s, T0 + 4, { force: true }); // Diskussion → Abstimmung
    for (const p of alive(s)) s = must(s, p.id, { type: 'vote', target: p.id === 'p5' ? 'p4' : 'p5' }, T0 + 6);
    s = tick(s, T0 + 3_000_000);
    expect(s.players.p5!.alive).toBe(false);
    expect(s.packVotes).toEqual({});
    expect(privateView(s, 'p1')!.packTarget!.mine).toBeNull();
  });
  it('ohne gültige Stimme wählt der Server zufällig ein zulässiges Ziel – nie ein Rudelmitglied', () => {
    for (let i = 0; i < 25; i++) {
      let s = toNight({}, 10, `rand${i}`);
      s = tick(s, T0 + 9_000_000);
      const dead = Object.values(s.players).filter((p) => !p.alive);
      expect(dead).toHaveLength(1);
      expect(dead[0]!.faction).toBe('village');
    }
  });
  it('Nicht-Rudelmitglieder dürfen kein Ziel setzen; Rudelziel darf kein Rudelmitglied sein', () => {
    const s = toNight({});
    expect(night(s, 'p3', { type: 'pack_target', target: 'p5' }).ok).toBe(false);
    expect(night(s, 'p1', { type: 'pack_target', target: 'p2' }).ok).toBe(false);
  });
  it('ausgeschiedene Wölfe verlieren sofort alle Rudelrechte', () => {
    let s = toNight({ p3: 'wolf' });
    s = JSON.parse(JSON.stringify(s));
    s.players.p3!.alive = false;
    expect(night(s, 'p3', { type: 'pack_target', target: 'p5' }).ok).toBe(false);
    expect(privateView(s, 'p3')!.hasPackChannel).toBe(false);
    expect(privateView(s, 'p3')!.packMates).toEqual([]);
  });
});

describe('Schutz', () => {
  it('Wächter schützt das Opfer; niemand scheidet aus', () => {
    let s = toNight({ p3: 'guardian' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(alive(s)).toHaveLength(10);
    expect(publicView(s).morningDeaths).toEqual([]);
  });
  it('Wächter darf dieselbe Person nicht zwei Nächte in Folge schützen', () => {
    let s = toNight({ p3: 'guardian' });
    s = must(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    s = forceNight(s, T0 + 20_000_000);
    expect(night(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 20_000_000).ok).toBe(false);
    expect(night(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p6' }, T0 + 20_000_000).ok).toBe(true);
  });
  it('Alchemistin: Schutztrank ist einmalig', () => {
    let s = toNight({ p3: 'alchemist' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p3', { type: 'night_action', ability: 'potion_protect', target: 'p5' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p5!.alive).toBe(true);
    expect(s.players.p3!.uses.potion_protect).toBe(0);
    s = forceNight(s, T0 + 30_000_000);
    expect(night(s, 'p3', { type: 'night_action', ability: 'potion_protect', target: 'p6' }, T0 + 30_000_000).ok).toBe(false);
  });
  it('Alchemistin: offensiver Trank wirkt trotz Schutz und ist einmalig', () => {
    let s = toNight({ p3: 'alchemist', p4: 'guardian' });
    s = must(s, 'p3', { type: 'night_action', ability: 'potion_strike', target: 'p5' }, T0 + 5_000_000);
    s = must(s, 'p4', { type: 'night_action', ability: 'protect', target: 'p5' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p5!.alive).toBe(false);
    expect(s.players.p3!.uses.potion_strike).toBe(0);
  });
});

describe('Informationsrollen', () => {
  it('Späher erfährt die Zugehörigkeit, begrenzt auf wenige Nutzungen', () => {
    let s = toNight({ p3: 'scout' });
    s = must(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    const notes = privateView(s, 'p3')!.notes.filter((n) => n.kind === 'inspect_result');
    expect(notes).toHaveLength(1);
    expect(notes[0]!.data).toMatchObject({ target: 'p1', faction: 'pack' });
    expect(s.players.p3!.uses.scout).toBe(1);
  });
  it('Späher kann sich selbst nicht prüfen und nicht ohne Nutzungen', () => {
    const s = toNight({ p3: 'scout' });
    expect(night(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p3' }).ok).toBe(false);
    const c = JSON.parse(JSON.stringify(s)) as GameState;
    c.players.p3!.uses.scout = 0;
    const r = night(c, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' });
    expect(r.ok).toBe(false);
  });
  it('Fährtenleser erfährt nur, ob mindestens ein Wolf in der Gruppe ist', () => {
    let s = toNight({ p3: 'tracker' });
    s = must(s, 'p3', { type: 'night_action', ability: 'track', targets: ['p1', 'p4', 'p5'] }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    const n = privateView(s, 'p3')!.notes.find((x) => x.kind === 'group_result')!;
    expect(n.data).toMatchObject({ packPresent: true });
    expect(JSON.stringify(n.data)).not.toContain('"p1":'); // keine Einzelzuordnung
  });
  it('Fährtenleser muss genau die Gruppengröße wählen', () => {
    const s = toNight({ p3: 'tracker' });
    expect(night(s, 'p3', { type: 'night_action', ability: 'track', targets: ['p1', 'p4'] }).ok).toBe(false);
    expect(night(s, 'p3', { type: 'night_action', ability: 'track', targets: ['p4', 'p4', 'p5'] }).ok).toBe(false);
  });
  it('Schattenwolf stört einmalig Informationswirkungen der Nacht', () => {
    let s = toNight({ p3: 'scout', p4: 'shadowwolf' });
    s = must(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' }, T0 + 5_000_000);
    s = must(s, 'p4', { type: 'night_action', ability: 'veil' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    const n = privateView(s, 'p3')!.notes.find((x) => x.kind === 'inspect_result')!;
    expect(n.data.unclear).toBe(true);
    expect(n.data.faction).toBeUndefined();
    expect(s.players.p4!.uses.veil).toBe(0);
    s = forceNight(s, T0 + 40_000_000);
    expect(night(s, 'p4', { type: 'night_action', ability: 'veil' }, T0 + 40_000_000).ok).toBe(false);
  });
  it('Fremde Rollen können keine Aktionen ausführen', () => {
    const s = toNight({});
    expect(night(s, 'p3', { type: 'night_action', ability: 'scout', target: 'p1' }).ok).toBe(false);
    expect(night(s, 'p3', { type: 'night_action', ability: 'protect', target: 'p1' }).ok).toBe(false);
  });
});

describe('Jäger', () => {
  it('Ausgeschiedener Jäger kann im Ergebnisfenster einen letzten Schuss abgeben – wirksam erst am Fensterende', () => {
    let s = toNight({ p3: 'hunter' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p3' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.phase.kind).toBe('morning');
    expect(s.players.p3!.alive).toBe(false);
    s = must(s, 'p3', { type: 'hunter_shoot', target: 'p5' }, T0 + 9_000_100);
    expect(s.players.p5!.alive).toBe(true); // Timing verrät nichts
    for (const p of alive(s)) s = must(s, p.id, { type: 'ready', topic: 'advance', value: true }, T0 + 9_000_200);
    expect(s.players.p5!.alive).toBe(true); // Mindestdauer des Morgens gilt für alle gleich
    s = tick(s, T0 + 9_000_000 + s.rules.durations.morningMs + 1);
    expect(s.players.p5!.alive).toBe(false);
  });
  it('Ein anderer Ausgeschiedener darf nicht schießen', () => {
    let s = toNight({ p3: 'hunter' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p4' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(applyCommand(s, 'p4', { type: 'hunter_shoot', target: 'p5' }, T0 + 9_000_100).ok).toBe(false);
  });
});

describe('Grenzgänger', () => {
  it('wählt das Rudel und erhält Rudelrechte', () => {
    let s = withRoles(newGame(10, 'bw'), { p1: 'wolf', p2: 'wolf', p3: 'borderwalker' });
    s = electSpeaker(s, T0 + 1, 'p9');
    expect(privateView(s, 'p3')!.sidePending).toBe(true);
    expect(privateView(s, 'p3')!.hasPackChannel).toBe(false);
    s = must(s, 'p3', { type: 'choose_side', side: 'pack' }, T0 + 2);
    expect(privateView(s, 'p3')!.hasPackChannel).toBe(true);
    expect(privateView(s, 'p1')!.packMates.map((m) => m.id).sort()).toEqual(['p2', 'p3']);
    s = must(s, 'p3', { type: 'pack_target', target: 'p5' }, T0 + 3);
  });
  it('bleibt ohne Wahl bis zur Nacht im Dorf', () => {
    let s = withRoles(newGame(10, 'bw2'), { p1: 'wolf', p2: 'wolf', p3: 'borderwalker' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = advanceTo(s, 'council', T0 + 2);
    s = advanceTo(s, 'dusk', T0 + 3);
    s = advanceTo(s, 'night', T0 + 4);
    expect(s.players.p3!.faction).toBe('village');
    expect(applyCommand(s, 'p3', { type: 'choose_side', side: 'pack' }, T0 + 3).ok).toBe(false);
  });
  it('kann nur einmal wählen', () => {
    let s = withRoles(newGame(10, 'bw3'), { p1: 'wolf', p2: 'wolf', p3: 'borderwalker' });
    s = electSpeaker(s, T0 + 1, 'p9');
    s = must(s, 'p3', { type: 'choose_side', side: 'village' }, T0 + 2);
    expect(applyCommand(s, 'p3', { type: 'choose_side', side: 'pack' }, T0 + 3).ok).toBe(false);
  });
});

describe('Ausgeschiedene', () => {
  it('stimmen nicht ab, lösen keinen Dorfrat aus, nutzen keine Fähigkeiten', () => {
    let s = toNight({ p3: 'scout' });
    s = must(s, 'p1', { type: 'pack_target', target: 'p3' }, T0 + 5_000_000);
    s = tick(s, T0 + 9_000_000);
    expect(s.players.p3!.alive).toBe(false);
    for (const cmd of [
      { type: 'ready', topic: 'council', value: true },
      { type: 'quest_done' },
      { type: 'vote', target: 'p4' },
      { type: 'night_action', ability: 'scout', target: 'p1' },
    ] as const) {
      expect(applyCommand(s, 'p3', cmd, T0 + 9_000_001).ok).toBe(false);
    }
  });
});
