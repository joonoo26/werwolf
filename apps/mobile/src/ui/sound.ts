// Klang-Hook: bewusst ohne Audiodateien (Rechte/Lizenz offen, siehe OPEN_DECISIONS). Alle Geräte rufen bei jedem
// geheimen Moment denselben Cue auf – unabhängig davon, ob der Moment die Person betrifft.
export type Cue = 'moment';
type Player = (cue: Cue) => void;
let player: Player | null = null;
export const setCuePlayer = (p: Player | null) => { player = p; };
export const playCue = (cue: Cue) => { try { player?.(cue); } catch { /* Ton ist optional */ } };
