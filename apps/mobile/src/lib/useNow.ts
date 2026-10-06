import { useEffect, useState } from 'react';
import { useRoom } from './room';

/** Serverzeit, die sich im Takt aktualisiert (für Countdowns). */
export function useNow(intervalMs = 250): number {
  const { serverNow } = useRoom();
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [serverNow, intervalMs]);
  return now;
}
