-- Avoid PL/pgSQL output-column ambiguity in the worker authority quarantine.
do $x$
declare s text;
begin
 select prosrc into s from pg_proc where oid='public.autonomous_worker_cycle(text,integer)'::regprocedure;
 s:=replace(s,'where status=''QUEUED'' and authority_class in(''YELLOW'',''RED'')','where autonomous_jobs.status=''QUEUED'' and autonomous_jobs.authority_class in(''YELLOW'',''RED'')');
 execute 'create or replace function public.autonomous_worker_cycle(p_worker text,p_limit integer default 10) returns table(job_id uuid,status text,reason text) language plpgsql security definer set search_path=public,private,auth as '||quote_literal(s);
end $x$;
