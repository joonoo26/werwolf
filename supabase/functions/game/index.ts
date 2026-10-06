// Edge Function „game": einzige Schreib-Schnittstelle für Spielzustand.
// Identität kommt ausschließlich aus dem verifizierten JWT. Clients senden nur Befehle.
// @ts-nocheck – läuft unter Deno; Typen kommen aus dem Bundle (packages/server).
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MESSAGE_PUSH, VersionConflictError, handleCommand, handleTick, neutralPush, parseCommand, startGame, sweep,
} from '../_shared/dorf.js';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sweepSecret = Deno.env.get('SWEEP_SECRET') ?? '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

const store = {
  async load(roomId: string) {
    const { data, error } = await admin.rpc('server_load_game', { p_room: roomId });
    if (error) throw error;
    return data;
  },
  async commit(roomId: string, expected: number, p: any) {
    const { data, error } = await admin.rpc('server_commit_game', {
      p_room: roomId, p_expected_version: expected, p_state: p.state, p_public: p.public, p_private: p.private,
      p_pack_members: p.packMembers, p_alive: p.alive,
      p_next_deadline: p.nextDeadlineMs === null ? null : new Date(p.nextDeadlineMs).toISOString(),
      p_status: p.status,
    });
    if (error) {
      if (error.code === '40001') throw new VersionConflictError();
      throw error;
    }
    return data as number;
  },
  async start(roomId: string, hostUserId: string, p: any) {
    const { data, error } = await admin.rpc('server_start_game', {
      p_room: roomId, p_host_user: hostUserId, p_state: p.state, p_public: p.public, p_private: p.private,
      p_pack_members: p.packMembers, p_alive: p.alive,
      p_next_deadline: p.nextDeadlineMs === null ? null : new Date(p.nextDeadlineMs).toISOString(),
    });
    if (error) throw new Error(error.message);
    return data as number;
  },
  async dueRooms(nowMs: number) {
    const { data, error } = await admin.rpc('server_due_rooms', { p_now: new Date(nowMs).toISOString() });
    if (error) throw error;
    return data as string[];
  },
};

async function push(roomId: string, message: { title: string; body: string }, exceptUserId?: string) {
  const { data } = await admin.rpc('server_push_tokens', { p_room: roomId });
  const targets = (data ?? []).filter((t: any) => t.user_id !== exceptUserId).map((t: any) => ({
    to: t.token, title: message.title, body: message.body, sound: null, // identisch für alle, kein Rollenbezug
  }));
  if (targets.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(targets),
  }).catch(() => {});
}

async function authenticate(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id, token };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const now = Date.now();

  try {
    if (body.action === 'sweep') {
      if (!sweepSecret || req.headers.get('x-sweep-secret') !== sweepSecret) return json({ error: 'forbidden' }, 403);
      return json(await sweep(store, now));
    }

    if (body.action === 'cleanup') {
      // Löscht abgelaufene Räume samt Gastspieler-Daten; Profilfotos zuerst über die Storage-API (nicht per SQL).
      if (!sweepSecret || req.headers.get('x-sweep-secret') !== sweepSecret) return json({ error: 'forbidden' }, 403);
      const { data: rows } = await admin.rpc('server_purge_candidates');
      const paths = (rows ?? []).map((r: any) => r.photo_path).filter(Boolean);
      for (let i = 0; i < paths.length; i += 100) await admin.storage.from('profile-photos').remove(paths.slice(i, i + 100));
      const { data: purged } = await admin.rpc('server_cleanup');
      return json({ purged, photos: paths.length });
    }

    const user = await authenticate(req);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const roomId = typeof body.roomId === 'string' ? body.roomId : '';
    if (!/^[0-9a-f-]{36}$/.test(roomId)) return json({ error: 'invalid_room' }, 400);

    let result;
    switch (body.action) {
      case 'start': {
        const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
        result = await startGame(store, { roomId, userId: user.id, now, seed });
        break;
      }
      case 'command': {
        const command = parseCommand(body.command);
        if (!command) return json({ error: 'invalid_command' }, 400);
        result = await handleCommand(store, { roomId, userId: user.id, command, now });
        break;
      }
      case 'tick':
        result = await handleTick(store, { roomId, now });
        break;
      case 'message': {
        // Läuft mit der Sitzung des Nutzers: RLS/Security-Definer-Funktion prüft Mitgliedschaft, PIN, Leben.
        const userClient = createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${user.token}` } }, auth: { persistSession: false },
        });
        const { error } = await userClient.rpc('send_message', { p_channel: body.channelId, p_body: body.text });
        if (error) return json({ ok: false, code: error.message }, 400);
        await push(roomId, MESSAGE_PUSH, user.id);
        return json({ ok: true });
      }
      default:
        return json({ error: 'unknown_action' }, 400);
    }
    if (!result.ok) return json(result, 400);
    if (result.changed) {
      const note = neutralPush(result.prev, result.next);
      if (note) await push(roomId, note);
    }
    return json({ ok: true, version: result.version, serverNow: now });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});
