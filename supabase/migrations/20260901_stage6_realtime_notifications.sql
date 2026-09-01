alter table public.notificaciones add column if not exists dedupe_key text;
create unique index if not exists notificaciones_dedupe_key_uq on public.notificaciones(dedupe_key) where dedupe_key is not null;

create or replace function private.crear_notificacion_unica(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_datos jsonb,
  p_dedupe_key text
) returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if p_usuario_id is null then return; end if;
  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos,dedupe_key)
  values(p_usuario_id,p_tipo,p_titulo,p_cuerpo,coalesce(p_datos,'{}'::jsonb),p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;
revoke all on function private.crear_notificacion_unica(uuid,text,text,text,jsonb,text) from public;

create or replace function private.notificar_oferta_servicio()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare v_numero bigint; v_desc text; v_tarifa numeric;
begin
  if new.estado::text <> 'pendiente' then return new; end if;
  if tg_op='UPDATE' and old.estado::text='pendiente' then return new; end if;
  select numero,descripcion,tarifa into v_numero,v_desc,v_tarifa from public.servicios where id=new.servicio_id;
  perform private.crear_notificacion_unica(
    new.proveedor_id,'nueva_oferta','Nueva oferta UGO',
    'Servicio #'||coalesce(v_numero::text,'')||' · '||left(coalesce(v_desc,'Nuevo trabajo'),90)||case when v_tarifa is not null then ' · R$ '||to_char(v_tarifa,'FM999999990.00') else '' end,
    jsonb_build_object('servicio_id',new.servicio_id,'oferta_id',new.id,'estado','pendiente'),
    'oferta:'||new.id::text||':pendiente'
  );
  return new;
end;
$$;

drop trigger if exists trg_notificar_oferta_servicio on public.ofertas_servicio;
create trigger trg_notificar_oferta_servicio
after insert or update of estado on public.ofertas_servicio
for each row execute function private.notificar_oferta_servicio();

create or replace function private.notificar_estado_servicio()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare v_proveedor_nombre text; v_estado text:=new.estado::text; v_num text:=coalesce(new.numero::text,'');
begin
  if old.estado is not distinct from new.estado and old.proveedor_id is not distinct from new.proveedor_id then return new; end if;
  if new.proveedor_id is not null then select nombre into v_proveedor_nombre from public.usuarios where id=new.proveedor_id; end if;

  if v_estado='asignado' then
    perform private.crear_notificacion_unica(new.cliente_id,'proveedor_asignado','Proveedor confirmado',coalesce(v_proveedor_nombre,'Un profesional')||' aceptó el servicio #'||v_num,jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:'||new.id||':asignado:cliente');
  elsif v_estado='en_camino' then
    perform private.crear_notificacion_unica(new.cliente_id,'proveedor_en_camino','Tu proveedor está en camino','El profesional ya salió hacia tu dirección para el servicio #'||v_num,jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':en_camino:cliente');
  elsif v_estado='en_progreso' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_iniciado','Servicio iniciado','El servicio #'||v_num||' está en progreso.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':en_progreso:cliente');
  elsif v_estado='esperando_aprobacion' then
    perform private.crear_notificacion_unica(new.cliente_id,'aprobacion_pendiente','Trabajo finalizado','Revisá las evidencias del servicio #'||v_num||' y aprobalo para liberar el pago.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':esperando_aprobacion:cliente');
  elsif v_estado='completado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_completado','Servicio completado','El servicio #'||v_num||' quedó completado. Ya podés calificar al proveedor.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':completado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_completado','Trabajo aprobado','El cliente aprobó el servicio #'||v_num||'.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':completado:proveedor');
  elsif v_estado='cancelado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_cancelado','Servicio cancelado','El servicio #'||v_num||' fue cancelado.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':cancelado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_cancelado','Servicio cancelado','El servicio #'||v_num||' fue cancelado.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':cancelado:proveedor');
  elsif v_estado='disputado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_disputado','Servicio en disputa','El servicio #'||v_num||' está en revisión por UGO.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':disputado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_disputado','Servicio en disputa','El servicio #'||v_num||' está en revisión por UGO.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:'||new.id||':disputado:proveedor');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_estado_servicio on public.servicios;
create trigger trg_notificar_estado_servicio
after update of estado,proveedor_id on public.servicios
for each row execute function private.notificar_estado_servicio();

create or replace function private.notificar_estado_pago()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare v_cliente uuid; v_proveedor uuid; v_num bigint; v_estado text:=new.estado::text;
begin
  if old.estado is not distinct from new.estado then return new; end if;
  select cliente_id,proveedor_id,numero into v_cliente,v_proveedor,v_num from public.servicios where id=new.servicio_id;
  if v_estado='retenido' then
    perform private.crear_notificacion_unica(v_cliente,'pago_confirmado','Pago protegido','El pago del servicio #'||coalesce(v_num::text,'')||' fue confirmado y está protegido por UGO.',jsonb_build_object('servicio_id',new.servicio_id,'pago_id',new.id,'estado',v_estado),'pago:'||new.id||':retenido:cliente');
    perform private.crear_notificacion_unica(v_proveedor,'pago_protegido','Pago protegido','El servicio #'||coalesce(v_num::text,'')||' tiene el pago confirmado.',jsonb_build_object('servicio_id',new.servicio_id,'pago_id',new.id,'estado',v_estado),'pago:'||new.id||':retenido:proveedor');
  elsif v_estado='liberado' then
    perform private.crear_notificacion_unica(v_proveedor,'pago_liberado','Pago liberado','Tu ganancia del servicio #'||coalesce(v_num::text,'')||' ya está disponible.',jsonb_build_object('servicio_id',new.servicio_id,'pago_id',new.id,'estado',v_estado),'pago:'||new.id||':liberado:proveedor');
  elsif v_estado='reembolsado' then
    perform private.crear_notificacion_unica(v_cliente,'pago_reembolsado','Pago reembolsado','El pago del servicio #'||coalesce(v_num::text,'')||' fue reembolsado.',jsonb_build_object('servicio_id',new.servicio_id,'pago_id',new.id,'estado',v_estado),'pago:'||new.id||':reembolsado:cliente');
  elsif v_estado='fallido' then
    perform private.crear_notificacion_unica(v_cliente,'pago_fallido','Pago no confirmado','No pudimos confirmar el pago del servicio #'||coalesce(v_num::text,'')||'.',jsonb_build_object('servicio_id',new.servicio_id,'pago_id',new.id,'estado',v_estado),'pago:'||new.id||':fallido:cliente');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_estado_pago on public.pagos;
create trigger trg_notificar_estado_pago
after update of estado on public.pagos
for each row execute function private.notificar_estado_pago();
