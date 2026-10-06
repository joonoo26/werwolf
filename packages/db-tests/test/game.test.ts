import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleCommand, handleTick, startGame, sweep } from '@dorf/server';
import type { GameState } from '@dorf/engine';
import { freshDb, lobby, type Db, type World } from './db';

let db: Db;
beforeAll(async () => (db = await freshDb()));
afterAll(async () => db.close());

const NOW = 1_800_000_000_000;
const seed = () => Array.from(randomBytes(16).subarray(0, 16)).slice(0, 4);

async function started(n = 10, opts: { mode?: 'classic' | 'evening'; minutes?: number } = {}) {
  const w = await lobby(db, n, opts);
  const r = await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: seed() });
  if (!r.ok) throw new Error(r.code);
  const state = (await db.store.load(w.roomId))!.state as GameState;
  return { w, state };
}

const unlock = (w: World, i: number) => db.user(w.users[i]!).rpc('verify_pin', w.roomId, w.pin);

describe('Spielstart', () => {
  it('nur der Host startet, alle müssen bereit sein, Raum ist danach gesperrt', async () => {
    const w = await lobby(db, 8);
    const notHost = await startGame(db.store, { roomId: w.roomId, userId: w.users[1]!, now: NOW, seed: seed() });
    expect(notHost).toMatchObject({ ok: false, code: 'not_host' });
    await db.user(w.users[3]!).rpc('set_ready', w.roomId, false);
    expect(await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: seed() })).toMatchObject({ ok: false, code: 'not_all_ready' });
    await db.user(w.users[3]!).rpc('set_ready', w.roomId, true);
    expect((await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: seed() })).ok).toBe(true);
    expect(await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: seed() })).toMatchObject({ ok: false, code: 'game_already_started' });
    await expect(db.user(randomUUID()).rpc('join_room', w.code, 'Spät', '1234')).rejects.toThrow(/game_already_started/);
  });

  it('lehnt zu kleine Gruppen ab', async () => {
    const w = await lobby(db, 5);
    expect(await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: seed() })).toMatchObject({ ok: false, code: 'invalid_roster' });
  });
});

describe('Geheimhaltung (RLS)', () => {
  it('Privatdaten sind gesperrt, bis der PIN stimmt; dann sieht jeder nur sich selbst', async () => {
    const { w, state } = await started(10);
    for (let i = 0; i < 10; i++) {
      const me = db.user(w.users[i]!);
      expect(await me.q('select * from public.player_private')).toHaveLength(0); // gesperrt
      expect((await unlock(w, i)).ok).toBe(true);
      const rows = await me.q('select player_id, data from public.player_private');
      expect(rows).toHaveLength(1);
      expect(rows[0]!.player_id).toBe(w.players[i]);
      expect(rows[0]!.data.role).toBe(state.players[w.players[i]!]!.role);
    }
  });

  it('Entsperrung läuft ab und kann gezielt gesperrt werden', async () => {
    const { w } = await started(8);
    const me = db.user(w.users[2]!);
    await unlock(w, 2);
    expect(await me.q('select * from public.player_private')).toHaveLength(1);
    await db.admin(`update public.player_secrets set unlocked_until = now() - interval '1 second' where player_id = $1`, [w.players[2]]);
    expect(await me.q('select * from public.player_private')).toHaveLength(0);
    await unlock(w, 2);
    await me.rpc('lock_private', w.roomId);
    expect(await me.q('select * from public.player_private')).toHaveLength(0);
    expect(await me.rpc('touch_unlock', w.roomId)).toBe(false);
  });

  it('Der öffentliche Zustand enthält keine Rollen; Außenstehende sehen ihn nicht', async () => {
    const { w } = await started(10);
    const rows = await db.user(w.users[4]!).q('select data from public.public_state');
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0]!.data)).not.toMatch(/"(villager|wolf|scout|tracker|alchemist|guardian|borderwalker|hunter|shadowwolf)"/);
    expect(await db.user(randomUUID()).q('select * from public.public_state')).toHaveLength(0);
  });

  it('Der vollständige Zustand ist für Clients niemals lesbar', async () => {
    const { w } = await started(8);
    await unlock(w, 0);
    await expect(db.user(w.users[0]!).q('select * from public.game_secret')).rejects.toThrow(/permission denied/);
    await expect(db.user(w.users[0]!).q('select state from public.game_secret')).rejects.toThrow(/permission denied/);
  });

  it('Ausgeschiedene sehen nur noch ihre eigene Privatsicht, aber keine Chats mehr', async () => {
    const { w } = await started(8);
    await unlock(w, 3);
    expect(await db.user(w.users[3]!).q('select * from public.player_private')).toHaveLength(1);
    await db.admin(`update public.players set alive = false where id = $1`, [w.players[3]]);
    expect(await db.user(w.users[3]!).q('select * from public.player_private')).toHaveLength(1);
    expect(await db.user(w.users[3]!).q('select * from public.channels')).toHaveLength(0);
  });
});

describe('Chat', () => {
  it('Direktnachrichten: nur Beteiligte, nur entsperrt, nur lebend', async () => {
    const { w } = await started(8);
    await unlock(w, 1);
    await unlock(w, 2);
    await unlock(w, 3);
    const a = db.user(w.users[1]!);
    const b = db.user(w.users[2]!);
    const c = db.user(w.users[3]!);
    const ch = await a.rpc('open_dm', w.roomId, w.players[2]);
    await a.rpc('send_message', ch, 'Glaubst du, dass Tom unschuldig ist?');
    expect((await b.q('select body from public.messages where channel_id=$1', [ch])).map((r) => r.body)).toEqual(['Glaubst du, dass Tom unschuldig ist?']);
    expect(await c.q('select * from public.messages')).toHaveLength(0);
    await expect(c.rpc('send_message', ch, 'mitlesen')).rejects.toThrow(/not_allowed/);
    // Gesperrt → nichts lesbar
    await b.rpc('lock_private', w.roomId);
    expect(await b.q('select * from public.messages')).toHaveLength(0);
    await expect(b.rpc('send_message', ch, 'x')).rejects.toThrow(/not_allowed/);
    // Ausgeschieden → kein Zugriff, keine neuen DMs an Tote
    await unlock(w, 2);
    await db.admin(`update public.players set alive = false where id = $1`, [w.players[2]]);
    expect(await b.q('select * from public.messages')).toHaveLength(0);
    await expect(a.rpc('open_dm', w.roomId, w.players[2])).rejects.toThrow(/not_allowed/);
  });

  it('Ungelesen-Zähler zählt neutral über alle Kanäle und lässt sich zurücksetzen', async () => {
    const { w } = await started(8);
    await unlock(w, 1);
    await unlock(w, 2);
    const a = db.user(w.users[1]!);
    const b = db.user(w.users[2]!);
    const ch = await a.rpc('open_dm', w.roomId, w.players[2]);
    await a.rpc('send_message', ch, 'eins');
    await a.rpc('send_message', ch, 'zwei');
    expect((await b.q('select unread from public.player_status'))[0]!.unread).toBe(2);
    expect((await a.q('select unread from public.player_status'))[0]!.unread).toBe(0);
    await b.rpc('mark_read', ch);
    expect((await b.q('select unread from public.player_status'))[0]!.unread).toBe(0);
    // Zähler ist ohne PIN sichtbar (neutrales Dashboard), liefert aber keinen Inhalt
    await b.rpc('lock_private', w.roomId);
    await a.rpc('send_message', ch, 'drei');
    expect((await b.q('select unread from public.player_status'))[0]!.unread).toBe(1);
  });

  it('Nachrichten sind rate-limitiert und längenbegrenzt', async () => {
    const { w } = await started(8);
    await unlock(w, 1);
    await unlock(w, 2);
    const a = db.user(w.users[1]!);
    const ch = await a.rpc('open_dm', w.roomId, w.players[2]);
    await expect(a.rpc('send_message', ch, 'x'.repeat(1001))).rejects.toThrow(/invalid_message/);
    await expect(a.rpc('send_message', ch, '   ')).rejects.toThrow(/invalid_message/);
    for (let i = 0; i < 15; i++) await a.rpc('send_message', ch, `m${i}`);
    await expect(a.rpc('send_message', ch, 'zu viel')).rejects.toThrow(/rate_limited/);
  });

  it('Rudelkanal: nur lebende Rudelmitglieder lesen und schreiben; Tote verlieren sofort alles', async () => {
    const { w, state } = await started(10);
    const ids = Object.values(state.players);
    const pack = ids.filter((p) => p.faction === 'pack').map((p) => p.id);
    const others = ids.filter((p) => p.faction !== 'pack').map((p) => p.id);
    const idx = (pid: string) => w.players.indexOf(pid);
    for (const pid of [...pack, others[0]!]) await unlock(w, idx(pid));

    const wolf1 = db.user(w.users[idx(pack[0]!)]!);
    const wolf2 = db.user(w.users[idx(pack[1]!)]!);
    const villager = db.user(w.users[idx(others[0]!)]!);

    const chans = await wolf1.q(`select id from public.channels where kind = 'pack'`);
    expect(chans).toHaveLength(1);
    const ch = chans[0]!.id as string;
    await wolf1.rpc('send_message', ch, 'Heute Nacht: wer?');
    expect((await wolf2.q('select body from public.messages where channel_id=$1', [ch]))).toHaveLength(1);
    // Dorfbewohner sieht den Kanal weder in channels noch in messages und kann nicht schreiben
    expect(await villager.q('select * from public.channels')).toHaveLength(0);
    expect(await villager.q('select * from public.messages')).toHaveLength(0);
    await expect(villager.rpc('send_message', ch, 'hi')).rejects.toThrow(/not_allowed/);

    // Wolf scheidet aus → Engine setzt Mitgliedschaft; hier über Verbannung per Host-Force simuliert
    await db.admin(`update public.players set alive = false where id = $1`, [pack[1]]);
    expect(await wolf2.q('select * from public.messages')).toHaveLength(0);
    await expect(wolf2.rpc('send_message', ch, 'ich lebe noch')).rejects.toThrow(/not_allowed/);
  });
});

describe('Nebenläufigkeit & Zeit', () => {
  it('parallele Befehle verschiedener Spieler gehen nie verloren (CAS + Retry)', async () => {
    const { w } = await started(10);
    // Dorfsprecher-Wahl: alle 10 stimmen gleichzeitig ab
    const results = await Promise.all(
      w.users.map((u, i) =>
        handleCommand(db.store, {
          roomId: w.roomId, userId: u, now: NOW + 1000,
          command: { type: 'vote_speaker', target: w.players[(i + 1) % 10]! },
        }),
      ),
    );
    for (const r of results) expect(r.ok).toBe(true);
    const state = (await db.store.load(w.roomId))!.state as GameState;
    // Alle Stimmen wurden angewandt → Wahl abgeschlossen, Dorfsprecher steht fest
    expect(state.speakerId).not.toBeNull();
    expect(state.phase.kind).toBe('day');
  });

  it('veraltete Versionen werden abgewiesen', async () => {
    const { w } = await started(8);
    const loaded = (await db.store.load(w.roomId))!;
    await handleCommand(db.store, { roomId: w.roomId, userId: w.users[1]!, now: NOW + 1, command: { type: 'vote_speaker', target: w.players[2]! } });
    const { buildPayload } = await import('@dorf/server');
    await expect(db.store.commit(w.roomId, loaded.version, buildPayload(loaded.state!))).rejects.toThrow(/version_conflict/);
  });

  it('Befehle fremder Nutzer werden abgewiesen; Identität kommt nur aus der Sitzung', async () => {
    const { w } = await started(8);
    const r = await handleCommand(db.store, { roomId: w.roomId, userId: randomUUID(), now: NOW, command: { type: 'vote_speaker', target: w.players[1]! } });
    expect(r).toMatchObject({ ok: false, code: 'not_a_player' });
  });

  it('Tick ändert nichts vor der Frist; Cron-Sweep findet fällige Räume', async () => {
    const { w } = await started(8);
    const early = await handleTick(db.store, { roomId: w.roomId, now: NOW + 1000 });
    expect(early).toMatchObject({ ok: true, changed: false });
    expect(await db.store.dueRooms(NOW + 1000)).not.toContain(w.roomId);
    const late = NOW + 10 * 60_000;
    expect(await db.store.dueRooms(late)).toContain(w.roomId);
    const res = await sweep(db.store, late);
    expect(res.processed).toBeGreaterThanOrEqual(1);
    const state = (await db.store.load(w.roomId))!.state as GameState;
    expect(state.phase.kind).toBe('day'); // Dorfsprecher-Wahl per Frist beendet
  });

  it('Host-Notfall: nur der Host darf den Ablauf erzwingen', async () => {
    const { w } = await started(8);
    const bad = await handleCommand(db.store, { roomId: w.roomId, userId: w.users[2]!, now: NOW, command: { type: 'tick', force: true } });
    expect(bad.ok).toBe(false);
    const ok = await handleCommand(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, command: { type: 'tick', force: true } });
    expect(ok.ok).toBe(true);
  });

  it('Spielende wird als beendet persistiert und sperrt den Privatbereich', async () => {
    const { w } = await started(8);
    await db.admin(`update public.rooms set status = 'ended' where id = $1`, [w.roomId]);
    await unlock(w, 1);
    expect(await db.user(w.users[1]!).q('select * from public.player_private')).toHaveLength(0);
  });
});

describe('iPad-Dorfanzeige', () => {
  it('sieht öffentliche Daten, aber nie Privates oder Chats – und ist kein Spieler', async () => {
    const { w } = await started(8);
    const display = db.user(randomUUID());
    await display.rpc('join_display', w.code);
    expect(await display.q('select * from public.public_state')).toHaveLength(1);
    expect((await display.q('select * from public.players')).length).toBe(8);
    expect(await display.q('select * from public.player_private')).toHaveLength(0);
    await expect(display.rpc('verify_pin', w.roomId, '1234')).rejects.toThrow(/not_in_room/);
    const r = await handleCommand(db.store, { roomId: w.roomId, userId: (display as { uid: string }).uid, now: NOW, command: { type: 'vote_speaker', target: w.players[1]! } });
    expect(r).toMatchObject({ ok: false, code: 'not_a_player' });
  });
});
