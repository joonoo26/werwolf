import type { Command, EyeColor, Gender, HairColor } from '@dorf/engine';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Postgres-Fehler tragen den Code im Message-Text (z. B. "name_taken"). */
function fail(error: { message: string }): never {
  const m = /([a-z_]{4,})/.exec(error.message);
  throw new ApiError(m?.[1] ?? 'unknown');
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

export interface RoomRef {
  room_id: string;
  code: string;
  player_id: string;
}

export interface ProfileInput {
  age: number;
  gender: Gender;
  hair: HairColor;
  eyes: EyeColor;
}
const profileArgs = (p: ProfileInput) => ({ p_age: p.age, p_gender: p.gender, p_hair: p.hair, p_eyes: p.eyes });

export const createRoom = (name: string, pin: string, profile: ProfileInput, mode: 'classic' | 'evening', minutes?: number) =>
  rpc<RoomRef>('create_room', { p_name: name, p_pin: pin, ...profileArgs(profile), p_mode: mode, p_target_minutes: mode === 'evening' ? minutes : null });
export const joinRoom = (code: string, name: string, pin: string, profile: ProfileInput) =>
  rpc<RoomRef>('join_room', { p_code: code, p_name: name, p_pin: pin, ...profileArgs(profile) });
export const setPhoto = (room: string, path: string | null) => rpc<void>('set_photo', { p_room: room, p_path: path });
export const saveNote = (room: string, about: string, body: string) => rpc<void>('save_note', { p_room: room, p_about: about, p_body: body });
export const reclaimPlayer = (code: string, name: string, pin: string) =>
  rpc<RoomRef & { ok: boolean }>('reclaim_player', { p_code: code, p_name: name, p_pin: pin });
export const joinDisplay = (code: string) => rpc<{ room_id: string; code: string }>('join_display', { p_code: code });
export const setReady = (room: string, ready: boolean) => rpc<void>('set_ready', { p_room: room, p_ready: ready });
export const leaveRoom = (room: string) => rpc<void>('leave_room', { p_room: room });
export const removePlayer = (room: string, player: string) => rpc<void>('remove_player', { p_room: room, p_player: player });
export const verifyPin = (room: string, pin: string) => rpc<{ ok: boolean; retry_after: number }>('verify_pin', { p_room: room, p_pin: pin });
export const touchUnlock = (room: string) => rpc<boolean>('touch_unlock', { p_room: room });
export const lockPrivate = (room: string) => rpc<void>('lock_private', { p_room: room });
export const openDm = (room: string, other: string) => rpc<string>('open_dm', { p_room: room, p_other: other });
export const markRead = (channel: string) => rpc<void>('mark_read', { p_channel: channel });
export const registerPushToken = (token: string, platform: string) => rpc<void>('register_push_token', { p_token: token, p_platform: platform });

async function game(body: Record<string, unknown>): Promise<{ serverNow?: number }> {
  const { data, error } = await supabase.functions.invoke('game', { body });
  if (error) {
    let code = 'unknown';
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      code = j?.code ?? j?.error ?? code;
    } catch {
      /* ignorieren */
    }
    throw new ApiError(code);
  }
  return data as { serverNow?: number };
}

export const startGame = (roomId: string) => game({ action: 'start', roomId });
export const sendCommand = (roomId: string, command: Command) => game({ action: 'command', roomId, command });
export const tickRoom = (roomId: string) => game({ action: 'tick', roomId });
export const sendMessage = (roomId: string, channelId: string, text: string) => game({ action: 'message', roomId, channelId, text });

export const errorText = (e: unknown, map: Record<string, string>, fallback: string) =>
  e instanceof ApiError ? (map[e.code] ?? fallback) : fallback;
