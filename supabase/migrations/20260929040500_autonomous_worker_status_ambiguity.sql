-- Avoid PL/pgSQL output-column ambiguity in the worker authority quarantine/recovery.
do $x$
declare s text;
begin
 select prosrc into s from pg_proc where oid='public.autonomous_worker_cycle(text,integer)'::regprocedure;
 s:=replace(s,'where status=''QUEUED'' and authority_class in(''YELLOW'',''RED'')','where autonomous_jobs.status=''QUEUED'' and autonomous_jobs.authority_class in(''YELLOW'',''RED'')');
 s:=replace(s,'where status=''RUNNING'' and lease_expires_at<now()','where autonomous_jobs.status=''RUNNING'' and autonomous_jobs.lease_expires_at<now()');
 s:=replace(s,'encode(digest(','encode(extensions.digest(');
 execute 'create or replace function public.autonomous_worker_cycle(p_worker text,p_limit integer default 10) returns table(job_id uuid,status text,reason text) language plpgsql security definer set search_path=public,private,auth as '||quote_literal(s);
end $x$;
