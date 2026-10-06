// Wahre, möglichst nicht eindeutige Aussagen aus Spielerprofilen (Beobachter-Hinweis, „Ausschau halten").
// Aus den exakten Profildaten werden bei Bedarf gröbere wahre Aussagen erzeugt („über 30", „dunkle Haare").
import type { Rng } from './rng';
import type { EyeColor, HairColor, Profile, TraitStatement } from './types';

const AGE_THRESHOLDS = [20, 30, 40, 50];
const DARK_HAIR: HairColor[] = ['black', 'brown'];
const LIGHT_HAIR: HairColor[] = ['blonde', 'gray'];
const LIGHT_EYES: EyeColor[] = ['blue', 'green', 'gray'];

export function holds(st: TraitStatement, p: Profile): boolean {
  switch (st.trait) {
    case 'gender':
      return p.gender === st.value;
    case 'hair':
      if (st.value === 'dark') return DARK_HAIR.includes(p.hair);
      if (st.value === 'light') return LIGHT_HAIR.includes(p.hair);
      return p.hair === st.value;
    case 'eyes':
      if (st.value === 'light') return LIGHT_EYES.includes(p.eyes);
      return p.eyes === st.value;
    case 'age_over':
      return p.age > st.value;
    case 'age_under':
      return p.age < st.value;
  }
}

/** Alle wahren Aussagen über ein Profil – genau ein Merkmal je Aussage. */
export function trueStatements(p: Profile): TraitStatement[] {
  const out: TraitStatement[] = [
    { trait: 'gender', value: p.gender },
    { trait: 'hair', value: p.hair },
    { trait: 'eyes', value: p.eyes },
  ];
  if (DARK_HAIR.includes(p.hair)) out.push({ trait: 'hair', value: 'dark' });
  if (LIGHT_HAIR.includes(p.hair)) out.push({ trait: 'hair', value: 'light' });
  if (LIGHT_EYES.includes(p.eyes)) out.push({ trait: 'eyes', value: 'light' });
  for (const t of AGE_THRESHOLDS) {
    if (p.age > t) out.push({ trait: 'age_over', value: t });
    if (p.age < t) out.push({ trait: 'age_under', value: t });
  }
  return out;
}

/**
 * Wählt eine wahre Aussage über `subject`, die möglichst auf mehrere Personen der Gruppe zutrifft
 * (mindestens zwei, aber nicht auf alle). Gibt es keine solche, wird die am wenigsten eindeutige gewählt.
 */
export function pickStatement(subject: Profile, group: Profile[], rng: Rng): TraitStatement {
  const all = trueStatements(subject).map((st) => ({ st, n: group.filter((g) => holds(st, g)).length }));
  const ambiguous = all.filter((x) => x.n >= 2 && x.n < group.length);
  if (ambiguous.length) return rng.pick(ambiguous).st;
  const multi = all.filter((x) => x.n >= 2);
  if (multi.length) return rng.pick(multi).st;
  const best = Math.max(...all.map((x) => x.n));
  return rng.pick(all.filter((x) => x.n === best)).st;
}

/** Zufälliges, aber gültiges Standardprofil (Tests/Roster ohne Profil), deterministisch aus der ID. */
export function defaultProfile(id: string): Profile {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const genders = ['female', 'male', 'diverse'] as const;
  const hairs = ['black', 'brown', 'blonde', 'red', 'gray'] as const;
  const eyes = ['brown', 'blue', 'green', 'gray'] as const;
  return {
    age: 18 + (h % 50),
    gender: genders[h % 3]!,
    hair: hairs[(h >> 3) % 5]!,
    eyes: eyes[(h >> 6) % 4]!,
  };
}
