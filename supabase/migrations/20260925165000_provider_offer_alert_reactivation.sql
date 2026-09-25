-- P0 provider dispatch: re-alert a real offer cycle after matching reactivation,
-- carry the offer expiry end-to-end, and keep each cycle idempotent.

create or replace function private.notify_provider_new_offer()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_numero bigint;
  v_programado timestamptz;
  v_cycle_key text;
begin
  if new.estado::text <> 'pendiente' then return new; end if;

  -- Ignore no-op UPDATEs. A new alert cycle is only an INSERT, a transition
  -- back to pendiente, or an explicit expiry refresh.
  if tg_op='UPDATE'
     and old.estado::text='pendiente'
     and old.expira_at is not distinct from new.expira_at then
    return new;
  end if;

  select numero,programado_para
    into v_numero,v_programado
    from public.servicios
   where id=new.servicio_id;

  v_cycle_key := coalesce(
    floor(extract(epoch from new.expira_at)*1000)::bigint::text,
    'sin-vencimiento'
  );

  perform private.crear_notificacion_unica(
    new.proveedor_id,
    'nueva_oferta',
    'Nuevo servicio en tu zona',
    case when v_programado is not null
      then 'Tenés una oportunidad programada para revisar.'
      else 'Hay un servicio disponible para revisar ahora.' end,
    jsonb_build_object(
      'oferta_id',new.id,
      'servicio_id',new.servicio_id,
      'numero',v_numero,
      'programado_para',v_programado,
      'expira_at',new.expira_at
    ),
    'oferta:'||new.id::text||':'||v_cycle_key
  );
  return new;
end;
$function$;

drop trigger if exists trg_notify_provider_new_offer on public.ofertas_servicio;
create trigger trg_notify_provider_new_offer
after insert or update of estado,expira_at on public.ofertas_servicio
for each row execute function private.notify_provider_new_offer();
