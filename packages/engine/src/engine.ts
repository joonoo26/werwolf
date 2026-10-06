// Zustandsmaschine von DAS DORF. Reine Funktionen: (state, actor, command, now) → neuer state.
// Kein I/O, keine Uhr, kein globaler Zufall → vollständig simulier- und testbar.
import { assignStartRoles, pickLateAssignment } from './director';
import { HINT_IMPULSE_KEYS, NEUTRAL_CHANGE_IMPULSE, QUESTS } from './content';
import { Rng, seedToState } from './rng';
import { mergeRules } from './rules';
import { planDay } from './schedule';
import type {
  Command,
  CouncilState,
  ErrorCode,
  EventKind,
  Faction,
  GameState,
  AbilityChoice,
  AbilityDef,
  NoteKind,
  PlayerId,
  PlayerState,
  PlayerUses,
  QuestRewardDef,
  Result,
  RoleDef,
  RoleId,
  Rules,
  StartInput,
  Trigger,
} from './types';
import { UNLIMITED } from './types';

interface Ctx {
  now: number;
  rng: Rng;
}

class Fail extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const fail = (code: ErrorCode, message: string): never => {
  throw new Fail(code, message);
};

// ───────────────────────── Hilfsfunktionen ─────────────────────────

export const livingPlayers = (s: GameState): PlayerState[] => Object.values(s.players).filter((p) => p.alive);
const livingIds = (s: GameState): PlayerId[] => livingPlayers(s).map((p) => p.id);
const isAlive = (s: GameState, id: PlayerId | undefined | null): boolean => !!id && !!s.players[id]?.alive;

export function packAliveCount(s: GameState): number {
  return livingPlayers(s).filter((p) => p.faction === 'pack').length;
}

/** Siegbedingungen (GAME_DESIGN §2). Dorf hat Vorrang, falls beides gleichzeitig zutrifft. */
export function checkWin(s: GameState): Faction | null {
  const alive = livingPlayers(s);
  const pack = alive.filter((p) => p.faction === 'pack').length;
  const others = alive.length - pack;
  if (pack === 0) return 'village';
  if (pack >= others) return 'pack';
  return null;
}

function pushEvent(
  s: GameState,
  ctx: Ctx,
  kind: EventKind,
  players?: PlayerId[],
  data?: Record<string, unknown>,
): void {
  const ev: GameState['events'][number] = { id: s.nextEventId++, day: s.day, at: ctx.now, kind };
  if (players) ev.players = players;
  if (data) ev.data = data;
  s.events.push(ev);
}

function addNote(s: GameState, id: PlayerId, day: number, kind: NoteKind, data: Record<string, unknown>): void {
  (s.notes[id] ??= []).push({ id: s.nextNoteId++, day, kind, data });
}

/** Nutzungen je Fähigkeit aus der Rollen-Konfiguration. */
export function initialUses(role: RoleId, rules: Rules): PlayerUses {
  const uses: PlayerUses = {};
  for (const a of rules.roles[role].abilities) uses[a.id] = a.uses === null ? UNLIMITED : a.uses;
  return uses;
}

const abilitiesOf = (s: GameState, p: PlayerState): AbilityDef[] => s.rules.roles[p.role].abilities;

function setRole(s: GameState, id: PlayerId, role: RoleId, day: number): void {
  const p = s.players[id]!;
  const def = s.rules.roles[role];
  p.role = role;
  p.faction = def.faction;
  p.roleSince = day;
  p.uses = initialUses(role, s.rules);
  p.lastTarget = {};
  p.sidePending = def.startChoice;
}

function setImpulse(s: GameState, ctx: Ctx, kind: 'change' | 'hint'): void {
  let textKey: string;
  if (kind === 'change') {
    textKey = NEUTRAL_CHANGE_IMPULSE;
  } else {
    const unused = HINT_IMPULSE_KEYS.filter((k) => !s.usedImpulseKeys.includes(k));
    const pool = unused.length > 0 ? unused : HINT_IMPULSE_KEYS;
    if (unused.length === 0) s.usedImpulseKeys = [];
    textKey = ctx.rng.pick(pool);
    s.usedImpulseKeys.push(textKey);
  }
  // Auch bei Rollenvergabe bekommen alle einen echten Hinweis zusätzlich zum allgemeinen Impuls.
  s.impulse = { id: (s.impulse?.id ?? 0) + 1, kind, textKey, at: ctx.now, showUntil: ctx.now + s.rules.durations.impulseMs };
  pushEvent(s, ctx, 'impulse', undefined, { kind });
}

/**
 * Rollen-Moment (vorab definierte Zeitpunkte). Der allgemeine Dorfimpuls erscheint bei JEDEM Moment,
 * unabhängig davon, ob eine Rolle vergeben wird – niemand kann am Impuls erkennen, ob etwas vergeben wurde.
 */
function runMoment(s: GameState, ctx: Ctx, trigger: Exclude<Trigger, 'start'>): void {
  const m = s.rules.moments[trigger];
  if (!ctx.rng.chance(m.momentChance)) return;
  setImpulse(s, ctx, 'change');
  if (!ctx.rng.chance(m.grantChance)) return;
  const a = pickLateAssignment(s, trigger, ctx.rng);
  if (!a) return;
  setRole(s, a.playerId, a.role, s.day);
  addNote(s, a.playerId, s.day, 'role_gained', { role: a.role });
}

/** Spieler scheidet aus: sofort aus allem aktiven Spiel heraus (GAME_DESIGN §12). */
function eliminate(s: GameState, ctx: Ctx, id: PlayerId): void {
  const p = s.players[id];
  if (!p || !p.alive) return;
  p.alive = false;
  p.eliminatedDay = s.day;
  s.readyCouncil = s.readyCouncil.filter((x) => x !== id);
  s.readyAdvance = s.readyAdvance.filter((x) => x !== id);
  delete s.nightActions[id];
  delete s.packVotes[id];
  // Stimmen auf den Ausgeschiedenen sind ungültig; das Rudel muss neu wählen.
  for (const [voter, target] of Object.entries(s.packVotes)) if (target === id) delete s.packVotes[voter];
  if (s.speakerId === id) s.speakerId = null;
  // Letzter Schuss: nur, wenn die Rolle eine last_shot-Fähigkeit mit Nutzungen hat.
  if (abilitiesOf(s, p).some((a) => a.kind === 'last_shot' && (p.uses[a.id] ?? 0) > 0)) s.hunterShots[id] = null;
}

// ───────────────────────── Spielstart ─────────────────────────

export function createGame(input: StartInput): GameState {
  const rules = mergeRules(input.rules);
  const n = input.roster.length;
  if (n < rules.minPlayers || n > rules.maxPlayers) {
    throw new Error(`Spielerzahl ${n} außerhalb von ${rules.minPlayers}–${rules.maxPlayers}`);
  }
  if (new Set(input.roster.map((r) => r.id)).size !== n) throw new Error('Doppelte Spieler-IDs');
  if (!input.roster.some((r) => r.id === input.hostId)) throw new Error('Host ist kein Spieler');

  const rng = new Rng(seedToState(input.seed));
  const ids = input.roster.map((r) => r.id);
  const { assignments, startSpecialCount } = assignStartRoles(ids, rules, rng);
  const seats = rng.shuffle(ids);

  const s: GameState = {
    schema: 1,
    mode: input.mode,
    rules,
    rng: rng.state(),
    hostId: input.hostId,
    startedAt: input.now,
    targetEndsAt:
      input.mode === 'evening' ? input.now + Math.max(30, input.targetMinutes ?? 180) * 60_000 : null,
    day: 0,
    phase: { kind: 'ended' },
    players: {},
    speakerId: null,
    readyCouncil: [],
    readyAdvance: [],
    majorityAt: null,
    packVotes: {},
    nightActions: {},
    notes: {},
    hunterShots: {},
    usedQuestIds: [],
    usedImpulseKeys: [],
    startSpecialCount,
    firstCouncilDone: false,
    impulse: null,
    events: [],
    nextEventId: 1,
    nextNoteId: 1,
    winner: null,
  };

  for (const r of input.roster) {
    const p: PlayerState = {
      id: r.id,
      name: r.name,
      seat: seats.indexOf(r.id),
      alive: true,
      role: 'villager',
      faction: 'village',
      roleSince: 1,
      uses: initialUses('villager', rules),
      lastTarget: {},
      sidePending: false,
      eliminatedDay: null,
    };
    s.players[r.id] = p;
  }
  for (const a of assignments) setRole(s, a.playerId, a.role, 1);
  for (const p of Object.values(s.players)) addNote(s, p.id, 1, 'role', { role: p.role });

  const ctx: Ctx = { now: input.now, rng };
  pushEvent(s, ctx, 'game_started');
  setImpulse(s, ctx, 'change');
  startDay(s, ctx);
  s.rng = rng.state();
  return s;
}

// ───────────────────────── Phasen: Tag ─────────────────────────

function startDay(s: GameState, ctx: Ctx): void {
  s.day += 1;
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  s.packVotes = {};
  if (s.speakerId === null) {
    s.phase = { kind: 'speaker_election', votes: {}, endsAt: ctx.now + s.rules.durations.speakerElectionMs };
    return;
  }
  beginDayPhase(s, ctx);
}

function beginDayPhase(s: GameState, ctx: Ctx): void {
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  if (s.day >= 2) runMoment(s, ctx, 'day_start');

  let councilBy: number | null = null;
  let nightAt: number | null = null;
  let questTimes: number[];
  if (s.mode === 'evening' && s.targetEndsAt !== null) {
    const alive = livingPlayers(s);
    const pack = alive.filter((p) => p.faction === 'pack').length;
    const plan = planDay({
      now: ctx.now,
      targetEndsAt: s.targetEndsAt,
      nonPackAlive: alive.length - pack,
      packAlive: pack,
      rules: s.rules,
    });
    councilBy = plan.councilBy;
    nightAt = plan.nightAt;
    questTimes = plan.questTimes;
  } else {
    questTimes = [ctx.now + 20_000];
  }
  s.phase = {
    kind: 'day',
    startedAt: ctx.now,
    councilBy,
    nightAt,
    quest: null,
    questTimes,
    councilQueued: false,
  };
}

function resolveElection(s: GameState, ctx: Ctx): void {
  if (s.phase.kind !== 'speaker_election') return;
  const living = livingIds(s);
  const counts: Record<PlayerId, number> = {};
  for (const [voter, target] of Object.entries(s.phase.votes)) {
    if (isAlive(s, voter) && isAlive(s, target)) counts[target] = (counts[target] ?? 0) + 1;
  }
  let winners: PlayerId[];
  const top = Math.max(0, ...Object.values(counts));
  if (top === 0) winners = living;
  else winners = Object.keys(counts).filter((id) => counts[id] === top);
  const speaker = winners.length === 1 ? winners[0]! : ctx.rng.pick(winners);
  s.speakerId = speaker;
  pushEvent(s, ctx, 'speaker_elected', [speaker]);
  beginDayPhase(s, ctx);
}

function startQuest(s: GameState, ctx: Ctx): void {
  if (s.phase.kind !== 'day') return;
  let pool = QUESTS.filter((q) => !s.usedQuestIds.includes(q.id));
  if (pool.length === 0) {
    s.usedQuestIds = [];
    pool = QUESTS;
  }
  const def = ctx.rng.pick(pool);
  s.usedQuestIds.push(def.id);
  s.phase.questTimes.shift();
  s.phase.quest = {
    id: def.id,
    startedAt: ctx.now,
    endsAt: ctx.now + (def.durationMs ?? s.rules.durations.questMs),
    doneBy: [],
  };
  pushEvent(s, ctx, 'quest_started', undefined, { questId: def.id });
}

function applyQuestReward(s: GameState, ctx: Ctx, reward: QuestRewardDef): void {
  switch (reward.kind) {
    case 'hint':
      setImpulse(s, ctx, 'hint');
      break;
    case 'role':
      // Moment mit konfigurierter Wahrscheinlichkeit; der Impuls erscheint immer, die Vergabe bleibt unsichtbar.
      runMoment(s, ctx, 'quest_reward');
      break;
    case 'event':
      pushEvent(s, ctx, 'quest_event', undefined, { eventKey: reward.eventKey });
      break;
  }
}

/**
 * Beendet die Quest. Erfolgreich = alle Lebenden haben die Erfüllung bestätigt.
 * Das bloße Beenden/Abschließen erzeugt keine Belohnung; nur ausdrücklich konfigurierte Quests
 * (QuestDef.reward) lösen bei Erfolg etwas aus.
 */
function endQuest(s: GameState, ctx: Ctx): void {
  if (s.phase.kind !== 'day' || !s.phase.quest) return;
  const quest = s.phase.quest;
  const def = QUESTS.find((q) => q.id === quest.id);
  const success = livingIds(s).every((id) => quest.doneBy.includes(id));
  s.phase.quest = null;
  pushEvent(s, ctx, 'quest_ended', undefined, { questId: quest.id, success });
  if (success && def?.reward) applyQuestReward(s, ctx, def.reward);
}

// ───────────────────────── Dorfrat ─────────────────────────

/** Der Dorfrat beginnt direkt mit der Abstimmung: jeder Lebende wählt jeden anderen Lebenden. */
function startCouncil(s: GameState, ctx: Ctx): void {
  const nightAt = s.phase.kind === 'day' ? s.phase.nightAt : null;
  const council: CouncilState = {
    step: 'voting',
    endsAt: ctx.now + s.rules.durations.votingMs,
    candidates: livingIds(s),
    votes: {},
    revealAt: null,
    tally: null,
    tied: null,
    banished: null,
    decidedByTiebreak: false,
  };
  s.phase = { kind: 'council', council, nightAt };
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  pushEvent(s, ctx, 'council_started');
}

function banish(s: GameState, ctx: Ctx, id: PlayerId, byTiebreak: boolean): void {
  if (s.phase.kind !== 'council') return;
  const c = s.phase.council;
  c.banished = id;
  c.decidedByTiebreak = byTiebreak;
  c.step = 'result';
  c.endsAt = ctx.now + s.rules.durations.resultMs;
  eliminate(s, ctx, id);
  pushEvent(s, ctx, 'banished', [id], { tally: c.tally ?? undefined, tiebreak: byTiebreak });
}

function tallyVotes(s: GameState, c: CouncilState): Record<PlayerId, number> {
  const tally: Record<PlayerId, number> = {};
  for (const cand of c.candidates) tally[cand] = 0;
  for (const [voter, target] of Object.entries(c.votes)) {
    if (isAlive(s, voter) && voter !== target && c.candidates.includes(target)) tally[target] = (tally[target] ?? 0) + 1;
  }
  return tally;
}

function stepCouncil(s: GameState, ctx: Ctx, force: boolean): boolean {
  if (s.phase.kind !== 'council') return false;
  const c = s.phase.council;
  const { now } = ctx;
  const d = s.rules.durations;
  const living = livingIds(s);

  switch (c.step) {
    case 'voting': {
      // Alle Stimmen gesperrt (oder Frist/Notfall) → gemeinsamer Countdown 3 – 2 – 1 – ZEIGT!
      const all = living.every((id) => c.votes[id]);
      if (!(all || now >= c.endsAt || force)) return false;
      c.step = 'showdown';
      c.revealAt = now + d.countdownMs;
      c.endsAt = c.revealAt + d.pointingMs;
      return true;
    }
    case 'showdown': {
      // Erst nach dem gemeinsamen Zeigen wird das digitale Ergebnis sichtbar.
      if (!(now >= c.endsAt || force)) return false;
      const tally = tallyVotes(s, c);
      c.tally = tally;
      const top = Math.max(0, ...Object.values(tally));
      const leaders = c.candidates.filter((id) => tally[id] === top && isAlive(s, id));
      if (top === 0 || leaders.length === 0) {
        // Niemand hat gültig gewählt: der Dorfrat endet trotzdem mit genau einer Verbannung.
        banish(s, ctx, ctx.rng.pick(living), false);
        return true;
      }
      if (leaders.length === 1) {
        banish(s, ctx, leaders[0]!, false);
        return true;
      }
      c.tied = leaders;
      if (s.speakerId && isAlive(s, s.speakerId)) {
        c.step = 'tiebreak';
        c.endsAt = now + d.tiebreakMs;
      } else {
        banish(s, ctx, ctx.rng.pick(leaders), true);
      }
      return true;
    }
    case 'tiebreak': {
      if (!(now >= c.endsAt || force)) return false;
      banish(s, ctx, ctx.rng.pick(c.tied ?? living), true);
      return true;
    }
    case 'result': {
      if (!(now >= c.endsAt || force)) return false;
      proceed(s, ctx, 'after_council');
      return true;
    }
  }
}

// ───────────────────────── Weiterschalten, Dämmerung, Nacht, Morgen ─────────────────────────

function applyHunterShots(s: GameState, ctx: Ctx): void {
  for (const [hunterId, target] of Object.entries(s.hunterShots)) {
    const h = s.players[hunterId];
    const ability = h ? abilitiesOf(s, h).find((a) => a.kind === 'last_shot') : undefined;
    if (h && ability && target && isAlive(s, target) && hasUses(h, ability)) {
      consume(h, ability);
      eliminate(s, ctx, target);
      pushEvent(s, ctx, 'last_shot', [hunterId, target]);
    }
  }
  s.hunterShots = {};
}

function proceed(s: GameState, ctx: Ctx, which: 'after_council' | 'after_night'): void {
  applyHunterShots(s, ctx);
  const winner = checkWin(s);
  if (winner) {
    s.winner = winner;
    s.phase = { kind: 'ended' };
    pushEvent(s, ctx, 'game_ended', undefined, { winner });
    return;
  }
  if (which === 'after_council') {
    const nightAt = s.phase.kind === 'council' ? s.phase.nightAt : null;
    if (!s.firstCouncilDone) {
      s.firstCouncilDone = true;
      runMoment(s, ctx, 'after_first_council');
    }
    s.readyAdvance = [];
    s.majorityAt = null;
    s.phase = { kind: 'dusk', startedAt: ctx.now, nightAt };
  } else {
    startDay(s, ctx);
  }
}

function startNight(s: GameState, ctx: Ctx): void {
  for (const p of Object.values(s.players)) if (p.alive && p.sidePending) p.sidePending = false;
  s.readyAdvance = [];
  s.readyCouncil = [];
  s.majorityAt = null;
  s.nightActions = {};
  s.phase = { kind: 'night', startedAt: ctx.now, endsAt: ctx.now + s.rules.durations.nightMs };
  pushEvent(s, ctx, 'night_began');
}

function resolvePackTarget(s: GameState, ctx: Ctx): PlayerId | null {
  const counts: Record<PlayerId, number> = {};
  for (const [voter, target] of Object.entries(s.packVotes)) {
    const v = s.players[voter];
    const t = s.players[target];
    if (v?.alive && v.faction === 'pack' && t?.alive && t.faction !== 'pack') counts[target] = (counts[target] ?? 0) + 1;
  }
  const top = Math.max(0, ...Object.values(counts));
  if (top > 0) {
    const leaders = Object.keys(counts).filter((id) => counts[id] === top);
    return leaders.length === 1 ? leaders[0]! : ctx.rng.pick(leaders);
  }
  const options = livingPlayers(s).filter((p) => p.faction !== 'pack');
  return options.length ? ctx.rng.pick(options).id : null;
}

const hasUses = (p: PlayerState, a: AbilityDef): boolean => (p.uses[a.id] ?? 0) > 0;
const consume = (p: PlayerState, a: AbilityDef): void => {
  if (a.uses !== null) p.uses[a.id] = (p.uses[a.id] ?? 0) - 1;
};

/**
 * Nachtauflösung, vollständig aus den Fähigkeits-Definitionen der Rollen (Rules.roles) abgeleitet.
 * Reihenfolge: Schleier → Informationen → Schutz → Angriff; Rudelangriff wird nur durch Schutz verhindert.
 */
function resolveNight(s: GameState, ctx: Ctx): void {
  const day = s.day;
  const target = resolvePackTarget(s, ctx);
  const actors = livingPlayers(s);
  const chosen = (p: PlayerState, a: AbilityDef): AbilityChoice | undefined => s.nightActions[p.id]?.[a.id];
  const each = (kind: AbilityDef['kind'], fn: (p: PlayerState, a: AbilityDef, c: AbilityChoice) => void) => {
    for (const p of actors) {
      for (const a of abilitiesOf(s, p)) {
        const c = chosen(p, a);
        if (a.kind === kind && c && hasUses(p, a)) fn(p, a, c);
      }
    }
  };

  let veiled = false;
  each('veil', (p, a) => {
    consume(p, a);
    veiled = true;
  });
  each('inspect', (p, a, c) => {
    consume(p, a);
    const t = c.target ? s.players[c.target] : undefined;
    addNote(s, p.id, day, 'inspect_result', veiled || !t ? { ability: a.id, target: c.target, unclear: true } : { ability: a.id, target: c.target, faction: t.faction });
  });
  each('inspect_group', (p, a, c) => {
    consume(p, a);
    const targets = c.targets ?? [];
    const packPresent = targets.some((tid) => s.players[tid]?.faction === 'pack');
    addNote(s, p.id, day, 'group_result', veiled ? { ability: a.id, targets, unclear: true } : { ability: a.id, targets, packPresent });
  });

  const protectedIds = new Set<PlayerId>();
  each('protect', (p, a, c) => {
    consume(p, a);
    if (c.target) {
      protectedIds.add(c.target);
      p.lastTarget[a.id] = c.target;
    }
  });
  // Nicht-Wiederholungs-Sperre läuft ab, wenn in dieser Nacht nicht geschützt wurde.
  for (const p of actors) {
    for (const a of abilitiesOf(s, p)) if (a.kind === 'protect' && !chosen(p, a)) p.lastTarget[a.id] = null;
  }
  const strikeIds: PlayerId[] = [];
  each('strike', (p, a, c) => {
    consume(p, a);
    if (c.target) strikeIds.push(c.target);
  });

  const deaths: PlayerId[] = [];
  if (target && isAlive(s, target) && !protectedIds.has(target)) deaths.push(target);
  for (const t of strikeIds) if (isAlive(s, t) && !deaths.includes(t)) deaths.push(t);

  s.nightActions = {};
  s.packVotes = {};
  s.readyAdvance = [];
  s.majorityAt = null;
  for (const id of deaths) {
    eliminate(s, ctx, id);
    pushEvent(s, ctx, 'eliminated', [id], { how: 'night' });
  }
  pushEvent(s, ctx, 'morning', deaths);
  s.phase = {
    kind: 'morning',
    startedAt: ctx.now,
    endsAt: ctx.now + s.rules.durations.morningMs,
    deaths,
  };
}

// ───────────────────────── Bestätigungen (Quorum) ─────────────────────────

function quorum(s: GameState, ctx: Ctx, list: PlayerId[], graceMs: number): boolean {
  const living = livingIds(s);
  const ready = list.filter((id) => living.includes(id));
  if (living.length > 0 && ready.length === living.length) return true;
  if (ready.length * 2 > living.length) {
    if (s.majorityAt === null) s.majorityAt = ctx.now;
    return ctx.now - s.majorityAt >= graceMs;
  }
  s.majorityAt = null;
  return false;
}

export function councilReadyFlag(s: GameState): boolean {
  const living = livingIds(s);
  const ready = s.readyCouncil.filter((id) => living.includes(id));
  return ready.length * 2 > living.length;
}

// ───────────────────────── Ein Schritt der Zeit-/Zustandsmaschine ─────────────────────────

function step(s: GameState, ctx: Ctx, force: boolean): boolean {
  const { now } = ctx;
  const d = s.rules.durations;
  const phase = s.phase;
  switch (phase.kind) {
    case 'speaker_election': {
      const living = livingIds(s);
      const all = living.every((id) => phase.votes[id]);
      if (!(all || now >= phase.endsAt || force)) return false;
      resolveElection(s, ctx);
      return true;
    }
    case 'day': {
      const quest = phase.quest;
      const living = livingIds(s);
      if (quest) {
        const done = living.every((id) => quest.doneBy.includes(id));
        if (done || now >= quest.endsAt || force) {
          endQuest(s, ctx);
          return true;
        }
      }
      const councilDue =
        force ||
        phase.councilQueued ||
        (phase.councilBy !== null && now >= phase.councilBy) ||
        (s.mode === 'classic' && quorum(s, ctx, s.readyCouncil, d.confirmGraceMs));
      if (councilDue) {
        // Eine laufende Quest wird sauber abgeschlossen, danach beginnt der Dorfrat (GAME_DESIGN §19).
        if (phase.quest && !force) {
          phase.councilQueued = true;
          return false;
        }
        startCouncil(s, ctx);
        return true;
      }
      if (!phase.quest && phase.questTimes.length > 0 && now >= (phase.questTimes[0] as number)) {
        startQuest(s, ctx);
        return true;
      }
      return false;
    }
    case 'council':
      return stepCouncil(s, ctx, force);
    case 'dusk': {
      const due =
        force ||
        (phase.nightAt !== null && now >= phase.nightAt) ||
        quorum(s, ctx, s.readyAdvance, d.confirmGraceMs);
      if (!due) return false;
      startNight(s, ctx);
      return true;
    }
    case 'night': {
      if (!(now >= phase.endsAt || force)) return false;
      resolveNight(s, ctx);
      return true;
    }
    case 'morning': {
      // Mindestdauer für alle gleich (kein Zeit-Tell für letzte Aktionen); Klassisch bestätigt danach.
      const due =
        force ||
        (now >= phase.endsAt && (s.mode === 'evening' || quorum(s, ctx, s.readyAdvance, d.confirmGraceMs)));
      if (!due) return false;
      proceed(s, ctx, 'after_night');
      return true;
    }
    case 'ended':
      return false;
  }
}

function settle(s: GameState, ctx: Ctx, force = false): void {
  let guard = 0;
  let first = true;
  // Force gilt für genau einen Übergang (technischer Notfall), danach normale Regeln.
  while (guard++ < 24 && step(s, ctx, force && first)) first = false;
}

// ───────────────────────── Befehle ─────────────────────────

function requirePlayer(s: GameState, id: PlayerId): PlayerState {
  const p = s.players[id];
  if (!p) return fail('not_a_player', 'Unbekannter Spieler');
  return p;
}

function requireAlive(s: GameState, id: PlayerId): PlayerState {
  const p = requirePlayer(s, id);
  if (!p.alive) fail('not_alive', 'Ausgeschiedene Spieler sind aus dem aktiven Spiel raus');
  return p;
}

function requireLivingTarget(s: GameState, target: PlayerId, opts: { not?: PlayerId } = {}): PlayerState {
  const t = s.players[target];
  if (!t || !t.alive) return fail('invalid_target', 'Ziel muss ein lebender Spieler sein');
  if (opts.not === target) fail('invalid_target', 'Dieses Ziel ist nicht erlaubt');
  return t;
}

function applyNightAction(s: GameState, actor: PlayerState, cmd: Extract<Command, { type: 'night_action' }>): void {
  if (s.phase.kind !== 'night') fail('wrong_phase', 'Nachtaktionen gibt es nur nachts');
  const a = abilitiesOf(s, actor).find((x) => x.id === cmd.ability);
  if (!a || a.kind === 'last_shot') return fail('not_allowed', 'Diese Aktion steht dir nicht zur Verfügung');
  if (!hasUses(actor, a)) fail('no_uses_left', 'Keine Nutzungen übrig');
  let choice: AbilityChoice = {};
  switch (a.kind) {
    case 'inspect':
    case 'strike': {
      if (!cmd.target) return fail('invalid_target', 'Ziel fehlt');
      requireLivingTarget(s, cmd.target, { not: actor.id });
      choice = { target: cmd.target };
      break;
    }
    case 'protect': {
      if (!cmd.target) return fail('invalid_target', 'Ziel fehlt');
      requireLivingTarget(s, cmd.target, a.allowSelf === false ? { not: actor.id } : {});
      if (a.noRepeatTarget && actor.lastTarget[a.id] === cmd.target) fail('invalid_target', 'Dieselbe Person nicht zwei Nächte in Folge');
      choice = { target: cmd.target };
      break;
    }
    case 'inspect_group': {
      const targets = cmd.targets ?? [];
      const others = livingPlayers(s).filter((p) => p.id !== actor.id).length;
      const size = Math.min(a.groupSize ?? 3, others);
      if (new Set(targets).size !== targets.length || targets.length !== size) fail('invalid_target', `Wähle genau ${size} verschiedene Personen`);
      for (const t of targets) requireLivingTarget(s, t, { not: actor.id });
      choice = { targets };
      break;
    }
    case 'veil':
      break;
  }
  (s.nightActions[actor.id] ??= {})[a.id] = choice;
}

function execute(s: GameState, actorId: PlayerId | 'system', cmd: Command, ctx: Ctx): void {
  if (cmd.type === 'tick') {
    if (cmd.force) {
      if (actorId !== 'system' && actorId !== s.hostId) fail('not_allowed', 'Nur der technische Host darf fortsetzen');
      settle(s, ctx, true);
      return;
    }
    if (actorId !== 'system') requirePlayer(s, actorId);
    return;
  }
  if (actorId === 'system') fail('not_allowed', 'Befehl nur für Spieler');
  const actor = requirePlayer(s, actorId);

  // Der Jäger darf nach dem Ausscheiden handeln – im selben Zeitfenster wie die Ergebnisanzeige.
  if (cmd.type === 'hunter_shoot') {
    const hp = s.phase;
    const windowOpen = (hp.kind === 'council' && hp.council.step === 'result') || hp.kind === 'morning';
    if (!windowOpen || !(actor.id in s.hunterShots)) return fail('wrong_phase', 'Kein letzter Schuss möglich');
    requireLivingTarget(s, cmd.target);
    s.hunterShots[actor.id] = cmd.target;
    return;
  }

  requireAlive(s, actor.id);

  switch (cmd.type) {
    case 'ready': {
      if (cmd.topic === 'council') {
        if (s.phase.kind !== 'day') fail('wrong_phase', 'Bereitschaft für den Dorfrat gibt es nur am Tag');
        const before = councilReadyFlag(s);
        s.readyCouncil = s.readyCouncil.filter((id) => id !== actor.id);
        if (cmd.value) s.readyCouncil.push(actor.id);
        if (!before && councilReadyFlag(s)) pushEvent(s, ctx, 'council_ready');
      } else {
        const ok = s.phase.kind === 'dusk' || (s.phase.kind === 'morning' && s.mode === 'classic');
        if (!ok) fail('wrong_phase', 'Hier gibt es nichts zu bestätigen');
        s.readyAdvance = s.readyAdvance.filter((id) => id !== actor.id);
        if (cmd.value) s.readyAdvance.push(actor.id);
      }
      return;
    }
    case 'start_council': {
      const dp = s.phase;
      if (dp.kind !== 'day') return fail('wrong_phase', 'Der Dorfrat kann jetzt nicht beginnen');
      if (!councilReadyFlag(s)) fail('not_allowed', 'Das Dorf ist noch nicht bereit für einen Dorfrat');
      if (dp.quest) dp.councilQueued = true;
      else startCouncil(s, ctx);
      return;
    }
    case 'quest_done': {
      const qp = s.phase;
      if (qp.kind !== 'day' || !qp.quest) return fail('wrong_phase', 'Gerade läuft keine Quest');
      const q = qp.quest;
      if (!q.doneBy.includes(actor.id)) q.doneBy.push(actor.id);
      return;
    }
    case 'vote_speaker': {
      const ep = s.phase;
      if (ep.kind !== 'speaker_election') return fail('wrong_phase', 'Keine Dorfsprecher-Wahl');
      requireLivingTarget(s, cmd.target, { not: actor.id });
      if (ep.votes[actor.id]) fail('already_decided', 'Deine Stimme ist bereits gesetzt');
      ep.votes[actor.id] = cmd.target;
      return;
    }
    case 'vote': {
      const vp = s.phase;
      if (vp.kind !== 'council' || vp.council.step !== 'voting') return fail('wrong_phase', 'Jetzt wird nicht abgestimmt');
      const c = vp.council;
      if (!c.candidates.includes(cmd.target)) fail('invalid_target', 'Diese Person steht nicht zur Wahl');
      if (cmd.target === actor.id) fail('invalid_target', 'Du kannst nicht für dich selbst stimmen');
      if (c.votes[actor.id]) fail('already_decided', 'Deine Stimme ist gesetzt und verbindlich');
      c.votes[actor.id] = cmd.target;
      return;
    }
    case 'decide_tie': {
      const tp = s.phase;
      if (tp.kind !== 'council' || tp.council.step !== 'tiebreak') return fail('wrong_phase', 'Kein Gleichstand zu entscheiden');
      if (s.speakerId !== actor.id) fail('not_allowed', 'Nur der Dorfsprecher entscheidet');
      const c = tp.council;
      if (!c.tied?.includes(cmd.target)) fail('invalid_target', 'Nur gleichplatzierte Kandidaten sind wählbar');
      banish(s, ctx, cmd.target, true);
      return;
    }
    case 'pack_target': {
      if (actor.faction !== 'pack') fail('not_allowed', 'Diese Aktion steht dir nicht zur Verfügung');
      if (s.phase.kind !== 'day' && s.phase.kind !== 'dusk' && s.phase.kind !== 'night') {
        fail('wrong_phase', 'Jetzt kann kein Ziel gewählt werden');
      }
      const t = requireLivingTarget(s, cmd.target);
      if (t.faction === 'pack') fail('invalid_target', 'Das Ziel darf nicht zum Rudel gehören');
      s.packVotes[actor.id] = cmd.target;
      return;
    }
    case 'night_action': {
      applyNightAction(s, actor, cmd);
      return;
    }
    case 'choose_side': {
      if (!actor.sidePending) fail('not_allowed', 'Keine Wahl offen');
      if (s.phase.kind === 'night' || s.phase.kind === 'ended') fail('wrong_phase', 'Zu spät für diese Wahl');
      actor.sidePending = false;
      actor.faction = cmd.side;
      return;
    }
    default:
      fail('invalid_command', 'Unbekannter Befehl');
  }
}

/**
 * Wendet einen Befehl an. Gibt einen neuen Zustand zurück; der übergebene
 * Zustand wird nie verändert. Fehler sind Daten, keine Exceptions.
 */
export function applyCommand(
  state: GameState,
  actor: PlayerId | 'system',
  cmd: Command,
  now: number,
): Result {
  const s = JSON.parse(JSON.stringify(state)) as GameState;
  const ctx: Ctx = { now, rng: new Rng(s.rng) };
  try {
    execute(s, actor, cmd, ctx);
    settle(s, ctx);
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: { code: e.code, message: e.message } };
    throw e;
  }
  s.rng = ctx.rng.state();
  return { ok: true, state: s };
}

/** Zeitschritt ohne Spielerbefehl (Server-Tick, Cron). */
export function tick(state: GameState, now: number, opts: { force?: boolean } = {}): GameState {
  const r = applyCommand(state, 'system', { type: 'tick', force: opts.force }, now);
  if (!r.ok) throw new Error(r.error.message);
  return r.state;
}

export function nextDeadline(s: GameState): number | null {
  const p = s.phase;
  switch (p.kind) {
    case 'speaker_election':
    case 'night':
      return p.endsAt;
    case 'morning':
      return p.endsAt;
    case 'council':
      return p.council.endsAt;
    case 'dusk':
      return p.nightAt;
    case 'day': {
      const t = [p.councilBy, p.quest?.endsAt, p.quest ? null : p.questTimes[0]].filter((x): x is number => typeof x === 'number');
      return t.length ? Math.min(...t) : null;
    }
    case 'ended':
      return null;
  }
}
