-- PostgREST does not set request.jwt.claim.role in every service-role call.
-- The underlying QA runner and table ACL own invocation authorization;
-- the trigger independently recalculates all product assertions from persisted state.
revoke insert, update, delete on public.autonomous_qa_runs from public, anon, authenticated;

do $migration$
declare
  source_body text;
  old_guard constant text :=
    '  if coalesce(current_setting(''request.jwt.claim.role'',true),'''') <> ''service_role'' then'
    || E'\n' || '    raise exception ''SERVICE_ROLE_REQUIRED'' using errcode=''42501'';'
    || E'\n' || '  end if;';
begin
  select prosrc into source_body from pg_proc
    where oid='private.autonomous_attribute_persisted_qa_judge()'::regprocedure;
  if source_body is null or position(old_guard in source_body)=0 then
    raise exception 'EXPECTED_QA_JUDGE_GUARD_NOT_FOUND';
  end if;
  source_body:=replace(source_body,old_guard,
    '  -- Direct writes are denied to public, anon and authenticated.');
  execute 'create or replace function private.autonomous_attribute_persisted_qa_judge() '
    || 'returns trigger language plpgsql security definer '
    || 'set search_path=public,private,auth,extensions,pg_temp as '
    || quote_literal(source_body);
end $migration$;
