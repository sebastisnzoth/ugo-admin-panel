-- pgcrypto is installed in extensions on Supabase. SECURITY DEFINER functions use a restricted search_path,
-- so hash calls must be schema-qualified instead of depending on caller search_path.
do $$
declare r record; d text;
begin
 for r in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) def
          from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where p.prokind='f' and n.nspname in('public','private') and p.prosrc ilike '%digest(%'
 loop
   d:=replace(r.def,'encode(digest(','encode(extensions.digest(');
   if d<>r.def then execute d; end if;
 end loop;
end$$;
