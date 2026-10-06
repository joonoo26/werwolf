// GENERIERT von scripts/build-functions.mjs – nicht von Hand ändern.

// packages/server/src/store.ts
var VersionConflictError = class extends Error {
  constructor() {
    super("version_conflict");
  }
};

// packages/engine/src/rng.ts
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return h >>> 0;
}
function seedToState(seed) {
  const r = new Rng(rawState(seed));
  for (let i = 0; i < 12; i++) r.next();
  return r.state();
}
function rawState(seed) {
  if (typeof seed === "string") {
    const a = hashString(seed);
    const b = hashString(seed + "#1");
    const c = hashString(seed + "#2");
    const d = hashString(seed + "#3");
    return [a, b, c, d];
  }
  const s = [0, 0, 0, 0].map((_, i) => (seed[i] ?? 2654435769 * (i + 1)) >>> 0);
  return [s[0], s[1], s[2], s[3]];
}
var Rng = class {
  a;
  b;
  c;
  d;
  constructor(state) {
    [this.a, this.b, this.c, this.d] = state;
  }
  /** Gleichverteilt in [0, 1). */
  next() {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = this.a + this.b | 0;
    this.a = this.b ^ this.b >>> 9;
    this.b = this.c + (this.c << 3) | 0;
    this.c = this.c << 21 | this.c >>> 11;
    this.d = this.d + 1 | 0;
    t = t + this.d | 0;
    this.c = this.c + t | 0;
    return (t >>> 0) / 4294967296;
  }
  int(maxExclusive) {
    return Math.floor(this.next() * maxExclusive);
  }
  chance(p) {
    return this.next() < p;
  }
  pick(items) {
    if (items.length === 0) throw new Error("pick() auf leerer Liste");
    return items[this.int(items.length)];
  }
  shuffle(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  weighted(items, weight) {
    const weights = items.map((i) => Math.max(0, weight(i)));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
  /** Aktueller Zustand zum Zurückschreiben in den GameState. */
  state() {
    return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
  }
};

// packages/engine/src/rules.ts
var DEFAULT_RULES = {
  minPlayers: 6,
  maxPlayers: 14,
  wolfDivisor: 3.5,
  trackGroupSize: 3,
  scoutUses: 2,
  trackerUses: 3,
  roleMinPlayers: {
    villager: 1,
    wolf: 1,
    scout: 6,
    tracker: 6,
    guardian: 7,
    alchemist: 8,
    borderwalker: 8,
    hunter: 8,
    shadowwolf: 9
  },
  roleWeights: {
    villager: 0,
    wolf: 0,
    scout: 1,
    tracker: 2,
    guardian: 3,
    alchemist: 2,
    borderwalker: 1,
    hunter: 2,
    shadowwolf: 1
  },
  maxLaterSpecials: { small: 1, medium: 2, large: 3 },
  infoBudget: { small: 2, medium: 2, large: 3 },
  finaleAlive: 5,
  laterRoleChanceDayStart: 0.35,
  laterRoleChanceAfterFirstCouncil: 0.5,
  durations: {
    speakerElectionMs: 6e4,
    nominationMs: 9e4,
    defenseMs: 12e4,
    votingMs: 12e4,
    countdownMs: 4500,
    pointingMs: 8e3,
    tiebreakMs: 6e4,
    resultMs: 3e4,
    nightMs: 15e4,
    morningMs: 3e4,
    questMs: 5 * 6e4,
    confirmGraceMs: 6e4,
    impulseMs: 8e3
  },
  evening: {
    minDayMs: 10 * 6e4,
    councilBudgetMs: 10 * 6e4,
    questSpacingMs: 25 * 6e4,
    maxQuestsPerDay: 3
  }
};
function mergeRules(overrides) {
  const base = JSON.parse(JSON.stringify(DEFAULT_RULES));
  if (!overrides) return base;
  return deepMerge(base, overrides);
}
function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof target[k] === "object") {
      deepMerge(target[k], v);
    } else if (v !== void 0) {
      target[k] = v;
    }
  }
  return target;
}
function sizeBand(playerCount) {
  if (playerCount <= 7) return "small";
  if (playerCount <= 10) return "medium";
  return "large";
}
function wolfCount(playerCount, rules) {
  return Math.max(2, Math.round(playerCount / rules.wolfDivisor));
}
function startSpecialDistribution(playerCount) {
  switch (sizeBand(playerCount)) {
    case "small":
      return [
        { count: 0, weight: 50 },
        { count: 1, weight: 50 }
      ];
    case "medium":
      return [
        { count: 0, weight: 25 },
        { count: 1, weight: 45 },
        { count: 2, weight: 30 }
      ];
    case "large":
      return [
        { count: 1, weight: 50 },
        { count: 2, weight: 50 }
      ];
  }
}
var ROLES = {
  villager: { id: "villager", faction: "village", infoWeight: 0, startOnly: false, special: false },
  wolf: { id: "wolf", faction: "pack", infoWeight: 0, startOnly: false, special: false },
  scout: { id: "scout", faction: "village", infoWeight: 2, startOnly: false, special: true },
  tracker: { id: "tracker", faction: "village", infoWeight: 1, startOnly: false, special: true },
  alchemist: { id: "alchemist", faction: "village", infoWeight: 0, startOnly: false, special: true },
  guardian: { id: "guardian", faction: "village", infoWeight: 0, startOnly: false, special: true },
  borderwalker: { id: "borderwalker", faction: "village", infoWeight: 0, startOnly: true, special: true },
  hunter: { id: "hunter", faction: "village", infoWeight: 0, startOnly: false, special: true },
  shadowwolf: { id: "shadowwolf", faction: "pack", infoWeight: 0, startOnly: false, special: true }
};
var SPECIAL_ROLES = Object.keys(ROLES).filter((r) => ROLES[r].special);

// packages/engine/src/director.ts
function living(state) {
  return Object.values(state.players).filter((p) => p.alive);
}
function roleTaken(state, role) {
  return Object.values(state.players).some((p) => p.role === role);
}
function activeInfoWeight(state, rules) {
  const used = living(state).reduce((sum, p) => sum + ROLES[p.role].infoWeight, 0);
  return { used, budget: rules.infoBudget[sizeBand(Object.keys(state.players).length)] };
}
function specialsGiven(state) {
  return Object.values(state.players).filter((p) => ROLES[p.role].special).length;
}
function isRoleEligible(role, ctx, state, rules) {
  const meta = ROLES[role];
  if (!meta.special) return false;
  if (ctx.playerCount < rules.roleMinPlayers[role]) return false;
  if (!ctx.isStart && meta.startOnly) return false;
  if (ctx.chosen?.includes(role)) return false;
  if (state && roleTaken(state, role)) return false;
  if (!ctx.isStart && ctx.aliveCount <= rules.finaleAlive) return false;
  if (meta.infoWeight > 0) {
    const existing = state ? activeInfoWeight(state, rules).used : 0;
    const chosen = (ctx.chosen ?? []).reduce((s, r) => s + ROLES[r].infoWeight, 0);
    const budget = rules.infoBudget[sizeBand(ctx.playerCount)];
    if (existing + chosen + meta.infoWeight > budget) return false;
  }
  if (!ctx.isStart) {
    const others = ctx.aliveCount - ctx.packAlive;
    const balance = others > 0 ? ctx.packAlive / others : 1;
    if (meta.faction === "pack" && balance >= 0.6) return false;
    if (meta.faction === "village" && balance <= 0.25) return false;
    if (ctx.packAlive >= others) return false;
  }
  return true;
}
function recipientsFor(state, role) {
  const wantRole = ROLES[role].faction === "pack" ? "wolf" : "villager";
  return living(state).filter((p) => p.role === wantRole).map((p) => p.id);
}
function maybeSpawnRole(state, trigger, rng) {
  const { rules } = state;
  const playerCount = Object.keys(state.players).length;
  const band = sizeBand(playerCount);
  const laterGiven = specialsGiven(state) - state.startSpecials;
  if (laterGiven >= rules.maxLaterSpecials[band]) return null;
  if (trigger === "day_start" && !rng.chance(rules.laterRoleChanceDayStart)) return null;
  if (trigger === "after_first_council" && !rng.chance(rules.laterRoleChanceAfterFirstCouncil)) return null;
  const alive = living(state);
  const packAlive = alive.filter((p) => p.faction === "pack").length;
  const ctx = { isStart: false, playerCount, aliveCount: alive.length, packAlive };
  const candidates = SPECIAL_ROLES.filter(
    (r) => isRoleEligible(r, ctx, state, rules) && recipientsFor(state, r).length > 0
  );
  const role = rng.weighted(candidates, (r) => rules.roleWeights[r]);
  if (!role) return null;
  const recipient = rng.pick(recipientsFor(state, role));
  return { playerId: recipient, role };
}
function assignStartRoles(playerIds, rules, rng) {
  const n = playerIds.length;
  const order = rng.shuffle(playerIds);
  const wolves = wolfCount(n, rules);
  const dist = startSpecialDistribution(n);
  const picked = rng.weighted(dist, (d) => d.weight);
  const chosen = [];
  let shadowWolf = false;
  for (let i = 0; i < picked.count; i++) {
    const ctx = {
      isStart: true,
      chosen,
      playerCount: n,
      aliveCount: n,
      packAlive: wolves
    };
    const options = SPECIAL_ROLES.filter((r) => isRoleEligible(r, ctx, null, rules));
    const role = rng.weighted(options, (r) => rules.roleWeights[r]);
    if (!role) break;
    chosen.push(role);
    if (role === "shadowwolf") shadowWolf = true;
  }
  const assignments = [];
  let cursor = 0;
  for (let i = 0; i < wolves; i++) {
    const id = order[cursor++];
    assignments.push({ playerId: id, role: i === 0 && shadowWolf ? "shadowwolf" : "wolf" });
  }
  for (const role of chosen) {
    if (role === "shadowwolf") continue;
    assignments.push({ playerId: order[cursor++], role });
  }
  while (cursor < order.length) assignments.push({ playerId: order[cursor++], role: "villager" });
  const startSpecials = chosen.length;
  return { assignments, startSpecials };
}

// packages/engine/src/content.ts
var QUESTS = [
  {
    id: "q-wer-von-euch-1",
    category: "assess",
    title: "Wer von euch \u2026",
    goal: "Findet heraus, wie gut ihr einander einsch\xE4tzt.",
    task: "Jemand liest \u201EWer von euch w\xFCrde bei Stromausfall als Erstes die Kerzen finden?\u201C vor. Alle zeigen gleichzeitig auf eine Person. Danach darf die gezeigte Person erkl\xE4ren, ob es stimmt.",
    finish: "Fertig, sobald alle ihre Einsch\xE4tzung erkl\xE4rt haben.",
    reward: "none"
  },
  {
    id: "q-wer-von-euch-2",
    category: "assess",
    title: "Der ruhigste Pol",
    goal: "Tippt, wer in diesem Raum am schwersten aus der Ruhe zu bringen ist.",
    task: "Jeder schreibt einen Namen auf einen Zettel oder merkt ihn sich. Dann nennt reihum, wen ihr gew\xE4hlt habt \u2013 und warum.",
    finish: "Fertig, wenn jede Begr\xFCndung geh\xF6rt wurde.",
    reward: "hint"
  },
  {
    id: "q-tabu-1",
    category: "taboo",
    title: "Ohne das Wort",
    goal: "Erkl\xE4rt einen Begriff, ohne ihn auszusprechen.",
    task: "Reihum zieht jemand im Kopf einen Alltagsgegenstand und erkl\xE4rt ihn der Gruppe, ohne dessen Namen oder Verwandte davon zu nennen. Wer das Wort r\xE4t, erkl\xE4rt als N\xE4chstes.",
    finish: "Fertig nach drei erratenen Begriffen oder Ablauf der Zeit.",
    reward: "none"
  },
  {
    id: "q-tabu-2",
    category: "taboo",
    title: "Verbotene Silbe",
    goal: "Haltet ein kurzes Gespr\xE4ch, ohne eine bestimmte Silbe zu benutzen.",
    task: "Das Dorf einigt sich auf ein h\xE4ufiges Wort (\u201Eja\u201C, \u201Enein\u201C oder \u201Eich\u201C). Zwei Minuten lang darf es niemand sagen. Wer es doch tut, sagt danach ein Geheimnis, das keines ist.",
    finish: "Fertig nach zwei Minuten.",
    reward: "none",
    durationMs: 4 * 6e4
  },
  {
    id: "q-koordination-1",
    category: "coordination",
    title: "Gleicher Gedanke",
    goal: "Findet ohne Absprache dieselbe Antwort.",
    task: "Alle denken sich gleichzeitig eine Farbe, eine Zahl von 1 bis 10 und ein Tier aus. Auf \u201EJetzt\u201C sagen alle laut ihre Antworten. Wie viele \xDCbereinstimmungen gibt es?",
    finish: "Fertig nach drei Runden. Ihr d\xFCrft nach jeder Runde nur schweigen und nicken.",
    reward: "role"
  },
  {
    id: "q-koordination-2",
    category: "coordination",
    title: "Im Takt",
    goal: "Bringt das Dorf in einen gemeinsamen Rhythmus.",
    task: "Ohne zu sprechen, versucht ihr, nacheinander von 1 bis zur Zahl der Mitspielenden zu z\xE4hlen. Wenn zwei gleichzeitig sprechen, beginnt ihr von vorn.",
    finish: "Fertig, sobald ihr einmal ohne \xDCberschneidung durchkommt \u2013 oder die Zeit abl\xE4uft.",
    reward: "none"
  },
  {
    id: "q-wissen-1",
    category: "shared_knowledge",
    title: "Was alle wissen",
    goal: "Findet heraus, was das Dorf gemeinsam wei\xDF.",
    task: "Sammelt zusammen zehn Dinge, die garantiert jede Person in diesem Raum kennt, aber keine Fremde kennen w\xFCrde.",
    finish: "Fertig bei zehn Dingen, die alle best\xE4tigen.",
    reward: "hint"
  },
  {
    id: "q-wissen-2",
    category: "shared_knowledge",
    title: "Orte und Wege",
    goal: "Beschreibt einen Ort, den alle schon gesehen haben.",
    task: "Reihum nennt jemand einen Satz \xFCber einen Ort, den alle kennen m\xFCssten. Der Ort darf nicht genannt werden. Sobald alle ihn erraten, beginnt ein neuer.",
    finish: "Fertig nach zwei Orten.",
    reward: "none"
  },
  {
    id: "q-sortieren-1",
    category: "sorting",
    title: "Aufgereiht",
    goal: "Stellt euch ohne zu sprechen in der richtigen Reihenfolge auf.",
    task: "Ordnet euch nach Geburtstag im Jahr, ohne zu sprechen. Zeigt, was ihr k\xF6nnt: Finger, Gesten, Blicke. Dann pr\xFCft laut.",
    finish: "Fertig, wenn alle die Reihenfolge laut best\xE4tigt haben.",
    reward: "none"
  },
  {
    id: "q-sortieren-2",
    category: "sorting",
    title: "Alles in Ordnung",
    goal: "Bringt Begriffe gemeinsam in eine Rangfolge.",
    task: "Einigt euch auf eine Rangfolge von f\xFCnf Dingen vom Allt\xE4glichsten zum Seltensten (z. B. Regenschirm, Fahrradschl\xFCssel, Briefmarke, Taschenlampe, Gummiente). Jeder darf einmal umstellen.",
    finish: "Fertig, wenn ihr eine Reihenfolge habt, mit der niemand laut widerspricht.",
    reward: "none"
  },
  {
    id: "q-gedaechtnis-1",
    category: "memory",
    title: "Wer sa\xDF wo?",
    goal: "Pr\xFCft, wie gut ihr euch den Abend gemerkt habt.",
    task: "Alle schlie\xDFen die Augen. Eine Person stellt drei Fragen zu dem, was heute im Raum zu sehen war (Kleidung, Gegenst\xE4nde, Sitzpl\xE4tze). Danach wird gemeinsam gepr\xFCft.",
    finish: "Fertig nach drei Fragen.",
    reward: "none"
  },
  {
    id: "q-gedaechtnis-2",
    category: "memory",
    title: "Die lange Kette",
    goal: "Baut zusammen eine Merkkette auf.",
    task: "Reihum wiederholt jede Person die bisherige Kette (\u201EIch packe in meinen Korb \u2026\u201C) und f\xFCgt einen Gegenstand hinzu. Wer sich verhaspelt, beginnt die n\xE4chste Runde.",
    finish: "Fertig nach zwei Runden oder wenn die Kette zehn Gegenst\xE4nde hat.",
    reward: "role"
  },
  {
    id: "q-geschick-1",
    category: "dexterity",
    title: "Ruhige Hand",
    goal: "Haltet etwas stabil, w\xE4hrend die anderen reden.",
    task: "Alle stapeln mit dem, was zur Hand ist (Bierdeckel, M\xFCnzen, L\xF6ffel), einen m\xF6glichst hohen Turm, w\xE4hrend sie dabei \xFCber ihren Tag erz\xE4hlen. Wessen Turm f\xE4llt, erz\xE4hlt eine Gegenfrage.",
    finish: "Fertig nach Ablauf der Zeit.",
    reward: "none"
  },
  {
    id: "q-geschick-2",
    category: "dexterity",
    title: "Die Kerze des Dorfes",
    goal: "Gebt etwas gemeinsam weiter, ohne dass es herunterf\xE4llt.",
    task: "Gebt einen L\xF6ffel mit einer M\xFCnze reihum, ohne dass die M\xFCnze f\xE4llt. W\xE4hrend der Weitergabe nennt jede Person eine Eigenschaft der n\xE4chsten.",
    finish: "Fertig, wenn die M\xFCnze einmal im Kreis ist.",
    reward: "hint"
  }
];
var IMPULSES = {
  "impulse.timing": "Wer zuerst schnell antwortet, hat nicht immer am meisten zu sagen.",
  "impulse.questions": "Achtet darauf, wer Fragen beantwortet \u2013 und wer sie nur weitergibt.",
  "impulse.agree": "Zustimmung kann Vertrauen sein. Oder Deckung.",
  "impulse.silence": "Schweigen f\xE4llt erst auf, wenn alle anderen reden.",
  "impulse.repeat": "Wer S\xE4tze wiederholt, die er eben geh\xF6rt hat, sucht oft Zeit.",
  "impulse.change": "Wenn jemand pl\xF6tzlich die Meinung \xE4ndert: Fragt nach dem Grund.",
  "impulse.eyes": "Blicke verraten nicht, ob jemand l\xFCgt. Aber, wen er im Blick beh\xE4lt.",
  "impulse.details": "Wahre Geschichten haben oft zu viele Details. Erfundene meist genau die richtigen.",
  "impulse.group": "Gruppen werden schneller laut, wenn sie sich unsicher sind.",
  "impulse.accuse": "Wer anklagt, braucht nur einen Satz. Wer sich verteidigt, braucht mehr.",
  "impulse.calm": "Ruhe ist ein Signal \u2013 in beide Richtungen.",
  "impulse.change-village": "Im Dorf hat sich etwas ver\xE4ndert. Schaut in euren privaten Bereich."
};
var NEUTRAL_CHANGE_IMPULSE = "impulse.change-village";
var HINT_IMPULSE_KEYS = Object.keys(IMPULSES).filter((k) => k !== NEUTRAL_CHANGE_IMPULSE);

// packages/engine/src/schedule.ts
function roundsLeft(nonPackAlive, packAlive) {
  return Math.max(1, Math.ceil((nonPackAlive - packAlive) / 2));
}
function planDay(opts) {
  const { now, targetEndsAt, nonPackAlive, packAlive, rules } = opts;
  const rounds = roundsLeft(nonPackAlive, packAlive);
  const remaining = Math.max(0, targetEndsAt - now);
  const roundLen = remaining / rounds;
  const overhead = rules.durations.nightMs + rules.durations.morningMs;
  const dayLen = Math.max(rules.evening.minDayMs, roundLen - overhead);
  const nightAt = now + dayLen;
  const councilBy = Math.max(now + 6e4, nightAt - rules.evening.councilBudgetMs);
  const span = councilBy - now;
  const q = Math.max(0, Math.min(rules.evening.maxQuestsPerDay, Math.floor(span / rules.evening.questSpacingMs)));
  const questTimes = [];
  for (let k = 1; k <= q; k++) questTimes.push(Math.round(now + span * k / (q + 1)));
  return { nightAt, councilBy, questTimes };
}

// packages/engine/src/engine.ts
var Fail = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  code;
};
var fail = (code, message) => {
  throw new Fail(code, message);
};
var livingPlayers = (s) => Object.values(s.players).filter((p) => p.alive);
var livingIds = (s) => livingPlayers(s).map((p) => p.id);
var isAlive = (s, id) => !!id && !!s.players[id]?.alive;
function checkWin(s) {
  const alive = livingPlayers(s);
  const pack = alive.filter((p) => p.faction === "pack").length;
  const others = alive.length - pack;
  if (pack === 0) return "village";
  if (pack >= others) return "pack";
  return null;
}
function pushEvent(s, ctx, kind, players, data) {
  const ev = { id: s.nextEventId++, day: s.day, at: ctx.now, kind };
  if (players) ev.players = players;
  if (data) ev.data = data;
  s.events.push(ev);
}
function addNote(s, id, day, kind, data) {
  (s.notes[id] ??= []).push({ id: s.nextNoteId++, day, kind, data });
}
function freshUses(role, s) {
  return {
    scout: role === "scout" ? s.rules.scoutUses : 0,
    tracker: role === "tracker" ? s.rules.trackerUses : 0,
    alchemistProtect: role === "alchemist" ? 1 : 0,
    alchemistStrike: role === "alchemist" ? 1 : 0,
    shadowVeil: role === "shadowwolf" ? 1 : 0
  };
}
function setRole(s, id, role, day) {
  const p = s.players[id];
  p.role = role;
  p.faction = ROLES[role].faction;
  p.roleSince = day;
  p.uses = freshUses(role, s);
  p.sidePending = role === "borderwalker";
}
function setImpulse(s, ctx, kind) {
  let textKey;
  if (kind === "change") {
    textKey = NEUTRAL_CHANGE_IMPULSE;
  } else {
    const unused = HINT_IMPULSE_KEYS.filter((k) => !s.usedImpulseKeys.includes(k));
    const pool = unused.length > 0 ? unused : HINT_IMPULSE_KEYS;
    if (unused.length === 0) s.usedImpulseKeys = [];
    textKey = ctx.rng.pick(pool);
    s.usedImpulseKeys.push(textKey);
  }
  s.impulse = { id: (s.impulse?.id ?? 0) + 1, kind, textKey, at: ctx.now, showUntil: ctx.now + s.rules.durations.impulseMs };
  pushEvent(s, ctx, "impulse", void 0, { kind });
}
function applySpawn(s, ctx, trigger) {
  const a = maybeSpawnRole(s, trigger, ctx.rng);
  if (!a) return;
  setRole(s, a.playerId, a.role, s.day);
  addNote(s, a.playerId, s.day, "role_gained", { role: a.role });
  setImpulse(s, ctx, "change");
}
function eliminate(s, ctx, id) {
  const p = s.players[id];
  if (!p || !p.alive) return;
  p.alive = false;
  p.eliminatedDay = s.day;
  s.readyCouncil = s.readyCouncil.filter((x) => x !== id);
  s.readyAdvance = s.readyAdvance.filter((x) => x !== id);
  delete s.nightActions[id];
  delete s.packVotes[id];
  for (const [voter, target] of Object.entries(s.packVotes)) if (target === id) delete s.packVotes[voter];
  if (s.speakerId === id) s.speakerId = null;
  if (p.role === "hunter") s.hunterShots[id] = null;
}
function createGame(input) {
  const rules = mergeRules(input.rules);
  const n = input.roster.length;
  if (n < rules.minPlayers || n > rules.maxPlayers) {
    throw new Error(`Spielerzahl ${n} au\xDFerhalb von ${rules.minPlayers}\u2013${rules.maxPlayers}`);
  }
  if (new Set(input.roster.map((r) => r.id)).size !== n) throw new Error("Doppelte Spieler-IDs");
  if (!input.roster.some((r) => r.id === input.hostId)) throw new Error("Host ist kein Spieler");
  const rng = new Rng(seedToState(input.seed));
  const ids = input.roster.map((r) => r.id);
  const { assignments, startSpecials } = assignStartRoles(ids, rules, rng);
  const seats = rng.shuffle(ids);
  const s = {
    schema: 1,
    mode: input.mode,
    rules,
    rng: rng.state(),
    hostId: input.hostId,
    startedAt: input.now,
    targetEndsAt: input.mode === "evening" ? input.now + Math.max(30, input.targetMinutes ?? 180) * 6e4 : null,
    day: 0,
    phase: { kind: "ended" },
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
    startSpecials,
    firstCouncilDone: false,
    impulse: null,
    events: [],
    nextEventId: 1,
    nextNoteId: 1,
    winner: null
  };
  for (const r of input.roster) {
    const p = {
      id: r.id,
      name: r.name,
      seat: seats.indexOf(r.id),
      alive: true,
      role: "villager",
      faction: "village",
      roleSince: 1,
      uses: freshUses("villager", s),
      lastProtected: null,
      sidePending: false,
      eliminatedDay: null
    };
    s.players[r.id] = p;
  }
  for (const a of assignments) setRole(s, a.playerId, a.role, 1);
  for (const p of Object.values(s.players)) addNote(s, p.id, 1, "role", { role: p.role });
  const ctx = { now: input.now, rng };
  pushEvent(s, ctx, "game_started");
  setImpulse(s, ctx, "change");
  startDay(s, ctx);
  s.rng = rng.state();
  return s;
}
function startDay(s, ctx) {
  s.day += 1;
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  s.packVotes = {};
  if (s.speakerId === null) {
    s.phase = { kind: "speaker_election", votes: {}, endsAt: ctx.now + s.rules.durations.speakerElectionMs };
    return;
  }
  beginDayPhase(s, ctx);
}
function beginDayPhase(s, ctx) {
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  if (s.day >= 2) applySpawn(s, ctx, "day_start");
  let councilBy = null;
  let nightAt = null;
  let questTimes;
  if (s.mode === "evening" && s.targetEndsAt !== null) {
    const alive = livingPlayers(s);
    const pack = alive.filter((p) => p.faction === "pack").length;
    const plan = planDay({
      now: ctx.now,
      targetEndsAt: s.targetEndsAt,
      nonPackAlive: alive.length - pack,
      packAlive: pack,
      rules: s.rules
    });
    councilBy = plan.councilBy;
    nightAt = plan.nightAt;
    questTimes = plan.questTimes;
  } else {
    questTimes = [ctx.now + 2e4];
  }
  s.phase = {
    kind: "day",
    startedAt: ctx.now,
    councilBy,
    nightAt,
    quest: null,
    questTimes,
    councilQueued: false
  };
}
function resolveElection(s, ctx) {
  if (s.phase.kind !== "speaker_election") return;
  const living2 = livingIds(s);
  const counts = {};
  for (const [voter, target] of Object.entries(s.phase.votes)) {
    if (isAlive(s, voter) && isAlive(s, target)) counts[target] = (counts[target] ?? 0) + 1;
  }
  let winners;
  const top = Math.max(0, ...Object.values(counts));
  if (top === 0) winners = living2;
  else winners = Object.keys(counts).filter((id) => counts[id] === top);
  const speaker = winners.length === 1 ? winners[0] : ctx.rng.pick(winners);
  s.speakerId = speaker;
  pushEvent(s, ctx, "speaker_elected", [speaker]);
  beginDayPhase(s, ctx);
}
function startQuest(s, ctx) {
  if (s.phase.kind !== "day") return;
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
    doneBy: []
  };
  pushEvent(s, ctx, "quest_started", void 0, { questId: def.id });
}
function endQuest(s, ctx) {
  if (s.phase.kind !== "day" || !s.phase.quest) return;
  const questId = s.phase.quest.id;
  const def = QUESTS.find((q) => q.id === questId);
  s.phase.quest = null;
  pushEvent(s, ctx, "quest_ended", void 0, { questId: def?.id });
  if (def?.reward === "role") applySpawn(s, ctx, "quest_reward");
  else if (def?.reward === "hint") setImpulse(s, ctx, "hint");
}
function startCouncil(s, ctx) {
  const nightAt = s.phase.kind === "day" ? s.phase.nightAt : null;
  const council = {
    step: "nomination",
    endsAt: ctx.now + s.rules.durations.nominationMs,
    nominations: {},
    candidates: [],
    votes: {},
    revealAt: null,
    tally: null,
    tied: null,
    banished: null,
    decidedByTiebreak: false
  };
  s.phase = { kind: "council", council, nightAt };
  s.readyCouncil = [];
  s.readyAdvance = [];
  s.majorityAt = null;
  pushEvent(s, ctx, "council_started");
}
function computeCandidates(s, c) {
  const counts = {};
  for (const [voter, target] of Object.entries(c.nominations)) {
    if (isAlive(s, voter) && isAlive(s, target)) counts[target] = (counts[target] ?? 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return livingIds(s);
  const cut = ranked[Math.min(2, ranked.length - 1)][1];
  return ranked.filter(([, n]) => n >= cut).map(([id]) => id);
}
function banish(s, ctx, id, byTiebreak) {
  if (s.phase.kind !== "council") return;
  const c = s.phase.council;
  c.banished = id;
  c.decidedByTiebreak = byTiebreak;
  c.step = "result";
  c.endsAt = ctx.now + s.rules.durations.resultMs;
  eliminate(s, ctx, id);
  pushEvent(s, ctx, "banished", [id], { tally: c.tally ?? void 0, tiebreak: byTiebreak });
}
function tallyVotes(s, c) {
  const tally = {};
  for (const cand of c.candidates) tally[cand] = 0;
  for (const [voter, target] of Object.entries(c.votes)) {
    if (isAlive(s, voter) && c.candidates.includes(target)) tally[target] = (tally[target] ?? 0) + 1;
  }
  return tally;
}
function stepCouncil(s, ctx, force) {
  if (s.phase.kind !== "council") return false;
  const c = s.phase.council;
  const { now } = ctx;
  const d = s.rules.durations;
  const living2 = livingIds(s);
  switch (c.step) {
    case "nomination": {
      const all = living2.every((id) => c.nominations[id]);
      if (!(all || now >= c.endsAt || force)) return false;
      c.candidates = computeCandidates(s, c);
      pushEvent(s, ctx, "candidates", c.candidates);
      c.step = "defense";
      c.endsAt = now + d.defenseMs;
      return true;
    }
    case "defense": {
      if (!(now >= c.endsAt || force)) return false;
      if (c.candidates.length === 1) {
        c.tally = { [c.candidates[0]]: 0 };
        banish(s, ctx, c.candidates[0], false);
        return true;
      }
      c.step = "voting";
      c.endsAt = now + d.votingMs;
      return true;
    }
    case "voting": {
      const all = living2.every((id) => c.votes[id]);
      if (!(all || now >= c.endsAt || force)) return false;
      c.step = "showdown";
      c.revealAt = now + d.countdownMs;
      c.endsAt = c.revealAt + d.pointingMs;
      return true;
    }
    case "showdown": {
      if (!(now >= c.endsAt || force)) return false;
      const tally = tallyVotes(s, c);
      c.tally = tally;
      const top = Math.max(0, ...Object.values(tally));
      const leaders = c.candidates.filter((id) => tally[id] === top);
      if (top === 0) {
        banish(s, ctx, ctx.rng.pick(c.candidates), false);
        return true;
      }
      if (leaders.length === 1) {
        banish(s, ctx, leaders[0], false);
        return true;
      }
      c.tied = leaders;
      if (s.speakerId && isAlive(s, s.speakerId)) {
        c.step = "tiebreak";
        c.endsAt = now + d.tiebreakMs;
      } else {
        banish(s, ctx, ctx.rng.pick(leaders), true);
      }
      return true;
    }
    case "tiebreak": {
      if (!(now >= c.endsAt || force)) return false;
      banish(s, ctx, ctx.rng.pick(c.tied ?? c.candidates), true);
      return true;
    }
    case "result": {
      if (!(now >= c.endsAt || force)) return false;
      proceed(s, ctx, "after_council");
      return true;
    }
  }
}
function applyHunterShots(s, ctx) {
  for (const [hunterId, target] of Object.entries(s.hunterShots)) {
    if (target && isAlive(s, target)) {
      eliminate(s, ctx, target);
      pushEvent(s, ctx, "last_shot", [hunterId, target]);
    }
  }
  s.hunterShots = {};
}
function proceed(s, ctx, which) {
  applyHunterShots(s, ctx);
  const winner = checkWin(s);
  if (winner) {
    s.winner = winner;
    s.phase = { kind: "ended" };
    pushEvent(s, ctx, "game_ended", void 0, { winner });
    return;
  }
  if (which === "after_council") {
    const nightAt = s.phase.kind === "council" ? s.phase.nightAt : null;
    if (!s.firstCouncilDone) {
      s.firstCouncilDone = true;
      applySpawn(s, ctx, "after_first_council");
    }
    s.readyAdvance = [];
    s.majorityAt = null;
    s.phase = { kind: "dusk", startedAt: ctx.now, nightAt };
  } else {
    startDay(s, ctx);
  }
}
function startNight(s, ctx) {
  for (const p of Object.values(s.players)) if (p.alive && p.sidePending) p.sidePending = false;
  s.readyAdvance = [];
  s.readyCouncil = [];
  s.majorityAt = null;
  s.nightActions = {};
  s.phase = { kind: "night", startedAt: ctx.now, endsAt: ctx.now + s.rules.durations.nightMs };
  pushEvent(s, ctx, "night_began");
}
function resolvePackTarget(s, ctx) {
  const counts = {};
  for (const [voter, target] of Object.entries(s.packVotes)) {
    const v = s.players[voter];
    const t = s.players[target];
    if (v?.alive && v.faction === "pack" && t?.alive && t.faction !== "pack") counts[target] = (counts[target] ?? 0) + 1;
  }
  const top = Math.max(0, ...Object.values(counts));
  if (top > 0) {
    const leaders = Object.keys(counts).filter((id) => counts[id] === top);
    return leaders.length === 1 ? leaders[0] : ctx.rng.pick(leaders);
  }
  const options = livingPlayers(s).filter((p) => p.faction !== "pack");
  return options.length ? ctx.rng.pick(options).id : null;
}
function resolveNight(s, ctx) {
  const day = s.day;
  const actions = s.nightActions;
  const target = resolvePackTarget(s, ctx);
  let veiled = false;
  for (const [id, a] of Object.entries(actions)) {
    const p = s.players[id];
    if (a.kind === "veil" && p?.alive && p.role === "shadowwolf" && p.uses.shadowVeil > 0) {
      p.uses.shadowVeil -= 1;
      veiled = true;
    }
  }
  const protectedIds = /* @__PURE__ */ new Set();
  const strikeIds = [];
  for (const [id, a] of Object.entries(actions)) {
    const p = s.players[id];
    if (!p || !p.alive) continue;
    switch (a.kind) {
      case "scout": {
        if (p.role !== "scout" || p.uses.scout <= 0) break;
        p.uses.scout -= 1;
        const t = s.players[a.target];
        addNote(s, id, day, "scout_result", veiled || !t ? { target: a.target, unclear: true } : { target: a.target, faction: t.faction });
        break;
      }
      case "track": {
        if (p.role !== "tracker" || p.uses.tracker <= 0) break;
        p.uses.tracker -= 1;
        const hasWolf = a.targets.some((tid) => s.players[tid]?.faction === "pack");
        addNote(s, id, day, "track_result", veiled ? { targets: a.targets, unclear: true } : { targets: a.targets, packPresent: hasWolf });
        break;
      }
      case "protect": {
        if (p.role !== "guardian") break;
        protectedIds.add(a.target);
        p.lastProtected = a.target;
        break;
      }
      case "alchemist": {
        if (p.role !== "alchemist") break;
        if (a.protect && p.uses.alchemistProtect > 0) {
          p.uses.alchemistProtect -= 1;
          protectedIds.add(a.protect);
        }
        if (a.strike && p.uses.alchemistStrike > 0) {
          p.uses.alchemistStrike -= 1;
          strikeIds.push(a.strike);
        }
        break;
      }
      default:
        break;
    }
  }
  for (const p of Object.values(s.players)) {
    if (p.role === "guardian" && p.alive && actions[p.id]?.kind !== "protect") p.lastProtected = null;
  }
  const deaths = [];
  if (target && isAlive(s, target) && !protectedIds.has(target)) deaths.push(target);
  for (const t of strikeIds) if (isAlive(s, t) && !deaths.includes(t)) deaths.push(t);
  s.nightActions = {};
  s.packVotes = {};
  s.readyAdvance = [];
  s.majorityAt = null;
  for (const id of deaths) {
    eliminate(s, ctx, id);
    pushEvent(s, ctx, "eliminated", [id], { how: "night" });
  }
  pushEvent(s, ctx, "morning", deaths);
  s.phase = {
    kind: "morning",
    startedAt: ctx.now,
    endsAt: ctx.now + s.rules.durations.morningMs,
    deaths
  };
}
function quorum(s, ctx, list, graceMs) {
  const living2 = livingIds(s);
  const ready = list.filter((id) => living2.includes(id));
  if (living2.length > 0 && ready.length === living2.length) return true;
  if (ready.length * 2 > living2.length) {
    if (s.majorityAt === null) s.majorityAt = ctx.now;
    return ctx.now - s.majorityAt >= graceMs;
  }
  s.majorityAt = null;
  return false;
}
function councilReadyFlag(s) {
  const living2 = livingIds(s);
  const ready = s.readyCouncil.filter((id) => living2.includes(id));
  return ready.length * 2 > living2.length;
}
function step(s, ctx, force) {
  const { now } = ctx;
  const d = s.rules.durations;
  const phase = s.phase;
  switch (phase.kind) {
    case "speaker_election": {
      const living2 = livingIds(s);
      const all = living2.every((id) => phase.votes[id]);
      if (!(all || now >= phase.endsAt || force)) return false;
      resolveElection(s, ctx);
      return true;
    }
    case "day": {
      const quest = phase.quest;
      const living2 = livingIds(s);
      if (quest) {
        const done = living2.every((id) => quest.doneBy.includes(id));
        if (done || now >= quest.endsAt || force) {
          endQuest(s, ctx);
          return true;
        }
      }
      const councilDue = force || phase.councilQueued || phase.councilBy !== null && now >= phase.councilBy || s.mode === "classic" && quorum(s, ctx, s.readyCouncil, d.confirmGraceMs);
      if (councilDue) {
        if (phase.quest && !force) {
          phase.councilQueued = true;
          return false;
        }
        startCouncil(s, ctx);
        return true;
      }
      if (!phase.quest && phase.questTimes.length > 0 && now >= phase.questTimes[0]) {
        startQuest(s, ctx);
        return true;
      }
      return false;
    }
    case "council":
      return stepCouncil(s, ctx, force);
    case "dusk": {
      const due = force || phase.nightAt !== null && now >= phase.nightAt || quorum(s, ctx, s.readyAdvance, d.confirmGraceMs);
      if (!due) return false;
      startNight(s, ctx);
      return true;
    }
    case "night": {
      if (!(now >= phase.endsAt || force)) return false;
      resolveNight(s, ctx);
      return true;
    }
    case "morning": {
      const due = force || now >= phase.endsAt && (s.mode === "evening" || quorum(s, ctx, s.readyAdvance, d.confirmGraceMs));
      if (!due) return false;
      proceed(s, ctx, "after_night");
      return true;
    }
    case "ended":
      return false;
  }
}
function settle(s, ctx, force = false) {
  let guard = 0;
  let first = true;
  while (guard++ < 24 && step(s, ctx, force && first)) first = false;
}
function requirePlayer(s, id) {
  const p = s.players[id];
  if (!p) return fail("not_a_player", "Unbekannter Spieler");
  return p;
}
function requireAlive(s, id) {
  const p = requirePlayer(s, id);
  if (!p.alive) fail("not_alive", "Ausgeschiedene Spieler sind aus dem aktiven Spiel raus");
  return p;
}
function requireLivingTarget(s, target, opts = {}) {
  const t = s.players[target];
  if (!t || !t.alive) return fail("invalid_target", "Ziel muss ein lebender Spieler sein");
  if (opts.not === target) fail("invalid_target", "Dieses Ziel ist nicht erlaubt");
  return t;
}
function applyNightAction(s, actor, a) {
  if (s.phase.kind !== "night") fail("wrong_phase", "Nachtaktionen gibt es nur nachts");
  switch (a.kind) {
    case "scout": {
      if (actor.role !== "scout") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (actor.uses.scout <= 0) fail("no_uses_left", "Keine Nutzungen \xFCbrig");
      requireLivingTarget(s, a.target, { not: actor.id });
      break;
    }
    case "track": {
      if (actor.role !== "tracker") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (actor.uses.tracker <= 0) fail("no_uses_left", "Keine Nutzungen \xFCbrig");
      const targets = [...new Set(a.targets)];
      const others = livingPlayers(s).filter((p) => p.id !== actor.id).length;
      const size = Math.min(s.rules.trackGroupSize, others);
      if (targets.length !== size || targets.length !== a.targets.length) {
        fail("invalid_target", `W\xE4hle genau ${size} verschiedene Personen`);
      }
      for (const t of targets) requireLivingTarget(s, t, { not: actor.id });
      break;
    }
    case "protect": {
      if (actor.role !== "guardian") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      requireLivingTarget(s, a.target);
      if (actor.lastProtected === a.target) fail("invalid_target", "Dieselbe Person nicht zwei N\xE4chte in Folge");
      break;
    }
    case "alchemist": {
      if (actor.role !== "alchemist") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (!a.protect && !a.strike) fail("invalid_command", "Keine Wirkung gew\xE4hlt");
      if (a.protect) {
        if (actor.uses.alchemistProtect <= 0) fail("no_uses_left", "Dieser Trank ist verbraucht");
        requireLivingTarget(s, a.protect);
      }
      if (a.strike) {
        if (actor.uses.alchemistStrike <= 0) fail("no_uses_left", "Dieser Trank ist verbraucht");
        requireLivingTarget(s, a.strike, { not: actor.id });
      }
      break;
    }
    case "veil": {
      if (actor.role !== "shadowwolf") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (actor.uses.shadowVeil <= 0) fail("no_uses_left", "Bereits benutzt");
      break;
    }
    default:
      fail("invalid_command", "Unbekannte Aktion");
  }
  s.nightActions[actor.id] = a;
}
function execute(s, actorId, cmd, ctx) {
  if (cmd.type === "tick") {
    if (cmd.force) {
      if (actorId !== "system" && actorId !== s.hostId) fail("not_allowed", "Nur der technische Host darf fortsetzen");
      settle(s, ctx, true);
      return;
    }
    if (actorId !== "system") requirePlayer(s, actorId);
    return;
  }
  if (actorId === "system") fail("not_allowed", "Befehl nur f\xFCr Spieler");
  const actor = requirePlayer(s, actorId);
  if (cmd.type === "hunter_shoot") {
    const hp = s.phase;
    const windowOpen = hp.kind === "council" && hp.council.step === "result" || hp.kind === "morning";
    if (!windowOpen || !(actor.id in s.hunterShots)) return fail("wrong_phase", "Kein letzter Schuss m\xF6glich");
    requireLivingTarget(s, cmd.target);
    s.hunterShots[actor.id] = cmd.target;
    return;
  }
  requireAlive(s, actor.id);
  switch (cmd.type) {
    case "ready": {
      if (cmd.topic === "council") {
        if (s.phase.kind !== "day") fail("wrong_phase", "Bereitschaft f\xFCr den Dorfrat gibt es nur am Tag");
        const before = councilReadyFlag(s);
        s.readyCouncil = s.readyCouncil.filter((id) => id !== actor.id);
        if (cmd.value) s.readyCouncil.push(actor.id);
        if (!before && councilReadyFlag(s)) pushEvent(s, ctx, "council_ready");
      } else {
        const ok = s.phase.kind === "dusk" || s.phase.kind === "morning" && s.mode === "classic";
        if (!ok) fail("wrong_phase", "Hier gibt es nichts zu best\xE4tigen");
        s.readyAdvance = s.readyAdvance.filter((id) => id !== actor.id);
        if (cmd.value) s.readyAdvance.push(actor.id);
      }
      return;
    }
    case "start_council": {
      const dp = s.phase;
      if (dp.kind !== "day") return fail("wrong_phase", "Der Dorfrat kann jetzt nicht beginnen");
      if (!councilReadyFlag(s)) fail("not_allowed", "Das Dorf ist noch nicht bereit f\xFCr einen Dorfrat");
      if (dp.quest) dp.councilQueued = true;
      else startCouncil(s, ctx);
      return;
    }
    case "quest_done": {
      const qp = s.phase;
      if (qp.kind !== "day" || !qp.quest) return fail("wrong_phase", "Gerade l\xE4uft keine Quest");
      const q = qp.quest;
      if (!q.doneBy.includes(actor.id)) q.doneBy.push(actor.id);
      return;
    }
    case "vote_speaker": {
      const ep = s.phase;
      if (ep.kind !== "speaker_election") return fail("wrong_phase", "Keine Dorfsprecher-Wahl");
      requireLivingTarget(s, cmd.target, { not: actor.id });
      if (ep.votes[actor.id]) fail("already_decided", "Deine Stimme ist bereits gesetzt");
      ep.votes[actor.id] = cmd.target;
      return;
    }
    case "nominate": {
      const np = s.phase;
      if (np.kind !== "council" || np.council.step !== "nomination") return fail("wrong_phase", "Jetzt wird nicht nominiert");
      requireLivingTarget(s, cmd.target, { not: actor.id });
      np.council.nominations[actor.id] = cmd.target;
      return;
    }
    case "vote": {
      const vp = s.phase;
      if (vp.kind !== "council" || vp.council.step !== "voting") return fail("wrong_phase", "Jetzt wird nicht abgestimmt");
      const c = vp.council;
      if (!c.candidates.includes(cmd.target)) fail("invalid_target", "Diese Person steht nicht zur Wahl");
      if (cmd.target === actor.id) fail("invalid_target", "Du kannst nicht f\xFCr dich selbst stimmen");
      if (c.votes[actor.id]) fail("already_decided", "Deine Stimme ist gesetzt und verbindlich");
      c.votes[actor.id] = cmd.target;
      return;
    }
    case "decide_tie": {
      const tp = s.phase;
      if (tp.kind !== "council" || tp.council.step !== "tiebreak") return fail("wrong_phase", "Kein Gleichstand zu entscheiden");
      if (s.speakerId !== actor.id) fail("not_allowed", "Nur der Dorfsprecher entscheidet");
      const c = tp.council;
      if (!c.tied?.includes(cmd.target)) fail("invalid_target", "Nur gleichplatzierte Kandidaten sind w\xE4hlbar");
      banish(s, ctx, cmd.target, true);
      return;
    }
    case "pack_target": {
      if (actor.faction !== "pack") fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (s.phase.kind !== "day" && s.phase.kind !== "dusk" && s.phase.kind !== "night") {
        fail("wrong_phase", "Jetzt kann kein Ziel gew\xE4hlt werden");
      }
      const t = requireLivingTarget(s, cmd.target);
      if (t.faction === "pack") fail("invalid_target", "Das Ziel darf nicht zum Rudel geh\xF6ren");
      s.packVotes[actor.id] = cmd.target;
      return;
    }
    case "night_action": {
      applyNightAction(s, actor, cmd.action);
      return;
    }
    case "choose_side": {
      if (actor.role !== "borderwalker" || !actor.sidePending) fail("not_allowed", "Keine Wahl offen");
      if (s.phase.kind === "night" || s.phase.kind === "ended") fail("wrong_phase", "Zu sp\xE4t f\xFCr diese Wahl");
      actor.sidePending = false;
      actor.faction = cmd.side;
      return;
    }
    default:
      fail("invalid_command", "Unbekannter Befehl");
  }
}
function applyCommand(state, actor, cmd, now) {
  const s = JSON.parse(JSON.stringify(state));
  const ctx = { now, rng: new Rng(s.rng) };
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
function tick(state, now, opts = {}) {
  const r = applyCommand(state, "system", { type: "tick", force: opts.force }, now);
  if (!r.ok) throw new Error(r.error.message);
  return r.state;
}
function nextDeadline(s) {
  const p = s.phase;
  switch (p.kind) {
    case "speaker_election":
    case "night":
      return p.endsAt;
    case "morning":
      return p.endsAt;
    case "council":
      return p.council.endsAt;
    case "dusk":
      return p.nightAt;
    case "day": {
      const t = [p.councilBy, p.quest?.endsAt, p.quest ? null : p.questTimes[0]].filter((x) => typeof x === "number");
      return t.length ? Math.min(...t) : null;
    }
    case "ended":
      return null;
  }
}

// packages/engine/src/views.ts
function publicView(s) {
  const living2 = livingPlayers(s);
  const p = s.phase;
  let phaseEndsAt = null;
  let nightAt = null;
  let council = null;
  let quest = null;
  let electionProgress = null;
  let advance = null;
  let morningDeaths = null;
  switch (p.kind) {
    case "speaker_election":
      phaseEndsAt = p.endsAt;
      electionProgress = {
        cast: Object.keys(p.votes).filter((id) => s.players[id]?.alive).length,
        total: living2.length
      };
      break;
    case "day":
      phaseEndsAt = p.councilBy;
      nightAt = p.nightAt;
      if (p.quest) quest = { id: p.quest.id, endsAt: p.quest.endsAt, doneCount: p.quest.doneBy.length };
      break;
    case "council": {
      const c = p.council;
      nightAt = p.nightAt;
      phaseEndsAt = c.endsAt;
      const cast = c.step === "nomination" ? Object.keys(c.nominations).filter((id) => s.players[id]?.alive).length : Object.keys(c.votes).filter((id) => s.players[id]?.alive).length;
      council = {
        step: c.step,
        endsAt: c.endsAt,
        candidates: c.candidates,
        progress: c.step === "nomination" || c.step === "voting" ? { cast, total: living2.length } : null,
        revealAt: c.revealAt,
        tally: c.step === "tiebreak" || c.step === "result" ? c.tally : null,
        tied: c.step === "tiebreak" ? c.tied : null,
        banished: c.step === "result" ? c.banished : null,
        decidedByTiebreak: c.step === "result" ? c.decidedByTiebreak : false
      };
      break;
    }
    case "dusk":
      nightAt = p.nightAt;
      phaseEndsAt = p.nightAt;
      advance = {
        ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length,
        total: living2.length
      };
      break;
    case "night":
      phaseEndsAt = p.endsAt;
      break;
    case "morning":
      phaseEndsAt = p.endsAt;
      morningDeaths = p.deaths;
      if (s.mode === "classic") {
        advance = {
          ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length,
          total: living2.length
        };
      }
      break;
    case "ended":
      break;
  }
  return {
    schema: 1,
    mode: s.mode,
    day: s.day,
    phase: p.kind,
    phaseEndsAt,
    nightAt,
    players: Object.values(s.players).sort((a, b) => a.seat - b.seat).map((pl) => ({
      id: pl.id,
      name: pl.name,
      seat: pl.seat,
      alive: pl.alive,
      isSpeaker: s.speakerId === pl.id
    })),
    livingCount: living2.length,
    speakerId: s.speakerId,
    quest,
    councilReady: p.kind === "day" ? councilReadyFlag(s) : false,
    advance,
    electionProgress,
    morningDeaths,
    council,
    impulse: s.impulse,
    events: s.events.slice(-60),
    winner: p.kind === "ended" ? s.winner : null,
    reveal: p.kind === "ended" ? Object.values(s.players).map((pl) => ({ id: pl.id, role: pl.role, faction: pl.faction })) : null
  };
}
function privateView(s, id) {
  const me = s.players[id];
  if (!me) return null;
  const alive = livingPlayers(s);
  const others = alive.filter((p) => p.id !== id).map((p) => p.id);
  const isPack = me.alive && me.faction === "pack";
  let nightAction = null;
  if (s.phase.kind === "night" && me.alive) {
    switch (me.role) {
      case "scout":
        if (me.uses.scout > 0) nightAction = { kind: "scout", targets: others, usesLeft: me.uses.scout };
        break;
      case "tracker":
        if (me.uses.tracker > 0)
          nightAction = {
            kind: "track",
            targets: others,
            groupSize: Math.min(s.rules.trackGroupSize, others.length),
            usesLeft: me.uses.tracker
          };
        break;
      case "guardian":
        nightAction = { kind: "protect", targets: alive.map((p) => p.id), forbidden: me.lastProtected };
        break;
      case "alchemist":
        if (me.uses.alchemistProtect > 0 || me.uses.alchemistStrike > 0)
          nightAction = {
            kind: "alchemist",
            targets: alive.map((p) => p.id),
            protectLeft: me.uses.alchemistProtect,
            strikeLeft: me.uses.alchemistStrike
          };
        break;
      case "shadowwolf":
        if (me.uses.shadowVeil > 0) nightAction = { kind: "veil", usesLeft: me.uses.shadowVeil };
        break;
      default:
        break;
    }
  }
  let packTarget = null;
  if (isPack) {
    const counts = {};
    for (const [voter, target] of Object.entries(s.packVotes)) {
      if (s.players[voter]?.alive && s.players[voter]?.faction === "pack" && s.players[target]?.alive) {
        counts[target] = (counts[target] ?? 0) + 1;
      }
    }
    const top = Math.max(0, ...Object.values(counts));
    packTarget = {
      mine: s.packVotes[id] && s.players[s.packVotes[id]]?.alive ? s.packVotes[id] : null,
      candidates: alive.filter((p) => p.faction !== "pack").map((p) => p.id),
      leading: top > 0 ? Object.keys(counts).filter((k) => counts[k] === top) : []
    };
  }
  const phase = s.phase;
  let lastShot = null;
  if (!me.alive && id in s.hunterShots) {
    const open = phase.kind === "council" && phase.council.step === "result" || phase.kind === "morning";
    lastShot = { open, targets: alive.map((p) => p.id), chosen: s.hunterShots[id] ?? null };
  }
  let myBallot = null;
  if (phase.kind === "speaker_election") myBallot = phase.votes[id] ?? null;
  if (phase.kind === "council") {
    myBallot = (phase.council.step === "nomination" ? phase.council.nominations[id] : phase.council.votes[id]) ?? null;
  }
  return {
    schema: 1,
    playerId: id,
    alive: me.alive,
    role: me.role,
    faction: me.faction,
    packMates: isPack ? Object.values(s.players).filter((p) => p.faction === "pack" && p.id !== id).map((p) => ({ id: p.id, name: p.name, alive: p.alive })) : [],
    hasPackChannel: isPack,
    packTarget,
    notes: s.notes[id] ?? [],
    nightAction,
    currentNightChoice: s.nightActions[id] ?? null,
    sidePending: me.alive && me.sidePending,
    lastShot,
    readyCouncil: s.readyCouncil.includes(id),
    readyAdvance: s.readyAdvance.includes(id),
    myBallot
  };
}
function packChannelMembers(s) {
  return livingPlayers(s).filter((p) => p.faction === "pack").map((p) => p.id);
}

// packages/server/src/game.ts
var MAX_RETRIES = 30;
function buildPayload(state) {
  const priv = {};
  for (const id of Object.keys(state.players)) {
    const v = privateView(state, id);
    if (v) priv[id] = v;
  }
  return {
    state,
    public: publicView(state),
    private: priv,
    packMembers: packChannelMembers(state),
    alive: Object.values(state.players).filter((p) => p.alive).map((p) => p.id),
    nextDeadlineMs: nextDeadline(state),
    status: state.phase.kind === "ended" ? "ended" : "running"
  };
}
var err = (code, message) => ({ ok: false, code, message });
async function startGame(store, input) {
  const loaded = await store.load(input.roomId);
  if (!loaded) return err("room_not_found", "Raum nicht gefunden");
  if (loaded.room.host_user_id !== input.userId) return err("not_host", "Nur der Host startet das Spiel");
  if (loaded.room.status !== "lobby") return err("game_already_started", "Das Spiel l\xE4uft bereits");
  if (!loaded.players.every((p) => p.ready)) return err("not_all_ready", "Noch nicht alle sind bereit");
  const host = loaded.players.find((p) => p.user_id === input.userId);
  if (!host) return err("not_host", "Host ist kein Spieler");
  let state;
  try {
    state = createGame({
      roster: loaded.players.map((p) => ({ id: p.id, name: p.name })),
      hostId: host.id,
      mode: loaded.room.mode,
      targetMinutes: loaded.room.target_minutes ?? void 0,
      seed: input.seed,
      now: input.now
    });
  } catch (e) {
    return err("invalid_roster", e instanceof Error ? e.message : "Ung\xFCltige Spielerzahl");
  }
  const payload = buildPayload(state);
  try {
    const version = await store.start(input.roomId, input.userId, payload);
    return { ok: true, version, prev: null, next: payload.public, changed: true };
  } catch (e) {
    return mapStoreError(e);
  }
}
function mapStoreError(e) {
  const msg = e instanceof Error ? e.message : String(e);
  for (const code of ["game_already_started", "not_all_ready", "not_host", "roster_changed", "room_not_found"]) {
    if (msg.includes(code)) return err(code, code);
  }
  throw e;
}
async function mutate(store, roomId, fn) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const loaded = await store.load(roomId);
    if (!loaded) return err("room_not_found", "Raum nicht gefunden");
    if (!loaded.state || loaded.room.status === "lobby") return err("not_running", "Das Spiel l\xE4uft nicht");
    const r = fn(loaded, loaded.state);
    if (!r.ok) return r;
    const prev = publicView(loaded.state);
    if (JSON.stringify(r.state) === JSON.stringify(loaded.state)) {
      return { ok: true, version: loaded.version, prev, next: prev, changed: false };
    }
    const payload = buildPayload(r.state);
    try {
      const version = await store.commit(roomId, loaded.version, payload);
      return { ok: true, version, prev, next: payload.public, changed: true };
    } catch (e) {
      if (e instanceof VersionConflictError) {
        await new Promise((r2) => setTimeout(r2, Math.random() * 15 * Math.min(attempt + 1, 6)));
        continue;
      }
      throw e;
    }
  }
  return err("conflict", "Zu viele gleichzeitige \xC4nderungen \u2013 bitte erneut versuchen");
}
function handleCommand(store, input) {
  return mutate(store, input.roomId, (loaded, state) => {
    const player = loaded.players.find((p) => p.user_id === input.userId);
    if (!player) return { ok: false, code: "not_a_player", message: "Du geh\xF6rst nicht zu diesem Spiel" };
    const r = applyCommand(state, player.id, input.command, input.now);
    return r.ok ? r : { ok: false, code: r.error.code, message: r.error.message };
  });
}
function handleTick(store, input) {
  return mutate(store, input.roomId, (_loaded, state) => ({ ok: true, state: tick(state, input.now) }));
}
async function sweep(store, now) {
  const rooms = await store.dueRooms(now);
  let processed = 0;
  for (const roomId of rooms) {
    const r = await handleTick(store, { roomId, now });
    if (r.ok && r.changed) processed++;
  }
  return { processed };
}
function neutralPush(prev, next) {
  if (prev && prev.phase === next.phase && prev.council?.step === next.council?.step) return null;
  const title = "Das Dorf";
  switch (next.phase) {
    case "night":
      return { title, body: "Die Nacht beginnt." };
    case "morning":
      return { title, body: "Im Dorf hat sich etwas ver\xE4ndert." };
    case "council":
      return next.council?.step === "nomination" ? { title, body: "Das Dorf wird zusammengerufen." } : null;
    case "ended":
      return { title, body: "Das Spiel ist zu Ende." };
    default:
      return null;
  }
}
var MESSAGE_PUSH = { title: "Das Dorf", body: "Im Dorf gibt es eine neue Nachricht." };

// packages/server/src/parse.ts
var isId = (v) => typeof v === "string" && v.length > 0 && v.length <= 64;
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function parseNightAction(a) {
  if (!isObj(a)) return null;
  switch (a.kind) {
    case "scout":
      return isId(a.target) ? { kind: "scout", target: a.target } : null;
    case "track":
      return Array.isArray(a.targets) && a.targets.length <= 14 && a.targets.every(isId) ? { kind: "track", targets: a.targets } : null;
    case "protect":
      return isId(a.target) ? { kind: "protect", target: a.target } : null;
    case "alchemist": {
      if (a.protect !== void 0 && !isId(a.protect)) return null;
      if (a.strike !== void 0 && !isId(a.strike)) return null;
      return { kind: "alchemist", protect: a.protect, strike: a.strike };
    }
    case "veil":
      return { kind: "veil" };
    default:
      return null;
  }
}
function parseCommand(raw) {
  if (!isObj(raw) || typeof raw.type !== "string") return null;
  switch (raw.type) {
    case "tick":
      return { type: "tick", force: raw.force === true };
    case "ready":
      return (raw.topic === "council" || raw.topic === "advance") && typeof raw.value === "boolean" ? { type: "ready", topic: raw.topic, value: raw.value } : null;
    case "start_council":
      return { type: "start_council" };
    case "quest_done":
      return { type: "quest_done" };
    case "vote_speaker":
    case "nominate":
    case "vote":
    case "decide_tie":
    case "pack_target":
    case "hunter_shoot":
      return isId(raw.target) ? { type: raw.type, target: raw.target } : null;
    case "night_action": {
      const action = parseNightAction(raw.action);
      return action ? { type: "night_action", action } : null;
    }
    case "choose_side":
      return raw.side === "village" || raw.side === "pack" ? { type: "choose_side", side: raw.side } : null;
    default:
      return null;
  }
}
export {
  MESSAGE_PUSH,
  VersionConflictError,
  buildPayload,
  handleCommand,
  handleTick,
  neutralPush,
  parseCommand,
  startGame,
  sweep
};
