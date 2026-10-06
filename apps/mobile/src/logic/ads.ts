// Werbe-Regeln (GAME_DESIGN §21). Es ist bewusst KEIN Werbe-SDK eingebunden; diese Funktion ist die
// einzige Stelle, die entscheidet, ob eine Anzeige erscheinen DARF. Eine spätere Integration muss sie nutzen.
import type { PublicView } from '@dorf/engine';

export interface AdContext {
  /** Werbefrei für die gesamte Partie (vom Host gekauft). */
  adFree: boolean;
  surface: 'phone' | 'display';
  /** null = noch in der Lobby. */
  view: PublicView | null;
}

export function mayShowAd(c: AdContext): boolean {
  if (c.adFree) return false;
  if (c.surface === 'display') return false; // nie auf der Dorfanzeige
  if (c.view === null) return true; // Lobby
  // Nach Spielende erlaubt. Während der Partie gilt konservativ: nie, denn in jeder Phase
  // kann eine Abstimmung, Quest, Nacht- oder Rollenaktion offen sein.
  return c.view.phase === 'ended';
}
