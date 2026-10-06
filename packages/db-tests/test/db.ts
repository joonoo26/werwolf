import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { VersionConflictError, type CommitPayload, type LoadedGame, type Store } from '@dorf/server';

const base = () => process.env.DORF_TEST_DATABASE_URL!;

/** Legt eine frische Datenbank aus dem Template an. */
export async function freshDb() {
  const name = `t_${randomUUID().replace(/-/g, '')}`;
  const admin = new pg.Client({ connectionString: base() });
  await admin.connect();
  await admin.query(`create database ${name} template dorf_template`);
  await admin.end();
  const u = new URL(base());
  u.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: u.toString(), max: 8 });

  type Row = Record<string, any>;
  async function run(role: 'authenticated' | 'service_role' | 'anon' | 'postgres', uid: string | null, sql: string, params: unknown[] = []) {
    const c = await pool.connect();
    try {
      await c.query('begin');
      if (role !== 'postgres') await c.query(`set local role ${role}`);
      if (uid) await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
      const r = await c.query(sql, params as any[]);
      await c.query('commit');
      return r.rows as Row[];
    } catch (e) {
      await c.query('rollback').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }

  const user = (uid: string) => ({
    uid,
    q: (sql: string, params?: unknown[]) => run('authenticated', uid, sql, params),
    rpc: async (fn: string, ...args: unknown[]) => {
      const rows = await run('authenticated', uid, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) as r`, args);
      return rows[0]?.r;
    },
  });
  const anon = { q: (sql: string, params?: unknown[]) => run('anon', null, sql, params) };
  const service = (sql: string, params?: unknown[]) => run('service_role', null, sql, params);
  const admin2 = (sql: string, params?: unknown[]) => run('postgres', null, sql, params);

  const store: Store = {
    async load(roomId) {
      const rows = await service('select public.server_load_game($1) as g', [roomId]);
      return (rows[0]?.g ?? null) as LoadedGame | null;
    },
    async commit(roomId, expected, p: CommitPayload) {
      try {
        const rows = await service(
          'select public.server_commit_game($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::uuid[],$7::uuid[],$8::timestamptz,$9) as v',
          [roomId, expected, JSON.stringify(p.state), JSON.stringify(p.public), JSON.stringify(p.private), p.packMembers, p.alive,
            p.nextDeadlineMs === null ? null : new Date(p.nextDeadlineMs).toISOString(), p.status],
        );
        return rows[0]!.v as number;
      } catch (e: any) {
        if (e?.code === '40001') throw new VersionConflictError();
        throw e;
      }
    },
    async start(roomId, hostUserId, p: CommitPayload) {
      try {
        const rows = await service(
          'select public.server_start_game($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::uuid[],$7::uuid[],$8::timestamptz) as v',
          [roomId, hostUserId, JSON.stringify(p.state), JSON.stringify(p.public), JSON.stringify(p.private), p.packMembers, p.alive,
            p.nextDeadlineMs === null ? null : new Date(p.nextDeadlineMs).toISOString()],
        );
        return rows[0]!.v as number;
      } catch (e: any) {
        if (e?.code === '40001' && String(e.message).includes('roster_changed')) throw new Error('roster_changed');
        throw e;
      }
    },
    async dueRooms(nowMs) {
      const rows = await service('select public.server_due_rooms($1::timestamptz) as id', [new Date(nowMs).toISOString()]);
      return rows.map((r) => r.id as string);
    },
  };

  return { pool, user, anon, service, admin: admin2, store, close: () => pool.end() };
}

export type Db = Awaited<ReturnType<typeof freshDb>>;

export interface World {
  db: Db;
  roomId: string;
  code: string;
  users: string[]; // user ids, Index 0 = Host
  players: string[]; // player ids (gleiche Reihenfolge)
  pin: string;
}

/** Raum mit n Spielern (alle bereit), noch in der Lobby. */
export async function lobby(db: Db, n: number, opts: { mode?: 'classic' | 'evening'; minutes?: number } = {}): Promise<World> {
  const users = Array.from({ length: n }, () => randomUUID());
  const host = db.user(users[0]!);
  const created = await host.rpc('create_room', 'Spieler 1', '1234', opts.mode ?? 'classic', opts.minutes ?? null);
  const players = [created.player_id as string];
  for (let i = 1; i < n; i++) {
    const r = await db.user(users[i]!).rpc('join_room', created.code, `Spieler ${i + 1}`, '1234');
    players.push(r.player_id);
  }
  for (let i = 0; i < n; i++) await db.user(users[i]!).rpc('set_ready', created.room_id, true);
  return { db, roomId: created.room_id, code: created.code, users, players, pin: '1234' };
}
