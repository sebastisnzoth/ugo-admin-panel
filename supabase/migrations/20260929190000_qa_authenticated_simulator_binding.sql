-- Bind QA simulator identities to authenticated UGO TEST actors and make service-lifecycle PASS depend on persisted actor evidence.
create table if not exists public.autonomous_qa_actor_actions(
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.servicios(id) on delete cascade,
  simulator_id uuid not null references public.autonomous_qa_simulators(id),
  simulator_key text not null,
  simulator_role text not null check(simulator_role in('CLIENT','PROVIDER','ADMIN')),
  actor_user_id uuid not null references public.usuarios(id),
  actor_user_type text not null,
  action_key text not null,
  result_snapshot jsonb not null,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists autonomous_qa_actor_actions_service_idx
  on public.autonomous_qa_actor_actions(service_id,simulator_key,created_at desc);
alter table public.autonomous_qa_actor_actions enable row level security;
revoke all on public.autonomous_qa_actor_actions from public,anon,authenticated;
grant select on public.autonomous_qa_actor_actions to service_role;
do $$ begin
 create policy qa_actor_actions_superadmin_read on public.autonomous_qa_actor_actions
 for select to authenticated using(private.is_superadmin());
exception when duplicate_object then null; end $$;

create or replace function public.autonomous_qa_record_actor_action(
 p_service_id uuid,p_simulator_key text,p_action_key text)
returns public.autonomous_qa_actor_actions
language plpgsql security definer
set search_path=public,private,auth,pg_temp
as $$
declare
 uid uuid:=auth.uid();
 u public.usuarios%rowtype;
 s public.servicios%rowtype;
 sim public.autonomous_qa_simulators%rowtype;
 outrow public.autonomous_qa_actor_actions%rowtype;
 snap jsonb;
begin
 if uid is null then raise exception 'AUTHENTICATED_ACTOR_REQUIRED' using errcode='42501'; end if;
 select * into u from public.usuarios where id=uid and activo is true;
 if u.id is null then raise exception 'ACTIVE_TEST_ACTOR_REQUIRED' using errcode='42501'; end if;
 select * into s from public.servicios where id=p_service_id and ambiente='demo';
 if s.id is null then raise exception 'UGO_TEST_SERVICE_REQUIRED'; end if;
 select * into sim from public.autonomous_qa_simulators
  where simulator_key=p_simulator_key and status='ACTIVE';
 if sim.id is null then raise exception 'ACTIVE_QA_SIMULATOR_REQUIRED'; end if;

 if sim.role='CLIENT' then
   if u.tipo<>'cliente' or s.cliente_id<>uid or p_action_key<>'observe_service' then
     raise exception 'CLIENT_SIMULATOR_BINDING_REJECTED' using errcode='42501';
   end if;
 elsif sim.role='PROVIDER' then
   if u.tipo<>'proveedor' or s.proveedor_id<>uid or p_action_key<>'observe_service' then
     raise exception 'PROVIDER_SIMULATOR_BINDING_REJECTED' using errcode='42501';
   end if;
 elsif sim.role='ADMIN' then
   if u.tipo not in('admin','superadmin') or p_action_key<>'observe_service' then
     raise exception 'ADMIN_SIMULATOR_BINDING_REJECTED' using errcode='42501';
   end if;
 else
   raise exception 'UNSUPPORTED_SIMULATOR_ROLE';
 end if;

 snap:=jsonb_build_object(
   'service_id',s.id,
   'service_state',s.estado,
   'client_id',s.cliente_id,
   'provider_id',s.proveedor_id,
   'evidence_count',(select count(*) from public.evidencias_servicio e where e.servicio_id=s.id),
   'payment_confirmed',exists(select 1 from public.pagos p where p.servicio_id=s.id and p.fecha_confirmacion is not null),
   'rating_sides',(select count(distinct r.autor_tipo) from public.resenas r where r.servicio_id=s.id),
   'source','AUTHENTICATED_DATABASE_ACTION'
 );
 insert into public.autonomous_qa_actor_actions(
   service_id,simulator_id,simulator_key,simulator_role,actor_user_id,actor_user_type,action_key,result_snapshot)
 values(s.id,sim.id,sim.simulator_key,sim.role,uid,u.tipo,p_action_key,snap)
 returning * into outrow;
 return outrow;
end$$;
revoke all on function public.autonomous_qa_record_actor_action(uuid,text,text) from public,anon;
grant execute on function public.autonomous_qa_record_actor_action(uuid,text,text) to authenticated;

-- Caller-provided boolean maps can no longer certify QA.
create or replace function public.superadmin_run_qa_scenario(
 p_scenario_id uuid,p_simulator_results jsonb,p_chaos_result jsonb default '{}'::jsonb)
returns public.autonomous_qa_runs
language plpgsql security definer set search_path=public,private,auth,pg_temp
as $$
begin
 if auth.uid() is null or not private.is_superadmin() then
   raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
 end if;
 raise exception 'CALLER_ASSERTIONS_NOT_AUTHORITATIVE_USE_BOUND_RUNTIME' using errcode='0A000';
end$$;
revoke all on function public.superadmin_run_qa_scenario(uuid,jsonb,jsonb) from public;
grant execute on function public.superadmin_run_qa_scenario(uuid,jsonb,jsonb) to authenticated;

-- Fail closed before the persisted-state judge can attribute a service-lifecycle PASS.
create or replace function private.autonomous_require_bound_simulators()
returns trigger language plpgsql security definer
set search_path=public,private,auth,pg_temp
as $$
declare s public.autonomous_qa_scenarios%rowtype; svc public.servicios%rowtype;
begin
 if new.judge_result->>'source' is distinct from 'PERSISTED_TEST_STATE'
    or new.status<>'PASSED' then return new; end if;
 select * into s from public.autonomous_qa_scenarios where id=new.scenario_id;
 if s.scenario_key<>'service-lifecycle' then return new; end if;
 if s.service_id is null then raise exception 'BOUND_TEST_SERVICE_REQUIRED'; end if;
 select * into svc from public.servicios where id=s.service_id and ambiente='demo';
 if svc.id is null then raise exception 'UGO_TEST_SERVICE_REQUIRED'; end if;
 if not exists(select 1 from public.autonomous_qa_actor_actions a
   where a.service_id=svc.id and a.simulator_key='qa-client-simulator'
     and a.simulator_role='CLIENT' and a.actor_user_id=svc.cliente_id and a.action_key='observe_service')
 then raise exception 'AUTHENTICATED_CLIENT_SIMULATOR_ACTION_REQUIRED'; end if;
 if not exists(select 1 from public.autonomous_qa_actor_actions a
   where a.service_id=svc.id and a.simulator_key='qa-provider-simulator'
     and a.simulator_role='PROVIDER' and a.actor_user_id=svc.proveedor_id and a.action_key='observe_service')
 then raise exception 'AUTHENTICATED_PROVIDER_SIMULATOR_ACTION_REQUIRED'; end if;
 if not exists(select 1 from public.autonomous_qa_actor_actions a
   join public.usuarios u on u.id=a.actor_user_id
   where a.service_id=svc.id and a.simulator_key='qa-admin-system-simulator'
     and a.simulator_role='ADMIN' and u.tipo in('admin','superadmin') and a.action_key='observe_service')
 then raise exception 'AUTHENTICATED_ADMIN_SIMULATOR_ACTION_REQUIRED'; end if;
 return new;
end$$;
revoke all on function private.autonomous_require_bound_simulators() from public,anon,authenticated;
drop trigger if exists autonomous_require_bound_simulators on public.autonomous_qa_runs;
create trigger autonomous_require_bound_simulators
before insert on public.autonomous_qa_runs for each row
execute function private.autonomous_require_bound_simulators();

-- Keep the canonical P0 harness on real business RPCs, but bind it to the same
-- authenticated TEST client/provider accounts used by browser-independent CI.
create or replace function public.autonomous_qa_run_p0_test_service()
returns uuid language plpgsql security definer set search_path=public,private,auth,extensions,pg_temp as $$
declare
 cid uuid; pid uuid; cat uuid; sid uuid; oid uuid; s public.servicios%rowtype; loc extensions.geography;
 lat double precision; lng double precision; arrival jsonb; initial_role text; br_cash_old text;
begin
 initial_role:=coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','');
 if initial_role<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
 select id into cid from public.usuarios where email='cliente@ugo.com.ar' and tipo='cliente' and es_demo is true and activo is true limit 1;
 select id into pid from public.usuarios where email='proveedor.ugo.test@example.com' and tipo='proveedor' and es_demo is true and activo is true limit 1;
 if cid is null or pid is null then raise exception 'AUTHENTICATED_TEST_ACTORS_REQUIRED'; end if;
 select valor into br_cash_old from public.config_sistema where clave='pago_efectivo_br_activo' for update;
 if br_cash_old is null then raise exception 'TEST_CASH_CONFIG_MISSING'; end if;
 update public.config_sistema set valor='true' where clave='pago_efectivo_br_activo';

 select categoria_principal_id,ubicacion,extensions.st_y(ubicacion::extensions.geometry),extensions.st_x(ubicacion::extensions.geometry)
 into cat,loc,lat,lng from public.perfiles_proveedor where usuario_id=pid;
 if cat is null or loc is null or lat is null or lng is null then raise exception 'TEST_PROVIDER_NOT_READY'; end if;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform public.publicar_ubicacion_disponibilidad_proveedor(lat,lng,now(),10);

 insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
 values(nextval('public.servicios_numero_seq'),cid,cat,'borrador','QA P0 persisted TEST service','UGO TEST',loc,120,
        jsonb_build_object('qa_p0',true,'payment_method','cash','authenticated_simulator_binding',true),'demo') returning id into sid;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform * from private.iniciar_matching_impl(sid);
 select id into oid from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente' order by ranking limit 1;
 if oid is null then raise exception 'P0_MATCHING_FAILED'; end if;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.aceptar_oferta_impl(oid);
 if s.estado<>'asignado' then raise exception 'P0_ACCEPT_FAILED'; end if;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform public.seleccionar_pago_efectivo(sid);

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.avanzar_servicio_impl(sid,'en_camino');
 perform public.publicar_ubicacion_proveedor(sid,lat,lng,now(),10);
 arrival:=public.marcar_llegada_proveedor(sid);
 if arrival->>'status'<>'arrived' then raise exception 'P0_ARRIVAL_FAILED:%',arrival; end if;

 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'antes','qa/'||sid||'/before.jpg','QA persisted initial evidence','{"qa":true,"phase":"before"}');
 select * into s from private.avanzar_servicio_impl(sid,'en_progreso');
 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'despues','qa/'||sid||'/after.jpg','QA persisted final evidence','{"qa":true,"phase":"after"}');
 select * into s from private.avanzar_servicio_impl(sid,'esperando_aprobacion');

 perform set_config('request.jwt.claim.sub',cid::text,true);
 select * into s from private.aprobar_servicio_impl(sid);
 select * into s from public.confirmar_pago_efectivo_cliente(sid);
 if s.estado<>'completado' then raise exception 'P0_CASH_COMPLETION_FAILED'; end if;

 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'QA client rating','cliente');
 perform set_config('request.jwt.claim.sub',pid::text,true);
 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'QA provider rating','proveedor');

 update public.autonomous_qa_scenarios set service_id=sid where scenario_key in('provider-radius','payments','service-lifecycle');
 update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 return sid;
end$$;
revoke all on function public.autonomous_qa_run_p0_test_service() from public,anon,authenticated;
grant execute on function public.autonomous_qa_run_p0_test_service() to service_role;
