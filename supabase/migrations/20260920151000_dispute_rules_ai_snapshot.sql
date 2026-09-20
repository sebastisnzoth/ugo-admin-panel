-- UGO · Disputas v2: reglas estructuradas, acuerdo previo, snapshot y evidencia adjunta.
-- La IA es asistencia para Admin: nunca ejecuta por sí sola una resolución financiera.

alter table public.disputas add column if not exists motivo_codigo text;
alter table public.disputas add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.disputas add column if not exists nivel_revision text not null default 'asistida';
alter table public.disputas add column if not exists requiere_humano boolean not null default false;

do $$ begin
 alter table public.disputas add constraint disputas_nivel_revision_check check(nivel_revision in ('automatica','asistida','humana'));
exception when duplicate_object then null;
end $$;

create table if not exists public.reglas_motivos_disputa(
 codigo text primary key,
 actor text not null check(actor in ('cliente','proveedor','ambos')),
 etiqueta text not null,
 severidad text not null check(severidad in ('baja','media','alta')),
 requiere_humano boolean not null default false,
 ventana_horas integer not null default 48 check(ventana_horas between 1 and 720),
 evidencia_sugerida text,
 activo boolean not null default true
);
alter table public.reglas_motivos_disputa enable row level security;
drop policy if exists reglas_motivos_disputa_read on public.reglas_motivos_disputa;
create policy reglas_motivos_disputa_read on public.reglas_motivos_disputa for select to authenticated using(activo=true);
revoke all on public.reglas_motivos_disputa from anon;
grant select on public.reglas_motivos_disputa to authenticated;

insert into public.reglas_motivos_disputa(codigo,actor,etiqueta,severidad,requiere_humano,ventana_horas,evidencia_sugerida) values
 ('no_realizado','cliente','El trabajo no se realizó','media',false,48,'Chat, horario, ubicación o evidencia del servicio.'),
 ('incompleto','cliente','El trabajo quedó incompleto','media',false,48,'Fotos del resultado y alcance acordado.'),
 ('calidad','cliente','No estoy conforme con la calidad','media',false,48,'Fotos antes/después y descripción concreta.'),
 ('retraso','cliente','Retraso o incumplimiento de horario','baja',false,48,'Timestamps, chat y agenda del pedido.'),
 ('cobro_incorrecto','cliente','Cobro incorrecto o duplicado','media',false,48,'Comprobante y monto acordado.'),
 ('danio','cliente','Daño durante el servicio','alta',true,168,'Fotos, evidencia previa/posterior y descripción del daño.'),
 ('cliente_ausente','proveedor','El cliente no estaba','media',false,48,'Hora de llegada, chat y ubicación.'),
 ('sin_acceso','proveedor','No pude acceder al lugar','media',false,48,'Chat, hora de llegada y motivo de acceso.'),
 ('negativa_pago','proveedor','El cliente no pagó','alta',true,48,'Estado del pago, chat y cierre del trabajo.'),
 ('tarea_extra','proveedor','Se pidieron tareas fuera del alcance','media',false,48,'Pedido original, chat y ampliaciones.'),
 ('cancelacion_tardia','proveedor','Cancelación tardía','media',false,48,'Agenda, timestamps y chat.'),
 ('conducta','ambos','Conducta inapropiada o situación de seguridad','alta',true,168,'Relato concreto y evidencia disponible; no confrontar a la otra parte.'),
 ('fraude','ambos','Posible fraude o manipulación','alta',true,168,'Comprobantes, mensajes y datos verificables.'),
 ('otro','ambos','Otro problema','media',true,48,'Explicación y evidencia verificable disponible.')
on conflict(codigo) do update set
 actor=excluded.actor,etiqueta=excluded.etiqueta,severidad=excluded.severidad,requiere_humano=excluded.requiere_humano,ventana_horas=excluded.ventana_horas,evidencia_sugerida=excluded.evidencia_sugerida,activo=true;

create table if not exists public.acuerdos_previos_disputa(
 id uuid primary key default gen_random_uuid(),
 servicio_id uuid not null references public.servicios(id) on delete cascade,
 propuesto_por uuid not null references public.usuarios(id) on delete cascade,
 tipo text not null check(tipo in ('retrabajo','ajuste_precio','reagendar','otro')),
 detalle text not null check(length(trim(detalle)) between 8 and 1200),
 monto numeric check(monto is null or monto>=0),
 estado text not null default 'propuesto' check(estado in ('propuesto','aceptado','rechazado','cancelado','escalado')),
 respondido_por uuid references public.usuarios(id),
 respuesta text,
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 updated_at timestamptz not null default now()
);
create unique index if not exists acuerdos_previos_uno_pendiente_idx on public.acuerdos_previos_disputa(servicio_id) where estado='propuesto';
create index if not exists acuerdos_previos_servicio_idx on public.acuerdos_previos_disputa(servicio_id,created_at desc);
alter table public.acuerdos_previos_disputa enable row level security;
drop policy if exists acuerdos_previos_select on public.acuerdos_previos_disputa;
create policy acuerdos_previos_select on public.acuerdos_previos_disputa for select to authenticated using(private.is_admin() or private.es_participante_servicio(servicio_id,auth.uid()));
revoke all on public.acuerdos_previos_disputa from anon;
grant select on public.acuerdos_previos_disputa to authenticated;

create table if not exists public.disputa_ai_analisis(
 disputa_id uuid primary key references public.disputas(id) on delete cascade,
 modelo text not null,
 resultado jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.disputa_ai_analisis enable row level security;
revoke all on public.disputa_ai_analisis from public,anon,authenticated;
grant all on public.disputa_ai_analisis to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dispute-evidence','dispute-evidence',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists dispute_evidence_participant_upload on storage.objects;
create policy dispute_evidence_participant_upload on storage.objects for insert to authenticated with check(
 bucket_id='dispute-evidence'
 and (storage.foldername(name))[2]=auth.uid()::text
 and exists(select 1 from public.servicios s where s.id::text=(storage.foldername(name))[1] and (s.cliente_id=auth.uid() or s.proveedor_id=auth.uid()))
);
drop policy if exists dispute_evidence_participant_read on storage.objects;
create policy dispute_evidence_participant_read on storage.objects for select to authenticated using(
 bucket_id='dispute-evidence'
 and (
  private.is_admin()
  or exists(select 1 from public.servicios s where s.id::text=(storage.foldername(name))[1] and (s.cliente_id=auth.uid() or s.proveedor_id=auth.uid()))
 )
);
drop policy if exists dispute_evidence_owner_delete on storage.objects;
create policy dispute_evidence_owner_delete on storage.objects for delete to authenticated using(
 bucket_id='dispute-evidence' and ((storage.foldername(name))[2]=auth.uid()::text or private.is_admin())
);

create or replace function private.capture_dispute_snapshot(p_servicio_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object(
  'captured_at',now(),
  'service',coalesce((select jsonb_build_object(
    'id',s.id,'numero',s.numero,'estado',s.estado,'descripcion',s.descripcion,'direccion',s.direccion_cliente,
    'programado_para',s.programado_para,'tarifa',s.tarifa,'moneda',s.moneda,
    'created_at',s.created_at,'aceptado_at',s.aceptado_at,'iniciado_at',s.iniciado_at,'completado_at',s.completado_at,'cancelado_at',s.cancelado_at
   ) from public.servicios s where s.id=p_servicio_id),'{}'::jsonb),
  'payment',coalesce((select jsonb_build_object('estado',p.estado,'monto',p.monto_bruto,'metodo',p.metodo,'procesador',p.procesador,'created_at',p.created_at)
    from public.pagos p where p.servicio_id=p_servicio_id order by p.created_at desc limit 1),'{}'::jsonb),
  'events',coalesce((select jsonb_agg(q.item) from(select jsonb_build_object('from',e.estado_anterior,'to',e.estado_nuevo,'role',e.actor_role,'reason',e.motivo,'at',e.created_at) item from public.servicio_estado_eventos e where e.servicio_id=p_servicio_id order by e.created_at asc limit 150)q),'[]'::jsonb),
  'chat',coalesce((select jsonb_agg(q.item) from(select jsonb_build_object('id',m.id,'role',m.emisor_rol,'message',m.contenido,'at',m.created_at) item from public.mensajes m where m.servicio_id=p_servicio_id order by m.created_at asc limit 150)q),'[]'::jsonb),
  'evidence',coalesce((select jsonb_agg(q.item) from(select jsonb_build_object('id',e.id,'type',e.tipo,'path',e.storage_path,'description',e.descripcion,'at',e.created_at) item from public.evidencias_servicio e where e.servicio_id=p_servicio_id order by e.created_at asc limit 100)q),'[]'::jsonb)
 );
$$;
revoke all on function private.capture_dispute_snapshot(uuid) from public,anon,authenticated;

create or replace function public.proponer_acuerdo_previo(p_servicio_id uuid,p_tipo text,p_detalle text,p_monto numeric default null)
returns public.acuerdos_previos_disputa language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid();v_s public.servicios;v_row public.acuerdos_previos_disputa;v_destino uuid;
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 select * into v_s from public.servicios where id=p_servicio_id;
 if v_s.id is null or (v_uid<>v_s.cliente_id and v_uid is distinct from v_s.proveedor_id) then raise exception 'Servicio no disponible'; end if;
 if v_s.estado not in ('llegado','en_progreso','esperando_aprobacion','completado') then raise exception 'Este servicio todavía no admite acuerdo previo'; end if;
 if p_tipo not in ('retrabajo','ajuste_precio','reagendar','otro') then raise exception 'Tipo de acuerdo inválido'; end if;
 if length(trim(coalesce(p_detalle,'')))<8 then raise exception 'Explicá mejor la propuesta'; end if;
 if exists(select 1 from public.disputas d where d.servicio_id=p_servicio_id and d.estado in ('abierta','en_revision')) then raise exception 'Ya existe una disputa formal'; end if;
 insert into public.acuerdos_previos_disputa(servicio_id,propuesto_por,tipo,detalle,monto) values(p_servicio_id,v_uid,p_tipo,trim(p_detalle),p_monto) returning * into v_row;
 v_destino:=case when v_uid=v_s.cliente_id then v_s.proveedor_id else v_s.cliente_id end;
 if v_destino is not null then perform private.crear_notificacion_unica(v_destino,'acuerdo_previo','Propuesta para resolver el servicio','La otra parte propuso resolver el problema antes de abrir una disputa.',jsonb_build_object('servicio_id',p_servicio_id,'acuerdo_id',v_row.id),'acuerdo:'||v_row.id||':propuesto'); end if;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('acuerdo_previo_propuesto',v_uid,'servicio',p_servicio_id,jsonb_build_object('acuerdo_id',v_row.id,'tipo',p_tipo,'monto',p_monto));
 return v_row;
end $$;

create or replace function public.responder_acuerdo_previo(p_acuerdo_id uuid,p_aceptar boolean,p_respuesta text default null)
returns public.acuerdos_previos_disputa language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid();v_row public.acuerdos_previos_disputa;v_s public.servicios;
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 select * into v_row from public.acuerdos_previos_disputa where id=p_acuerdo_id for update;
 if v_row.id is null or v_row.estado<>'propuesto' then raise exception 'La propuesta ya no está pendiente'; end if;
 select * into v_s from public.servicios where id=v_row.servicio_id;
 if not (v_uid=v_s.cliente_id or v_uid=v_s.proveedor_id) or v_uid=v_row.propuesto_por then raise exception 'Sólo la contraparte puede responder'; end if;
 update public.acuerdos_previos_disputa set estado=case when p_aceptar then 'aceptado' else 'rechazado' end,respondido_por=v_uid,respuesta=nullif(trim(coalesce(p_respuesta,'')),''),responded_at=now(),updated_at=now() where id=p_acuerdo_id returning * into v_row;
 perform private.crear_notificacion_unica(v_row.propuesto_por,'acuerdo_previo_respuesta',case when p_aceptar then 'Propuesta aceptada' else 'Propuesta rechazada' end,'Revisá el servicio para continuar.',jsonb_build_object('servicio_id',v_row.servicio_id,'acuerdo_id',v_row.id),'acuerdo:'||v_row.id||':respuesta');
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('acuerdo_previo_respondido',v_uid,'servicio',v_row.servicio_id,jsonb_build_object('acuerdo_id',v_row.id,'aceptado',p_aceptar));
 return v_row;
end $$;

create or replace function public.abrir_disputa_v2(p_servicio_id uuid,p_motivo_codigo text,p_motivo text,p_evidencias jsonb default '[]'::jsonb)
returns public.disputas language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid();v_s public.servicios;v_d public.disputas;v_rule public.reglas_motivos_disputa;v_role text;v_destino uuid;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'No autenticado'; end if;
 select * into v_s from public.servicios where id=p_servicio_id;
 if v_s.id is null then raise exception 'Servicio no encontrado'; end if;
 if v_uid<>v_s.cliente_id and v_uid is distinct from v_s.proveedor_id then raise exception 'No participás de este servicio'; end if;
 if v_s.estado not in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado') then raise exception 'El servicio todavía no admite disputa'; end if;
 v_role:=case when v_uid=v_s.cliente_id then 'cliente' else 'proveedor' end;
 select * into v_rule from public.reglas_motivos_disputa where codigo=p_motivo_codigo and activo=true and actor in (v_role,'ambos');
 if v_rule.codigo is null then raise exception 'Motivo de disputa inválido'; end if;
 if char_length(trim(coalesce(p_motivo,'')))<8 then raise exception 'Describí mejor el problema'; end if;
 if jsonb_typeof(coalesce(p_evidencias,'[]'::jsonb))<>'array' then raise exception 'Evidencias inválidas'; end if;
 if v_s.estado='completado' and v_s.completado_at is not null and now()>v_s.completado_at+make_interval(hours=>v_rule.ventana_horas) then raise exception 'El plazo para abrir este tipo de disputa venció'; end if;
 select * into v_d from public.disputas where servicio_id=p_servicio_id limit 1;
 if v_d.id is not null then return v_d; end if;
 v_snapshot:=private.capture_dispute_snapshot(p_servicio_id);
 insert into public.disputas(servicio_id,abierta_por,cliente_id,proveedor_id,monto_disputado,motivo,motivo_codigo,evidencias,estado_servicio_previo,snapshot,nivel_revision,requiere_humano)
 values(v_s.id,v_uid,v_s.cliente_id,v_s.proveedor_id,v_s.tarifa,trim(p_motivo),v_rule.codigo,coalesce(p_evidencias,'[]'::jsonb),v_s.estado,v_snapshot,case when v_rule.requiere_humano then 'humana' else 'asistida' end,v_rule.requiere_humano) returning * into v_d;
 update public.servicios set estado='disputado',updated_at=now() where id=v_s.id and estado<>'completado';
 update public.pagos set estado='disputado',updated_at=now() where servicio_id=v_s.id and estado in ('autorizado','retenido');
 update public.acuerdos_previos_disputa set estado='escalado',updated_at=now() where servicio_id=v_s.id and estado='propuesto';
 insert into public.disputa_mensajes(disputa_id,autor_id,autor_rol,mensaje,evidencias) values(v_d.id,v_uid,v_role,trim(p_motivo),coalesce(p_evidencias,'[]'::jsonb));
 v_destino:=case when v_uid=v_s.cliente_id then v_s.proveedor_id else v_s.cliente_id end;
 if v_destino is not null then perform private.crear_notificacion_unica(v_destino,'disputa_abierta','Se abrió una disputa','UGO abrió una revisión sobre el servicio #'||coalesce(v_s.numero::text,''),jsonb_build_object('servicio_id',v_s.id,'disputa_id',v_d.id),'disputa:'||v_d.id||':abierta'); end if;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('disputa_abierta_v2',v_uid,'disputa',v_d.id,jsonb_build_object('servicio_id',v_s.id,'motivo_codigo',v_rule.codigo,'requiere_humano',v_rule.requiere_humano));
 return v_d;
end $$;

revoke execute on function public.abrir_disputa(uuid,text,jsonb) from authenticated;
revoke all on function public.proponer_acuerdo_previo(uuid,text,text,numeric) from public,anon;
revoke all on function public.responder_acuerdo_previo(uuid,boolean,text) from public,anon;
revoke all on function public.abrir_disputa_v2(uuid,text,text,jsonb) from public,anon;
grant execute on function public.proponer_acuerdo_previo(uuid,text,text,numeric) to authenticated;
grant execute on function public.responder_acuerdo_previo(uuid,boolean,text) to authenticated;
grant execute on function public.abrir_disputa_v2(uuid,text,text,jsonb) to authenticated;

do $$ begin alter publication supabase_realtime add table public.acuerdos_previos_disputa; exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
