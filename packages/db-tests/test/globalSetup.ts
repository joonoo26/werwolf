import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const root = join(__dirname, '..', '..', '..');

/** Baut einmal eine Template-Datenbank (Stub + alle Migrationen); jede Testdatei klont sie. */
export default async function setup() {
  const url = process.env.DORF_TEST_DATABASE_URL;
  if (!url) throw new Error('DORF_TEST_DATABASE_URL fehlt – Tests über `npm run test:db` starten.');
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query('drop database if exists dorf_template');
  await admin.query('create database dorf_template');
  await admin.end();

  const u = new URL(url);
  u.pathname = '/dorf_template';
  const c = new pg.Client({ connectionString: u.toString() });
  await c.connect();
  // Rollen sind clusterweit: nur anlegen, wenn sie noch nicht existieren.
  const stub = readFileSync(join(root, 'supabase/tests/00_supabase_stub.sql'), 'utf8').replace(
    /create role (\w+) ([^;]*);/g,
    (_m, name, rest) =>
      `do $$ begin if not exists (select 1 from pg_roles where rolname='${name}') then create role ${name} ${rest}; end if; end $$;`,
  );
  await c.query(stub);
  const dir = join(root, 'supabase/migrations');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await c.query(readFileSync(join(dir, f), 'utf8'));
  }
  await c.end();
}
