// Abendmodus: verteilt Tage, Quests und Dorfräte über die gewählte Zieldauer.
import type { Rules } from './types';

export interface DayPlan {
  nightAt: number;
  councilBy: number;
  questTimes: number[];
}

/**
 * Schlimmster Fall: In jeder Runde scheidet je ein Nicht-Rudel-Spieler durch
 * Dorfrat und Nacht aus. Dann fehlen noch ceil((nichtRudel − Rudel) / 2) Runden
 * bis zur Rudel-Siegbedingung. Die verbleibende Zeit wird gleichmäßig darauf verteilt;
 * endet das Spiel früher, endet es früher (GAME_DESIGN §3).
 */
export function roundsLeft(nonPackAlive: number, packAlive: number): number {
  return Math.max(1, Math.ceil((nonPackAlive - packAlive) / 2));
}

export function planDay(opts: {
  now: number;
  targetEndsAt: number;
  nonPackAlive: number;
  packAlive: number;
  rules: Rules;
}): DayPlan {
  const { now, targetEndsAt, nonPackAlive, packAlive, rules } = opts;
  const rounds = roundsLeft(nonPackAlive, packAlive);
  const remaining = Math.max(0, targetEndsAt - now);
  const roundLen = remaining / rounds;
  const overhead = rules.durations.nightMs + rules.durations.morningMs;
  const dayLen = Math.max(rules.evening.minDayMs, roundLen - overhead);
  const nightAt = now + dayLen;
  const councilBy = Math.max(now + 60_000, nightAt - rules.evening.councilBudgetMs);

  const span = councilBy - now;
  const q = Math.max(0, Math.min(rules.evening.maxQuestsPerDay, Math.floor(span / rules.evening.questSpacingMs)));
  const questTimes: number[] = [];
  for (let k = 1; k <= q; k++) questTimes.push(Math.round(now + (span * k) / (q + 1)));
  return { nightAt, councilBy, questTimes };
}
