alter table public.social_accounts drop constraint if exists social_accounts_connection_type_check;
alter table public.social_accounts add constraint social_accounts_connection_type_check
  check (connection_type in ('local', 'telegram', 'blogger', 'x', 'instagram'));

-- Instagram fetches media from a temporary signed URL while publishing. The
-- bucket stays private; only the owner and the server-side publishing role can
-- read its objects. Paths are <auth user id>/<random UUID>.<extension>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  104857600,
  array['image/jpeg', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "post media owner read" on storage.objects for select to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post media owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post media owner update" on storage.objects for update to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post media owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
