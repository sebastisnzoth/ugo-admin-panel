-- UGO provider public profile photo.
alter table public.perfiles_proveedor
  add column if not exists foto_perfil_path text;

comment on column public.perfiles_proveedor.foto_perfil_path is
  'Relative object path in the public provider-public bucket.';

drop policy if exists "provider_public_delete_own" on storage.objects;
create policy "provider_public_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id='provider-public'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

notify pgrst,'reload schema';
