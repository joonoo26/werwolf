-- Minimal-Nachbau der Supabase-Umgebung für Tests gegen ein reines Postgres.
-- (Rollen, auth.uid(), Schemata, Standardrechte). Wird NIE in Produktion ausgeführt.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema if not exists auth;
create schema if not exists extensions;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, extensions, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Wie Supabase: neue Tabellen/Funktionen sind zunächst für alle API-Rollen offen.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
