-- Optionale iPad-Dorfanzeige: liest nur öffentliche Daten, ohne Spielerplatz.
create table public.room_displays (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.room_displays enable row level security;
revoke all on public.room_displays from anon, authenticated;

-- Mitglied = Spieler ODER Anzeige. Privatzugriff (can_see_private / can_read_channel) hängt weiter nur an players.
create or replace function private.is_member(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.players p where p.room_id = p_room and p.user_id = (select auth.uid()))
      or exists (select 1 from public.room_displays d where d.room_id = p_room and d.user_id = (select auth.uid()));
$$;

create function public.join_display(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.rooms;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_room from public.rooms where code = upper(btrim(p_code));
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  insert into public.room_displays (room_id, user_id) values (v_room.id, v_user) on conflict do nothing;
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code);
end;
$$;

revoke all on function public.join_display(text) from public, anon, authenticated;
grant execute on function public.join_display(text) to authenticated;
