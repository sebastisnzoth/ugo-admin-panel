-- Enforce the product invariant: one active service per client.
-- The trigger gives a human-readable error; the partial unique index closes the
-- concurrency race so two simultaneous confirmations cannot create two active jobs.

create unique index if not exists servicios_cliente_single_active_uidx
on public.servicios (cliente_id)
where estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado');

create or replace function private.guard_single_active_client_service()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_conflict_id uuid;
begin
  if new.cliente_id is null
     or new.estado not in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado') then
    return new;
  end if;

  select s.id
    into v_conflict_id
    from public.servicios s
   where s.cliente_id = new.cliente_id
     and s.estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
     and (tg_op = 'INSERT' or s.id <> new.id)
   order by s.created_at desc
   limit 1;

  if v_conflict_id is not null then
    raise exception using
      errcode = '23505',
      message = 'Ya tenés un servicio activo. Seguilo o cancelalo antes de crear otro pedido.',
      detail = format('active_service_id=%s', v_conflict_id),
      hint = 'UGO permite un solo servicio activo por cliente.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_single_active_client_service on public.servicios;
create trigger trg_guard_single_active_client_service
before insert or update of cliente_id, estado on public.servicios
for each row execute function private.guard_single_active_client_service();
