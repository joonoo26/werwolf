-- DAS DORF – Kernschema
-- Sicherheitsmodell:
--   * Der vollständige Spielzustand (inkl. aller Rollen) liegt nur in `game_secret` und ist für
--     Clients vollständig gesperrt (RLS an, keine Policy, keine Grants). Nur service_role.
--   * Clients lesen ausschließlich Projektionen: `public_state` (alle Raummitglieder) und
--     `player_private` (nur der Eigentümer, nur PIN-entsperrt, nur lebend).
--   * Chats: Zugriff nur für aktive Kanalmitglieder, die lebendig und PIN-entsperrt sind.
--   * Alle schreibenden Client-Aktionen laufen über SECURITY-DEFINER-Funktionen mit festem
--     search_path. Tabellen sind für anon/authenticated nicht beschreibbar.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ───────────────────────── Tabellen ─────────────────────────

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_user_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby', 'running', 'ended')),
  mode text not null default 'classic' check (mode in ('classic', 'evening')),
  target_minutes int check (target_minutes is null or target_minutes between 60 and 480),
  -- Werbefrei gilt für die ganze vom Käufer gehostete Partie (GAME_DESIGN §21).
  ad_free boolean not null default false,
  next_deadline_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  ready boolean not null default false,
  -- Öffentlich: ausgeschieden ja/nein wird vom Server aus dem Engine-Zustand gespiegelt.
  alive boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create unique index players_room_name_unique on public.players (room_id, lower(btrim(name)));
create index players_user_idx on public.players (user_id);

-- PIN und Entsperr-Zustand: niemals für Clients lesbar (auch nicht per Realtime).
create table public.player_secrets (
  player_id uuid primary key references public.players (id) on delete cascade,
  pin_hash text not null,
  failures int not null default 0,
  locked_until timestamptz,
  unlocked_until timestamptz
);

create table public.game_secret (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  version int not null,
  state jsonb not null
);

create table public.public_state (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  version int not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.player_private (
  player_id uuid primary key references public.players (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  version int not null,
  data jsonb not null
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  kind text not null check (kind in ('dm', 'pack')),
  key text not null,
  unique (room_id, key)
);

create table public.channel_members (
  channel_id uuid not null references public.channels (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  active boolean not null default true,
  -- Nachrichten bis hierher bleiben für das Mitglied unsichtbar (z. B. Grenzgänger nach Beitritt).
  from_message_id bigint not null default 0,
  last_read_id bigint not null default 0,
  primary key (channel_id, player_id)
);
create index channel_members_player_idx on public.channel_members (player_id);

create table public.messages (
  id bigint generated always as identity primary key,
  channel_id uuid not null references public.channels (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  sender_player_id uuid not null references public.players (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_channel_idx on public.messages (channel_id, id);
create index messages_sender_time_idx on public.messages (sender_player_id, created_at);

-- Ungelesen-Zähler: absichtlich ohne PIN lesbar, damit das neutrale Dashboard ein Badge zeigen kann.
-- Der Zähler mischt alle Kanäle, ein Rudelkanal ist darin nicht erkennbar.
create table public.player_status (
  player_id uuid primary key references public.players (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  unread int not null default 0
);

create table public.push_tokens (
  user_id uuid not null,
  token text not null,
  platform text not null default 'ios',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index rooms_deadline_idx on public.rooms (next_deadline_at) where status = 'running';

-- ───────────────────────── Rechte-Grundzustand ─────────────────────────

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.player_secrets enable row level security;
alter table public.game_secret enable row level security;
alter table public.public_state enable row level security;
alter table public.player_private enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.player_status enable row level security;
alter table public.push_tokens enable row level security;

-- ───────────────────────── Hilfsfunktionen für Policies ─────────────────────────

create function private.is_member(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.players p where p.room_id = p_room and p.user_id = (select auth.uid())
  );
$$;

-- Eigener Spieler darf Privates sehen: lebendig, PIN-entsperrt, Spiel läuft.
create function private.can_see_private(p_player uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.players p
    join public.player_secrets s on s.player_id = p.id
    join public.rooms r on r.id = p.room_id
    where p.id = p_player
      and p.user_id = (select auth.uid())
      and p.alive
      and r.status = 'running'
      and s.unlocked_until is not null
      and s.unlocked_until > now()
  );
$$;

create function private.can_read_channel(p_channel uuid, p_message_id bigint default null)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.channel_members cm
    join public.players p on p.id = cm.player_id
    join public.player_secrets s on s.player_id = p.id
    join public.rooms r on r.id = p.room_id
    where cm.channel_id = p_channel
      and cm.active
      and (p_message_id is null or p_message_id > cm.from_message_id)
      and p.user_id = (select auth.uid())
      and p.alive
      and r.status = 'running'
      and s.unlocked_until is not null
      and s.unlocked_until > now()
  );
$$;

grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_see_private(uuid) to authenticated;
grant execute on function private.can_read_channel(uuid, bigint) to authenticated;

-- ───────────────────────── Policies (nur Lesen) ─────────────────────────

grant select on public.rooms, public.players, public.public_state to authenticated;
grant select on public.player_private, public.channels, public.channel_members, public.messages to authenticated;
grant select on public.player_status to authenticated;

create policy rooms_member_read on public.rooms
  for select to authenticated using (private.is_member(id));

create policy players_member_read on public.players
  for select to authenticated using (private.is_member(room_id));

create policy public_state_member_read on public.public_state
  for select to authenticated using (private.is_member(room_id));

create policy player_private_owner_unlocked on public.player_private
  for select to authenticated using (private.can_see_private(player_id));

create policy channels_readable on public.channels
  for select to authenticated using (private.can_read_channel(id));

create policy channel_members_readable on public.channel_members
  for select to authenticated using (private.can_read_channel(channel_id));

create policy messages_readable on public.messages
  for select to authenticated using (private.can_read_channel(channel_id, id));

create policy player_status_owner on public.player_status
  for select to authenticated using (
    exists (select 1 from public.players p where p.id = player_id and p.user_id = (select auth.uid()))
  );

-- ───────────────────────── Realtime ─────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.rooms, public.players, public.public_state, public.player_private,
      public.messages, public.channels, public.channel_members, public.player_status;
  end if;
end $$;
