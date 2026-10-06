import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDb, lobby, type Db } from './db';

let db: Db;
beforeAll(async () => (db = await freshDb()));
afterAll(async () => db.close());

describe('Lobby', () => {
  it('Host erstellt Raum, andere treten mit Code bei, Spielerzahl wird begrenzt', async () => {
    const w = await lobby(db, 14);
    expect(w.code).toMatch(/^[A-Z2-9]{6}$/);
    const extra = db.user(randomUUID());
    await expect(extra.rpc('join_room', w.code, 'Zu viel', '1234')).rejects.toThrow(/room_full/);
  });

  it('Name muss im Raum eindeutig sein; PIN-Format wird geprüft', async () => {
    const host = db.user(randomUUID());
    const r = await host.rpc('create_room', 'Mara', '4321');
    const other = db.user(randomUUID());
    await expect(other.rpc('join_room', r.code, ' mara ', '1234')).rejects.toThrow(/name_taken/);
    await expect(other.rpc('join_room', r.code, 'Tom', 'abcd')).rejects.toThrow(/invalid_pin/);
    await expect(other.rpc('join_room', r.code, 'Tom', '123')).rejects.toThrow(/invalid_pin/);
    await expect(other.rpc('join_room', 'ZZZZZZ', 'Tom', '1234')).rejects.toThrow(/room_not_found/);
  });

  it('Beitritt ist idempotent (Reconnect mit derselben Sitzung)', async () => {
    const host = db.user(randomUUID());
    const r = await host.rpc('create_room', 'Mara', '4321');
    const again = await host.rpc('join_room', r.code, 'Mara', '4321');
    expect(again.player_id).toBe(r.player_id);
  });

  it('Nicht-Mitglieder sehen weder Raum, Spieler noch Zustand', async () => {
    const w = await lobby(db, 6);
    const outsider = db.user(randomUUID());
    expect(await outsider.q('select * from public.rooms')).toHaveLength(0);
    expect(await outsider.q('select * from public.players')).toHaveLength(0);
    expect(await outsider.q('select * from public.public_state')).toHaveLength(0);
    const member = db.user(w.users[1]!);
    expect(await member.q('select * from public.rooms where id = $1', [w.roomId])).toHaveLength(1);
    expect((await member.q('select * from public.players where room_id = $1', [w.roomId])).length).toBe(6);
  });

  it('Spieler-Tabelle enthält keine PIN-Daten und Geheimtabellen sind gesperrt', async () => {
    const w = await lobby(db, 6);
    const member = db.user(w.users[1]!);
    const row = (await member.q('select * from public.players limit 1'))[0]!;
    expect(Object.keys(row).sort()).toEqual(['alive', 'id', 'joined_at', 'name', 'ready', 'room_id', 'user_id']);
    for (const t of ['player_secrets', 'game_secret', 'push_tokens']) {
      await expect(member.q(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
    }
    await expect(db.anon.q('select * from public.rooms')).rejects.toThrow(/permission denied/);
  });

  it('Clients können keine Tabellen direkt beschreiben', async () => {
    const w = await lobby(db, 6);
    const member = db.user(w.users[1]!);
    await expect(member.q(`insert into public.messages (channel_id, room_id, sender_player_id, body) values ($1,$2,$3,'x')`, [randomUUID(), w.roomId, w.players[1]])).rejects.toThrow(/permission denied/);
    await expect(member.q(`update public.players set alive = false where id = $1`, [w.players[1]])).rejects.toThrow(/permission denied/);
    await expect(member.q(`update public.rooms set status = 'ended'`)).rejects.toThrow(/permission denied/);
    await expect(member.q(`delete from public.players`)).rejects.toThrow(/permission denied/);
  });

  it('Server-Funktionen sind für Clients nicht aufrufbar', async () => {
    const w = await lobby(db, 6);
    const member = db.user(w.users[1]!);
    await expect(member.q(`select public.server_load_game($1)`, [w.roomId])).rejects.toThrow(/permission denied/);
    await expect(member.q(`select public.server_cleanup()`)).rejects.toThrow(/permission denied/);
    await expect(member.q(`select private.add_player($1,$2,'x','1234')`, [w.roomId, randomUUID()])).rejects.toThrow(/permission denied/);
    await expect(db.anon.q(`select public.server_now()`)).rejects.toThrow(/permission denied/);
  });

  it('Host kann Spieler entfernen; andere nicht; Host-Verlassen schließt den Raum', async () => {
    const host = db.user(randomUUID());
    const r = await host.rpc('create_room', 'Host', '1234');
    const a = db.user(randomUUID());
    const ja = await a.rpc('join_room', r.code, 'A', '1234');
    const b = db.user(randomUUID());
    const jb = await b.rpc('join_room', r.code, 'B', '1234');
    await expect(a.rpc('remove_player', r.room_id, jb.player_id)).rejects.toThrow(/not_host/);
    await host.rpc('remove_player', r.room_id, ja.player_id);
    await b.rpc('leave_room', r.room_id);
    expect((await host.q('select * from public.players where room_id=$1', [r.room_id])).length).toBe(1);
    await host.rpc('leave_room', r.room_id);
    expect(await db.service('select * from public.rooms where id=$1', [r.room_id])).toHaveLength(0);
  });
});

describe('PIN', () => {
  it('sperrt nach fünf Fehlversuchen mit steigender Wartezeit (Fehlversuche bleiben gespeichert)', async () => {
    const w = await lobby(db, 6);
    const me = db.user(w.users[2]!);
    for (let i = 0; i < 4; i++) expect((await me.rpc('verify_pin', w.roomId, '0000')).ok).toBe(false);
    const fifth = await me.rpc('verify_pin', w.roomId, '0000');
    expect(fifth.ok).toBe(false);
    expect(fifth.retry_after).toBeGreaterThan(0);
    // Auch der richtige PIN hilft während der Sperre nicht.
    const locked = await me.rpc('verify_pin', w.roomId, '1234');
    expect(locked.ok).toBe(false);
    expect(locked.retry_after).toBeGreaterThan(0);
    await db.admin(`update public.player_secrets set locked_until = now() - interval '1 second'`);
    expect((await me.rpc('verify_pin', w.roomId, '1234')).ok).toBe(true);
  });

  it('Falscher PIN hebt eine bestehende Entsperrung auf', async () => {
    const w = await lobby(db, 6);
    const me = db.user(w.users[2]!);
    expect((await me.rpc('verify_pin', w.roomId, '1234')).ok).toBe(true);
    await me.rpc('verify_pin', w.roomId, '9999');
    const s = await db.admin('select unlocked_until from public.player_secrets where player_id=$1', [w.players[2]]);
    expect(s[0]!.unlocked_until).toBeNull();
  });

  it('PIN wird nur als bcrypt-Hash gespeichert', async () => {
    const w = await lobby(db, 6);
    const rows = await db.admin('select pin_hash from public.player_secrets where player_id=$1', [w.players[0]]);
    expect(rows[0]!.pin_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0]!.pin_hash).not.toContain('1234');
  });

  it('Wiederverbinden auf neuem Gerät nur mit Name + PIN, mit Sperre bei Raten', async () => {
    const w = await lobby(db, 6);
    const device2 = db.user(randomUUID());
    for (let i = 0; i < 5; i++) expect((await device2.rpc('reclaim_player', w.code, 'Spieler 3', '0000')).ok).toBe(false);
    expect((await device2.rpc('reclaim_player', w.code, 'Spieler 3', '1234')).ok).toBe(false); // gesperrt
    await db.admin(`update public.player_secrets set locked_until = null`);
    const ok = await device2.rpc('reclaim_player', w.code, 'Spieler 3', '1234');
    expect(ok.ok).toBe(true);
    expect(ok.player_id).toBe(w.players[2]);
    // Altes Gerät ist ausgesperrt
    const old = db.user(w.users[2]!);
    expect(await old.q('select * from public.players where id=$1', [w.players[2]])).toHaveLength(0);
  });
});
