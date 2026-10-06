import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startGame } from '@dorf/server';
import { freshDb, lobby, PROFILE, type Db, type World } from './db';

let db: Db;
beforeAll(async () => (db = await freshDb()));
afterAll(async () => db.close());

const NOW = 1_800_000_000_000;
const unlock = (w: World, i: number) => db.user(w.users[i]!).rpc('verify_pin', w.roomId, w.pin);

describe('Spielerprofil', () => {
  it('Profil wird gespeichert und ist für Mitspieler sichtbar (exaktes Alter), für Außenstehende nicht', async () => {
    const host = db.user(randomUUID());
    const r = await host.rpc('create_room', 'Lena', '1234', 34, 'female', 'red', 'blue');
    const other = db.user(randomUUID());
    await other.rpc('join_room', r.code, 'Tom', '4321', 29, 'male', 'black', 'brown');
    const rows = await other.q('select name, age, gender, hair, eyes, photo_path from public.players order by name');
    expect(rows).toEqual([
      { name: 'Lena', age: 34, gender: 'female', hair: 'red', eyes: 'blue', photo_path: null },
      { name: 'Tom', age: 29, gender: 'male', hair: 'black', eyes: 'brown', photo_path: null },
    ]);
    expect(await db.user(randomUUID()).q('select * from public.players')).toHaveLength(0);
  });
  it('ungültige Profile werden abgelehnt', async () => {
    const u = db.user(randomUUID());
    await expect(u.rpc('create_room', 'A', '1234', 3, 'female', 'red', 'blue')).rejects.toThrow(/invalid_profile/);
    await expect(u.rpc('create_room', 'A', '1234', 30, 'robot', 'red', 'blue')).rejects.toThrow(/invalid_profile/);
    await expect(u.rpc('create_room', 'A', '1234', 30, 'male', 'purple', 'blue')).rejects.toThrow(/invalid_profile/);
    await expect(u.rpc('create_room', 'A', '1234', 30, 'male', 'red', 'pink')).rejects.toThrow(/invalid_profile/);
  });
  it('Die Engine bekommt die Profile beim Spielstart', async () => {
    const w = await lobby(db, 6);
    const r = await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: [1, 2, 3, 4] });
    expect(r.ok).toBe(true);
    const pub = (await db.user(w.users[1]!).q('select data from public.public_state'))[0]!.data;
    expect(pub.players[0].profile).toEqual({ age: PROFILE[0], gender: PROFILE[1], hair: PROFILE[2], eyes: PROFILE[3] });
    expect(pub.packSeats).toBe(1);
  });
  it('Foto: nur der eigene Pfad darf gesetzt werden', async () => {
    const w = await lobby(db, 4);
    const me = db.user(w.users[1]!);
    await expect(me.rpc('set_photo', w.roomId, `${w.roomId}/${w.players[2]}.jpg`)).rejects.toThrow(/invalid_path/);
    await expect(me.rpc('set_photo', w.roomId, '../etc/passwd')).rejects.toThrow(/invalid_path/);
    await me.rpc('set_photo', w.roomId, `${w.roomId}/${w.players[1]}.jpg`);
    const row = (await db.user(w.users[2]!).q('select photo_path from public.players where id = $1', [w.players[1]]))[0]!;
    expect(row.photo_path).toBe(`${w.roomId}/${w.players[1]}.jpg`);
    await expect(db.user(randomUUID()).rpc('set_photo', w.roomId, null)).rejects.toThrow(/not_in_room/);
  });
  it('Storage-Policies: nur Raummitglieder lesen, nur der Besitzer schreibt', async () => {
    const w = await lobby(db, 4);
    const name = `${w.roomId}/${w.players[1]}.jpg`;
    await db.user(w.users[1]!).q(`insert into storage.objects (bucket_id, name, owner) values ('profile-photos', $1, $2)`, [name, w.users[1]]);
    expect(await db.user(w.users[2]!).q(`select name from storage.objects where bucket_id = 'profile-photos'`)).toHaveLength(1);
    expect(await db.user(randomUUID()).q(`select name from storage.objects where bucket_id = 'profile-photos'`)).toHaveLength(0);
    await expect(db.user(w.users[2]!).q(`insert into storage.objects (bucket_id, name, owner) values ('profile-photos', $1, $2)`, [name.replace(w.players[1]!, w.players[2]!), w.users[2]]))
      .resolves.toBeDefined(); // eigener Pfad: erlaubt
    await expect(db.user(w.users[2]!).q(`insert into storage.objects (bucket_id, name, owner) values ('profile-photos', $1, $2)`, [name, w.users[2]])).rejects.toThrow(/row-level security/);
  });
});

describe('Private Notizen', () => {
  it('nur der Verfasser sieht sie – nie Host, nie andere; nur PIN-entsperrt', async () => {
    const w = await lobby(db, 5);
    const author = db.user(w.users[2]!);
    await expect(author.rpc('save_note', w.roomId, w.players[3], 'verdächtig')).rejects.toThrow(/not_allowed/); // gesperrt
    await unlock(w, 2);
    await author.rpc('save_note', w.roomId, w.players[3], 'wirkte nervös');
    expect((await author.q('select body from public.player_notes')).map((r) => r.body)).toEqual(['wirkte nervös']);
    // Host und andere sehen nichts – selbst entsperrt
    for (const i of [0, 1, 3, 4]) {
      await unlock(w, i);
      expect(await db.user(w.users[i]!).q('select * from public.player_notes')).toHaveLength(0);
    }
    // Außenstehende und anon ebenso
    expect(await db.user(randomUUID()).q('select * from public.player_notes')).toHaveLength(0);
    await expect(db.anon.q('select * from public.player_notes')).rejects.toThrow(/permission denied/);
    // Nach dem Sperren sind sie auch für den Verfasser nicht lesbar
    await author.rpc('lock_private', w.roomId);
    expect(await author.q('select * from public.player_notes')).toHaveLength(0);
  });
  it('Notiz überschreiben, leeren (löscht) und auf Mitspieler beschränken', async () => {
    const w = await lobby(db, 4);
    const a = db.user(w.users[1]!);
    await unlock(w, 1);
    await a.rpc('save_note', w.roomId, w.players[2], 'eins');
    await a.rpc('save_note', w.roomId, w.players[2], 'zwei');
    expect((await a.q('select body from public.player_notes')).map((r) => r.body)).toEqual(['zwei']);
    await expect(a.rpc('save_note', w.roomId, w.players[1], 'selbst')).rejects.toThrow(/invalid_target/);
    await expect(a.rpc('save_note', w.roomId, randomUUID(), 'x')).rejects.toThrow(/invalid_target/);
    await a.rpc('save_note', w.roomId, w.players[2], '  ');
    expect(await a.q('select * from public.player_notes')).toHaveLength(0);
  });
  it('Notizen sind nicht direkt beschreibbar', async () => {
    const w = await lobby(db, 4);
    await unlock(w, 1);
    await expect(db.user(w.users[1]!).q(`insert into public.player_notes values ($1,$2,'x')`, [w.players[1], w.players[2]])).rejects.toThrow(/permission denied/);
  });
});

describe('Gast vs. optionales dauerhaftes Profil', () => {
  it('Gäste (anonym) können kein dauerhaftes Profil anlegen – Mitspielen braucht kein Konto', async () => {
    const guest = db.user(randomUUID());
    await expect(guest.rpc('save_profile', 'Lena', 30, 'female', 'red', 'blue', null)).rejects.toThrow(/account_required/);
    const w = await lobby(db, 4); // spielen funktioniert ohne Konto
    expect(w.players).toHaveLength(4);
  });
  it('Registrierte Konten speichern Profil dauerhaft, nur sie selbst sehen es, und können es löschen', async () => {
    const uid = randomUUID();
    const account = db.user(uid, { anonymous: false });
    await account.rpc('save_profile', 'Lena', 30, 'female', 'red', 'blue', null);
    await account.rpc('save_profile', 'Lena', 31, 'female', 'red', 'blue', null); // ändern
    expect((await account.q('select name, age from public.user_profiles'))).toEqual([{ name: 'Lena', age: 31 }]);
    expect(await db.user(randomUUID(), { anonymous: false }).q('select * from public.user_profiles')).toHaveLength(0);
    await expect(db.user(uid).q('select * from public.user_profiles').then((r) => r.length)).resolves.toBe(1); // gleiche Nutzer-ID, Policy greift per uid
    await account.rpc('delete_profile');
    expect(await account.q('select * from public.user_profiles')).toHaveLength(0);
  });
  it('Profil ist keine Voraussetzung und enthält keine Spielfelder (Notizen, Verdacht, Rollen)', async () => {
    const cols = await db.admin(`select column_name from information_schema.columns where table_name = 'user_profiles' order by 1`);
    expect(cols.map((c) => c.column_name)).toEqual(['age', 'eyes', 'gender', 'hair', 'name', 'photo_path', 'updated_at', 'user_id']);
  });
});

describe('Löschung von Gastspieler-Daten', () => {
  it('beendete und abgelaufene Räume werden samt Profil, Notizen und Spielzustand gelöscht', async () => {
    const w = await lobby(db, 6);
    await startGame(db.store, { roomId: w.roomId, userId: w.users[0]!, now: NOW, seed: [9, 9, 9, 9] });
    await unlock(w, 1);
    await db.user(w.users[1]!).rpc('save_note', w.roomId, w.players[2], 'geheim');
    await db.user(w.users[1]!).rpc('set_photo', w.roomId, `${w.roomId}/${w.players[1]}.jpg`);
    // läuft noch → nicht löschen
    expect(await db.service('select public.server_cleanup() as n').then((r) => r[0]!.n)).toBe(0);
    // Spielende vor 13 Stunden
    await db.admin(`update public.rooms set status = 'ended', ended_at = now() - interval '13 hours' where id = $1`, [w.roomId]);
    const cand = await db.service('select * from public.server_purge_candidates()');
    expect(cand.some((c) => c.room_id === w.roomId && c.photo_path === `${w.roomId}/${w.players[1]}.jpg`)).toBe(true);
    expect(await db.service('select public.server_cleanup() as n').then((r) => r[0]!.n)).toBeGreaterThanOrEqual(1);
    expect(await db.admin('select * from public.players where room_id = $1', [w.roomId])).toHaveLength(0);
    expect(await db.admin('select * from public.game_secret where room_id = $1', [w.roomId])).toHaveLength(0);
    expect(await db.admin('select * from public.player_notes where about_player_id = any($1::uuid[])', [w.players])).toHaveLength(0);
  });
  it('abgelaufene Lobbys werden ebenfalls gelöscht; Konten-Profile bleiben', async () => {
    const acc = db.user(randomUUID(), { anonymous: false });
    await acc.rpc('save_profile', 'Max', 40, 'male', 'gray', 'gray', null);
    const w = await lobby(db, 4);
    await db.admin(`update public.rooms set created_at = now() - interval '3 days' where id = $1`, [w.roomId]);
    await db.service('select public.server_cleanup()');
    expect(await db.admin('select * from public.rooms where id = $1', [w.roomId])).toHaveLength(0);
    expect((await acc.q('select * from public.user_profiles')).length).toBe(1);
  });
  it('Clients dürfen weder Aufräumen noch Kandidaten abfragen', async () => {
    const w = await lobby(db, 4);
    await expect(db.user(w.users[0]!).q('select public.server_cleanup()')).rejects.toThrow(/permission denied/);
    await expect(db.user(w.users[0]!).q('select * from public.server_purge_candidates()')).rejects.toThrow(/permission denied/);
  });
});
