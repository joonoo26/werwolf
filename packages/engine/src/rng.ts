// Seedbarer, deterministischer Zufall (sfc32). Der Zustand liegt im GameState,
// damit Partien reproduzierbar simuliert und getestet werden können.

export type RngState = [number, number, number, number];

function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Seed → Startzustand, aufgewärmt, damit schwache Seeds nicht sichtbar korrelieren. */
export function seedToState(seed: number[] | string): RngState {
  const r = new Rng(rawState(seed));
  for (let i = 0; i < 12; i++) r.next();
  return r.state();
}

function rawState(seed: number[] | string): RngState {
  if (typeof seed === 'string') {
    const a = hashString(seed);
    const b = hashString(seed + '#1');
    const c = hashString(seed + '#2');
    const d = hashString(seed + '#3');
    return [a, b, c, d];
  }
  const s = [0, 0, 0, 0].map((_, i) => (seed[i] ?? 0x9e3779b9 * (i + 1)) >>> 0);
  return [s[0]!, s[1]!, s[2]!, s[3]!];
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(state: RngState) {
    [this.a, this.b, this.c, this.d] = state;
  }

  /** Gleichverteilt in [0, 1). */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() auf leerer Liste');
    return items[this.int(items.length)] as T;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T | null {
    const weights = items.map((i) => Math.max(0, weight(i)));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i] as number;
      if (r < 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  /** Aktueller Zustand zum Zurückschreiben in den GameState. */
  state(): RngState {
    return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
  }
}
