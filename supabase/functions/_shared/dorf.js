// GENERIERT von scripts/build-functions.mjs – nicht von Hand ändern.

// packages/server/src/store.ts
var VersionConflictError = class extends Error {
  constructor() {
    super("version_conflict");
  }
};

// packages/engine/src/types.ts
var UNLIMITED = 1e6;

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
var LATE = ["start", "quest_reward", "after_first_council", "day_start"];
function role(def) {
  return {
    special: true,
    enabled: true,
    weight: 1,
    minPlayers: 6,
    maxPlayers: null,
    unlock: { triggers: LATE, earliestDay: 1, latestDay: null },
    recipient: def.faction === "pack" ? "wolf" : "villager",
    startChoice: false,
    abilities: [],
    maxLivingHolders: 1,
    maxGrants: null,
    announcedAtStart: false,
    ...def
  };
}
var ab = (a) => a;
var DEFAULT_RULES = {
  minPlayers: 4,
  maxPlayers: 14,
  wolvesByPlayers: { 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3, 13: 4, 14: 4 },
  nightKillInterval: {},
  borderwalkerReplacesWolf: true,
  roles: {
    villager: role({ id: "villager", faction: "village", special: false, weight: 0, minPlayers: 1, unlock: { triggers: [], earliestDay: 1, latestDay: null } }),
    wolf: role({ id: "wolf", faction: "pack", special: false, weight: 0, minPlayers: 1, unlock: { triggers: [], earliestDay: 1, latestDay: null } }),
    scout: role({
      id: "scout",
      faction: "village",
      weight: 1,
      minPlayers: 6,
      abilities: [ab({ id: "scout", kind: "inspect", uses: 2 })]
    }),
    tracker: role({
      id: "tracker",
      faction: "village",
      weight: 2,
      minPlayers: 6,
      abilities: [ab({ id: "track", kind: "inspect_group", uses: 1, groupSize: 3 })]
    }),
    guardian: role({
      id: "guardian",
      faction: "village",
      weight: 3,
      minPlayers: 7,
      abilities: [ab({ id: "protect", kind: "protect", uses: null, noRepeatTarget: true, allowSelf: true })]
    }),
    alchemist: role({
      id: "alchemist",
      faction: "village",
      weight: 2,
      minPlayers: 8,
      // Ausschließlich ein einmaliger Heiltrank (keine Tötungsfähigkeit).
      abilities: [ab({ id: "potion_heal", kind: "heal", uses: 1 })]
    }),
    borderwalker: role({
      id: "borderwalker",
      faction: "village",
      weight: 1,
      minPlayers: 8,
      enabled: false,
      // vollständig implementiert, standardmäßig deaktiviert (Wirkung wird separat getestet)
      startChoice: true,
      announcedAtStart: true,
      unlock: { triggers: ["start"], earliestDay: 1, latestDay: 1 }
    }),
    hunter: role({
      id: "hunter",
      faction: "village",
      weight: 2,
      minPlayers: 8,
      enabled: false,
      // technisch vorhanden, standardmäßig deaktiviert
      abilities: [ab({ id: "last_shot", kind: "last_shot", uses: 1 })]
    }),
    observer: role({
      id: "observer",
      faction: "village",
      weight: 1,
      minPlayers: 8,
      // Mindestspielerzahl: Startwert, offen
      abilities: [ab({ id: "observe", kind: "observe", uses: null, windowMs: 1e4 })]
    }),
    shadowwolf: role({
      id: "shadowwolf",
      faction: "pack",
      weight: 1,
      minPlayers: 9,
      enabled: false,
      // vorerst nicht im Standardspiel
      abilities: [ab({ id: "veil", kind: "veil", uses: 1 })]
    })
  },
  startSpecials: {
    tiny: [{ count: 0, weight: 50 }, { count: 1, weight: 50 }],
    small: [{ count: 0, weight: 50 }, { count: 1, weight: 50 }],
    medium: [{ count: 0, weight: 25 }, { count: 1, weight: 45 }, { count: 2, weight: 30 }],
    large: [{ count: 1, weight: 50 }, { count: 2, weight: 50 }]
  },
  maxLaterSpecials: { tiny: 1, small: 1, medium: 2, large: 3 },
  comboLimits: [{ roles: ["scout", "tracker"], max: { tiny: 1, small: 1, medium: 1, large: 2 } }],
  finaleAlive: 5,
  moments: {
    after_first_council: { noRoleChance: 0.5 },
    day_start: { days: [3], noRoleChance: 0.5 }
  },
  lookout: { enabled: true },
  durations: {
    speakerElectionMs: 6e4,
    discussionTargetMs: 8 * 6e4,
    discussionGraceMs: 3 * 6e4,
    countdownMs: 4500,
    pointingMs: 8e3,
    tiebreakMs: 6e4,
    resultMs: 3e4,
    nightMs: 15e4,
    healWindowMs: 4e4,
    observerPingTtlMs: 2500,
    morningMs: 3e4,
    questMs: 5 * 6e4,
    confirmGraceMs: 6e4,
    momentMs: 2e4
  },
  evening: {
    minDayMs: 10 * 6e4,
    councilBudgetMs: 18 * 6e4,
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
    if (v && typeof v === "object" && !Array.isArray(v) && typeof target[k] === "object" && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else if (v !== void 0) {
      target[k] = v;
    }
  }
  return target;
}
function sizeBand(playerCount) {
  if (playerCount <= 6) return "tiny";
  if (playerCount <= 7) return "small";
  if (playerCount <= 10) return "medium";
  return "large";
}
function wolfCount(playerCount, rules) {
  return rules.wolvesByPlayers[playerCount] ?? Math.max(2, Math.round(playerCount / 3.5));
}
var ROLE_IDS = ["villager", "wolf", "scout", "tracker", "alchemist", "guardian", "borderwalker", "hunter", "shadowwolf", "observer"];
var SPECIAL_ROLE_IDS = ROLE_IDS.filter((r) => DEFAULT_RULES.roles[r].special);

// packages/engine/src/director.ts
var living = (s) => Object.values(s.players).filter((p) => p.alive);
function isRoleAllowed(def, ctx, rules) {
  if (!def.special || !def.enabled || def.weight <= 0) return false;
  const holders = ctx.held.filter((r) => r === def.id).length;
  if (def.maxLivingHolders !== null && holders >= def.maxLivingHolders) return false;
  if (def.maxGrants !== null && (ctx.grants?.[def.id] ?? 0) >= def.maxGrants) return false;
  if (ctx.playerCount < def.minPlayers) return false;
  if (def.maxPlayers !== null && ctx.playerCount > def.maxPlayers) return false;
  if (!def.unlock.triggers.includes(ctx.trigger)) return false;
  if (ctx.day < def.unlock.earliestDay) return false;
  if (def.unlock.latestDay !== null && ctx.day > def.unlock.latestDay) return false;
  if (ctx.trigger !== "start" && rules.finaleAlive > 0 && ctx.aliveCount <= rules.finaleAlive) return false;
  const band = sizeBand(ctx.playerCount);
  for (const combo of rules.comboLimits) {
    if (!combo.roles.includes(def.id)) continue;
    const have = ctx.held.filter((r) => combo.roles.includes(r)).length;
    if (have + 1 > combo.max[band]) return false;
  }
  return true;
}
function recipients(s, def) {
  const want = def.recipient === "wolf" ? "wolf" : "villager";
  return living(s).filter((p) => p.role === want).map((p) => p.id);
}
function pickLateAssignment(s, trigger, rng, fixedRole) {
  const { rules } = s;
  const playerCount = s.playerCount;
  const band = sizeBand(playerCount);
  if (s.laterGrants >= rules.maxLaterSpecials[band]) return null;
  const held = living(s).map((p) => p.role);
  const ctx = { trigger, day: s.day, playerCount, held, grants: s.grantsByRole, aliveCount: living(s).length };
  const candidates = Object.values(rules.roles).filter(
    (d) => (fixedRole ? d.id === fixedRole : true) && isRoleAllowed(d, ctx, rules) && recipients(s, d).length > 0
  );
  const def = fixedRole ? candidates[0] ?? null : rng.weighted(candidates, (d) => d.weight);
  if (!def) return null;
  return { playerId: rng.pick(recipients(s, def)), role: def.id };
}
function assignStartRoles(playerIds, rules, rng, guaranteed = []) {
  const n = playerIds.length;
  const order = rng.shuffle(playerIds);
  let wolves = wolfCount(n, rules);
  const dist = rules.startSpecials[sizeBand(n)];
  const picked = rng.weighted(dist, (d) => d.weight);
  const startCtx = (chosen2) => ({ trigger: "start", day: 1, playerCount: n, held: chosen2, aliveCount: n });
  const chosen = [];
  for (const r of guaranteed) {
    const def = rules.roles[r];
    if (def && isRoleAllowed(def, startCtx(chosen), rules)) chosen.push(r);
  }
  const target = Math.max(picked?.count ?? 0, chosen.length);
  while (chosen.length < target) {
    const options = Object.values(rules.roles).filter((d) => isRoleAllowed(d, startCtx(chosen), rules));
    const def = rng.weighted(options, (d) => d.weight);
    if (!def) break;
    chosen.push(def.id);
  }
  if (chosen.includes("borderwalker") && rules.borderwalkerReplacesWolf) wolves = Math.max(1, wolves - 1);
  const assignments = [];
  let cursor = 0;
  const packRoles = chosen.filter((r) => rules.roles[r].faction === "pack");
  for (let i = 0; i < wolves; i++) assignments.push({ playerId: order[cursor++], role: packRoles[i] ?? "wolf" });
  for (const r of chosen.filter((x) => rules.roles[x].faction !== "pack")) assignments.push({ playerId: order[cursor++], role: r });
  while (cursor < order.length) assignments.push({ playerId: order[cursor++], role: "villager" });
  return { assignments, startSpecialCount: chosen.length };
}

// packages/engine/src/content.ts
var QUESTS = [
  {
    id: "q-wer-von-euch-1",
    category: "assess",
    title: "Wer von euch \u2026",
    goal: "Findet heraus, wie gut ihr einander einsch\xE4tzt.",
    task: "Jemand liest \u201EWer von euch w\xFCrde bei Stromausfall als Erstes die Kerzen finden?\u201C vor. Alle zeigen gleichzeitig auf eine Person. Danach darf die gezeigte Person erkl\xE4ren, ob es stimmt.",
    finish: "Fertig, sobald alle ihre Einsch\xE4tzung erkl\xE4rt haben."
  },
  {
    id: "q-wer-von-euch-2",
    category: "assess",
    title: "Der ruhigste Pol",
    goal: "Tippt, wer in diesem Raum am schwersten aus der Ruhe zu bringen ist.",
    task: "Jeder schreibt einen Namen auf einen Zettel oder merkt ihn sich. Dann nennt reihum, wen ihr gew\xE4hlt habt \u2013 und warum.",
    finish: "Fertig, wenn jede Begr\xFCndung geh\xF6rt wurde."
  },
  {
    id: "q-tabu-1",
    category: "taboo",
    title: "Ohne das Wort",
    goal: "Erkl\xE4rt einen Begriff, ohne ihn auszusprechen.",
    task: "Reihum zieht jemand im Kopf einen Alltagsgegenstand und erkl\xE4rt ihn der Gruppe, ohne dessen Namen oder Verwandte davon zu nennen. Wer das Wort r\xE4t, erkl\xE4rt als N\xE4chstes.",
    finish: "Fertig nach drei erratenen Begriffen oder Ablauf der Zeit."
  },
  {
    id: "q-tabu-2",
    category: "taboo",
    title: "Verbotene Silbe",
    goal: "Haltet ein kurzes Gespr\xE4ch, ohne eine bestimmte Silbe zu benutzen.",
    task: "Das Dorf einigt sich auf ein h\xE4ufiges Wort (\u201Eja\u201C, \u201Enein\u201C oder \u201Eich\u201C). Zwei Minuten lang darf es niemand sagen. Wer es doch tut, sagt danach ein Geheimnis, das keines ist.",
    finish: "Fertig nach zwei Minuten.",
    durationMs: 4 * 6e4
  },
  {
    id: "q-koordination-1",
    category: "coordination",
    title: "Gleicher Gedanke",
    goal: "Findet ohne Absprache dieselbe Antwort.",
    task: "Alle denken sich gleichzeitig eine Farbe, eine Zahl von 1 bis 10 und ein Tier aus. Auf \u201EJetzt\u201C sagen alle laut ihre Antworten. Wie viele \xDCbereinstimmungen gibt es?",
    finish: "Fertig nach drei Runden. Ihr d\xFCrft nach jeder Runde nur schweigen und nicken.",
    reward: { kind: "unlock_role", role: "scout" }
  },
  {
    id: "q-koordination-2",
    category: "coordination",
    title: "Im Takt",
    goal: "Bringt das Dorf in einen gemeinsamen Rhythmus.",
    task: "Ohne zu sprechen, versucht ihr, nacheinander von 1 bis zur Zahl der Mitspielenden zu z\xE4hlen. Wenn zwei gleichzeitig sprechen, beginnt ihr von vorn.",
    finish: "Fertig, sobald ihr einmal ohne \xDCberschneidung durchkommt \u2013 oder die Zeit abl\xE4uft."
  },
  {
    id: "q-wissen-1",
    category: "shared_knowledge",
    title: "Was alle wissen",
    goal: "Findet heraus, was das Dorf gemeinsam wei\xDF.",
    task: "Sammelt zusammen zehn Dinge, die garantiert jede Person in diesem Raum kennt, aber keine Fremde kennen w\xFCrde.",
    finish: "Fertig bei zehn Dingen, die alle best\xE4tigen.",
    reward: { kind: "hint" }
  },
  {
    id: "q-wissen-2",
    category: "shared_knowledge",
    title: "Orte und Wege",
    goal: "Beschreibt einen Ort, den alle schon gesehen haben.",
    task: "Reihum nennt jemand einen Satz \xFCber einen Ort, den alle kennen m\xFCssten. Der Ort darf nicht genannt werden. Sobald alle ihn erraten, beginnt ein neuer.",
    finish: "Fertig nach zwei Orten."
  },
  {
    id: "q-sortieren-1",
    category: "sorting",
    title: "Aufgereiht",
    goal: "Stellt euch ohne zu sprechen in der richtigen Reihenfolge auf.",
    task: "Ordnet euch nach Geburtstag im Jahr, ohne zu sprechen. Zeigt, was ihr k\xF6nnt: Finger, Gesten, Blicke. Dann pr\xFCft laut.",
    finish: "Fertig, wenn alle die Reihenfolge laut best\xE4tigt haben."
  },
  {
    id: "q-sortieren-2",
    category: "sorting",
    title: "Alles in Ordnung",
    goal: "Bringt Begriffe gemeinsam in eine Rangfolge.",
    task: "Einigt euch auf eine Rangfolge von f\xFCnf Dingen vom Allt\xE4glichsten zum Seltensten (z. B. Regenschirm, Fahrradschl\xFCssel, Briefmarke, Taschenlampe, Gummiente). Jeder darf einmal umstellen.",
    finish: "Fertig, wenn ihr eine Reihenfolge habt, mit der niemand laut widerspricht."
  },
  {
    id: "q-gedaechtnis-1",
    category: "memory",
    title: "Wer sa\xDF wo?",
    goal: "Pr\xFCft, wie gut ihr euch den Abend gemerkt habt.",
    task: "Alle schlie\xDFen die Augen. Eine Person stellt drei Fragen zu dem, was heute im Raum zu sehen war (Kleidung, Gegenst\xE4nde, Sitzpl\xE4tze). Danach wird gemeinsam gepr\xFCft.",
    finish: "Fertig nach drei Fragen."
  },
  {
    id: "q-gedaechtnis-2",
    category: "memory",
    title: "Die lange Kette",
    goal: "Baut zusammen eine Merkkette auf.",
    task: "Reihum wiederholt jede Person die bisherige Kette (\u201EIch packe in meinen Korb \u2026\u201C) und f\xFCgt einen Gegenstand hinzu. Wer sich verhaspelt, beginnt die n\xE4chste Runde.",
    finish: "Fertig nach zwei Runden oder wenn die Kette zehn Gegenst\xE4nde hat."
  },
  {
    id: "q-geschick-1",
    category: "dexterity",
    title: "Ruhige Hand",
    goal: "Haltet etwas stabil, w\xE4hrend die anderen reden.",
    task: "Alle stapeln mit dem, was zur Hand ist (Bierdeckel, M\xFCnzen, L\xF6ffel), einen m\xF6glichst hohen Turm, w\xE4hrend sie dabei \xFCber ihren Tag erz\xE4hlen. Wessen Turm f\xE4llt, erz\xE4hlt eine Gegenfrage.",
    finish: "Fertig nach Ablauf der Zeit."
  },
  {
    id: "q-geschick-2",
    category: "dexterity",
    title: "Die Kerze des Dorfes",
    goal: "Gebt etwas gemeinsam weiter, ohne dass es herunterf\xE4llt.",
    task: "Gebt einen L\xF6ffel mit einer M\xFCnze reihum, ohne dass die M\xFCnze f\xE4llt. W\xE4hrend der Weitergabe nennt jede Person eine Eigenschaft der n\xE4chsten.",
    finish: "Fertig, wenn die M\xFCnze einmal im Kreis ist."
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

// packages/engine/src/traits.ts
var AGE_THRESHOLDS = [20, 30, 40, 50];
var DARK_HAIR = ["black", "brown"];
var LIGHT_HAIR = ["blonde", "gray"];
var LIGHT_EYES = ["blue", "green", "gray"];
function holds(st, p) {
  switch (st.trait) {
    case "gender":
      return p.gender === st.value;
    case "hair":
      if (st.value === "dark") return DARK_HAIR.includes(p.hair);
      if (st.value === "light") return LIGHT_HAIR.includes(p.hair);
      return p.hair === st.value;
    case "eyes":
      if (st.value === "light") return LIGHT_EYES.includes(p.eyes);
      return p.eyes === st.value;
    case "age_over":
      return p.age > st.value;
    case "age_under":
      return p.age < st.value;
  }
}
function trueStatements(p) {
  const out = [
    { trait: "gender", value: p.gender },
    { trait: "hair", value: p.hair },
    { trait: "eyes", value: p.eyes }
  ];
  if (DARK_HAIR.includes(p.hair)) out.push({ trait: "hair", value: "dark" });
  if (LIGHT_HAIR.includes(p.hair)) out.push({ trait: "hair", value: "light" });
  if (LIGHT_EYES.includes(p.eyes)) out.push({ trait: "eyes", value: "light" });
  for (const t of AGE_THRESHOLDS) {
    if (p.age > t) out.push({ trait: "age_over", value: t });
    if (p.age < t) out.push({ trait: "age_under", value: t });
  }
  return out;
}
function pickStatement(subject, group, rng) {
  const all = trueStatements(subject).map((st) => ({ st, n: group.filter((g) => holds(st, g)).length }));
  const ambiguous = all.filter((x) => x.n >= 2 && x.n < group.length);
  if (ambiguous.length) return rng.pick(ambiguous).st;
  const multi = all.filter((x) => x.n >= 2);
  if (multi.length) return rng.pick(multi).st;
  const best = Math.max(...all.map((x) => x.n));
  return rng.pick(all.filter((x) => x.n === best)).st;
}
function defaultProfile(id) {
  let h = 7;
  for (const ch of id) h = h * 31 + ch.charCodeAt(0) >>> 0;
  const genders = ["female", "male", "diverse"];
  const hairs = ["black", "brown", "blonde", "red", "gray"];
  const eyes = ["brown", "blue", "green", "gray"];
  return {
    age: 18 + h % 50,
    gender: genders[h % 3],
    hair: hairs[(h >> 3) % 5],
    eyes: eyes[(h >> 6) % 4]
  };
}

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
function initialUses(role2, rules) {
  const uses = {};
  for (const a of rules.roles[role2].abilities) uses[a.id] = a.uses === null ? UNLIMITED : a.uses;
  return uses;
}
var abilitiesOf = (s, p) => s.rules.roles[p.role].abilities;
function setRole(s, id, role2, day) {
  const p = s.players[id];
  const def = s.rules.roles[role2];
  p.role = role2;
  p.faction = def.faction;
  p.roleSince = day;
  p.uses = initialUses(role2, s.rules);
  p.lastTarget = {};
  p.sidePending = def.startChoice;
}
function makeMoment(s, ctx, kind, opts) {
  const id = (s.moment?.id ?? 0) + 1;
  const m = { id, kind, at: ctx.now, showUntil: ctx.now + s.rules.durations.momentMs, secret: opts.secret };
  if (opts.role) m.role = opts.role;
  if (opts.announced?.length) m.announced = opts.announced;
  if (opts.hint) {
    const unused = HINT_IMPULSE_KEYS.filter((k) => !s.usedImpulseKeys.includes(k));
    const pool = unused.length > 0 ? unused : HINT_IMPULSE_KEYS;
    if (unused.length === 0) s.usedImpulseKeys = [];
    m.textKey = ctx.rng.pick(pool);
    s.usedImpulseKeys.push(m.textKey);
  }
  s.moment = m;
  s.momentSecret = opts.secret ? { momentId: id, recipient: null, role: null, ...opts.secretInfo } : null;
  pushEvent(s, ctx, "moment", void 0, { kind, role: opts.role });
}
function grantRole(s, playerId, role2) {
  setRole(s, playerId, role2, s.day);
  addNote(s, playerId, s.day, "role_gained", { role: role2 });
  s.laterGrants += 1;
  s.grantsByRole[role2] = (s.grantsByRole[role2] ?? 0) + 1;
}
function runMoment(s, ctx, trigger) {
  const m = s.rules.moments[trigger];
  if (m.days && !m.days.includes(s.day)) return;
  makeMoment(s, ctx, "neutral", { secret: true });
  if (ctx.rng.chance(m.noRoleChance)) return;
  const a = pickLateAssignment(s, trigger, ctx.rng);
  if (!a) return;
  grantRole(s, a.playerId, a.role);
  s.momentSecret = { momentId: s.moment.id, recipient: a.playerId, role: a.role };
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
  if (abilitiesOf(s, p).some((a) => a.kind === "last_shot" && (p.uses[a.id] ?? 0) > 0)) s.hunterShots[id] = null;
}
function createGame(input) {
  const rules = mergeRules(input.rules);
  const guaranteed = [];
  for (const [role2, mode] of Object.entries(input.roleModes ?? {})) {
    if (!rules.roles[role2] || !rules.roles[role2].special) continue;
    if (mode === "off") rules.roles[role2].enabled = false;
    else {
      rules.roles[role2].enabled = true;
      if (mode === "guaranteed") guaranteed.push(role2);
    }
  }
  const n = input.roster.length;
  if (n < rules.minPlayers || n > rules.maxPlayers) {
    throw new Error(`Spielerzahl ${n} au\xDFerhalb von ${rules.minPlayers}\u2013${rules.maxPlayers}`);
  }
  if (new Set(input.roster.map((r) => r.id)).size !== n) throw new Error("Doppelte Spieler-IDs");
  if (!input.roster.some((r) => r.id === input.hostId)) throw new Error("Host ist kein Spieler");
  const rng = new Rng(seedToState(input.seed));
  const ids = input.roster.map((r) => r.id);
  const { assignments, startSpecialCount } = assignStartRoles(ids, rules, rng, guaranteed);
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
    startSpecialCount,
    packSeats: wolfCount(n, rules),
    playerCount: n,
    laterGrants: 0,
    grantsByRole: {},
    bwDecidedAnnounced: false,
    night: null,
    suspicions: [],
    firstCouncilDone: false,
    moment: null,
    momentSecret: null,
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
      profile: r.profile ?? defaultProfile(r.id),
      roleSince: 1,
      uses: initialUses("villager", rules),
      lastTarget: {},
      sidePending: false,
      eliminatedDay: null
    };
    s.players[r.id] = p;
  }
  for (const a of assignments) setRole(s, a.playerId, a.role, 1);
  for (const p of Object.values(s.players)) addNote(s, p.id, 1, "role", { role: p.role });
  const ctx = { now: input.now, rng };
  pushEvent(s, ctx, "game_started");
  const announced = Object.values(s.players).map((p) => p.role).filter((r) => rules.roles[r].announcedAtStart);
  makeMoment(s, ctx, "start", { secret: true, announced: [...new Set(announced)] });
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
  if (s.day >= 2) runMoment(s, ctx, "day_start");
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
function applyQuestReward(s, ctx, reward) {
  switch (reward.kind) {
    case "hint":
      makeMoment(s, ctx, "hint", { secret: false, hint: true });
      break;
    case "unlock_role": {
      const a = pickLateAssignment(s, "quest_reward", ctx.rng, reward.role);
      if (!a) break;
      grantRole(s, a.playerId, a.role);
      makeMoment(s, ctx, "quest_unlock", { secret: true, role: a.role, secretInfo: { recipient: a.playerId, role: a.role } });
      break;
    }
    case "event":
      pushEvent(s, ctx, "quest_event", void 0, { eventKey: reward.eventKey });
      break;
  }
}
function endQuest(s, ctx) {
  if (s.phase.kind !== "day" || !s.phase.quest) return;
  const quest = s.phase.quest;
  const def = QUESTS.find((q) => q.id === quest.id);
  const success = livingIds(s).every((id) => quest.doneBy.includes(id));
  s.phase.quest = null;
  pushEvent(s, ctx, "quest_ended", void 0, { questId: quest.id, success });
  if (success && def?.reward) applyQuestReward(s, ctx, def.reward);
}
function startCouncil(s, ctx) {
  const nightAt = s.phase.kind === "day" ? s.phase.nightAt : null;
  const evening = s.mode === "evening";
  const council = {
    step: "discussion",
    endsAt: null,
    targetAt: evening ? ctx.now + s.rules.durations.discussionTargetMs : null,
    autoAt: evening ? ctx.now + s.rules.durations.discussionTargetMs + s.rules.durations.discussionGraceMs : null,
    candidates: livingIds(s),
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
    if (isAlive(s, voter) && voter !== target && c.candidates.includes(target)) tally[target] = (tally[target] ?? 0) + 1;
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
    case "discussion": {
      const due = force || c.autoAt !== null && now >= c.autoAt || s.mode === "classic" && quorum(s, ctx, s.readyAdvance, d.confirmGraceMs);
      if (!due) return false;
      c.step = "voting";
      c.endsAt = null;
      s.readyAdvance = [];
      s.majorityAt = null;
      return true;
    }
    case "voting": {
      const all = living2.every((id) => c.votes[id]);
      const cast = Object.keys(c.votes).filter((id) => living2.includes(id));
      if (!(all || force || quorum(s, ctx, cast, d.confirmGraceMs))) return false;
      s.majorityAt = null;
      c.step = "showdown";
      c.revealAt = now + d.countdownMs;
      c.endsAt = c.revealAt + d.pointingMs;
      return true;
    }
    case "showdown": {
      if (!(now >= (c.endsAt ?? 0) || force)) return false;
      const tally = tallyVotes(s, c);
      c.tally = tally;
      const top = Math.max(0, ...Object.values(tally));
      const leaders = c.candidates.filter((id) => tally[id] === top && isAlive(s, id));
      if (top === 0 || leaders.length === 0) {
        banish(s, ctx, ctx.rng.pick(living2), false);
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
      if (!(now >= (c.endsAt ?? 0) || force)) return false;
      banish(s, ctx, ctx.rng.pick(c.tied ?? living2), true);
      return true;
    }
    case "result": {
      if (!(now >= (c.endsAt ?? 0) || force)) return false;
      proceed(s, ctx, "after_council");
      return true;
    }
  }
}
function applyHunterShots(s, ctx) {
  for (const [hunterId, target] of Object.entries(s.hunterShots)) {
    const h = s.players[hunterId];
    const ability = h ? abilitiesOf(s, h).find((a) => a.kind === "last_shot") : void 0;
    if (h && ability && target && isAlive(s, target) && hasUses(h, ability)) {
      consume(h, ability);
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
      runMoment(s, ctx, "after_first_council");
    }
    s.readyAdvance = [];
    s.majorityAt = null;
    s.phase = { kind: "dusk", startedAt: ctx.now, nightAt };
  } else {
    startDay(s, ctx);
  }
}
function finalizeBorderwalker(s, ctx, id, faction) {
  const p = s.players[id];
  p.sidePending = false;
  p.faction = faction;
  if (!s.bwDecidedAnnounced) {
    s.bwDecidedAnnounced = true;
    makeMoment(s, ctx, "borderwalker_decided", { secret: true, secretInfo: { recipient: id, role: p.role, faction } });
  }
}
function startNight(s, ctx) {
  for (const p of Object.values(s.players)) if (p.alive && p.sidePending) finalizeBorderwalker(s, ctx, p.id, "village");
  s.readyAdvance = [];
  s.readyCouncil = [];
  s.majorityAt = null;
  s.nightActions = {};
  s.night = { lockedTarget: null, healSave: null, lookoutUsed: false, observers: {} };
  s.phase = { kind: "night", startedAt: ctx.now, endsAt: ctx.now + s.rules.durations.nightMs, stage: "act" };
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
var hasUses = (p, a) => (p.uses[a.id] ?? 0) > 0;
var consume = (p, a) => {
  if (a.uses !== null) p.uses[a.id] = (p.uses[a.id] ?? 0) - 1;
};
function lockPack(s, ctx) {
  if (s.phase.kind !== "night" || !s.night) return;
  const interval = Math.max(1, s.rules.nightKillInterval[s.playerCount] ?? 1);
  const killNight = (s.day - 1) % interval === 0;
  s.night.lockedTarget = killNight ? resolvePackTarget(s, ctx) : null;
  for (const o of Object.values(s.night.observers)) o.open = false;
  const alchemist = livingPlayers(s).find((p) => abilitiesOf(s, p).some((a) => a.kind === "heal" && hasUses(p, a)));
  s.phase = { kind: "night", startedAt: s.phase.startedAt, endsAt: ctx.now + s.rules.durations.healWindowMs, stage: "heal" };
  makeMoment(s, ctx, "pack_decided", {
    secret: true,
    secretInfo: { recipient: s.night.lockedTarget && alchemist ? alchemist.id : null, role: null, victim: s.night.lockedTarget ?? void 0 }
  });
}
function resolveNight(s, ctx) {
  const day = s.day;
  const target = s.night?.lockedTarget ?? null;
  const actors = livingPlayers(s);
  const chosen = (p, a) => s.nightActions[p.id]?.[a.id];
  const each = (kind, fn) => {
    for (const p of actors) {
      for (const a of abilitiesOf(s, p)) {
        const c = chosen(p, a);
        if (a.kind === kind && c && hasUses(p, a)) fn(p, a, c);
      }
    }
  };
  let veiled = false;
  each("veil", (p, a) => {
    consume(p, a);
    veiled = true;
  });
  each("inspect", (p, a, c) => {
    consume(p, a);
    const t = c.target ? s.players[c.target] : void 0;
    addNote(s, p.id, day, "inspect_result", veiled || !t ? { ability: a.id, target: c.target, unclear: true } : { ability: a.id, target: c.target, faction: t.faction });
  });
  each("inspect_group", (p, a, c) => {
    consume(p, a);
    const targets = c.targets ?? [];
    const packPresent = targets.some((tid) => s.players[tid]?.faction === "pack");
    addNote(s, p.id, day, "group_result", veiled ? { ability: a.id, targets, unclear: true } : { ability: a.id, targets, packPresent });
  });
  const protectedIds = /* @__PURE__ */ new Set();
  each("protect", (p, a, c) => {
    consume(p, a);
    if (c.target) {
      protectedIds.add(c.target);
      p.lastTarget[a.id] = c.target;
    }
  });
  for (const p of actors) {
    for (const a of abilitiesOf(s, p)) if (a.kind === "protect" && !chosen(p, a)) p.lastTarget[a.id] = null;
  }
  if (s.night?.healSave === true && target) {
    for (const p of actors) {
      for (const a of abilitiesOf(s, p)) {
        if (a.kind === "heal" && hasUses(p, a)) {
          consume(p, a);
          protectedIds.add(target);
        }
      }
    }
  }
  const deaths = [];
  if (target && isAlive(s, target) && !protectedIds.has(target)) deaths.push(target);
  s.nightActions = {};
  s.packVotes = {};
  s.night = null;
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
function voteReadyFlag(s) {
  const living2 = livingIds(s);
  return s.readyAdvance.filter((id) => living2.includes(id)).length * 2 > living2.length;
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
      if (phase.stage === "act") {
        lockPack(s, ctx);
        return true;
      }
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
  expireObservers(s, ctx.now);
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
function applyNightAction(s, actor, cmd) {
  if (s.phase.kind !== "night" || s.phase.stage !== "act") fail("wrong_phase", "Nachtaktionen gibt es nur in der Handlungsphase der Nacht");
  const a = abilitiesOf(s, actor).find((x) => x.id === cmd.ability);
  if (!a || a.kind === "last_shot" || a.kind === "heal" || a.kind === "observe") return fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
  if (!hasUses(actor, a)) fail("no_uses_left", "Keine Nutzungen \xFCbrig");
  let choice = {};
  switch (a.kind) {
    case "inspect": {
      if (!cmd.target) return fail("invalid_target", "Ziel fehlt");
      requireLivingTarget(s, cmd.target, { not: actor.id });
      choice = { target: cmd.target };
      break;
    }
    case "protect": {
      if (!cmd.target) return fail("invalid_target", "Ziel fehlt");
      requireLivingTarget(s, cmd.target, a.allowSelf === false ? { not: actor.id } : {});
      if (a.noRepeatTarget && actor.lastTarget[a.id] === cmd.target) fail("invalid_target", "Dieselbe Person nicht zwei N\xE4chte in Folge");
      choice = { target: cmd.target };
      break;
    }
    case "inspect_group": {
      const targets = cmd.targets ?? [];
      const others = livingPlayers(s).filter((p) => p.id !== actor.id).length;
      const size = Math.min(a.groupSize ?? 3, others);
      if (new Set(targets).size !== targets.length || targets.length !== size) fail("invalid_target", `W\xE4hle genau ${size} verschiedene Personen`);
      for (const t of targets) requireLivingTarget(s, t, { not: actor.id });
      choice = { targets };
      break;
    }
    case "veil":
      break;
  }
  const chosen = s.nightActions[actor.id] ??= {};
  chosen[a.id] = choice;
}
var observeAbility = (s, p) => abilitiesOf(s, p).find((a) => a.kind === "observe");
function windowActive(s, o, ability, now) {
  if (!o.open || o.windowStartedAt === null || o.lastPingAt === null) return false;
  const max = ability?.windowMs ?? 1e4;
  return now - o.lastPingAt <= s.rules.durations.observerPingTtlMs && now - o.windowStartedAt <= max;
}
function expireObservers(s, now) {
  if (s.phase.kind !== "night" || !s.night) return;
  for (const [id, o] of Object.entries(s.night.observers)) {
    if (o.open && !windowActive(s, o, s.players[id] ? observeAbility(s, s.players[id]) : void 0, now)) o.open = false;
  }
}
function observe(s, actor, action, ctx) {
  const ability = observeAbility(s, actor);
  if (!ability) return fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
  if (s.phase.kind !== "night" || s.phase.stage !== "act" || !s.night) return fail("wrong_phase", "Nur in der Handlungsphase der Nacht");
  let o = s.night.observers[actor.id];
  if (action === "stop") {
    if (o) o.open = false;
    return;
  }
  if (action === "ping") {
    if (o && windowActive(s, o, ability, ctx.now)) o.lastPingAt = ctx.now;
    return;
  }
  if (o) return fail("already_decided", "Dein Blick in die Dunkelheit ist f\xFCr diese Nacht vorbei");
  const pack = livingPlayers(s).filter((p) => p.faction === "pack");
  if (pack.length === 0) return fail("invalid_target", "Nichts zu sehen");
  const target = ctx.rng.pick(pack);
  const group = livingPlayers(s).map((p) => p.profile);
  o = { target: target.id, hint: pickStatement(target.profile, group, ctx.rng), windowStartedAt: ctx.now, lastPingAt: ctx.now, open: true };
  s.night.observers[actor.id] = o;
}
function lookout(s, actor, ctx) {
  if (!s.rules.lookout.enabled) return fail("not_allowed", "Ausschau halten ist nicht verf\xFCgbar");
  if (actor.faction !== "pack") return fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
  if (s.phase.kind !== "night" || s.phase.stage !== "act" || !s.night) return fail("wrong_phase", "Nur in der Handlungsphase der Nacht");
  if (s.night.lookoutUsed) return fail("already_decided", "Das Rudel hat in dieser Nacht bereits Ausschau gehalten");
  s.night.lookoutUsed = true;
  const hit = Object.entries(s.night.observers).find(([id, o]) => {
    const p = s.players[id];
    return !!p?.alive && windowActive(s, o, observeAbility(s, p), ctx.now);
  });
  const pack = livingPlayers(s).filter((p) => p.faction === "pack");
  if (!hit) {
    for (const m of pack) addNote(s, m.id, s.day, "lookout_miss", { by: actor.id });
    return;
  }
  const observer = s.players[hit[0]];
  const statement = pickStatement(observer.profile, livingPlayers(s).map((p) => p.profile), ctx.rng);
  for (const m of pack) addNote(s, m.id, s.day, "lookout_result", { by: actor.id, statement });
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
        const ok = s.phase.kind === "dusk" || s.phase.kind === "morning" && s.mode === "classic" || s.phase.kind === "council" && s.phase.council.step === "discussion";
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
    case "start_vote": {
      const sp = s.phase;
      if (sp.kind !== "council" || sp.council.step !== "discussion") return fail("wrong_phase", "Die Abstimmung kann jetzt nicht er\xF6ffnet werden");
      if (!voteReadyFlag(s)) fail("not_allowed", "Das Dorf ist noch nicht bereit f\xFCr die Abstimmung");
      sp.council.step = "voting";
      sp.council.endsAt = null;
      s.readyAdvance = [];
      s.majorityAt = null;
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
      if (s.phase.kind !== "day" && s.phase.kind !== "dusk" && !(s.phase.kind === "night" && s.phase.stage === "act")) {
        fail("wrong_phase", "Jetzt kann kein Ziel gew\xE4hlt werden");
      }
      const t = requireLivingTarget(s, cmd.target);
      if (t.faction === "pack") fail("invalid_target", "Das Ziel darf nicht zum Rudel geh\xF6ren");
      s.packVotes[actor.id] = cmd.target;
      return;
    }
    case "night_action": {
      applyNightAction(s, actor, cmd);
      return;
    }
    case "suspect": {
      const np = s.phase;
      if (np.kind !== "night" || np.stage !== "act") return fail("wrong_phase", "Verdacht gibt es nur zu Beginn der Nacht");
      const others = livingIds(s).filter((id) => id !== actor.id);
      const need = Math.min(s.packSeats, others.length);
      const targets = cmd.targets;
      if (!Array.isArray(targets) || new Set(targets).size !== targets.length || targets.length !== need) {
        return fail("invalid_target", `W\xE4hle genau ${need} verschiedene Personen`);
      }
      for (const t of targets) if (!others.includes(t)) return fail("invalid_target", "Nur lebende andere Spieler sind w\xE4hlbar");
      const existing = s.suspicions.findIndex((e) => e.day === s.day && e.by === actor.id);
      const entry = { day: s.day, by: actor.id, targets: [...targets] };
      if (existing >= 0) s.suspicions[existing] = entry;
      else s.suspicions.push(entry);
      return;
    }
    case "observe": {
      observe(s, actor, cmd.action, ctx);
      return;
    }
    case "lookout": {
      lookout(s, actor, ctx);
      return;
    }
    case "heal_decision": {
      const hp = s.phase;
      if (hp.kind !== "night" || hp.stage !== "heal" || !s.night) return fail("wrong_phase", "Jetzt gibt es nichts zu entscheiden");
      const ability = abilitiesOf(s, actor).find((a) => a.kind === "heal");
      if (!ability) return fail("not_allowed", "Diese Aktion steht dir nicht zur Verf\xFCgung");
      if (!hasUses(actor, ability)) return fail("no_uses_left", "Dein Trank ist verbraucht");
      if (!s.night.lockedTarget) return fail("wrong_phase", "Es gibt kein Opfer");
      if (s.night.healSave !== null) return fail("already_decided", "Du hast dich bereits entschieden");
      s.night.healSave = cmd.save === true;
      return;
    }
    case "choose_side": {
      if (!actor.sidePending) fail("not_allowed", "Keine Wahl offen");
      if (s.phase.kind === "night" || s.phase.kind === "ended") fail("wrong_phase", "Zu sp\xE4t f\xFCr diese Wahl");
      finalizeBorderwalker(s, ctx, actor.id, cmd.side);
      return;
    }
    default:
      fail("invalid_command", "Unbekannter Befehl");
  }
}
function applyCommand(state, actor, cmd, now) {
  return applyCommandMut(JSON.parse(JSON.stringify(state)), actor, cmd, now);
}
function applyCommandMut(s, actor, cmd, now) {
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
      return p.endsAt;
    case "night": {
      const t = [p.endsAt];
      if (p.stage === "act" && s.night) {
        for (const [id, o] of Object.entries(s.night.observers)) {
          if (!o.open || o.lastPingAt === null || o.windowStartedAt === null) continue;
          const max = s.players[id] ? observeAbility(s, s.players[id])?.windowMs ?? 1e4 : 1e4;
          t.push(Math.min(o.lastPingAt + s.rules.durations.observerPingTtlMs + 1, o.windowStartedAt + max + 1));
        }
      }
      return Math.min(...t);
    }
    case "morning":
      return p.endsAt;
    case "council":
      return p.council.step === "discussion" ? p.council.autoAt : p.council.endsAt;
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

// packages/engine/src/retrospective.ts
function retrospective(s) {
  const entries = s.suspicions;
  const mentioned = /* @__PURE__ */ new Set();
  const pairs = /* @__PURE__ */ new Map();
  const byPlayer = /* @__PURE__ */ new Map();
  const hitPack = /* @__PURE__ */ new Set();
  for (const e of entries) {
    byPlayer.set(e.by, (byPlayer.get(e.by) ?? 0) + 1);
    for (const t of e.targets) {
      mentioned.add(t);
      const key = `${e.by}>${t}`;
      const p = pairs.get(key) ?? { by: e.by, target: t, days: [] };
      p.days.push(e.day);
      pairs.set(key, p);
      if (s.players[t]?.faction === "pack") hitPack.add(e.by);
    }
  }
  const suspicionStreaks = [...pairs.values()].filter((p) => p.days.length >= 2).map((p) => ({ by: p.by, target: p.target, sinceDay: Math.min(...p.days), nights: p.days.length })).sort((a, b) => b.nights - a.nights || a.sinceDay - b.sinceDay).slice(0, 5);
  const all = Object.keys(s.players);
  return {
    suspicionStreaks,
    neverSuspected: entries.length ? all.filter((id) => !mentioned.has(id)) : [],
    neverSuspectedPack: all.filter((id) => (byPlayer.get(id) ?? 0) > 0 && !hitPack.has(id))
  };
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
      phaseEndsAt = c.step === "discussion" ? c.autoAt : c.endsAt;
      if (c.step === "discussion" && s.mode === "classic") {
        advance = { ready: s.readyAdvance.filter((id) => s.players[id]?.alive).length, total: living2.length };
      }
      const cast = Object.keys(c.votes).filter((id) => s.players[id]?.alive).length;
      council = {
        step: c.step,
        endsAt: c.endsAt,
        targetAt: c.targetAt,
        autoAt: c.autoAt,
        voteReady: c.step === "discussion" ? voteReadyFlag(s) : false,
        candidates: c.candidates,
        progress: c.step === "voting" ? { cast, total: living2.length } : null,
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
      isSpeaker: s.speakerId === pl.id,
      profile: pl.profile,
      // Beim Ausscheiden für alle gleichzeitig aufgedeckt (Fraktion + Sonderrolle bzw. Grundrolle).
      revealed: pl.alive ? null : { faction: pl.faction, role: pl.role }
    })),
    livingCount: living2.length,
    speakerId: s.speakerId,
    quest,
    councilReady: p.kind === "day" ? councilReadyFlag(s) : false,
    advance,
    electionProgress,
    morningDeaths,
    council,
    moment: s.moment,
    packSeats: s.packSeats,
    playerCount: s.playerCount,
    nightStage: p.kind === "night" ? p.stage : null,
    suspicionCount: Math.max(0, Math.min(s.packSeats, living2.length - 1)),
    events: s.events.slice(-60),
    winner: p.kind === "ended" ? s.winner : null,
    reveal: p.kind === "ended" ? Object.values(s.players).map((pl) => ({ id: pl.id, role: pl.role, faction: pl.faction })) : null,
    retrospective: p.kind === "ended" ? retrospective(s) : null
  };
}
var NEUTRAL_VARIANTS = 4;
function variantFor(id, momentId) {
  let h = momentId * 2654435761;
  for (const ch of id) h = h * 31 + ch.charCodeAt(0) >>> 0;
  return h % NEUTRAL_VARIANTS;
}
function panelFor(s, id) {
  const m = s.moment;
  if (!m || !m.secret) return null;
  const sec = s.momentSecret && s.momentSecret.momentId === m.id ? s.momentSecret : null;
  const neutral = { momentId: m.id, kind: "neutral", variant: variantFor(id, m.id) };
  switch (m.kind) {
    case "start":
      return { momentId: m.id, kind: "role_info" };
    case "quest_unlock":
    case "neutral":
      return sec?.recipient === id && sec.role ? { momentId: m.id, kind: "you_are", role: sec.role } : neutral;
    case "borderwalker_decided":
      return sec?.recipient === id && sec.faction ? { momentId: m.id, kind: "chose", faction: sec.faction } : neutral;
    case "pack_decided":
      return sec?.recipient === id && sec.victim ? { momentId: m.id, kind: "heal_prompt", victim: sec.victim, decided: s.night?.healSave ?? null } : neutral;
    default:
      return null;
  }
}
function privateView(s, id) {
  const me = s.players[id];
  if (!me) return null;
  const alive = livingPlayers(s);
  const others = alive.filter((p) => p.id !== id).map((p) => p.id);
  const isPack = me.alive && me.faction === "pack";
  const phase = s.phase;
  const actStage = phase.kind === "night" && phase.stage === "act";
  const abilities = [];
  if (actStage && me.alive) {
    for (const a of s.rules.roles[me.role].abilities) {
      if (a.kind === "last_shot" || a.kind === "heal" || a.kind === "observe" || (me.uses[a.id] ?? 0) <= 0) continue;
      abilities.push({
        id: a.id,
        kind: a.kind,
        targets: a.kind === "protect" && a.allowSelf !== false ? alive.map((p) => p.id) : others,
        usesLeft: a.uses === null ? null : me.uses[a.id] ?? 0,
        groupSize: a.kind === "inspect_group" ? Math.min(a.groupSize ?? 3, others.length) : void 0,
        forbidden: a.noRepeatTarget ? me.lastTarget[a.id] ?? null : void 0,
        choice: s.nightActions[id]?.[a.id] ?? null
      });
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
      leading: top > 0 ? Object.keys(counts).filter((k) => counts[k] === top) : [],
      locked: phase.kind === "night" && phase.stage === "heal"
    };
  }
  let lastShot = null;
  if (!me.alive && id in s.hunterShots) {
    const open = phase.kind === "council" && phase.council.step === "result" || phase.kind === "morning";
    lastShot = { open, targets: alive.map((p) => p.id), chosen: s.hunterShots[id] ?? null };
  }
  let myBallot = null;
  if (phase.kind === "speaker_election") myBallot = phase.votes[id] ?? null;
  if (phase.kind === "council") myBallot = phase.council.votes[id] ?? null;
  let observation = null;
  const obsAbility = me.alive ? s.rules.roles[me.role].abilities.find((a) => a.kind === "observe") : void 0;
  if (obsAbility) {
    const o = s.night?.observers[id];
    observation = {
      available: actStage && !o,
      open: !!o?.open,
      hint: o?.open ? o.hint : null,
      startedAt: o?.open ? o.windowStartedAt : null,
      windowMs: obsAbility.windowMs ?? 1e4
    };
  }
  const lookout2 = isPack && s.rules.lookout.enabled ? { available: actStage && !s.night?.lookoutUsed } : null;
  let heal = null;
  if (me.alive && phase.kind === "night" && phase.stage === "heal" && s.night?.lockedTarget) {
    const ab2 = s.rules.roles[me.role].abilities.find((a) => a.kind === "heal");
    if (ab2 && (me.uses[ab2.id] ?? 0) > 0) heal = { victim: s.night.lockedTarget, decided: s.night.healSave };
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
    abilities,
    sidePending: me.alive && me.sidePending,
    lastShot,
    readyCouncil: s.readyCouncil.includes(id),
    readyAdvance: s.readyAdvance.includes(id),
    myBallot,
    panel: panelFor(s, id),
    observation,
    lookout: lookout2,
    heal
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
      roster: loaded.players.map((p) => ({ id: p.id, name: p.name, profile: { age: p.age, gender: p.gender, hair: p.hair, eyes: p.eyes } })),
      roleModes: loaded.room.role_modes,
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
  const title = "Das Dorf";
  if (next.moment && next.moment.secret && next.moment.id !== prev?.moment?.id) {
    return { title, body: "Im Dorf hat sich etwas ver\xE4ndert." };
  }
  if (prev && prev.phase === next.phase && prev.council?.step === next.council?.step) return null;
  switch (next.phase) {
    case "night":
      return { title, body: "Die Nacht beginnt." };
    case "morning":
      return { title, body: "Im Dorf hat sich etwas ver\xE4ndert." };
    case "council":
      return next.council?.step === "discussion" ? { title, body: "Das Dorf wird zusammengerufen." } : null;
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
function parseCommand(raw) {
  if (!isObj(raw) || typeof raw.type !== "string") return null;
  switch (raw.type) {
    case "tick":
      return { type: "tick", force: raw.force === true };
    case "ready":
      return (raw.topic === "council" || raw.topic === "advance") && typeof raw.value === "boolean" ? { type: "ready", topic: raw.topic, value: raw.value } : null;
    case "start_council":
      return { type: "start_council" };
    case "start_vote":
      return { type: "start_vote" };
    case "lookout":
      return { type: "lookout" };
    case "observe":
      return raw.action === "start" || raw.action === "ping" || raw.action === "stop" ? { type: "observe", action: raw.action } : null;
    case "heal_decision":
      return typeof raw.save === "boolean" ? { type: "heal_decision", save: raw.save } : null;
    case "suspect":
      return Array.isArray(raw.targets) && raw.targets.length <= 14 && raw.targets.every(isId) ? { type: "suspect", targets: raw.targets } : null;
    case "quest_done":
      return { type: "quest_done" };
    case "vote_speaker":
    case "vote":
    case "decide_tie":
    case "pack_target":
    case "hunter_shoot":
      return isId(raw.target) ? { type: raw.type, target: raw.target } : null;
    case "night_action": {
      if (typeof raw.ability !== "string" || !/^[a-z_]{1,32}$/.test(raw.ability)) return null;
      if (raw.target !== void 0 && !isId(raw.target)) return null;
      if (raw.targets !== void 0 && !(Array.isArray(raw.targets) && raw.targets.length <= 14 && raw.targets.every(isId))) return null;
      return { type: "night_action", ability: raw.ability, target: raw.target, targets: raw.targets };
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
