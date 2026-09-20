-- UGO · client/provider action alerts.
-- Every canonical service chat message creates one deduplicated notification
-- for the counterpart. Lifecycle notifications continue to be emitted by
-- private.notificar_estado_servicio() from servicios state changes.

create or replace function private.notificar_mensaje_servicio()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_cliente uuid;
  v_proveedor uuid;
  v_numero bigint;
  v_actor_nombre text;
  v_destino uuid;
  v_titulo text;
  v_cuerpo text;
begin
  select s.cliente_id,s.proveedor_id,s.numero,u.nombre
    into v_cliente,v_proveedor,v_numero,v_actor_nombre
    from public.servicios s
    left join public.usuarios u on u.id=new.emisor_id
   where s.id=new.servicio_id;

  if new.emisor_rol::text='proveedor' and new.emisor_id=v_proveedor then
    v_destino:=v_cliente;
    v_titulo:='Nuevo mensaje del profesional';
  elsif new.emisor_rol::text='cliente' and new.emisor_id=v_cliente then
    v_destino:=v_proveedor;
    v_titulo:='Nuevo mensaje del cliente';
  else
    return new;
  end if;

  if v_destino is null then return new; end if;

  v_cuerpo:=coalesce(nullif(btrim(v_actor_nombre),''),case when new.emisor_rol::text='proveedor' then 'Tu profesional' else 'Tu cliente' end)
    ||' · Pedido #'||coalesce(v_numero::text,'')
    ||': '||left(regexp_replace(coalesce(new.contenido,''),'[\r\n\t]+',' ','g'),160);

  perform private.crear_notificacion_unica(
    v_destino,
    'chat_mensaje',
    v_titulo,
    v_cuerpo,
    jsonb_build_object(
      'servicio_id',new.servicio_id,
      'mensaje_id',new.id,
      'emisor_id',new.emisor_id,
      'emisor_rol',new.emisor_rol,
      'numero',v_numero
    ),
    'mensaje:'||new.id::text||':'||v_destino::text
  );

  return new;
end;
$$;

revoke all on function private.notificar_mensaje_servicio() from public,anon,authenticated;

drop trigger if exists trg_notificar_mensaje_servicio on public.mensajes;
create trigger trg_notificar_mensaje_servicio
after insert on public.mensajes
for each row execute function private.notificar_mensaje_servicio();

notify pgrst,'reload schema';
