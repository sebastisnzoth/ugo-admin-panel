-- UGO TEST ONLY — atomic per-minute quota for anonymous public chat.
create table if not exists public.ugo_support_rate_limits (
  fingerprint text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (fingerprint, window_start)
);
alter table public.ugo_support_rate_limits enable row level security;
revoke all on public.ugo_support_rate_limits from public, anon, authenticated;
create or replace function public.ugo_support_check_limit(p_fingerprint text, p_limit integer default 6)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_hits integer; v_window timestamptz;
begin
 if length(p_fingerprint)<>64 or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FINGERPRINT'; end if;
 if p_limit<1 or p_limit>20 then raise exception 'INVALID_LIMIT'; end if;
 v_window := date_trunc('minute',now());
 insert into public.ugo_support_rate_limits(fingerprint,window_start,hits)
 values (p_fingerprint,v_window,1)
 on conflict (fingerprint,window_start) do update set hits=ugo_support_rate_limits.hits+1
 returning hits into v_hits;
 return v_hits<=p_limit;
end $$;
revoke all on function public.ugo_support_check_limit(text,integer) from public,anon,authenticated;
grant execute on function public.ugo_support_check_limit(text,integer) to service_role;
-- Schedule deletion of old minute buckets using a controlled maintenance job.
