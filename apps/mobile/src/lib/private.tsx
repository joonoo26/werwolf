import type { PrivateView } from '@dorf/engine';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { lockPrivate, touchUnlock, verifyPin } from './api';
import { useRoom } from './room';
import { supabase } from './supabase';
import { IDLE_LOCK_MS, TOUCH_INTERVAL_MS, shouldLock } from '../logic/lock';

interface PrivateCtx {
  unlocked: boolean;
  data: PrivateView | null;
  unread: number;
  /** Liefert Wartezeit in Sekunden bei Sperre, 0 bei Erfolg, -1 bei falschem PIN. */
  unlock: (pin: string) => Promise<number>;
  lock: () => void;
  /** Erzwingt eine frische PIN-Eingabe (Beginn eines geheimen Moments). */
  relock: () => void;
  touch: () => void;
}

const Ctx = createContext<PrivateCtx | null>(null);
export const usePrivate = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrivate außerhalb von PrivateProvider');
  return c;
};

/**
 * Hält den PIN-Entsperrzustand. Der Server liefert private Daten nur, solange `unlocked_until`
 * in der Zukunft liegt (RLS). Lokal sperrt die App zusätzlich nach Inaktivität und im Hintergrund.
 */
export function PrivateProvider({ children, fixture }: { children: ReactNode; fixture?: PrivateView }) {
  const { roomId, me } = useRoom();
  const [unlocked, setUnlocked] = useState(!!fixture);
  const [data, setData] = useState<PrivateView | null>(fixture ?? null);
  const [unread, setUnread] = useState(0);
  const last = useRef(Date.now());

  const lock = useCallback(() => {
    setUnlocked(false);
    setData(null); // geheime Daten verlassen den Speicher
    void lockPrivate(roomId).catch(() => {});
  }, [roomId]);

  const relock = useCallback(() => {
    if (!fixture) lock();
  }, [lock, fixture]);

  const touch = useCallback(() => {
    last.current = Date.now();
  }, []);

  const load = useCallback(async () => {
    if (!me) return;
    const { data: row } = await supabase.from('player_private').select('data').eq('player_id', me.id).maybeSingle();
    if (row) setData(row.data as PrivateView);
    else setUnlocked(false); // Server verweigert → gesperrt/ausgeschieden
  }, [me]);

  const unlock = useCallback(
    async (pin: string) => {
      const r = await verifyPin(roomId, pin);
      if (!r.ok) return r.retry_after > 0 ? r.retry_after : -1;
      last.current = Date.now();
      setUnlocked(true);
      await load();
      return 0;
    },
    [roomId, load],
  );

  // Neutraler Ungelesen-Zähler (ohne PIN lesbar).
  useEffect(() => {
    if (!me || fixture) return;
    const read = async () => {
      const { data: s } = await supabase.from('player_status').select('unread').eq('player_id', me.id).maybeSingle();
      if (s) setUnread(s.unread);
    };
    void read();
    const ch = supabase
      .channel(`status:${me.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_status', filter: `player_id=eq.${me.id}` }, (p) => {
        const row = p.new as { unread?: number };
        if (typeof row?.unread === 'number') setUnread(row.unread);
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [me, fixture]);

  // Live-Updates privater Daten (nur solange entsperrt).
  useEffect(() => {
    if (!unlocked || !me || fixture) return;
    const ch = supabase
      .channel(`private:${me.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_private', filter: `player_id=eq.${me.id}` }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [unlocked, me, load, fixture]);

  // Inaktivität, Hintergrund, Server-Verlängerung.
  useEffect(() => {
    if (!unlocked || fixture) return;
    const idle = setInterval(() => {
      if (shouldLock(last.current, Date.now(), IDLE_LOCK_MS)) lock();
    }, 3_000);
    const keep = setInterval(async () => {
      if (Date.now() - last.current < TOUCH_INTERVAL_MS * 1.5) {
        const ok = await touchUnlock(roomId).catch(() => false);
        if (!ok) lock();
      }
    }, TOUCH_INTERVAL_MS);
    const app = AppState.addEventListener('change', (s) => {
      if (s !== 'active') lock();
    });
    return () => {
      clearInterval(idle);
      clearInterval(keep);
      app.remove();
    };
  }, [unlocked, roomId, lock, fixture]);

  const value = useMemo(() => ({ unlocked, data, unread, unlock, lock, relock, touch }), [unlocked, data, unread, unlock, lock, relock, touch]);
  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }} onTouchStart={touch}>
        {children}
      </View>
    </Ctx.Provider>
  );
}
