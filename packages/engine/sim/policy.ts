// Bot-Verhalten für Balance-Simulationen. WICHTIG: stark vereinfachtes, symmetrisches Verhaltensmodell –
// es zeigt strukturelle Effekte der Regeln, ersetzt aber keine Playtests mit Menschen.
//
// Modell:
// * Dorf-Informationsrollen (Späher, Fährtenleser) geben ihre Ergebnisse am nächsten Tag wahrheitsgemäß
//   öffentlich bekannt und sind danach „geoutet". „Unklare" Ergebnisse (Schattenwolf) werden nicht verkündet.
// * Das Dorf einigt sich in der Diskussion auf einen Tagesverdächtigen (öffentliche Anschuldigung > Gruppenverdacht >
//   zufällige nicht entlastete Person); jeder Dorfbewohner folgt mit 80 % Wahrscheinlichkeit, sonst zufällige Stimme.
//   Ohne Informationen ist das reines Raten.
// * Das Rudel tarnt sich (folgt dem Dorf-Verdächtigen, solange der kein Rudelmitglied ist), lenkt sonst ab und
//   stimmt gegen Ankläger. Nachts tötet es koordiniert; geoutete Informationsrollen werden bevorzugt (80 %).
// * Schutz-/Angriffsrollen setzen ihre Fähigkeiten sinnvoll ein (siehe unten).
import { Rng } from '../src/rng';
import { applyCommandMut, livingPlayers, nextDeadline, tick } from '../src/engine';
import { privateView } from '../src/views';
import type { Command, GameState, PlayerId } from '../src/types';
import { createGame } from '../src/engine';
import type { DeepPartial, Rules } from '../src/types';

export interface GameResult {
  winner: 'village' | 'pack';
  rounds: number;
  aliveAtEnd: number;
  rolesSeen: string[];
  specials: number;
  /** Rudelgröße zu Spielbeginn (inkl. Grenzgänger-Wahl). */
  packAtStart: number;
}

export interface SimOptions {
  n: number;
  seed: string;
  rules?: DeepPartial<Rules>;
  /** Wie ein Grenzgänger sich entscheidet. */
  bwChoice?: 'village' | 'pack';
  questSuccessChance?: number;
}

const T0 = 1_800_000_000_000;

export function simulateGame(o: SimOptions): GameResult {
  const rng = new Rng([...Buffer.from(o.seed)].slice(0, 4).map((x, i) => (x * 2654435761 + i * 40503) >>> 0) as [number, number, number, number]);
  const roster = Array.from({ length: o.n }, (_, i) => ({ id: `p${i + 1}`, name: `S${i + 1}` }));
  const s = createGame({ roster, hostId: 'p1', mode: 'classic', seed: o.seed, now: T0, rules: o.rules });
  let now = T0;
  const cmd = (id: PlayerId | 'system', c: Command) => {
    const r = applyCommandMut(s, id, c, now);
    if (!r.ok) throw new Error(`Bot-Befehl fehlgeschlagen: ${c.type} ${id}: ${r.error.code} ${r.error.message} (Phase ${s.phase.kind})`);
  };
  const force = () => {
    now += 1000;
    cmd('system', { type: 'tick', force: true });
  };
  const advance = (ms: number) => {
    now += ms;
    cmd('system', { type: 'tick' });
  };

  // Öffentliches Wissen
  const accused = new Map<PlayerId, PlayerId>(); // target → claimer (Rudel-Anschuldigung)
  const cleared = new Set<PlayerId>();
  const groupSuspects: PlayerId[][] = [];
  const outed = new Set<PlayerId>();
  const seenRoles = new Set<string>();
  let packAtStart = -1;
  const living = () => livingPlayers(s).map((p) => p.id);
  const others = (id: PlayerId) => living().filter((x) => x !== id);
  const trackRoles = () => Object.values(s.players).forEach((p) => seenRoles.add(p.role));

  function readNewNotes(sinceNoteId: number) {
    for (const p of Object.values(s.players)) {
      for (const n of s.notes[p.id] ?? []) {
        if (n.id <= sinceNoteId) continue;
        const d = n.data as { target?: string; targets?: string[]; faction?: string; packPresent?: boolean; unclear?: boolean };
        if (d.unclear) continue;
        if (n.kind === 'inspect_result' && d.target) {
          outed.add(p.id);
          if (d.faction === 'pack') accused.set(d.target, p.id);
          else cleared.add(d.target);
        } else if (n.kind === 'group_result' && d.targets) {
          outed.add(p.id);
          if (d.packPresent) groupSuspects.push(d.targets);
          else d.targets.forEach((t) => cleared.add(t));
        }
      }
    }
  }

  const aliveAccused = () => [...accused.keys()].filter((t) => s.players[t]?.alive && !s.players[t]?.sidePending);
  const packIds = () => livingPlayers(s).filter((p) => p.faction === 'pack').map((p) => p.id);

  /**
   * Das Dorf einigt sich in der Diskussion auf einen Verdächtigen des Tages: öffentliche Anschuldigung >
   * Gruppen-Verdacht > zufällige Person (nicht öffentlich entlastet). Ohne Informationen ist das reines Raten.
   */
  function villageConsensus(): PlayerId {
    const acc = aliveAccused();
    if (acc.length) return acc[0]!;
    const groups = groupSuspects.map((g) => g.filter((t) => s.players[t]?.alive && !cleared.has(t))).filter((g) => g.length);
    if (groups.length) return rng.pick(groups[groups.length - 1]!);
    const pool = living().filter((t) => !cleared.has(t));
    return rng.pick(pool.length ? pool : living());
  }

  /** Das Rudel tarnt sich: es folgt dem Dorf-Verdächtigen, solange der kein Rudelmitglied ist; sonst lenkt es ab. */
  function packVoteFor(cv: PlayerId, id: PlayerId): PlayerId {
    const nonPack = living().filter((t) => s.players[t]!.faction !== 'pack');
    if (s.players[cv]!.faction !== 'pack') return cv;
    for (const t of aliveAccused()) {
      if (s.players[t]!.faction === 'pack') {
        const claimer = accused.get(t)!;
        if (s.players[claimer]?.alive && rng.chance(0.8)) return claimer;
      }
    }
    return nonPack.length ? rng.pick(nonPack) : rng.pick(others(id));
  }

  function villageVote(cv: PlayerId, id: PlayerId): PlayerId {
    if (cv !== id && rng.chance(0.8)) return cv;
    const pool = others(id).filter((t) => !cleared.has(t));
    return rng.pick(pool.length ? pool : others(id));
  }

  const questChance = o.questSuccessChance ?? 0.5;
  const maxRounds = 80;

  trackRoles();
  packAtStart = packIds().length;
  let guard = 0;

  while (s.phase.kind !== 'ended' && guard++ < maxRounds * 8) {
    switch (s.phase.kind) {
      case 'speaker_election': {
        for (const id of living()) cmd(id, { type: 'vote_speaker', target: rng.pick(others(id)) });
        break;
      }
      case 'day': {
        // Grenzgänger entscheidet vor der ersten Nacht
        for (const p of Object.values(s.players)) {
          if (p.alive && p.sidePending) {
            cmd(p.id, { type: 'choose_side', side: o.bwChoice ?? 'village' });
            if (p.faction === 'pack') packAtStart = Math.max(packAtStart, packIds().length);
          }
        }
        if (s.day === 1) packAtStart = packIds().length;
        // Quest
        advance(30_000);
        if (s.phase.kind === 'day' && s.phase.quest) {
          if (rng.chance(questChance)) for (const id of living()) cmd(id, { type: 'quest_done' });
          else advance(s.rules.durations.questMs + 1);
        }
        trackRoles();
        if (s.phase.kind === 'day') force(); // Dorfrat beginnt (Gruppe ist bereit)
        break;
      }
      case 'council': {
        const c = s.phase.council;
        if (c.step === 'discussion') {
          force(); // Gruppe eröffnet die Abstimmung
        } else if (c.step === 'voting') {
          const cv = villageConsensus();
          for (const id of living()) {
            const p = s.players[id]!;
            let t = p.faction === 'pack' ? packVoteFor(cv, id) : villageVote(cv, id);
            if (t === id) t = rng.pick(others(id));
            cmd(id, { type: 'vote', target: t });
          }
        } else if (c.step === 'showdown') {
          advance(30_000);
        } else if (c.step === 'tiebreak') {
          const sp = s.players[s.speakerId!]!;
          const tied = c.tied!;
          let pick = rng.pick(tied);
          if (sp.faction === 'pack') {
            const nonPack = tied.filter((t) => s.players[t]!.faction !== 'pack');
            if (nonPack.length) pick = rng.pick(nonPack);
          } else {
            const acc = tied.filter((t) => accused.has(t));
            if (acc.length) pick = acc[0]!;
          }
          cmd(s.speakerId!, { type: 'decide_tie', target: pick });
        } else {
          advance(s.rules.durations.resultMs + 1);
        }
        break;
      }
      case 'dusk': {
        force();
        break;
      }
      case 'night': {
        const noteMark = s.nextNoteId - 1;
        const nonPack = living().filter((id) => s.players[id]!.faction !== 'pack');
        const info = nonPack.filter((id) => outed.has(id));
        const target = nonPack.length ? (info.length && rng.chance(0.8) ? rng.pick(info) : rng.pick(nonPack)) : null;
        for (const id of packIds()) if (target) cmd(id, { type: 'pack_target', target });
        for (const id of living()) {
          const pv = privateView(s, id);
          if (!pv) continue;
          for (const a of pv.abilities) {
            switch (a.kind) {
              case 'inspect': {
                const pool = a.targets.filter((t) => !cleared.has(t) && !accused.has(t));
                if (pool.length) cmd(id, { type: 'night_action', ability: a.id, target: rng.pick(pool) });
                break;
              }
              case 'inspect_group': {
                const pool = a.targets.filter((t) => !cleared.has(t));
                const src = pool.length >= (a.groupSize ?? 3) ? pool : a.targets;
                cmd(id, { type: 'night_action', ability: a.id, targets: rng.shuffle(src).slice(0, a.groupSize ?? 3) });
                break;
              }
              case 'protect': {
                const infoAlive = living().filter((t) => outed.has(t) && t !== a.forbidden);
                const pool = a.targets.filter((t) => t !== a.forbidden);
                const t = infoAlive.length && rng.chance(0.6) ? rng.pick(infoAlive) : rng.pick(pool);
                cmd(id, { type: 'night_action', ability: a.id, target: t });
                break;
              }
              case 'veil': {
                if (living().some((t) => outed.has(t)) && rng.chance(0.8)) cmd(id, { type: 'night_action', ability: a.id });
                break;
              }
            }
          }
        }
        advance(s.rules.durations.nightMs + 1); // Rudelsperre → Heil-Fenster
        for (const id of living()) {
          if (privateView(s, id)?.heal) cmd(id, { type: 'heal_decision', save: rng.chance(0.5) });
        }
        advance(s.rules.durations.healWindowMs + 1);
        readNewNotes(noteMark);
        trackRoles();
        break;
      }
      case 'morning': {
        force();
        break;
      }
      default:
        throw new Error('unerwartete Phase ' + (s.phase as { kind: string }).kind);
    }
  }
  if (s.phase.kind !== 'ended') throw new Error('Partie endete nicht');
  const specials = Object.values(s.players).filter((p) => s.rules.roles[p.role].special).length;
  return {
    winner: s.winner!,
    rounds: s.day,
    aliveAtEnd: livingPlayers(s).length,
    rolesSeen: [...seenRoles].filter((r) => s.rules.roles[r as keyof typeof s.rules.roles].special),
    specials,
    packAtStart,
  };
}

export { nextDeadline, tick };
