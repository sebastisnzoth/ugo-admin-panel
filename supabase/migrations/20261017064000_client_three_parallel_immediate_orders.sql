-- UGO Cliente: support up to three independent immediate active requests.
-- Keep the limit database-side to protect against accidental duplicate submissions
-- and preserve per-request matching/service ownership.
create or replace function private.guard_client_immediate_order_concurrency()
returns trigger language plpgsql security invoker
set search_path to 'public','private','pg_temp'
as $function$
declare
 v_count integer;
begin
 if new.cliente_id is null
  or new.estado not in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
  or new.programado_para is not null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.cliente_id::text,314159));
 select count(*) into v_count from public.servicios s
 where s.cliente_id=new.cliente_id
  and s.estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
  and s.programado_para is null
  and (tg_op='INSERT' or s.id<>new.id);
 if v_count>=3 then
  raise exception using errcode='P0001',
   message='Podés tener hasta 3 pedidos inmediatos activos. Cerrá o cancelá uno, o programá un servicio futuro.';
 end if;
 return new;
end;
$function$;
revoke execute on function private.guard_client_immediate_order_concurrency() from public, anon, authenticated;
