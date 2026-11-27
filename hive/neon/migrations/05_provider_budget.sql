-- UGO Hive · 05 · Presupuesto USD 0: consumo por proveedor y circuitos.
--
-- NO DESTRUCTIVO sobre una `hive.provider_circuits` preexistente: sólo añade columnas
-- que falten. El consumo diario se guarda por proveedor y día; la escalera 50/70/85/95
-- devuelve nivel y acción, y declara el ciclo mensual como UNKNOWN cuando no hay
-- telemetría fiable (nunca se presenta como saludable).

create table if not exists hive.provider_daily_usage (
  provider text not null,
  day      date not null,
  calls    integer not null default 0,
  tokens   bigint  not null default 0,
  primary key (provider, day)
);
alter table hive.provider_daily_usage add column if not exists provider text;
alter table hive.provider_daily_usage add column if not exists day      date;
alter table hive.provider_daily_usage add column if not exists calls    integer not null default 0;
alter table hive.provider_daily_usage add column if not exists tokens   bigint  not null default 0;

create table if not exists hive.provider_circuits (
  provider      text primary key,
  failures      integer not null default 0,
  blocked_until timestamptz
);
alter table hive.provider_circuits add column if not exists provider      text;
alter table hive.provider_circuits add column if not exists failures      integer not null default 0;
alter table hive.provider_circuits add column if not exists blocked_until timestamptz;

create or replace function hive.quota_state(p_provider text, p_day date default (now() at time zone 'UTC')::date)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_calls integer; v_tokens bigint;
  v_limit_calls integer := hive.setting_int('daily_calls_per_provider', 20);
  v_limit_tokens bigint := hive.setting_int('daily_tokens_per_provider', 20000);
  v_pct numeric; v_level text; v_action text; v_allow boolean;
begin
  select calls, tokens into v_calls, v_tokens
    from hive.provider_daily_usage where provider = p_provider and day = p_day;
  v_calls := coalesce(v_calls, 0);
  v_tokens := coalesce(v_tokens, 0);
  v_pct := round(greatest(v_calls::numeric / greatest(v_limit_calls, 1),
                          v_tokens::numeric / greatest(v_limit_tokens, 1)) * 100, 2);
  if    v_pct < 50 then v_level := 'NORMAL';    v_action := 'OPERAR';    v_allow := true;
  elsif v_pct < 70 then v_level := 'ALERT';     v_action := 'ADVERTIR';  v_allow := true;
  elsif v_pct < 85 then v_level := 'REDUCED';   v_action := 'REDUCIR';   v_allow := true;
  elsif v_pct < 95 then v_level := 'SUSPENDED'; v_action := 'SUSPENDER'; v_allow := false;
  else                  v_level := 'BLOCKED';   v_action := 'BLOQUEAR';  v_allow := false;
  end if;
  return jsonb_build_object(
    'provider', p_provider, 'day', p_day, 'calls', v_calls, 'tokens', v_tokens,
    'daily_call_limit', v_limit_calls, 'daily_token_limit', v_limit_tokens,
    'percent_used', v_pct, 'level', v_level, 'action', v_action,
    'allow_new_secondary_tasks', v_allow, 'monthly_quota', 'UNKNOWN');
end $$;

create or replace function hive.record_provider_call(
  p_provider text, p_calls integer default 1, p_tokens bigint default 0
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'UTC')::date; v_state jsonb;
begin
  insert into hive.provider_daily_usage (provider, day, calls, tokens)
  values (p_provider, v_day, greatest(p_calls, 0), greatest(p_tokens, 0))
  on conflict (provider, day) do update
    set calls  = hive.provider_daily_usage.calls  + greatest(p_calls, 0),
        tokens = hive.provider_daily_usage.tokens + greatest(p_tokens, 0);
  v_state := hive.quota_state(p_provider, v_day);
  if not (v_state ->> 'allow_new_secondary_tasks')::boolean then
    insert into hive.provider_circuits (provider, failures, blocked_until)
    values (p_provider, 1, now() + make_interval(secs => 300))
    on conflict (provider) do update
      set failures = hive.provider_circuits.failures + 1,
          blocked_until = now() + make_interval(secs => 300);
  end if;
  return v_state;
end $$;
