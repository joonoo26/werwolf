import { simulateGame, type GameResult } from './policy';
import type { DeepPartial, Rules } from '../src/types';

export type ConfigId = 'none' | 'director' | 'bw_village' | 'bw_pack' | 'bw_village_norepl' | 'bw_pack_norepl';

export const CONFIG_LABELS: Record<ConfigId, string> = {
  none: '1 ohne Sonderrollen',
  director: '2 aktueller Rollen-Direktor',
  bw_village: '3 Grenzgänger → Dorf',
  bw_pack: '4 Grenzgänger → Rudel',
  bw_village_norepl: '3b Grenzgänger → Dorf (ohne Wolf-Ersatz)',
  bw_pack_norepl: '4b Grenzgänger → Rudel (ohne Wolf-Ersatz)',
};

const ALL_BANDS = (v: unknown) => ({ tiny: v, small: v, medium: v, large: v });
const OTHERS = ['scout', 'tracker', 'alchemist', 'guardian', 'hunter', 'shadowwolf', 'observer'];

export function rulesFor(cfg: ConfigId): { rules: DeepPartial<Rules> | undefined; bwChoice?: 'village' | 'pack' } {
  switch (cfg) {
    case 'none':
      return { rules: { startSpecials: ALL_BANDS([{ count: 0, weight: 1 }]), maxLaterSpecials: ALL_BANDS(0) } as never };
    case 'director':
      return { rules: undefined };
    default: {
      const replace = !cfg.endsWith('norepl');
      return {
        bwChoice: cfg.startsWith('bw_pack') ? 'pack' : 'village',
        rules: {
          borderwalkerReplacesWolf: replace,
          startSpecials: ALL_BANDS([{ count: 1, weight: 1 }]),
          maxLaterSpecials: ALL_BANDS(0),
          roles: { ...Object.fromEntries(OTHERS.map((r) => [r, { enabled: false }])), borderwalker: { minPlayers: 6, enabled: true } },
        } as never,
      };
    }
  }
}

export interface CellStats {
  n: number;
  cfg: ConfigId;
  games: number;
  villageWins: number;
  sumRounds: number;
  rounds1: number;
  rounds2: number;
  sumAlive: number;
  sumPackStart: number;
  withSpecial: { games: number; villageWins: number };
  noSpecial: { games: number; villageWins: number };
  byRole: Record<string, { games: number; villageWins: number }>;
  roundsHist: Record<number, number>;
}

export function runCell(n: number, cfg: ConfigId, games: number): CellStats {
  const { rules, bwChoice } = rulesFor(cfg);
  const st: CellStats = {
    n, cfg, games, villageWins: 0, sumRounds: 0, rounds1: 0, rounds2: 0, sumAlive: 0, sumPackStart: 0,
    withSpecial: { games: 0, villageWins: 0 }, noSpecial: { games: 0, villageWins: 0 }, byRole: {}, roundsHist: {},
  };
  for (let i = 0; i < games; i++) {
    const r: GameResult = simulateGame({ n, seed: `${cfg}-${n}-${i}`, rules, bwChoice });
    const v = r.winner === 'village' ? 1 : 0;
    st.villageWins += v;
    st.sumRounds += r.rounds;
    if (r.rounds <= 1) st.rounds1++;
    if (r.rounds <= 2) st.rounds2++;
    st.sumAlive += r.aliveAtEnd;
    st.sumPackStart += r.packAtStart;
    st.roundsHist[r.rounds] = (st.roundsHist[r.rounds] ?? 0) + 1;
    const bucket = r.rolesSeen.length > 0 ? st.withSpecial : st.noSpecial;
    bucket.games++;
    bucket.villageWins += v;
    for (const role of r.rolesSeen) {
      const b = (st.byRole[role] ??= { games: 0, villageWins: 0 });
      b.games++;
      b.villageWins += v;
    }
  }
  return st;
}
