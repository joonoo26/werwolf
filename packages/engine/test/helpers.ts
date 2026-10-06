import { applyCommand, createGame, initialUses, livingPlayers, nextDeadline, tick } from '../src/engine';
import { privateView } from '../src/views';
import { Rng, seedToState } from '../src/rng';
import type { Command, GameState, Mode, PlayerId, RoleId, Rules, DeepPartial } from '../src/types';

export const T0 = 1_700_000_000_000;

export function roster(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Spieler ${i + 1}` }));
}

export function newGame(
  n = 8,
  seed: string | number[] = 'seed-1',
  opts: { mode?: Mode; targetMinutes?: number; rules?: DeepPartial<Rules> } = {},
): GameState {
  return createGame({
    roster: roster(n),
    hostId: 'p1',
    mode: opts.mode ?? 'classic',
    targetMinutes: opts.targetMinutes,
    seed,
    now: T0,
    rules: opts.rules,
  });
}

/** Wendet einen Befehl an und erwartet Erfolg. */
export function must(s: GameState, actor: PlayerId | 'system', cmd: Command, now: number): GameState {
  const r = applyCommand(s, actor, cmd, now);
  if (!r.ok) throw new Error(`${cmd.type} von ${actor} schlug fehl: ${r.error.code} – ${r.error.message}`);
  return r.state;
}

export function alive(s: GameState) {
  return livingPlayers(s);
}

/** Setzt Rollen deterministisch (für gezielte Szenarien). Alle anderen werden Dorfbewohner. */
export function withRoles(s: GameState, roles: Record<PlayerId, RoleId>): GameState {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  for (const p of Object.values(c.players)) {
    const role = roles[p.id] ?? 'villager';
    p.role = role;
    p.faction = c.rules.roles[role].faction;
    p.uses = initialUses(role, c.rules);
    p.lastTarget = {};
    p.sidePending = role === 'borderwalker';
  }
  return c;
}

/** Dorfsprecher-Wahl: alle wählen `speaker`, dieser wählt eine andere Person. */
export function electSpeaker(s: GameState, now: number, speaker = 'p2'): GameState {
  let st = s;
  for (const p of alive(st)) {
    if (p.id === speaker) continue;
    st = must(st, p.id, { type: 'vote_speaker', target: speaker }, now);
  }
  const other = alive(st).find((p) => p.id !== speaker)!.id;
  return must(st, speaker, { type: 'vote_speaker', target: other }, now);
}

/** Bringt das Spiel per Host-Force in die gewünschte Phase. */
export function advanceTo(s: GameState, kind: GameState['phase']['kind'], now: number, guard = 40): GameState {
  let st = s;
  let t = now;
  for (let i = 0; i < guard && st.phase.kind !== kind; i++) {
    t += 1000;
    st = tick(st, t, { force: true });
  }
  if (st.phase.kind !== kind) throw new Error(`Phase ${kind} nicht erreichbar (jetzt ${st.phase.kind})`);
  return st;
}

export interface SimResult {
  state: GameState;
  councils: number;
  steps: number;
  now: number;
}

/** Spielt eine komplette Partie mit Zufalls-Bots und meldet jeden Zwischenzustand. */
export function simulate(
  seed: string,
  n: number,
  mode: Mode,
  onStep?: (s: GameState, now: number) => void,
  rules?: DeepPartial<Rules>,
): SimResult {
  const rng = new Rng(seedToState('bots-' + seed));
  let s = newGame(n, seed, { mode, targetMinutes: 180, rules });
  let now = T0;
  let steps = 0;
  let councils = 0;
  let lastKind = '';

  while (s.phase.kind !== 'ended' && steps++ < 2000) {
    const living = alive(s).map((p) => p.id);
    const phase = s.phase;
    const act = (id: PlayerId, cmd: Command) => {
      const r = applyCommand(s, id, cmd, now);
      if (r.ok) s = r.state;
    };
    const pickOther = (id: PlayerId) => rng.pick(living.filter((x) => x !== id));

    if (phase.kind === 'speaker_election') {
      for (const id of living) if (rng.chance(0.9)) act(id, { type: 'vote_speaker', target: pickOther(id) });
    } else if (phase.kind === 'day') {
      for (const id of living) {
        if (rng.chance(0.3)) act(id, { type: 'ready', topic: 'council', value: true });
        if (phase.quest && rng.chance(0.5)) act(id, { type: 'quest_done' });
        const me = s.players[id]!;
        if (me.sidePending && rng.chance(0.5)) act(id, { type: 'choose_side', side: rng.chance(0.5) ? 'pack' : 'village' });
        if (me.faction === 'pack') {
          const targets = alive(s).filter((p) => p.faction !== 'pack').map((p) => p.id);
          if (targets.length && rng.chance(0.3)) act(id, { type: 'pack_target', target: rng.pick(targets) });
        }
      }
      if (rng.chance(0.5)) act(rng.pick(living), { type: 'start_council' });
    } else if (phase.kind === 'council') {
      const c = phase.council;
      if (c.step === 'voting')
        for (const id of living) {
          const pool = c.candidates.filter((x) => x !== id);
          if (pool.length && rng.chance(0.85)) act(id, { type: 'vote', target: rng.pick(pool) });
        }
      if (c.step === 'tiebreak' && s.speakerId && rng.chance(0.7)) act(s.speakerId, { type: 'decide_tie', target: rng.pick(c.tied!) });
      if (c.step === 'result') for (const hid of Object.keys(s.hunterShots)) if (rng.chance(0.7)) act(hid, { type: 'hunter_shoot', target: rng.pick(living) });
    } else if (phase.kind === 'dusk') {
      for (const id of living) if (rng.chance(0.7)) act(id, { type: 'ready', topic: 'advance', value: true });
    } else if (phase.kind === 'night') {
      for (const id of living) {
        const me = s.players[id]!;
        const others = living.filter((x) => x !== id);
        if (me.faction === 'pack') {
          const targets = alive(s).filter((p) => p.faction !== 'pack').map((p) => p.id);
          if (targets.length) act(id, { type: 'pack_target', target: rng.pick(targets) });
        }
        for (const spec of privateView(s, id)?.abilities ?? []) {
          if (!rng.chance(0.8)) continue;
          if (spec.kind === 'inspect_group') act(id, { type: 'night_action', ability: spec.id, targets: rng.shuffle(spec.targets).slice(0, spec.groupSize) });
          else if (spec.kind === 'veil') act(id, { type: 'night_action', ability: spec.id });
          else act(id, { type: 'night_action', ability: spec.id, target: rng.pick(spec.targets.filter((x) => x !== spec.forbidden)) });
        }
      }
    } else if (phase.kind === 'morning') {
      for (const id of living) if (rng.chance(0.7)) act(id, { type: 'ready', topic: 'advance', value: true });
      for (const hid of Object.keys(s.hunterShots)) if (rng.chance(0.7)) act(hid, { type: 'hunter_shoot', target: rng.pick(living) });
    }

    if (phase.kind === 'council' && lastKind !== 'council') councils++;
    lastKind = phase.kind;
    onStep?.(s, now);

    // Zeit springt zur nächsten Frist; ohne Frist (Klassisch) reicht die Karenzzeit der Bestätigung.
    const dl = nextDeadline(s);
    now = Math.max(now + 1000, dl !== null ? dl + 1 : now + 61_000);
    s = tick(s, now);
    onStep?.(s, now);
  }
  return { state: s, councils, steps, now };
}

/** Testhilfe: setzt die Nacht direkt (ohne Dorfrat, der zufällig jemanden verbannen würde). */
export function forceNight(s: GameState, now = T0 + 5_000_000): GameState {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  c.phase = { kind: 'night', startedAt: now, endsAt: now + c.rules.durations.nightMs };
  for (const p of Object.values(c.players)) p.sidePending = false;
  c.nightActions = {};
  return c;
}
