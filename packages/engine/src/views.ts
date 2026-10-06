// Projektionen des geheimen Zustands. Der Server schreibt NUR diese Sichten in Tabellen,
// die Clients lesen dürfen. Der volle GameState verlässt den Server nie.
import { councilReadyFlag, livingPlayers } from './engine';
import type {
  Faction,
  GameState,
  Impulse,
  NightAction,
  PlayerId,
  PrivateNote,
  PublicEvent,
  RoleId,
} from './types';

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  seat: number;
  alive: boolean;
  isSpeaker: boolean;
}

export interface PublicCouncil {
  step: 'nomination' | 'defense' | 'voting' | 'showdown' | 'tiebreak' | 'result';
  endsAt: number;
  candidates: PlayerId[];
  /** Nur Anzahl, nie wer wie gewählt hat. */
  progress: { cast: number; total: number } | null;
  revealAt: number | null;
  /** Erst nach „ZEIGT!" sichtbar (ab Schritt tiebreak/result). */
  tally: Record<PlayerId, number> | null;
  tied: PlayerId[] | null;
  banished: PlayerId | null;
  decidedByTiebreak: boolean;
}

export interface PublicView {
  schema: 1;
  mode: GameState['mode'];
  day: number;
  phase: 'speaker_election' | 'day' | 'council' | 'dusk' | 'night' | 'morning' | 'ended';
  /** Frist der aktuellen Phase (Countdown) oder null. */
  phaseEndsAt: number | null;
  /** Abendmodus: Countdown zur nächsten Nacht. */
  nightAt: number | null;
  players: PublicPlayer[];
  livingCount: number;
  speakerId: PlayerId | null;
  quest: { id: string; endsAt: number; doneCount: number } | null;
  /** Das Dorf ist bereit für einen Dorfrat (nur Mehrheit, keine Namen, kein Zwischenstand). */
  councilReady: boolean;
  advance: { ready: number; total: number } | null;
  electionProgress: { cast: number; total: number } | null;
  morningDeaths: PlayerId[] | null;
  council: PublicCouncil | null;
  impulse: Impulse | null;
  events: PublicEvent[];
  winner: Faction | null;
  /** Erst nach Spielende: alle Rollen. */
  reveal: { id: PlayerId; role: RoleId; faction: Faction }[] | null;
}

export function publicView(s: GameState): PublicView {
  const living = livingPlayers(s);
  const p = s.phase;
  let phaseEndsAt: number | null = null;
  let nightAt: number | null = null;
  let council: PublicCouncil | null = null;
  let quest: PublicView['quest'] = null;
  let electionProgress: PublicView['electionProgress'] = null;
  let advance: PublicView['advance'] = null;
  let morningDeaths: PlayerId[] | null = null;

  switch (p.kind) {
    case 'speaker_election':
      phaseEndsAt = p.endsAt;
      electionProgress = {
        cast: Object.keys(p.votes).filter((id) => s.players[id]?.alive).length,
        total: living.length,
      };
      break;
    case 'day':
      phaseEndsAt = p.councilBy;
      nightAt = p.nightAt;
      if (p.quest) quest = { id: p.quest.id, endsAt: p.quest.endsAt, doneCount: p.quest.doneBy.length };
      break;
    case 'council': {
      const c = p.council;
      nightAt = p.nightAt;
      phaseEndsAt = c.endsAt;
      const cast =
        c.step === 'nomination'
          ? Object.keys(c.nominations).filter((id) => s.players[id]?.alive).length
          : Object.keys(c.votes).filter((id) => s.players[id]?.alive).length;
      council = {
        step: c.step,
        endsAt: c.endsAt,
        candidates: c.candidates,
        progress: c.step === 'nomination' || c.step === 'voting' ? { cast, total: living.length } : null,
        revealAt: c.revealAt,
        tally: c.step === 'tiebreak' || c.step === 'result' ? c.tally : null,
        tied: c.step === 'tiebreak' ? c.tied : null,
        banished: c.step === 'result' ? c.banished : null,
        decidedByTiebreak: c.step === 'result' ? c.decidedByTiebreak : false,
      };
      break;
    }
    case 'dusk':
      nightAt = p.nightAt;
      phaseEndsAt = p.nightAt;
      advance = {
        ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length,
        total: living.length,
      };
      break;
    case 'night':
      phaseEndsAt = p.endsAt;
      break;
    case 'morning':
      phaseEndsAt = p.endsAt;
      morningDeaths = p.deaths;
      if (s.mode === 'classic') {
        advance = {
          ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length,
          total: living.length,
        };
      }
      break;
    case 'ended':
      break;
  }

  return {
    schema: 1,
    mode: s.mode,
    day: s.day,
    phase: p.kind,
    phaseEndsAt,
    nightAt,
    players: Object.values(s.players)
      .sort((a, b) => a.seat - b.seat)
      .map((pl) => ({
        id: pl.id,
        name: pl.name,
        seat: pl.seat,
        alive: pl.alive,
        isSpeaker: s.speakerId === pl.id,
      })),
    livingCount: living.length,
    speakerId: s.speakerId,
    quest,
    councilReady: p.kind === 'day' ? councilReadyFlag(s) : false,
    advance,
    electionProgress,
    morningDeaths,
    council,
    impulse: s.impulse,
    events: s.events.slice(-60),
    winner: p.kind === 'ended' ? s.winner : null,
    reveal:
      p.kind === 'ended'
        ? Object.values(s.players).map((pl) => ({ id: pl.id, role: pl.role, faction: pl.faction }))
        : null,
  };
}

// ───────────────────────── Privatsicht ─────────────────────────

export type ActionSpec =
  | { kind: 'scout'; targets: PlayerId[]; usesLeft: number }
  | { kind: 'track'; targets: PlayerId[]; groupSize: number; usesLeft: number }
  | { kind: 'protect'; targets: PlayerId[]; forbidden: PlayerId | null }
  | { kind: 'alchemist'; targets: PlayerId[]; protectLeft: number; strikeLeft: number }
  | { kind: 'veil'; usesLeft: number };

export interface PrivateView {
  schema: 1;
  playerId: PlayerId;
  alive: boolean;
  role: RoleId;
  faction: Faction;
  /** Rudelmitglieder (nur für Rudelmitglieder gefüllt). */
  packMates: { id: PlayerId; name: string; alive: boolean }[];
  hasPackChannel: boolean;
  /** Aktuell vorgeschlagenes Rudelziel dieses Spielers und das Zwischenergebnis. */
  packTarget: { mine: PlayerId | null; candidates: PlayerId[]; leading: PlayerId[] } | null;
  notes: PrivateNote[];
  /** Verfügbare Nachtaktion in der aktuellen Nacht (leer außerhalb der Nacht). */
  nightAction: ActionSpec | null;
  currentNightChoice: NightAction | null;
  sidePending: boolean;
  /** Ausgeschiedener Jäger mit offenem letztem Schuss. */
  lastShot: { open: boolean; targets: PlayerId[]; chosen: PlayerId | null } | null;
  readyCouncil: boolean;
  readyAdvance: boolean;
  /** Eigene Stimme/Nominierung in der laufenden Abstimmung. */
  myBallot: PlayerId | null;
}

export function privateView(s: GameState, id: PlayerId): PrivateView | null {
  const me = s.players[id];
  if (!me) return null;
  const alive = livingPlayers(s);
  const others = alive.filter((p) => p.id !== id).map((p) => p.id);
  const isPack = me.alive && me.faction === 'pack';

  let nightAction: ActionSpec | null = null;
  if (s.phase.kind === 'night' && me.alive) {
    switch (me.role) {
      case 'scout':
        if (me.uses.scout > 0) nightAction = { kind: 'scout', targets: others, usesLeft: me.uses.scout };
        break;
      case 'tracker':
        if (me.uses.tracker > 0)
          nightAction = {
            kind: 'track',
            targets: others,
            groupSize: Math.min(s.rules.trackGroupSize, others.length),
            usesLeft: me.uses.tracker,
          };
        break;
      case 'guardian':
        nightAction = { kind: 'protect', targets: alive.map((p) => p.id), forbidden: me.lastProtected };
        break;
      case 'alchemist':
        if (me.uses.alchemistProtect > 0 || me.uses.alchemistStrike > 0)
          nightAction = {
            kind: 'alchemist',
            targets: alive.map((p) => p.id),
            protectLeft: me.uses.alchemistProtect,
            strikeLeft: me.uses.alchemistStrike,
          };
        break;
      case 'shadowwolf':
        if (me.uses.shadowVeil > 0) nightAction = { kind: 'veil', usesLeft: me.uses.shadowVeil };
        break;
      default:
        break;
    }
  }

  let packTarget: PrivateView['packTarget'] = null;
  if (isPack) {
    const counts: Record<PlayerId, number> = {};
    for (const [voter, target] of Object.entries(s.packVotes)) {
      if (s.players[voter]?.alive && s.players[voter]?.faction === 'pack' && s.players[target]?.alive) {
        counts[target] = (counts[target] ?? 0) + 1;
      }
    }
    const top = Math.max(0, ...Object.values(counts));
    packTarget = {
      mine: s.packVotes[id] && s.players[s.packVotes[id]!]?.alive ? s.packVotes[id]! : null,
      candidates: alive.filter((p) => p.faction !== 'pack').map((p) => p.id),
      leading: top > 0 ? Object.keys(counts).filter((k) => counts[k] === top) : [],
    };
  }

  const phase = s.phase;
  let lastShot: PrivateView['lastShot'] = null;
  if (!me.alive && id in s.hunterShots) {
    const open = (phase.kind === 'council' && phase.council.step === 'result') || phase.kind === 'morning';
    lastShot = { open, targets: alive.map((p) => p.id), chosen: s.hunterShots[id] ?? null };
  }

  let myBallot: PlayerId | null = null;
  if (phase.kind === 'speaker_election') myBallot = phase.votes[id] ?? null;
  if (phase.kind === 'council') {
    myBallot = (phase.council.step === 'nomination' ? phase.council.nominations[id] : phase.council.votes[id]) ?? null;
  }

  return {
    schema: 1,
    playerId: id,
    alive: me.alive,
    role: me.role,
    faction: me.faction,
    packMates: isPack
      ? Object.values(s.players)
          .filter((p) => p.faction === 'pack' && p.id !== id)
          .map((p) => ({ id: p.id, name: p.name, alive: p.alive }))
      : [],
    hasPackChannel: isPack,
    packTarget,
    notes: s.notes[id] ?? [],
    nightAction,
    currentNightChoice: s.nightActions[id] ?? null,
    sidePending: me.alive && me.sidePending,
    lastShot,
    readyCouncil: s.readyCouncil.includes(id),
    readyAdvance: s.readyAdvance.includes(id),
    myBallot,
  };
}

/**
 * Lebende Mitglieder des geheimen Rudelkanals. Ausgeschiedene verlieren sofort alle
 * Rudelrechte (GAME_DESIGN §9), daher nur lebende Rudelmitglieder.
 */
export function packChannelMembers(s: GameState): PlayerId[] {
  return livingPlayers(s)
    .filter((p) => p.faction === 'pack')
    .map((p) => p.id);
}
