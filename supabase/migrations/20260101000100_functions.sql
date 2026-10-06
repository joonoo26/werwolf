-- DAS DORF – Funktionen (Lobby, PIN, Chat, Server-Schnittstelle für die Engine)

-- ───────────────────────── Lobby ─────────────────────────

create function private.new_room_code()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ohne I, O, 0, 1
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.code = candidate);
  end loop;
  return candidate;
end;
$$;

create function private.add_player(p_room uuid, p_user uuid, p_name text, p_pin text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'invalid_pin' using errcode = '22023';
  end if;
  if btrim(p_name) = '' or char_length(btrim(p_name)) > 20 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  insert into public.players (room_id, user_id, name) values (p_room, p_user, btrim(p_name)) returning id into v_id;
  insert into public.player_secrets (player_id, pin_hash) values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)));
  insert into public.player_status (player_id, room_id) values (v_id, p_room);
  return v_id;
exception when unique_violation then
  raise exception 'name_taken' using errcode = '23505';
end;
$$;

create function public.create_room(p_name text, p_pin text, p_mode text default 'classic', p_target_minutes int default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.rooms;
  v_player uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_mode not in ('classic', 'evening') then raise exception 'invalid_mode' using errcode = '22023'; end if;
  if p_mode = 'evening' and (p_target_minutes is null or p_target_minutes < 60 or p_target_minutes > 480) then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;
  insert into public.rooms (code, host_user_id, mode, target_minutes)
  values (private.new_room_code(), v_user, p_mode, case when p_mode = 'evening' then p_target_minutes end)
  returning * into v_room;
  v_player := private.add_player(v_room.id, v_user, p_name, p_pin);
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'player_id', v_player);
end;
$$;

create function public.join_room(p_code text, p_name text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.rooms;
  v_player uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- Raumzeile sperren: serialisiert Beitritte gegen den Spielstart.
  select * into v_room from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  if v_room.status <> 'lobby' then raise exception 'game_already_started' using errcode = '55000'; end if;
  select id into v_player from public.players where room_id = v_room.id and user_id = v_user;
  if v_player is not null then
    return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'player_id', v_player);
  end if;
  if (select count(*) from public.players where room_id = v_room.id) >= 14 then
    raise exception 'room_full' using errcode = '53400';
  end if;
  v_player := private.add_player(v_room.id, v_user, p_name, p_pin);
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'player_id', v_player);
end;
$$;

create function public.set_ready(p_room uuid, p_ready boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.players p set ready = p_ready
  from public.rooms r
  where p.room_id = p_room and p.user_id = (select auth.uid()) and r.id = p.room_id and r.status = 'lobby';
  if not found then raise exception 'not_in_lobby' using errcode = '55000'; end if;
end;
$$;

create function public.leave_room(p_room uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.status <> 'lobby' then raise exception 'not_in_lobby' using errcode = '55000'; end if;
  if v_room.host_user_id = v_user then
    -- Verlässt der Host die Lobby, wird der Raum geschlossen.
    delete from public.rooms where id = p_room;
  else
    delete from public.players where room_id = p_room and user_id = v_user;
  end if;
end;
$$;

create function public.remove_player(p_room uuid, p_player uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.status <> 'lobby' then raise exception 'not_in_lobby' using errcode = '55000'; end if;
  if v_room.host_user_id <> (select auth.uid()) then raise exception 'not_host' using errcode = '42501'; end if;
  if exists (select 1 from public.players where id = p_player and user_id = v_room.host_user_id) then
    raise exception 'cannot_remove_host' using errcode = '22023';
  end if;
  delete from public.players where id = p_player and room_id = p_room;
end;
$$;

-- Wiederverbinden auf einem neuen Gerät (neue anonyme Sitzung): Name + PIN weisen die Identität nach.
create function public.reclaim_player(p_code text, p_name text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.rooms;
  v_player public.players;
  v_secret public.player_secrets;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_room from public.rooms where code = upper(btrim(p_code));
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  select * into v_player from public.players where room_id = v_room.id and lower(btrim(name)) = lower(btrim(p_name));
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if; -- gleiche Antwort: keine Namensabfrage
  select * into v_secret from public.player_secrets where player_id = v_player.id for update;
  if v_secret.locked_until is not null and v_secret.locked_until > now() then
    return jsonb_build_object('ok', false, 'retry_after', ceil(extract(epoch from (v_secret.locked_until - now())))::int);
  end if;
  if v_secret.pin_hash <> extensions.crypt(p_pin, v_secret.pin_hash) then
    -- Kein RAISE: der Fehlversuch muss committed werden, sonst wäre die Sperre wirkungslos.
    update public.player_secrets set
      failures = failures + 1,
      locked_until = case when failures + 1 >= 5
        then now() + make_interval(secs => 30 * power(2, least(failures + 1 - 5, 5))::int) end
    where player_id = v_player.id;
    return jsonb_build_object('ok', false, 'retry_after', 0);
  end if;
  update public.player_secrets set failures = 0, locked_until = null, unlocked_until = null where player_id = v_player.id;
  update public.players set user_id = v_user where id = v_player.id;
  return jsonb_build_object('ok', true, 'room_id', v_room.id, 'code', v_room.code, 'player_id', v_player.id);
end;
$$;

-- ───────────────────────── PIN / Privatbereich ─────────────────────────

-- Entsperrt den Privatbereich für kurze Zeit. Erst dann liefern RLS-Policies private Daten aus.
create function public.verify_pin(p_room uuid, p_pin text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_player uuid;
  v_secret public.player_secrets;
  v_failures int;
  v_lock timestamptz;
begin
  select id into v_player from public.players where room_id = p_room and user_id = (select auth.uid());
  if v_player is null then raise exception 'not_in_room' using errcode = '42501'; end if;
  select * into v_secret from public.player_secrets where player_id = v_player for update;
  if v_secret.locked_until is not null and v_secret.locked_until > now() then
    return jsonb_build_object('ok', false, 'retry_after', ceil(extract(epoch from (v_secret.locked_until - now())))::int);
  end if;
  if v_secret.pin_hash = extensions.crypt(p_pin, v_secret.pin_hash) then
    update public.player_secrets
      set failures = 0, locked_until = null, unlocked_until = now() + interval '2 minutes'
      where player_id = v_player;
    return jsonb_build_object('ok', true, 'retry_after', 0);
  end if;
  v_failures := v_secret.failures + 1;
  v_lock := case when v_failures >= 5 then now() + make_interval(secs => 30 * power(2, least(v_failures - 5, 5))::int) end;
  update public.player_secrets
    set failures = v_failures, locked_until = v_lock, unlocked_until = null
    where player_id = v_player;
  return jsonb_build_object(
    'ok', false,
    'retry_after', case when v_lock is null then 0 else ceil(extract(epoch from (v_lock - now())))::int end
  );
end;
$$;

-- Verlängert die Entsperrung, solange die App aktiv genutzt wird.
create function public.touch_unlock(p_room uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_updated int;
begin
  update public.player_secrets s
    set unlocked_until = now() + interval '2 minutes'
  from public.players p
  where s.player_id = p.id and p.room_id = p_room and p.user_id = (select auth.uid())
    and s.unlocked_until is not null and s.unlocked_until > now();
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create function public.lock_private(p_room uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.player_secrets s set unlocked_until = null
  from public.players p
  where s.player_id = p.id and p.room_id = p_room and p.user_id = (select auth.uid());
$$;

create function public.server_now()
returns timestamptz
language sql stable security definer set search_path = ''
as $$ select now(); $$;

-- ───────────────────────── Chat ─────────────────────────

create function public.open_dm(p_room uuid, p_other uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_me public.players;
  v_other public.players;
  v_key text;
  v_channel uuid;
begin
  select * into v_me from public.players where room_id = p_room and user_id = (select auth.uid());
  select * into v_other from public.players where id = p_other and room_id = p_room;
  if v_me.id is null or v_other.id is null or v_me.id = v_other.id then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if not (private.can_see_private(v_me.id) and v_other.alive) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_key := 'dm:' || least(v_me.id::text, v_other.id::text) || ':' || greatest(v_me.id::text, v_other.id::text);
  insert into public.channels (room_id, kind, key) values (p_room, 'dm', v_key)
    on conflict (room_id, key) do update set key = excluded.key
    returning id into v_channel;
  insert into public.channel_members (channel_id, player_id) values (v_channel, v_me.id), (v_channel, v_other.id)
    on conflict do nothing;
  return v_channel;
end;
$$;

create function public.send_message(p_channel uuid, p_body text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_player public.players;
  v_body text := btrim(p_body);
  v_room uuid;
  v_id bigint;
begin
  select room_id into v_room from public.channels where id = p_channel;
  select * into v_player from public.players where room_id = v_room and user_id = (select auth.uid());
  if v_player.id is null or not private.can_read_channel(p_channel) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.channel_members where channel_id = p_channel and player_id = v_player.id and active) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_body is null or v_body = '' or char_length(v_body) > 1000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if (select count(*) from public.messages where sender_player_id = v_player.id and created_at > now() - interval '10 seconds') >= 15 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into public.messages (channel_id, room_id, sender_player_id, body)
    values (p_channel, v_room, v_player.id, v_body) returning id into v_id;
  update public.channel_members set last_read_id = v_id where channel_id = p_channel and player_id = v_player.id;
  return v_id;
end;
$$;

create function private.on_message_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.player_status st set unread = unread + 1
  from public.channel_members cm
  where cm.channel_id = new.channel_id and cm.active and cm.player_id <> new.sender_player_id
    and cm.from_message_id < new.id and st.player_id = cm.player_id;
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function private.on_message_insert();

create function public.mark_read(p_channel uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_player uuid;
begin
  select p.id into v_player
  from public.players p join public.channels c on c.room_id = p.room_id
  where c.id = p_channel and p.user_id = (select auth.uid());
  if v_player is null or not private.can_read_channel(p_channel) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.channel_members
    set last_read_id = coalesce((select max(id) from public.messages where channel_id = p_channel), 0)
    where channel_id = p_channel and player_id = v_player;
  update public.player_status st set unread = (
    select count(*) from public.messages m
    join public.channel_members cm on cm.channel_id = m.channel_id and cm.player_id = v_player and cm.active
    where m.id > cm.last_read_id and m.id > cm.from_message_id and m.sender_player_id <> v_player
  ) where st.player_id = v_player;
end;
$$;

create function public.register_push_token(p_token text, p_platform text default 'ios')
returns void
language sql security definer set search_path = ''
as $$
  insert into public.push_tokens (user_id, token, platform) values ((select auth.uid()), p_token, p_platform)
  on conflict (user_id, token) do update set updated_at = now();
$$;

-- ───────────────────────── Server-Schnittstelle (nur service_role) ─────────────────────────

create function public.server_load_game(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
  v_game public.game_secret;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found then return null; end if;
  select * into v_game from public.game_secret where room_id = p_room;
  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'status', v_room.status, 'mode', v_room.mode,
      'target_minutes', v_room.target_minutes, 'host_user_id', v_room.host_user_id
    ),
    'version', coalesce(v_game.version, 0),
    'state', v_game.state,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'user_id', p.user_id, 'name', p.name, 'ready', p.ready) order by p.joined_at)
      from public.players p where p.room_id = p_room
    ), '[]'::jsonb)
  );
end;
$$;

create function private.write_projections(
  p_room uuid, p_version int, p_public jsonb, p_private jsonb,
  p_pack_members uuid[], p_alive uuid[]
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_channel uuid;
  v_max bigint;
begin
  insert into public.public_state (room_id, version, data, updated_at) values (p_room, p_version, p_public, now())
    on conflict (room_id) do update set version = excluded.version, data = excluded.data, updated_at = now();

  insert into public.player_private (player_id, room_id, version, data)
    select p.id, p_room, p_version, p_private -> (p.id::text)
    from public.players p where p.room_id = p_room and p_private ? (p.id::text)
    on conflict (player_id) do update set version = excluded.version, data = excluded.data;

  update public.players set alive = (id = any (p_alive)) where room_id = p_room;

  -- Rudelkanal: Mitgliedschaft folgt exakt der Engine (Tote und Nicht-Mitglieder verlieren sofort alles).
  if coalesce(array_length(p_pack_members, 1), 0) > 0 or exists (
    select 1 from public.channels where room_id = p_room and kind = 'pack'
  ) then
    insert into public.channels (room_id, kind, key) values (p_room, 'pack', 'pack')
      on conflict (room_id, key) do update set key = excluded.key
      returning id into v_channel;
    select coalesce(max(id), 0) into v_max from public.messages where channel_id = v_channel;
    update public.channel_members set active = false
      where channel_id = v_channel and active and not (player_id = any (coalesce(p_pack_members, '{}')));
    insert into public.channel_members (channel_id, player_id, active, from_message_id)
      select v_channel, m, true, v_max from unnest(coalesce(p_pack_members, '{}')) as m
      on conflict (channel_id, player_id) do update
        set from_message_id = case when public.channel_members.active then public.channel_members.from_message_id else v_max end,
            active = true;
  end if;
end;
$$;

-- Commit eines Spielschritts mit optimistischer Nebenläufigkeitskontrolle (CAS auf version).
create function public.server_commit_game(
  p_room uuid, p_expected_version int, p_state jsonb, p_public jsonb, p_private jsonb,
  p_pack_members uuid[], p_alive uuid[], p_next_deadline timestamptz, p_status text
)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_current int;
  v_new int;
begin
  perform 1 from public.rooms where id = p_room for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  select version into v_current from public.game_secret where room_id = p_room;
  if v_current is null or v_current <> p_expected_version then
    raise exception 'version_conflict' using errcode = '40001';
  end if;
  v_new := v_current + 1;
  update public.game_secret set version = v_new, state = p_state where room_id = p_room;
  perform private.write_projections(p_room, v_new, p_public, p_private, p_pack_members, p_alive);
  update public.rooms set status = p_status, next_deadline_at = p_next_deadline where id = p_room;
  return v_new;
end;
$$;

-- Spielstart: Raum sperren, Host und Bereitschaft prüfen, ersten Zustand schreiben.
create function public.server_start_game(
  p_room uuid, p_host_user uuid, p_state jsonb, p_public jsonb, p_private jsonb,
  p_pack_members uuid[], p_alive uuid[], p_next_deadline timestamptz
)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
  v_count int;
  v_ready int;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  if v_room.status <> 'lobby' then raise exception 'game_already_started' using errcode = '55000'; end if;
  if v_room.host_user_id <> p_host_user then raise exception 'not_host' using errcode = '42501'; end if;
  select count(*), count(*) filter (where ready) into v_count, v_ready from public.players where room_id = p_room;
  if v_count <> v_ready then raise exception 'not_all_ready' using errcode = '55000'; end if;
  if v_count <> jsonb_array_length(jsonb_path_query_array(p_state, '$.players.*')) then
    raise exception 'roster_changed' using errcode = '40001';
  end if;
  insert into public.game_secret (room_id, version, state) values (p_room, 1, p_state);
  perform private.write_projections(p_room, 1, p_public, p_private, p_pack_members, p_alive);
  update public.rooms set status = 'running', next_deadline_at = p_next_deadline where id = p_room;
  return 1;
end;
$$;

create function public.server_due_rooms(p_now timestamptz)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.rooms where status = 'running' and next_deadline_at is not null and next_deadline_at <= p_now;
$$;

create function public.server_push_tokens(p_room uuid)
returns table (user_id uuid, token text)
language sql stable security definer set search_path = ''
as $$
  select t.user_id, t.token from public.push_tokens t
  join public.players p on p.user_id = t.user_id where p.room_id = p_room;
$$;

create function public.server_cleanup(p_older_than interval default interval '2 days')
returns int
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  delete from public.rooms where created_at < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ───────────────────────── Ausführungsrechte ─────────────────────────

-- Postgres gewährt EXECUTE standardmäßig an PUBLIC. Erst alles entziehen, dann gezielt vergeben.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_member(uuid), private.can_see_private(uuid), private.can_read_channel(uuid, bigint)
  to authenticated, service_role;

grant execute on function
  public.create_room(text, text, text, int),
  public.join_room(text, text, text),
  public.set_ready(uuid, boolean),
  public.leave_room(uuid),
  public.remove_player(uuid, uuid),
  public.reclaim_player(text, text, text),
  public.verify_pin(uuid, text),
  public.touch_unlock(uuid),
  public.lock_private(uuid),
  public.server_now(),
  public.open_dm(uuid, uuid),
  public.send_message(uuid, text),
  public.mark_read(uuid),
  public.register_push_token(text, text)
to authenticated;

grant execute on function
  public.server_load_game(uuid),
  public.server_commit_game(uuid, int, jsonb, jsonb, jsonb, uuid[], uuid[], timestamptz, text),
  public.server_start_game(uuid, uuid, jsonb, jsonb, jsonb, uuid[], uuid[], timestamptz),
  public.server_due_rooms(timestamptz),
  public.server_push_tokens(uuid),
  public.server_cleanup(interval)
to service_role;

-- Datenbank-Hygiene (in Supabase per pg_cron einrichten, siehe docs/BACKEND.md):
--   select cron.schedule('dorf-cleanup', '17 4 * * *', $$select public.server_cleanup()$$);
