-- UGO first-client readiness dashboard.
-- Source of truth for verified progress: only status='approved' moves launch readiness.

create table if not exists public.development_checklist (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  area text not null,
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('P0','P1','P2','P3')),
  status text not null default 'pending' check (status in ('pending','in_progress','implemented','blocked','failed','approved')),
  weight smallint not null default 1 check (weight between 1 and 10),
  position integer not null default 0,
  evidence text,
  test_required boolean not null default true,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists development_checklist_priority_status_idx
  on public.development_checklist(priority,status,position);

alter table public.development_checklist enable row level security;

create policy development_checklist_admin_select
  on public.development_checklist for select
  to authenticated
  using (private.is_admin(auth.uid()));

create policy development_checklist_admin_insert
  on public.development_checklist for insert
  to authenticated
  with check (private.is_admin(auth.uid()));

create policy development_checklist_admin_update
  on public.development_checklist for update
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

create policy development_checklist_admin_delete
  on public.development_checklist for delete
  to authenticated
  using (private.is_admin(auth.uid()));

create table if not exists public.development_checklist_events (
  id bigint generated always as identity primary key,
  checklist_id uuid not null references public.development_checklist(id) on delete cascade,
  code text not null,
  old_status text,
  new_status text not null,
  evidence text,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

create index if not exists development_checklist_events_changed_idx
  on public.development_checklist_events(changed_at desc);

alter table public.development_checklist_events enable row level security;

create policy development_checklist_events_admin_select
  on public.development_checklist_events for select
  to authenticated
  using (private.is_admin(auth.uid()));

create or replace function private.log_development_checklist_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if old.status is distinct from new.status
     or old.evidence is distinct from new.evidence then
    insert into public.development_checklist_events(
      checklist_id,code,old_status,new_status,evidence,changed_by
    ) values (
      new.id,new.code,old.status,new.status,new.evidence,auth.uid()
    );
  end if;
  return new;
end;
$$;

revoke all on function private.log_development_checklist_event() from public;

create or replace function private.touch_development_checklist()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at := now();
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.completed_at := now();
  elsif new.status <> 'approved' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.touch_development_checklist() from public;

drop trigger if exists trg_touch_development_checklist on public.development_checklist;
create trigger trg_touch_development_checklist
before update on public.development_checklist
for each row execute function private.touch_development_checklist();

drop trigger if exists trg_log_development_checklist_event on public.development_checklist;
create trigger trg_log_development_checklist_event
after update on public.development_checklist
for each row execute function private.log_development_checklist_event();

alter table public.development_checklist replica identity full;
alter table public.development_checklist_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='development_checklist'
  ) then
    alter publication supabase_realtime add table public.development_checklist;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='development_checklist_events'
  ) then
    alter publication supabase_realtime add table public.development_checklist_events;
  end if;
end $$;

insert into public.development_checklist(code,area,title,description,priority,status,weight,position,evidence,test_required)
values
  ('ENV-TEST','Release','Ambiente UGO TEST aislado','La validación de cierre ocurre contra el proyecto TEST y no contra producción.','P0','approved',5,10,'main fija UGO_ENVIRONMENT=test y Supabase UGO Arena; CI valida el entorno antes de build/tests.',true),
  ('CI-MAIN','Release','Build, TypeScript y suite core verdes','Cada cambio de cierre debe mantener CI verde en main.','P0','approved',5,20,'UGO Core CI en main completó correctamente antes de iniciar este panel.',true),
  ('CLIENT-REQUEST','Cliente','Crear un pedido real','Cliente crea un servicio persistido con serviceId canónico.','P0','implemented',5,30,'Existe flujo y persistencia; falta revalidación E2E en dispositivo real.',true),
  ('CLIENT-MULTI','Cliente','Varios pedidos simultáneos','El cliente puede abrir un segundo/tercer servicio sin bloquear los anteriores.','P0','implemented',5,40,'Contrato y migración multipedido implementados; falta prueba E2E simultánea.',true),
  ('CLIENT-CANCEL','Cliente','Cancelar cada pedido de forma independiente','Cancelar un serviceId no debe afectar otros pedidos activos.','P0','failed',5,50,'Se reportó fallo funcional en interfaz; RPC existe pero debe validarse desde la UI real.',true),
  ('MATCH-ONLINE','Matching','Profesionales online reales','Matching y tarjetas deben reflejar proveedores realmente online/disponibles.','P0','failed',5,60,'Observado: proveedores online no aparecen correctamente al cliente.',true),
  ('HUGO-CARDS','Hugo','Hugo muestra tarjetas reales de proveedores','La conversación por voz/texto debe usar disponibilidad real y no estado inventado.','P0','failed',5,70,'Observado: Hugo no refleja correctamente tarjetas/online desde la base.',true),
  ('PROVIDER-ASSIGN','Proveedor','Pedido asignado visible y accionable','El proveedor ve el mismo serviceId asignado con datos suficientes para actuar.','P0','implemented',5,80,'Asignación visible; falta revalidar el recorrido completo desde Cliente.',true),
  ('PROVIDER-STATES','Proveedor','Estados simples del trabajo','Proveedor opera En camino → Iniciar → Finalizar sin pasos innecesarios.','P0','implemented',5,90,'UI/contratos implementados parcialmente; falta validación E2E real.',true),
  ('PROVIDER-AGENDA','Proveedor','Agenda/calendario operativo','El proveedor ve próximos trabajos por fecha y horario.','P1','implemented',3,100,'Agenda implementada; falta prueba con varios pedidos reales.',true),
  ('CHAT-REALTIME','Chat','Chat Cliente ↔ Proveedor bidireccional','Mensajes de ambos lados llegan en tiempo real y quedan aislados por serviceId.','P0','failed',5,110,'P0 confirmado: mensajes del proveedor no llegan al cliente.',true),
  ('CHAT-QUICK','Chat','Respuestas rápidas estilo Uber','Mensajes operativos cortos para llegada, demora, acceso, material y cierre.','P0','pending',5,120,'Requisito confirmado; no se considera terminado hasta verlo en Cliente y Proveedor.',true),
  ('CHAT-CONTACT','Chat','Bloqueo de datos de contacto','Filtrar teléfono, WhatsApp, email, links y otros datos para mantener la operación dentro de UGO.','P0','pending',5,130,'Requisito confirmado; debe validarse en ambos sentidos y con variantes de formato.',true),
  ('SYNC-REALTIME','Core','Estado sincronizado Cliente ↔ Proveedor ↔ Admin','Los tres roles observan la misma verdad persistida del serviceId.','P0','implemented',5,140,'Contratos Realtime existen; falta prueba real concurrente.',true),
  ('MAP-GPS','Cliente','GPS/mapa en celular real','Ubicación y mapa funcionan con permisos reales del dispositivo.','P1','in_progress',3,150,'Pendiente validación física en celular.',true),
  ('PAYMENT-CLOSE','Pago','Pago y cierre coherentes','El método elegido y el cierre del servicio mantienen estado auditable.','P0','implemented',5,160,'Backend contempla rutas de pago; falta recorrido final real del MVP.',true),
  ('RATING','Cliente','Calificación posterior al servicio','Tras finalizar, Cliente puede calificar y el resultado queda persistido.','P1','implemented',3,170,'Existe dominio de reseñas; falta E2E de cierre completo.',true),
  ('ADMIN-LIVE','Admin','Admin observa operación real','Admin ve el mismo servicio, proveedor, estado y cierre sin datos ficticios.','P0','implemented',5,180,'Panel Admin existe; falta validación conjunta con el serviceId del E2E final.',true),
  ('RLS-SECURITY','Seguridad','RLS y permisos críticos validados','Cliente/Proveedor/Admin sólo pueden leer y mutar lo que corresponde.','P0','in_progress',5,190,'Hay contratos y hardening; falta gate final de seguridad para primer cliente.',true),
  ('TWO-DEVICES','QA','Prueba simultánea en dos dispositivos/cuentas','Cliente y Proveedor recorren el mismo servicio al mismo tiempo.','P0','blocked',5,200,'Pendiente ejecución física con dos sesiones reales.',true),
  ('FULL-E2E','QA','E2E primer cliente completo','Solicitud → matching → asignación → chat → ejecución → pago → cierre → rating → Admin.','P0','blocked',5,210,'No aprobar hasta completar el recorrido sin intervención manual de base de datos.',true),
  ('GO-LIVE','Release','Go/No-Go primer cliente real','Todos los P0 necesarios están aprobados y hay evidencia de la prueba final.','P0','blocked',5,220,'Gate final: sólo se aprueba cuando no quedan P0 failed/blocked/pending/in_progress.',true)
on conflict (code) do update set
  area=excluded.area,
  title=excluded.title,
  description=excluded.description,
  priority=excluded.priority,
  weight=excluded.weight,
  position=excluded.position,
  test_required=excluded.test_required;

comment on table public.development_checklist is
  'UGO first-client readiness source of truth. Only approved items count toward verified launch progress.';
