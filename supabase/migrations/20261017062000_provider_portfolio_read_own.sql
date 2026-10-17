-- Read provider-public media from the owner's authenticated directory.
-- The policy may already exist in UGO Arena TEST from staged rollout.
do $$
begin
 if not exists (
  select 1 from pg_policies
  where schemaname='storage' and tablename='objects'
    and policyname='provider_public_select_own'
 ) then
  create policy "provider_public_select_own" on storage.objects
  for select to authenticated
  using (bucket_id='provider-public'
     and (storage.foldername(name))[1]=(select auth.uid())::text);
 end if;
end;
$$;
