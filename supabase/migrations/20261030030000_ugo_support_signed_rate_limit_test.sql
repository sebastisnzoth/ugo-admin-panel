-- TEST-only. Server-authenticated RPC using an HMAC signature and public publishable key.
-- Secret must be provisioned OUTSIDE the repository into a private schema.
create schema if not exists ugo_support_private;
revoke all on schema ugo_support_private from public, anon, authenticated;
create table if not exists ugo_support_private.config(id integer primary key check(id=1), hmac_secret text not null);
revoke all on ugo_support_private.config from public, anon, authenticated;
create or replace function public.ugo_support_check_limit_signed(
 p_fingerprint text,p_limit integer,p_stamp bigint,p_signature text
) returns boolean language plpgsql security definer
 set search_path=public,extensions,pg_temp as $$
declare v_secret text; v_expected text; v_hits integer; v_window timestamptz;
begin
 if p_fingerprint !~ '^[0-9a-f]{64}$' or p_limit<>6 or p_stamp is null
 or abs(extract(epoch from now())::bigint-p_stamp)>30
 or p_signature !~ '^[0-9a-f]{64}$' then return false; end if;
 select hmac_secret into v_secret from ugo_support_private.config where id=1;
 if v_secret is null then raise exception 'RATE_LIMIT_UNAVAILABLE'; end if;
 v_expected=encode(extensions.hmac(convert_to(p_fingerprint||':'||p_limit::text||':'||p_stamp::text,'utf8'),convert_to(v_secret,'utf8'),'sha256'),'hex');
 if v_expected<>p_signature then raise exception 'UNAUTHORIZED_RATE_SIGNATURE'; end if;
 v_window=date_trunc('minute',now());
 insert into public.ugo_support_rate_limits(fingerprint,window_start,hits) values(p_fingerprint,v_window,1)
 on conflict(fingerprint,window_start) do update set hits=ugo_support_rate_limits.hits+1
 returning hits into v_hits;
 return v_hits<=p_limit;
end $$;
revoke all on function public.ugo_support_check_limit_signed(text,integer,bigint,text) from public,authenticated;
grant execute on function public.ugo_support_check_limit_signed(text,integer,bigint,text) to anon;
