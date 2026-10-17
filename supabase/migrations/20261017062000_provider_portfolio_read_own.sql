-- Permit each provider to list their own portfolio photos. The bucket already
-- permits inserting into the authenticated user's own root folder.
create policy "provider_public_select_own"
on storage.objects
for select to authenticated
using (
  bucket_id='provider-public'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
