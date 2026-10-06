import type { PublicView } from '@dorf/engine';

/** Welche Vollbild-Inszenierung zeigt das Dorf-Tab für den aktuellen öffentlichen Zustand? */
export type Stage = 'speaker' | 'day' | 'council' | 'dusk' | 'night' | 'morning' | 'ended';

export function stageFor(view: PublicView): Stage {
  switch (view.phase) {
    case 'speaker_election': return 'speaker';
    case 'council': return 'council';
    default: return view.phase as Stage;
  }
}

export interface ChronicleLine {
  id: number;
  day: number;
  text: string;
}

/** Öffentliche Chronik in ruhigem Ton; verrät nie Rollen. */
export function chronicle(view: PublicView): ChronicleLine[] {
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  const lines: ChronicleLine[] = [];
  for (const e of view.events) {
    let text: string | null = null;
    switch (e.kind) {
      case 'game_started': text = 'Das Dorf erwacht.'; break;
      case 'speaker_elected': text = `${name(e.players?.[0] ?? '')} spricht ab jetzt für das Dorf.`; break;
      case 'quest_started': text = 'Eine Quest beginnt.'; break;
      case 'quest_ended': text = 'Die Quest ist beendet.'; break;
      case 'council_ready': text = 'Das Dorf ist bereit für einen Dorfrat.'; break;
      case 'council_started': text = 'Das Dorf wird zusammengerufen.'; break;
      case 'banished': text = `${name(e.players?.[0] ?? '')} wurde aus dem Dorf verbannt.`; break;
      case 'night_began': text = 'Die Nacht beginnt.'; break;
      case 'eliminated': text = `${name(e.players?.[0] ?? '')} ist in der Nacht ausgeschieden.`; break;
      case 'morning': text = (e.players?.length ?? 0) === 0 ? 'Die Nacht verging ruhig.' : null; break;
      case 'last_shot': text = `Ein letzter Schuss fiel. ${name(e.players?.[1] ?? '')} scheidet aus.`; break;
      case 'impulse': text = 'Im Dorf hat sich etwas verändert.'; break;
      case 'game_ended': text = 'Das Spiel ist zu Ende.'; break;
      default: break;
    }
    if (text) lines.push({ id: e.id, day: e.day, text });
  }
  return lines;
}
