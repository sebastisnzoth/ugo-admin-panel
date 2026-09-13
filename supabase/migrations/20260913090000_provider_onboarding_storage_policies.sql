drop policy if exists "provider_kyc_insert_own" on storage.objects;
create policy "provider_kyc_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-kyc'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "provider_kyc_select_own_or_admin" on storage.objects;
create policy "provider_kyc_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-kyc'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_admin(auth.uid())
  )
);

drop policy if exists "provider_public_insert_own" on storage.objects;
create policy "provider_public_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-public'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "provider_public_update_own" on storage.objects;
create policy "provider_public_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'provider-public'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'provider-public'
  and (storage.foldername(name))[1] = auth.uid()::text
);
