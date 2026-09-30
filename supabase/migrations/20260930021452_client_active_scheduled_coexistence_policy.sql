-- UGO TEST · client active/scheduled coexistence policy.
-- Keep one immediate active request per client while allowing future scheduled
-- requests to coexist. This closes the concurrency race at the database boundary.

create or replace function private.guard_client_immediate_order_concurrency()
returns trigger
language plpgsql
security invoker
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_conflict_id uuid;
begin
  if new.cliente_id is null
     or new.estado not in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
     or new.programado_para is not null then
    return new;
  end if;

  select s.id
    into v_conflict_id
    from public.servicios s
   where s.cliente_id = new.cliente_id
     and s.estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
     and s.programado_para is null
     and (tg_op = 'INSERT' or s.id <> new.id)
   order by s.created_at desc
   limit 1;

  if v_conflict_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Ya tenés un pedido inmediato activo. Podés seguirlo o programar otro servicio para más adelante.',
      detail = format('active_service_id=%s', v_conflict_id),
      hint = 'Los pedidos futuros programados pueden coexistir con un pedido inmediato activo.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_client_immediate_order_concurrency on public.servicios;
create trigger trg_guard_client_immediate_order_concurrency
before insert or update of cliente_id, estado, programado_para on public.servicios
for each row execute function private.guard_client_immediate_order_concurrency();

revoke execute on function private.guard_client_immediate_order_concurrency() from public, anon, authenticated;
