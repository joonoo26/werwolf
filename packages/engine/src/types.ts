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

/** Verbleibende Nutzungen je Fähigkeit-ID (UNLIMITED = unbegrenzt). */
export type PlayerUses = Record<string, number>;
export const UNLIMITED = 1_000_000;

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
  /** Zuletzt gewähltes Ziel je Fähigkeit (für „nicht zweimal in Folge"). */
  lastTarget: Record<string, PlayerId | null>;
  /** Wartet auf die Fraktionswahl (Rollen mit startChoice). */
  sidePending: boolean;
  eliminatedDay: number | null;
}

export type AbilityKind = 'inspect' | 'inspect_group' | 'protect' | 'strike' | 'veil' | 'last_shot';

/**
 * Datengetriebene Fähigkeit. Wirkung, Nutzungszahl und Parameter sind Konfiguration (Rules.roles),
 * keine festgeschriebene Produktregel. Alle Werte sind Playtest-Startwerte.
 */
export interface AbilityDef {
  id: string;
  kind: AbilityKind;
  /** null = unbegrenzt. */
  uses: number | null;
  /** inspect_group: Größe der gewählten Gruppe. */
  groupSize?: number;
  /** protect: dasselbe Ziel nicht in zwei aufeinanderfolgenden Nächten. */
  noRepeatTarget?: boolean;
  /** protect: darf sich selbst wählen (Standard true). */
  allowSelf?: boolean;
}

export type Trigger = 'start' | 'quest_reward' | 'after_first_council' | 'day_start';

export interface RoleDef {
  id: RoleId;
  faction: Faction;
  /** Zählt als Sonderrolle (Richtwerte, Pools). */
  special: boolean;
  /** Ausgeschaltete Rollen werden nie vergeben. */
  enabled: boolean;
  /** Gewicht im gewichteten Zufall. */
  weight: number;
  minPlayers: number;
  maxPlayers: number | null;
  /** Wann die Rolle vergeben werden darf. Nur 'start' = reine Startrolle. */
  unlock: { triggers: Trigger[]; earliestDay: number; latestDay: number | null };
  /** Wer die Rolle beim späteren Vergeben erhalten darf. */
  recipient: 'villager' | 'wolf';
  /** Geheime Fraktionswahl der Person selbst (z. B. Grenzgänger). */
  startChoice: boolean;
  abilities: AbilityDef[];
}

export type SizeBand = 'small' | 'medium' | 'large';

export type QuestRewardDef =
  | { kind: 'hint' }
  /** Löst einen Rollen-Moment aus (Pool, Gewicht und grantChance bestimmen, ob wirklich eine Rolle vergeben wird). */
  | { kind: 'role' }
  /** Öffentliches Ereignis ohne Mechanik (Mechanik wird später konfiguriert). */
  | { kind: 'event'; eventKey: string };

export interface MomentDef {
  /** Wahrscheinlichkeit, dass der Moment (und damit der öffentliche Dorfimpuls) überhaupt stattfindet. */
  momentChance: number;
  /** Wahrscheinlichkeit, dass im Moment wirklich eine Rolle vergeben wird (Pool erlaubt vorausgesetzt). */
  grantChance: number;
}

export interface Rules {
  minPlayers: number;
  maxPlayers: number;
  /** Anzahl Rudelmitglieder je Spielerzahl (Startwerte, zentral anpassbar). */
  wolvesByPlayers: Record<number, number>;
  roles: Record<RoleId, RoleDef>;
  /** Verteilung der Sonderrollen beim Start je Größenband (GAME_DESIGN §14 Richtwerte). */
  startSpecials: Record<SizeBand, { count: number; weight: number }[]>;
  /** Obergrenze zusätzlicher Sonderrollen nach dem Start. */
  maxLaterSpecials: Record<SizeBand, number>;
  /** Vorab erlaubte Kombinationen: höchstens `max` Rollen aus der Gruppe je Partie. */
  comboLimits: { roles: RoleId[]; max: Record<SizeBand, number> }[];
  /** Ab dieser Zahl lebender Spieler werden keine neuen Rollen mehr eingeführt (0 = aus). Zustandsabhängig, aber nicht stärkebasiert. */
  finaleAlive: number;
  /** Rollen-Momente. Impulse erscheinen bei JEDEM Moment, unabhängig davon, ob eine Rolle vergeben wird. */
  moments: Record<Exclude<Trigger, 'start'>, MomentDef>;
  durations: {
    speakerElectionMs: number;
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

/** Auswahl einer Fähigkeit (Art ergibt sich aus der Fähigkeit-Definition der Rolle). */
export interface AbilityChoice {
  target?: PlayerId;
  targets?: PlayerId[];
}

export type NoteKind = 'role' | 'inspect_result' | 'group_result' | 'role_gained' | 'info';

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

export type CouncilStep = 'voting' | 'showdown' | 'tiebreak' | 'result';

export interface CouncilState {
  step: CouncilStep;
  endsAt: number;
  /** Alle bei Beginn lebenden Spieler sind wählbar (keine Nominierung). */
  candidates: PlayerId[];
  votes: Record<PlayerId, PlayerId>;
  /** Zeitpunkt von „ZEIGT!" (nur Showdown). */
  revealAt: number | null;
  tally: Record<PlayerId, number> | null;
  tied: PlayerId[] | null;
  banished: PlayerId | null;
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
  | 'quest_event'
  | 'council_ready'
  | 'council_started'
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
  /** Nachtwahl je Spieler und Fähigkeit-ID. */
  nightActions: Record<PlayerId, Record<string, AbilityChoice>>;
  notes: Record<PlayerId, PrivateNote[]>;
  /** Ausgeschiedene Jäger → gewähltes Ziel (wird erst am Ende des Fensters wirksam, damit der Zeitpunkt nichts verrät). */
  hunterShots: Record<PlayerId, PlayerId | null>;
  usedQuestIds: string[];
  usedImpulseKeys: string[];
  /** Anzahl Sonderrollen, die beim Start vergeben wurden. */
  startSpecialCount: number;
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
  | { type: 'vote'; target: PlayerId }
  | { type: 'decide_tie'; target: PlayerId }
  | { type: 'pack_target'; target: PlayerId }
  | { type: 'night_action'; ability: string; target?: PlayerId; targets?: PlayerId[] }
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
