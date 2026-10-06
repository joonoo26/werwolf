-- Profilfotos: privater Storage-Bucket. Nur Mitglieder desselben Raums dürfen ein Foto lesen, nur der Besitzer
-- darf sein Foto hochladen/ändern. Fotos von Gastspielern werden mit dem Raum gelöscht (Edge-Aktion `cleanup`,
-- die die Dateien über die Storage-API entfernt und danach `server_cleanup()` aufruft).
-- Wird nur ausgeführt, wenn das Supabase-Storage-Schema existiert (nicht in Postgres-only-Tests ohne Storage).
do $$
begin
  if to_regclass('storage.objects') is null or to_regclass('storage.buckets') is null then
    raise notice 'storage-Schema fehlt – Foto-Policies übersprungen';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('profile-photos', 'profile-photos', false, 1048576, array['image/jpeg'])
  on conflict (id) do nothing;

  create or replace function private.photo_room(p_name text)
  returns uuid
  language sql immutable set search_path = ''
  as $f$ select case when p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then split_part(p_name, '/', 1)::uuid end $f$;

  create or replace function private.owns_photo(p_name text)
  returns boolean
  language sql stable security definer set search_path = ''
  as $f$
    select exists (
      select 1 from public.players p
      where p.user_id = (select auth.uid())
        and p_name = p.room_id::text || '/' || p.id::text || '.jpg'
    )
  $f$;

  grant execute on function private.photo_room(text), private.owns_photo(text) to authenticated;

  drop policy if exists profile_photos_read on storage.objects;
  drop policy if exists profile_photos_insert on storage.objects;
  drop policy if exists profile_photos_update on storage.objects;
  drop policy if exists profile_photos_delete on storage.objects;

  create policy profile_photos_read on storage.objects for select to authenticated
    using (bucket_id = 'profile-photos' and private.photo_room(name) is not null and private.is_member(private.photo_room(name)));
  create policy profile_photos_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'profile-photos' and private.owns_photo(name));
  create policy profile_photos_update on storage.objects for update to authenticated
    using (bucket_id = 'profile-photos' and private.owns_photo(name))
    with check (bucket_id = 'profile-photos' and private.owns_photo(name));
  create policy profile_photos_delete on storage.objects for delete to authenticated
    using (bucket_id = 'profile-photos' and private.owns_photo(name));
end $$;
