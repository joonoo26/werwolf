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
  | 'shadowwolf'
  | 'observer';

export type Gender = 'female' | 'male' | 'diverse';
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'gray';
export type EyeColor = 'brown' | 'blue' | 'green' | 'gray';

/** Spielerprofil (für Mitspieler sichtbar). Das exakte Alter wird gespeichert und angezeigt. */
export interface Profile {
  age: number;
  gender: Gender;
  hair: HairColor;
  eyes: EyeColor;
}

/** Wahre, möglichst nicht eindeutige Aussage über ein Profil (Beobachter-Hinweis, Ausschau halten). */
export type TraitStatement =
  | { trait: 'gender'; value: Gender }
  | { trait: 'hair'; value: HairColor | 'dark' | 'light' }
  | { trait: 'eyes'; value: EyeColor | 'light' }
  | { trait: 'age_over'; value: number }
  | { trait: 'age_under'; value: number };

export type RoleMode = 'off' | 'possible' | 'guaranteed';

/** Verbleibende Nutzungen je Fähigkeit-ID (UNLIMITED = unbegrenzt). */
export type PlayerUses = Record<string, number>;
export const UNLIMITED = 1_000_000;

export interface PlayerState {
  id: PlayerId;
  name: string;
  seat: number;
  alive: boolean;
  /**
   * Fraktion und Sonderrolle sind getrennt: `faction` ist Dorf/Rudel, `role` ist die (höchstens eine)
   * Sonderrolle bzw. die Grundrolle villager/wolf. Eine spätere Sonderrolle ändert die Fraktion nicht.
   */
  role: RoleId;
  faction: Faction;
  profile: Profile;
  /** Tag, an dem die Rolle zugewiesen wurde (1 = Spielstart). */
  roleSince: number;
  uses: PlayerUses;
  /** Zuletzt gewähltes Ziel je Fähigkeit (für „nicht zweimal in Folge"). */
  lastTarget: Record<string, PlayerId | null>;
  /** Wartet auf die Fraktionswahl (Rollen mit startChoice). */
  sidePending: boolean;
  eliminatedDay: number | null;
}

export type AbilityKind = 'inspect' | 'inspect_group' | 'protect' | 'heal' | 'veil' | 'last_shot' | 'observe';

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
  /** observe: maximale Dauer eines Beobachtungsfensters. */
  windowMs?: number;
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
  /** Höchstens so viele lebende Träger gleichzeitig (null = unbegrenzt). */
  maxLivingHolders: number | null;
  /** Höchstens so oft je Partie vergeben (null = unbegrenzt). */
  maxGrants: number | null;
  /** Jede Rollenart höchstens so oft je Partie (Start + später, auch ausgeschiedene Träger zählen; null = unbegrenzt). */
  maxPerGame: number | null;
  /**
   * Zeit-/Phasenpräferenz: Gewichtungsfaktor je Spielphase (früh/mittel/spät, Grenzen in `Rules.roleRewards.phases`).
   * Reine Konfiguration der Vergabewahrscheinlichkeit, keine Stärke-/Difficulty-Logik. 0 = in dieser Phase nicht.
   */
  timing: { early: number; mid: number; late: number };
  /** Ist die Rolle im Spiel, wissen alle von Beginn an davon (z. B. Grenzgänger). */
  announcedAtStart: boolean;
}

/** tiny = Kleingruppen 4–6 (Balance offen), small = 7, medium = 8–10, large = 11–14. */
export type SizeBand = 'tiny' | 'small' | 'medium' | 'large';

export type QuestRewardDef =
  | { kind: 'hint' }
  /**
   * Schaltet eine Sonderrolle frei und sagt es öffentlich an („Einer von euch wird zum …"). Ohne `role`
   * wird aus dem Pool gewichtet gezogen. Gibt es keinen geeigneten Empfänger, gibt es keine Freischaltung.
   */
  | { kind: 'unlock_role'; role?: RoleId }
  /** Öffentliches Ereignis ohne Mechanik (Mechanik wird später konfiguriert). */
  | { kind: 'event'; eventKey: string };

/**
 * Rollen-Moment: ein vorab definierter Zeitpunkt. Der öffentliche Dorfimpuls erscheint bei jedem Moment.
 * Eine einzige Wahrscheinlichkeit entscheidet, ob dabei KEINE Rolle vergeben wird; sonst wird (falls der
 * Pool etwas erlaubt) eine erlaubte Rolle gewichtet gezogen.
 */
export interface MomentDef {
  noRoleChance: number;
  /** Nur day_start: an welchen Tagen der Moment stattfindet. */
  days?: number[];
}

/** Reward Director: Rollenbudget, erste Quest, Folgequests, Tageslimit, Fallback, Kleingruppen (alles Konfiguration). */
export interface RoleRewardRules {
  /** Gesamtbudget Sonderrollen je Partie = floor(Startspieler / budgetDivisor); Obergrenze, kein Zielwert. Startrollen zählen mit. */
  budgetDivisor: number;
  /** Die erste erfolgreiche Quest der Partie schaltet (wenn zulässig) garantiert genau eine Sonderrolle frei. */
  firstSuccessfulQuestGuaranteed: boolean;
  /** Die direkt folgende erfolgreiche Quest nach einer Rollenbelohnung vergibt keine Rolle. */
  noRoleRewardAfterRoleReward: boolean;
  /** Höchstens so viele neue Sonderrollen pro Spieltag (Startrollen zählen nicht). */
  maxNewRolesPerDay: number;
  /** Belohnung, wenn eine Rolle nicht vergeben werden kann bzw. darf (keine Rolle). */
  fallback: Exclude<QuestRewardDef, { kind: 'unlock_role' }>;
  /** Spielphasen für `RoleDef.timing`: früh bis Tag `earlyUntilDay`, mittel bis `midUntilDay`, danach spät. */
  phases: { earlyUntilDay: number; midUntilDay: number };
  /**
   * Kleingruppen (Startspielerzahl ≤ maxStartPlayers): Statt `finaleAlive` gilt für neue Rollen
   * (insbesondere die erste Quest-Freischaltung) nur diese Mindestzahl Lebender.
   */
  smallGroup: { maxStartPlayers: number; minAlive: number };
}

export interface Rules {
  minPlayers: number;
  maxPlayers: number;
  /** Anzahl Rudelmitglieder je Spielerzahl (Startwerte, zentral anpassbar). */
  wolvesByPlayers: Record<number, number>;
  /**
   * Kill-Frequenz des Rudels je Spielerzahl: das Rudel tötet nur jede N-te Nacht (Nacht 1, 1+N, …).
   * Nicht eingetragen = jede Nacht (Standard). Für Kleingruppen später anpassbar; noch keine Sonderregel.
   */
  nightKillInterval: Record<number, number>;
  /**
   * Ist ein Grenzgänger im Spiel, ersetzt er einen Wolf-Platz: Die Rudelgröße der Tabelle ist das Maximum
   * (Grenzgänger im Rudel); wählt er das Dorf, ist das Rudel einen kleiner. So entsteht kein unkontrolliert
   * zusätzlicher Wolf.
   */
  borderwalkerReplacesWolf: boolean;
  roles: Record<RoleId, RoleDef>;
  /** Verteilung der Sonderrollen beim Start je Größenband (GAME_DESIGN §14 Richtwerte). */
  startSpecials: Record<SizeBand, { count: number; weight: number }[]>;
  /** Obergrenze zusätzlicher Sonderrollen nach dem Start. */
  maxLaterSpecials: Record<SizeBand, number>;
  /** Vorab erlaubte Kombinationen: höchstens `max` Rollen aus der Gruppe je Partie. */
  comboLimits: { roles: RoleId[]; max: Record<SizeBand, number> }[];
  /** Ab dieser Zahl lebender Spieler werden keine neuen Rollen mehr eingeführt (0 = aus). Zustandsabhängig, aber nicht stärkebasiert. */
  finaleAlive: number;
  roleRewards: RoleRewardRules;
  /** Rollen-Momente. Impulse erscheinen bei JEDEM Moment, unabhängig davon, ob eine Rolle vergeben wird. */
  moments: Record<'after_first_council' | 'day_start', MomentDef>;
  /** Ausschau halten des Rudels gegen den Beobachter. */
  lookout: { enabled: boolean };
  durations: {
    speakerElectionMs: number;
    /** Abendmodus: Richtwert, ab wann die Engine zur Abstimmung auffordert (Diskussion wird nie abrupt beendet). */
    discussionTargetMs: number;
    /** Abendmodus: Gnadenfrist nach dem Richtwert, bevor die Abstimmung automatisch eröffnet wird. */
    discussionGraceMs: number;
    countdownMs: number; // 3 – 2 – 1 – ZEIGT!
    pointingMs: number; // Zeit zum gleichzeitigen Zeigen
    tiebreakMs: number;
    resultMs: number;
    /** Länge der Handlungsphase der Nacht (fest, für alle gleich). */
    nightMs: number;
    /** Länge des Heil-Fensters nach der Rudelentscheidung (fest, auch ohne Alchemistin). */
    healWindowMs: number;
    /** Ein Beobachtungsfenster endet, wenn so lange kein Lebenszeichen des Geräts eintrifft. */
    observerPingTtlMs: number;
    morningMs: number;
    questMs: number;
    /** Wartezeit nach Mehrheit, bevor ohne alle Bestätigungen fortgesetzt wird. */
    confirmGraceMs: number;
    /** Dauer eines öffentlichen Moments (Overlay mit privatem PIN-Bereich), für alle gleich. */
    momentMs: number;
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

export type NoteKind = 'role' | 'inspect_result' | 'group_result' | 'role_gained' | 'lookout_result' | 'lookout_miss' | 'info';

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

export type CouncilStep = 'discussion' | 'voting' | 'showdown' | 'tiebreak' | 'result';

export interface CouncilState {
  step: CouncilStep;
  /** Frist des aktuellen Schritts; null bei freier Diskussion und Abstimmung (kein hartes Limit). */
  endsAt: number | null;
  /** Abendmodus: Richtwert für die Eröffnung der Abstimmung / automatische Eröffnung. */
  targetAt: number | null;
  autoAt: number | null;
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
  | { kind: 'night'; startedAt: number; endsAt: number; stage: 'act' | 'heal' }
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
  | 'moment'
  | 'borderwalker_announced'
  | 'game_ended';

export interface PublicEvent {
  id: number;
  day: number;
  at: number;
  kind: EventKind;
  players?: PlayerId[];
  data?: Record<string, unknown>;
}

export type MomentKind = 'start' | 'quest_unlock' | 'neutral' | 'hint' | 'borderwalker_decided' | 'pack_decided';

/**
 * Synchroner öffentlicher Moment: alle Geräte zeigen gleichzeitig denselben Screen (gleicher Sound/Haptic,
 * gleiche Dauer). Danach öffnet jeder Spieler mit derselben PIN-Interaktion seinen privaten Bereich auf diesem Screen.
 */
export interface Moment {
  id: number;
  kind: MomentKind;
  at: number;
  showUntil: number;
  /** true: Auf dem Screen gibt es für jeden Spieler denselben PIN-geschützten privaten Bereich. */
  secret: boolean;
  /** quest_unlock: die öffentlich angesagte Rolle. */
  role?: RoleId;
  /** hint: Textschlüssel des Hinweises. */
  textKey?: string;
  /** start: Rollen, von deren Existenz alle von Anfang an wissen. */
  announced?: RoleId[];
}

/** Geheimer Teil eines Moments (nur für den Server/den Betroffenen). */
export interface MomentSecret {
  momentId: number;
  recipient: PlayerId | null;
  role: RoleId | null;
  faction?: Faction;
  /** pack_decided: das gesperrte Rudelopfer (nur für die Alchemistin sichtbar). */
  victim?: PlayerId;
}

export interface SuspicionEntry {
  day: number;
  by: PlayerId;
  targets: PlayerId[];
}

export interface ObserverState {
  /** Das beobachtete lebende Rudelmitglied und die wahre Aussage über dieses (für diese Nacht fest). */
  target: PlayerId;
  hint: TraitStatement;
  windowStartedAt: number | null;
  lastPingAt: number | null;
  /** Fenster ist aktuell offen (wird durch Loslassen, Ablauf oder fehlende Lebenszeichen beendet). */
  open: boolean;
}

export interface NightState {
  lockedTarget: PlayerId | null;
  /** Heil-Entscheidung der Alchemistin (null = noch offen). */
  healSave: boolean | null;
  lookoutUsed: boolean;
  observers: Record<PlayerId, ObserverState>;
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
  /** Öffentlich bekannte Zahl der Rudelplätze zu Spielbeginn (bleibt konstant, unabhängig von geheimen Entscheidungen). */
  packSeats: number;
  /** Spielerzahl zu Beginn. */
  playerCount: number;
  /** Anzahl späterer Rollenvergaben (für die Obergrenze) und je Rolle. */
  laterGrants: number;
  grantsByRole: Partial<Record<RoleId, number>>;
  /** Neue Sonderrollen je Spieltag (Tageslimit). */
  grantsByDay: Record<number, number>;
  /** Erfolgreich beendete Quests dieser Partie. */
  questSuccesses: number;
  /** Art der Belohnung der letzten erfolgreichen Quest (für die Unterbrechung von Rollenbelohnungen). */
  lastQuestReward: 'role' | 'other' | 'none' | null;
  bwDecidedAnnounced: boolean;
  night: NightState | null;
  /** Geheime Verdachtsabgaben (nur für den Spielrückblick). */
  suspicions: SuspicionEntry[];
  /** Anzahl Sonderrollen, die beim Start vergeben wurden. */
  startSpecialCount: number;
  firstCouncilDone: boolean;
  moment: Moment | null;
  momentSecret: MomentSecret | null;
  events: PublicEvent[];
  nextEventId: number;
  nextNoteId: number;
  winner: Faction | null;
}

export type Command =
  | { type: 'tick'; force?: boolean }
  | { type: 'ready'; topic: 'council' | 'advance'; value: boolean }
  | { type: 'start_council' }
  | { type: 'start_vote' }
  | { type: 'quest_done' }
  | { type: 'vote_speaker'; target: PlayerId }
  | { type: 'vote'; target: PlayerId }
  | { type: 'decide_tie'; target: PlayerId }
  | { type: 'pack_target'; target: PlayerId }
  | { type: 'night_action'; ability: string; target?: PlayerId; targets?: PlayerId[] }
  | { type: 'suspect'; targets: PlayerId[] }
  | { type: 'observe'; action: 'start' | 'ping' | 'stop' }
  | { type: 'lookout' }
  | { type: 'heal_decision'; save: boolean }
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
  roster: { id: PlayerId; name: string; profile?: Profile }[];
  /** Host-Konfiguration je Rolle: aus / möglich / garantiert. */
  roleModes?: Partial<Record<RoleId, RoleMode>>;
  hostId: PlayerId;
  mode: Mode;
  /** Abendmodus: gewünschte Gesamtdauer in Minuten. */
  targetMinutes?: number;
  seed: number[] | string;
  now: number;
  rules?: DeepPartial<Rules>;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
