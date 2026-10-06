// Zentrale Typen der DAS-DORF-Engine. Der gesamte Zustand ist JSON-serialisierbar
// (keine Sets/Maps/Dates), damit er unverändert in Postgres (jsonb) liegen kann.

export type PlayerId = string;
export type Faction = 'village' | 'pack';
export type Mode = 'classic' | 'evening';

export type RoleId =
  | 'villager'
  | 'wolf'
  | 'scout'
  | 'tracker'
  | 'alchemist'
  | 'guardian'
  | 'borderwalker'
  | 'hunter'
  | 'shadowwolf';

export interface PlayerUses {
  scout: number;
  tracker: number;
  alchemistProtect: number;
  alchemistStrike: number;
  shadowVeil: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  seat: number;
  alive: boolean;
  role: RoleId;
  faction: Faction;
  /** Tag, an dem die Rolle zugewiesen wurde (1 = Spielstart). */
  roleSince: number;
  uses: PlayerUses;
  /** Wächter: zuletzt geschützte Person (nicht zwei Nächte in Folge dieselbe). */
  lastProtected: PlayerId | null;
  /** Grenzgänger: wartet auf die Fraktionswahl. */
  sidePending: boolean;
  eliminatedDay: number | null;
}

export interface Rules {
  minPlayers: number;
  maxPlayers: number;
  /** Anteil Rudel an der Spielerzahl (Startwert, Playtest). */
  wolfDivisor: number;
  /** Anzahl Spieler in der Fährtenleser-Gruppe. */
  trackGroupSize: number;
  scoutUses: number;
  trackerUses: number;
  /** Mindestspielerzahl je Rolle. */
  roleMinPlayers: Record<RoleId, number>;
  roleWeights: Record<RoleId, number>;
  /** Weitere Sonderrollen nach dem Start (Obergrenze) je Spielerzahl-Band. */
  maxLaterSpecials: { small: number; medium: number; large: number };
  /** Informations-Budget lebender Info-Rollen (Späher=2, Fährtenleser=1). */
  infoBudget: { small: number; medium: number; large: number };
  /** Ab dieser Zahl lebender Spieler werden keine neuen Rollen mehr eingeführt. */
  finaleAlive: number;
  laterRoleChanceDayStart: number;
  laterRoleChanceAfterFirstCouncil: number;
  durations: {
    speakerElectionMs: number;
    nominationMs: number;
    defenseMs: number;
    votingMs: number;
    countdownMs: number; // 3 – 2 – 1 – ZEIGT!
    pointingMs: number; // Zeit zum gleichzeitigen Zeigen
    tiebreakMs: number;
    resultMs: number;
    nightMs: number;
    morningMs: number;
    questMs: number;
    /** Wartezeit nach Mehrheit, bevor ohne alle Bestätigungen fortgesetzt wird. */
    confirmGraceMs: number;
    impulseMs: number;
  };
  evening: {
    minDayMs: number;
    councilBudgetMs: number;
    questSpacingMs: number;
    maxQuestsPerDay: number;
  };
}

export type NightAction =
  | { kind: 'scout'; target: PlayerId }
  | { kind: 'track'; targets: PlayerId[] }
  | { kind: 'protect'; target: PlayerId }
  | { kind: 'alchemist'; protect?: PlayerId; strike?: PlayerId }
  | { kind: 'veil' };

export type NoteKind = 'role' | 'scout_result' | 'track_result' | 'pack_joined' | 'role_gained' | 'info';

export interface PrivateNote {
  id: number;
  day: number;
  kind: NoteKind;
  data: Record<string, unknown>;
}

export interface ActiveQuest {
  id: string;
  endsAt: number;
  doneBy: PlayerId[];
  startedAt: number;
}

export type CouncilStep = 'nomination' | 'defense' | 'voting' | 'showdown' | 'tiebreak' | 'result';

export interface CouncilState {
  step: CouncilStep;
  endsAt: number;
  nominations: Record<PlayerId, PlayerId>;
  candidates: PlayerId[];
  votes: Record<PlayerId, PlayerId>;
  /** Zeitpunkt von „ZEIGT!" (nur Showdown). */
  revealAt: number | null;
  tally: Record<PlayerId, number> | null;
  tied: PlayerId[] | null;
  banished: PlayerId | null;
  /** Wie es nach der Ergebnisanzeige weitergeht. */
  decidedByTiebreak: boolean;
}

export type Phase =
  | { kind: 'speaker_election'; votes: Record<PlayerId, PlayerId>; endsAt: number }
  | {
      kind: 'day';
      startedAt: number;
      /** Abendmodus: spätester Zeitpunkt, an dem der Dorfrat automatisch beginnt. */
      councilBy: number | null;
      nightAt: number | null;
      quest: ActiveQuest | null;
      questTimes: number[];
      councilQueued: boolean;
    }
  | { kind: 'council'; council: CouncilState; nightAt: number | null }
  | { kind: 'dusk'; startedAt: number; nightAt: number | null }
  | { kind: 'night'; startedAt: number; endsAt: number }
  | { kind: 'morning'; startedAt: number; endsAt: number; deaths: PlayerId[] }
  | { kind: 'ended' };

export type EventKind =
  | 'game_started'
  | 'speaker_elected'
  | 'quest_started'
  | 'quest_ended'
  | 'council_ready'
  | 'council_started'
  | 'candidates'
  | 'banished'
  | 'night_began'
  | 'morning'
  | 'eliminated'
  | 'last_shot'
  | 'impulse'
  | 'game_ended';

export interface PublicEvent {
  id: number;
  day: number;
  at: number;
  kind: EventKind;
  players?: PlayerId[];
  data?: Record<string, unknown>;
}

export interface Impulse {
  id: number;
  /** 'change': eine geheime Rolle wurde verteilt (für alle gleich); 'hint': reiner Hinweis. */
  kind: 'change' | 'hint';
  textKey: string;
  at: number;
  showUntil: number;
}

export interface GameState {
  schema: 1;
  mode: Mode;
  rules: Rules;
  rng: [number, number, number, number];
  hostId: PlayerId;
  startedAt: number;
  /** Abendmodus: geplantes Spielende (Zieldauer). */
  targetEndsAt: number | null;
  day: number;
  phase: Phase;
  players: Record<PlayerId, PlayerState>;
  speakerId: PlayerId | null;
  /** Geheime Bereitschaft für den Dorfrat (nur Zahl/Mehrheit ist sichtbar). */
  readyCouncil: PlayerId[];
  /** Bestätigungen für Phasenwechsel (Klassisch / Dämmerung / Morgen). */
  readyAdvance: PlayerId[];
  majorityAt: number | null;
  packVotes: Record<PlayerId, PlayerId>;
  nightActions: Record<PlayerId, NightAction>;
  notes: Record<PlayerId, PrivateNote[]>;
  /** Ausgeschiedene Jäger → gewähltes Ziel (wird erst am Ende des Fensters wirksam, damit der Zeitpunkt nichts verrät). */
  hunterShots: Record<PlayerId, PlayerId | null>;
  usedQuestIds: string[];
  usedImpulseKeys: string[];
  /** Anzahl Sonderrollen, die beim Start vergeben wurden. */
  startSpecials: number;
  firstCouncilDone: boolean;
  impulse: Impulse | null;
  events: PublicEvent[];
  nextEventId: number;
  nextNoteId: number;
  winner: Faction | null;
}

export type Command =
  | { type: 'tick'; force?: boolean }
  | { type: 'ready'; topic: 'council' | 'advance'; value: boolean }
  | { type: 'start_council' }
  | { type: 'quest_done' }
  | { type: 'vote_speaker'; target: PlayerId }
  | { type: 'nominate'; target: PlayerId }
  | { type: 'vote'; target: PlayerId }
  | { type: 'decide_tie'; target: PlayerId }
  | { type: 'pack_target'; target: PlayerId }
  | { type: 'night_action'; action: NightAction }
  | { type: 'choose_side'; side: Faction }
  | { type: 'hunter_shoot'; target: PlayerId };

export type ErrorCode =
  | 'not_a_player'
  | 'not_alive'
  | 'wrong_phase'
  | 'invalid_target'
  | 'not_allowed'
  | 'no_uses_left'
  | 'already_decided'
  | 'invalid_command';

export type Result =
  | { ok: true; state: GameState }
  | { ok: false; error: { code: ErrorCode; message: string } };

export interface StartInput {
  roster: { id: PlayerId; name: string }[];
  hostId: PlayerId;
  mode: Mode;
  /** Abendmodus: gewünschte Gesamtdauer in Minuten. */
  targetMinutes?: number;
  seed: number[] | string;
  now: number;
  rules?: DeepPartial<Rules>;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
