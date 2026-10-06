import type { Command } from '@dorf/engine';
import { useCallback, useState } from 'react';
import { sendCommand } from '../lib/api';
import { useRoom } from '../lib/room';
import { haptic } from '../ui/primitives';

/** Sendet Befehle an den Server (Server bleibt Source of Truth). Liefert Busy- und Fehlerzustand. */
export function useAct() {
  const { roomId, refresh } = useRoom();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = useCallback(
    async (command: Command): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await sendCommand(roomId, command);
        haptic('success');
        void refresh();
        return true;
      } catch (e) {
        setError((e as Error).message || 'unknown');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [roomId, refresh],
  );
  return { act, busy, error };
}
