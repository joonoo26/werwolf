// Spielrückblick aus den geheimen Verdachtsabgaben (nur nach Spielende veröffentlicht).
import type { GameState, PlayerId } from './types';

export interface Retrospective {
  /** „A hatte B seit Tag X im Verdacht": Paare, die in mindestens zwei Abgaben von A vorkamen. */
  suspicionStreaks: { by: PlayerId; target: PlayerId; sinceDay: number; nights: number }[];
  /** Niemand verdächtigte diese Spieler. */
  neverSuspected: PlayerId[];
  /** Diese Spieler verdächtigten während der gesamten Partie kein einziges Rudelmitglied. */
  neverSuspectedPack: PlayerId[];
}

export function retrospective(s: GameState): Retrospective {
  const entries = s.suspicions;
  const mentioned = new Set<PlayerId>();
  const pairs = new Map<string, { by: PlayerId; target: PlayerId; days: number[] }>();
  const byPlayer = new Map<PlayerId, number>();
  const hitPack = new Set<PlayerId>();
  for (const e of entries) {
    byPlayer.set(e.by, (byPlayer.get(e.by) ?? 0) + 1);
    for (const t of e.targets) {
      mentioned.add(t);
      const key = `${e.by}>${t}`;
      const p = pairs.get(key) ?? { by: e.by, target: t, days: [] };
      p.days.push(e.day);
      pairs.set(key, p);
      if (s.players[t]?.faction === 'pack') hitPack.add(e.by);
    }
  }
  const suspicionStreaks = [...pairs.values()]
    .filter((p) => p.days.length >= 2)
    .map((p) => ({ by: p.by, target: p.target, sinceDay: Math.min(...p.days), nights: p.days.length }))
    .sort((a, b) => b.nights - a.nights || a.sinceDay - b.sinceDay)
    .slice(0, 5);
  const all = Object.keys(s.players);
  return {
    suspicionStreaks,
    neverSuspected: entries.length ? all.filter((id) => !mentioned.has(id)) : [],
    neverSuspectedPack: all.filter((id) => (byPlayer.get(id) ?? 0) > 0 && !hitPack.has(id)),
  };
}
