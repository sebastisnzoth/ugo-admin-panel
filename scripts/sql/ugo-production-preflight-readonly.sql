-- UGO audit: SELECT-only PROD/TEST snapshot. No mutations.
select current_database() as database_name,
 (select count(*) from information_schema.tables where table_schema='public') as public_table_count,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') as public_function_count,
 (select count(*) from pg_policies where schemaname='public') as rls_policy_count,
 (select count(*) from supabase_migrations.schema_migrations) as migrations_count,
 to_regclass('public.autonomous_company_state') as company_state,
 to_regclass('public.autonomous_release_gate') as autonomy_gate,
 to_regclass('public.autonomous_kill_switches') as kill_switches,
 to_regclass('public.hive_backup_versions') as hive_backup;
select table_name from information_schema.tables where table_schema='public'
 and (table_name like 'autonomous_%' or table_name like 'hive_%')
 order by table_name;
select id,public from storage.buckets order by id;
