import {
  applyCommand,
  createGame,
  nextDeadline,
  packChannelMembers,
  privateView,
  publicView,
  tick,
  type Command,
  type GameState,
  type PublicView,
} from '@dorf/engine';
import { VersionConflictError, type CommitPayload, type LoadedGame, type Store } from './store';

export type GameResult =
  | { ok: true; version: number; prev: PublicView | null; next: PublicView; changed: boolean }
  | { ok: false; code: string; message: string };

// Alle bis zu 14 Spieler können gleichzeitig abstimmen: genug Versuche + Jitter, damit keiner verliert.
const MAX_RETRIES = 30;

export function buildPayload(state: GameState): CommitPayload {
  const priv: CommitPayload['private'] = {};
  for (const id of Object.keys(state.players)) {
    const v = privateView(state, id);
    if (v) priv[id] = v;
  }
  return {
    state,
    public: publicView(state),
    private: priv,
    packMembers: packChannelMembers(state),
    alive: Object.values(state.players).filter((p) => p.alive).map((p) => p.id),
    nextDeadlineMs: nextDeadline(state),
    status: state.phase.kind === 'ended' ? 'ended' : 'running',
  };
}

const err = (code: string, message: string): GameResult => ({ ok: false, code, message });

export async function startGame(
  store: Store,
  input: { roomId: string; userId: string; now: number; seed: number[] },
): Promise<GameResult> {
  const loaded = await store.load(input.roomId);
  if (!loaded) return err('room_not_found', 'Raum nicht gefunden');
  if (loaded.room.host_user_id !== input.userId) return err('not_host', 'Nur der Host startet das Spiel');
  if (loaded.room.status !== 'lobby') return err('game_already_started', 'Das Spiel läuft bereits');
  if (!loaded.players.every((p) => p.ready)) return err('not_all_ready', 'Noch nicht alle sind bereit');
  const host = loaded.players.find((p) => p.user_id === input.userId);
  if (!host) return err('not_host', 'Host ist kein Spieler');

  let state: GameState;
  try {
    state = createGame({
      roster: loaded.players.map((p) => ({ id: p.id, name: p.name })),
      hostId: host.id,
      mode: loaded.room.mode,
      targetMinutes: loaded.room.target_minutes ?? undefined,
      seed: input.seed,
      now: input.now,
    });
  } catch (e) {
    return err('invalid_roster', e instanceof Error ? e.message : 'Ungültige Spielerzahl');
  }
  const payload = buildPayload(state);
  try {
    const version = await store.start(input.roomId, input.userId, payload);
    return { ok: true, version, prev: null, next: payload.public, changed: true };
  } catch (e) {
    return mapStoreError(e);
  }
}

function mapStoreError(e: unknown): GameResult {
  const msg = e instanceof Error ? e.message : String(e);
  for (const code of ['game_already_started', 'not_all_ready', 'not_host', 'roster_changed', 'room_not_found']) {
    if (msg.includes(code)) return err(code, code);
  }
  throw e;
}

async function mutate(
  store: Store,
  roomId: string,
  fn: (loaded: LoadedGame, state: GameState) => { ok: true; state: GameState } | { ok: false; code: string; message: string },
): Promise<GameResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const loaded = await store.load(roomId);
    if (!loaded) return err('room_not_found', 'Raum nicht gefunden');
    if (!loaded.state || loaded.room.status === 'lobby') return err('not_running', 'Das Spiel läuft nicht');
    const r = fn(loaded, loaded.state);
    if (!r.ok) return r;
    const prev = publicView(loaded.state);
    if (JSON.stringify(r.state) === JSON.stringify(loaded.state)) {
      return { ok: true, version: loaded.version, prev, next: prev, changed: false };
    }
    const payload = buildPayload(r.state);
    try {
      const version = await store.commit(roomId, loaded.version, payload);
      return { ok: true, version, prev, next: payload.public, changed: true };
    } catch (e) {
      if (e instanceof VersionConflictError) {
        await new Promise((r) => setTimeout(r, Math.random() * 15 * Math.min(attempt + 1, 6)));
        continue;
      }
      throw e;
    }
  }
  return err('conflict', 'Zu viele gleichzeitige Änderungen – bitte erneut versuchen');
}

/** Spielerbefehl. Die Identität kommt ausschließlich aus dem verifizierten JWT (userId). */
export function handleCommand(
  store: Store,
  input: { roomId: string; userId: string; command: Command; now: number },
): Promise<GameResult> {
  return mutate(store, input.roomId, (loaded, state) => {
    const player = loaded.players.find((p) => p.user_id === input.userId);
    if (!player) return { ok: false, code: 'not_a_player', message: 'Du gehörst nicht zu diesem Spiel' };
    const r = applyCommand(state, player.id, input.command, input.now);
    return r.ok ? r : { ok: false, code: r.error.code, message: r.error.message };
  });
}

/** Zeitschritt (Client-Tick oder Cron). Ändert nichts, solange keine Frist erreicht ist. */
export function handleTick(
  store: Store,
  input: { roomId: string; now: number },
): Promise<GameResult> {
  return mutate(store, input.roomId, (_loaded, state) => ({ ok: true, state: tick(state, input.now) }));
}

export async function sweep(store: Store, now: number): Promise<{ processed: number }> {
  const rooms = await store.dueRooms(now);
  let processed = 0;
  for (const roomId of rooms) {
    const r = await handleTick(store, { roomId, now });
    if (r.ok && r.changed) processed++;
  }
  return { processed };
}

/**
 * Neutrale Push-Texte: für alle Spieler identisch und ohne jeden Rollenbezug
 * (CLAUDE.md: keine Rolle darf durch Push-Text verraten werden).
 */
export function neutralPush(prev: PublicView | null, next: PublicView): { title: string; body: string } | null {
  if (prev && prev.phase === next.phase && prev.council?.step === next.council?.step) return null;
  const title = 'Das Dorf';
  switch (next.phase) {
    case 'night':
      return { title, body: 'Die Nacht beginnt.' };
    case 'morning':
      return { title, body: 'Im Dorf hat sich etwas verändert.' };
    case 'council':
      return next.council?.step === 'nomination' ? { title, body: 'Das Dorf wird zusammengerufen.' } : null;
    case 'ended':
      return { title, body: 'Das Spiel ist zu Ende.' };
    default:
      return null;
  }
}

export const MESSAGE_PUSH = { title: 'Das Dorf', body: 'Im Dorf gibt es eine neue Nachricht.' } as const;
