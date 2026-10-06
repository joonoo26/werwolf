import type { PublicView } from '@dorf/engine';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { tickRoom } from './api';
import { supabase } from './supabase';

export interface RoomRow {
  id: string;
  code: string;
  status: 'lobby' | 'running' | 'ended';
  mode: 'classic' | 'evening';
  target_minutes: number | null;
  host_user_id: string;
  ad_free: boolean;
}
export interface PlayerRow {
  id: string;
  user_id: string;
  name: string;
  ready: boolean;
  alive: boolean;
}

interface RoomCtx {
  roomId: string;
  /** null = Dorfanzeige ohne Spielerplatz. */
  me: PlayerRow | null;
  userId: string;
  room: RoomRow | null;
  players: PlayerRow[];
  pub: PublicView | null;
  loaded: boolean;
  /** Serverzeit in ms (Geräteuhr + Versatz). */
  serverNow: () => number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<RoomCtx | null>(null);
export const useRoom = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRoom außerhalb von RoomProvider');
  return c;
};

/** Nächste Frist im öffentlichen Zustand (für den Auto-Tick). */
export function publicDeadline(pub: PublicView): number | null {
  const c = [pub.phaseEndsAt, pub.quest?.endsAt, pub.phase === 'dusk' ? pub.nightAt : null].filter(
    (x): x is number => typeof x === 'number',
  );
  return c.length ? Math.min(...c) : null;
}

export interface RoomFixture {
  room: RoomRow;
  players: PlayerRow[];
  pub: PublicView | null;
  /** Gedachte „Jetzt"-Zeit der Vorschau (Serverzeit). */
  now?: number;
}

/** `fixture` ersetzt das Netzwerk komplett (nur für Vorschau/Screenshots, nie im Spielbetrieb). */
export function RoomProvider({ roomId, userId, children, fixture }: { roomId: string; userId: string; children: ReactNode; fixture?: RoomFixture }) {
  const [room, setRoom] = useState<RoomRow | null>(fixture?.room ?? null);
  const [players, setPlayers] = useState<PlayerRow[]>(fixture?.players ?? []);
  const [pub, setPub] = useState<PublicView | null>(fixture?.pub ?? null);
  const [loaded, setLoaded] = useState(!!fixture);
  const offset = useRef(fixture?.now ? fixture.now - Date.now() : 0);
  const version = useRef(0);

  const refresh = useCallback(async () => {
    const [r, p, s] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('players').select('id,user_id,name,ready,alive').eq('room_id', roomId).order('joined_at'),
      supabase.from('public_state').select('version,data').eq('room_id', roomId).maybeSingle(),
    ]);
    if (r.data) setRoom(r.data as RoomRow);
    if (p.data) setPlayers(p.data as PlayerRow[]);
    if (s.data && s.data.version >= version.current) {
      version.current = s.data.version;
      setPub(s.data.data as PublicView);
    }
    setLoaded(true);
  }, [roomId]);

  const syncClock = useCallback(async () => {
    const t0 = Date.now();
    const { data } = await supabase.rpc('server_now');
    if (typeof data === 'string') {
      const rtt = Date.now() - t0;
      offset.current = new Date(data).getTime() + rtt / 2 - Date.now();
    }
  }, []);

  useEffect(() => {
    if (fixture) return;
    void refresh();
    void syncClock();
    const ch = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_state', filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload.new as { version?: number; data?: PublicView };
        if (row?.data && (row.version ?? 0) >= version.current) {
          version.current = row.version ?? version.current;
          setPub(row.data);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => void refresh())
      .subscribe();
    const poll = setInterval(() => void refresh(), 20_000);
    const clock = setInterval(() => void syncClock(), 60_000);
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void refresh();
        void syncClock();
      }
    });
    return () => {
      void supabase.removeChannel(ch);
      clearInterval(poll);
      clearInterval(clock);
      app.remove();
    };
  }, [roomId, refresh, syncClock, fixture]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  // Auto-Tick: jedes Gerät darf Fristen anstoßen (Server prüft). So blockiert kein ausgefallenes Gerät das Spiel.
  useEffect(() => {
    if (fixture || !pub || pub.phase === 'ended') return;
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      const deadline = publicDeadline(pub);
      const due = deadline !== null && serverNow() >= deadline;
      const graceTick = deadline === null; // Klassisch: Mehrheit + Karenzzeit
      if (due || graceTick) {
        await new Promise((r) => setTimeout(r, Math.random() * 1500));
        if (!cancelled) await tickRoom(roomId).catch(() => {});
      }
    };
    const id = setInterval(() => void loop(), deadline_interval(pub, serverNow()));
    void loop();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pub, roomId, serverNow, fixture]);

  const me = useMemo(() => players.find((p) => p.user_id === userId) ?? null, [players, userId]);
  const value = useMemo<RoomCtx>(
    () => ({ roomId, me, userId, room, players, pub, loaded, serverNow, refresh }),
    [roomId, me, userId, room, players, pub, loaded, serverNow, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function deadline_interval(pub: PublicView, now: number): number {
  const d = publicDeadline(pub);
  if (d === null) return 15_000;
  return d - now > 5_000 ? 4_000 : 1_500;
}
