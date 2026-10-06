// Projektionen des geheimen Zustands. Der Server schreibt NUR diese Sichten in Tabellen,
// die Clients lesen dürfen. Der volle GameState verlässt den Server nie.
import { councilReadyFlag, livingPlayers, voteReadyFlag } from './engine';
import { retrospective, type Retrospective } from './retrospective';
import type {
  AbilityChoice,
  Faction,
  GameState,
  Moment,
  PlayerId,
  Profile,
  PrivateNote,
  PublicEvent,
  RoleId,
  TraitStatement,
} from './types';

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  seat: number;
  alive: boolean;
  isSpeaker: boolean;
  /** Profil ist für Mitspieler sichtbar (Alter exakt). */
  profile: Profile;
  /** Beim Ausscheiden für alle gleichzeitig aufgedeckt: Fraktion und Sonderrolle bzw. Grundrolle. */
  revealed: { faction: Faction; role: RoleId } | null;
}

export interface PublicCouncil {
  step: 'discussion' | 'voting' | 'showdown' | 'tiebreak' | 'result';
  endsAt: number | null;
  /** Abendmodus: Richtwert für die Abstimmung / automatische Eröffnung (Diskussion wird nie abrupt beendet). */
  targetAt: number | null;
  autoAt: number | null;
  /** Das Dorf ist bereit, die Abstimmung zu eröffnen (nur Mehrheit, keine Namen). */
  voteReady: boolean;
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
  /** Aktueller synchroner Moment (alle Geräte zeigen ihn gleichzeitig). */
  moment: Moment | null;
  /** Öffentlich bekannte Rudelplätze zu Spielbeginn (konstant, unabhängig von geheimen Entscheidungen). */
  packSeats: number;
  /** Spielerzahl zu Spielbeginn. */
  playerCount: number;
  /** Nacht: Handlungsphase oder Heil-Fenster. */
  nightStage: 'act' | 'heal' | null;
  /** Wie viele Personen jeder Lebende vor der Nacht als Verdächtige markiert (Rudelplätze, begrenzt durch die Lebenden). */
  suspicionCount: number;
  events: PublicEvent[];
  winner: Faction | null;
  /** Erst nach Spielende: alle Rollen. */
  reveal: { id: PlayerId; role: RoleId; faction: Faction }[] | null;
  /** Erst nach Spielende: Rückblick aus den geheimen Verdachtsabgaben. */
  retrospective: Retrospective | null;
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
      phaseEndsAt = c.step === 'discussion' ? c.autoAt : c.endsAt;
      if (c.step === 'discussion' && s.mode === 'classic') {
        advance = { ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length, total: living.length };
      }
      const cast = Object.keys(c.votes).filter((id) => s.players[id]?.alive).length;
      council = {
        step: c.step,
        endsAt: c.endsAt,
        targetAt: c.targetAt,
        autoAt: c.autoAt,
        voteReady: c.step === 'discussion' ? voteReadyFlag(s) : false,
        candidates: c.candidates,
        progress: c.step === 'voting' ? { cast, total: living.length } : null,
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
        profile: pl.profile,
        // Beim Ausscheiden für alle gleichzeitig aufgedeckt (Fraktion + Sonderrolle bzw. Grundrolle).
        revealed: pl.alive ? null : { faction: pl.faction, role: pl.role },
      })),
    livingCount: living.length,
    speakerId: s.speakerId,
    quest,
    councilReady: p.kind === 'day' ? councilReadyFlag(s) : false,
    advance,
    electionProgress,
    morningDeaths,
    council,
    moment: s.moment,
    packSeats: s.packSeats,
    playerCount: s.playerCount,
    nightStage: p.kind === 'night' ? p.stage : null,
    suspicionCount: Math.max(0, Math.min(s.packSeats, living.length - 1)),
    events: s.events.slice(-60),
    winner: p.kind === 'ended' ? s.winner : null,
    reveal:
      p.kind === 'ended'
        ? Object.values(s.players).map((pl) => ({ id: pl.id, role: pl.role, faction: pl.faction }))
        : null,
    retrospective: p.kind === 'ended' ? retrospective(s) : null,
  };
}

// ───────────────────────── Privatsicht ─────────────────────────

/** Beschreibung einer verfügbaren Nachtfähigkeit für die UI (Wirkung steht in der Rollen-Konfiguration). */
export interface AbilitySpec {
  id: string;
  kind: 'inspect' | 'inspect_group' | 'protect' | 'veil';
  targets: PlayerId[];
  /** null = unbegrenzt */
  usesLeft: number | null;
  groupSize?: number;
  forbidden?: PlayerId | null;
  choice: AbilityChoice | null;
}

/**
 * Inhalt des privaten Bereichs AUF dem synchronen Moment-Screen. Jeder Spieler hat zu jedem geheimen Moment
 * genau einen Inhalt; wer nicht betroffen ist, bekommt einen atmosphärischen neutralen Inhalt (`neutral`).
 */
export type PrivatePanel =
  | { momentId: number; kind: 'role_info' }
  | { momentId: number; kind: 'you_are'; role: RoleId }
  | { momentId: number; kind: 'chose'; faction: Faction }
  | { momentId: number; kind: 'heal_prompt'; victim: PlayerId; decided: boolean | null }
  | { momentId: number; kind: 'neutral'; variant: number };

/** Anzahl der neutralen Textvarianten je Momentart (die App hält die Texte; der Index ist deterministisch). */
export const NEUTRAL_VARIANTS = 4;

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
  packTarget: { mine: PlayerId | null; candidates: PlayerId[]; leading: PlayerId[]; locked: boolean } | null;
  notes: PrivateNote[];
  /** Verfügbare Nachtfähigkeiten in der aktuellen Nacht (leer außerhalb der Handlungsphase). */
  abilities: AbilitySpec[];
  sidePending: boolean;
  /** Ausgeschiedener Jäger mit offenem letztem Schuss. */
  lastShot: { open: boolean; targets: PlayerId[]; chosen: PlayerId | null } | null;
  readyCouncil: boolean;
  readyAdvance: boolean;
  /** Eigene Stimme in der laufenden Abstimmung. */
  myBallot: PlayerId | null;
  /** Privater Bereich des aktuellen geheimen Moments. */
  panel: PrivatePanel | null;
  /** Beobachter: Fenster offen? Der Hinweis ist nur sichtbar, solange das Fenster serverseitig aktiv ist. */
  observation: { available: boolean; open: boolean; hint: TraitStatement | null; startedAt: number | null; windowMs: number } | null;
  /** Rudel: Ausschau halten (gemeinsam ein Versuch pro Nacht). */
  lookout: { available: boolean } | null;
  /** Alchemistin: Heil-Entscheidung während des Heil-Fensters. */
  heal: { victim: PlayerId; decided: boolean | null } | null;
}

function variantFor(id: string, momentId: number): number {
  let h = momentId * 2654435761;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % NEUTRAL_VARIANTS;
}

function panelFor(s: GameState, id: PlayerId): PrivatePanel | null {
  const m = s.moment;
  if (!m || !m.secret) return null;
  const sec = s.momentSecret && s.momentSecret.momentId === m.id ? s.momentSecret : null;
  const neutral: PrivatePanel = { momentId: m.id, kind: 'neutral', variant: variantFor(id, m.id) };
  switch (m.kind) {
    case 'start':
      return { momentId: m.id, kind: 'role_info' };
    case 'quest_unlock':
    case 'neutral':
      return sec?.recipient === id && sec.role ? { momentId: m.id, kind: 'you_are', role: sec.role } : neutral;
    case 'borderwalker_decided':
      return sec?.recipient === id && sec.faction ? { momentId: m.id, kind: 'chose', faction: sec.faction } : neutral;
    case 'pack_decided':
      return sec?.recipient === id && sec.victim
        ? { momentId: m.id, kind: 'heal_prompt', victim: sec.victim, decided: s.night?.healSave ?? null }
        : neutral;
    default:
      return null;
  }
}

export function privateView(s: GameState, id: PlayerId): PrivateView | null {
  const me = s.players[id];
  if (!me) return null;
  const alive = livingPlayers(s);
  const others = alive.filter((p) => p.id !== id).map((p) => p.id);
  const isPack = me.alive && me.faction === 'pack';
  const phase = s.phase;
  const actStage = phase.kind === 'night' && phase.stage === 'act';

  const abilities: AbilitySpec[] = [];
  if (actStage && me.alive) {
    for (const a of s.rules.roles[me.role].abilities) {
      if (a.kind === 'last_shot' || a.kind === 'heal' || a.kind === 'observe' || (me.uses[a.id] ?? 0) <= 0) continue;
      abilities.push({
        id: a.id,
        kind: a.kind,
        targets: a.kind === 'protect' && a.allowSelf !== false ? alive.map((p) => p.id) : others,
        usesLeft: a.uses === null ? null : (me.uses[a.id] ?? 0),
        groupSize: a.kind === 'inspect_group' ? Math.min(a.groupSize ?? 3, others.length) : undefined,
        forbidden: a.noRepeatTarget ? (me.lastTarget[a.id] ?? null) : undefined,
        choice: s.nightActions[id]?.[a.id] ?? null,
      });
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
      locked: phase.kind === 'night' && phase.stage === 'heal',
    };
  }

  let lastShot: PrivateView['lastShot'] = null;
  if (!me.alive && id in s.hunterShots) {
    const open = (phase.kind === 'council' && phase.council.step === 'result') || phase.kind === 'morning';
    lastShot = { open, targets: alive.map((p) => p.id), chosen: s.hunterShots[id] ?? null };
  }

  let myBallot: PlayerId | null = null;
  if (phase.kind === 'speaker_election') myBallot = phase.votes[id] ?? null;
  if (phase.kind === 'council') myBallot = phase.council.votes[id] ?? null;

  // Beobachter: der Hinweis ist nur sichtbar, solange sein Fenster serverseitig aktiv ist.
  let observation: PrivateView['observation'] = null;
  const obsAbility = me.alive ? s.rules.roles[me.role].abilities.find((a) => a.kind === 'observe') : undefined;
  if (obsAbility) {
    const o = s.night?.observers[id];
    observation = {
      available: actStage && !o,
      open: !!o?.open,
      hint: o?.open ? o.hint : null,
      startedAt: o?.open ? o.windowStartedAt : null,
      windowMs: obsAbility.windowMs ?? 10_000,
    };
  }

  const lookout: PrivateView['lookout'] = isPack && s.rules.lookout.enabled ? { available: actStage && !s.night?.lookoutUsed } : null;

  let heal: PrivateView['heal'] = null;
  if (me.alive && phase.kind === 'night' && phase.stage === 'heal' && s.night?.lockedTarget) {
    const ab = s.rules.roles[me.role].abilities.find((a) => a.kind === 'heal');
    if (ab && (me.uses[ab.id] ?? 0) > 0) heal = { victim: s.night.lockedTarget, decided: s.night.healSave };
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
    abilities,
    sidePending: me.alive && me.sidePending,
    lastShot,
    readyCouncil: s.readyCouncil.includes(id),
    readyAdvance: s.readyAdvance.includes(id),
    myBallot,
    panel: panelFor(s, id),
    observation,
    lookout,
    heal,
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
