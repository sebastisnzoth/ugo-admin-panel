-- UGO Scout Recruitment CRM v1
-- Adds funnel, follow-up and demand-priority data without breaking the legacy Scout estados.

alter table public.prospectos_scouts
  add column if not exists pipeline_etapa text not null default 'nuevo',
  add column if not exists recruitment_score integer not null default 0,
  add column if not exists contactos_intentos integer not null default 0,
  add column if not exists ultimo_canal text,
  add column if not exists ultimo_contacto_at timestamptz,
  add column if not exists proximo_contacto_at timestamptz,
  add column if not exists no_contactar boolean not null default false,
  add column if not exists invitation_token uuid default gen_random_uuid();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='prospectos_scouts_pipeline_etapa_check'
      and conrelid='public.prospectos_scouts'::regclass
  ) then
    alter table public.prospectos_scouts
      add constraint prospectos_scouts_pipeline_etapa_check
      check (pipeline_etapa in (
        'nuevo','listo','contactado','respondio','interesado',
        'registro_iniciado','documentos_pendientes','aprobado','activo','no_interesado'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='prospectos_scouts_recruitment_score_check'
      and conrelid='public.prospectos_scouts'::regclass
  ) then
    alter table public.prospectos_scouts
      add constraint prospectos_scouts_recruitment_score_check
      check (recruitment_score between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='prospectos_scouts_contactos_intentos_check'
      and conrelid='public.prospectos_scouts'::regclass
  ) then
    alter table public.prospectos_scouts
      add constraint prospectos_scouts_contactos_intentos_check
      check (contactos_intentos >= 0);
  end if;
end $$;

create unique index if not exists prospectos_scouts_invitation_token_uidx
  on public.prospectos_scouts(invitation_token)
  where invitation_token is not null;
create index if not exists prospectos_scouts_pipeline_idx
  on public.prospectos_scouts(pipeline_etapa,categoria,updated_at desc);
create index if not exists prospectos_scouts_followup_idx
  on public.prospectos_scouts(proximo_contacto_at)
  where proximo_contacto_at is not null and no_contactar=false;

update public.prospectos_scouts
set pipeline_etapa=case
  when estado='aprobado' then 'aprobado'
  when estado='rechazado' then 'no_interesado'
  when estado='invitado' then 'contactado'
  else 'nuevo'
end
where pipeline_etapa='nuevo';

update public.prospectos_scouts
set recruitment_score=least(100,
  (case when coalesce(btrim(telefono),'')<>'' then 25 else 0 end)+
  (case when coalesce(btrim(email),'')<>'' then 25 else 0 end)+
  (case when coalesce(btrim(website),'')<>'' then 10 else 0 end)+
  (case when coalesce(btrim(direccion),'')<>'' then 10 else 0 end)+
  (case when coalesce(btrim(ciudad),'')<>'' then 5 else 0 end)+
  round(score_confianza*0.25)::int
);

create or replace function private.touch_prospectos_scouts()
returns trigger
language plpgsql
set search_path=public,private,pg_temp
as $$
begin
  new.updated_at=now();
  new.recruitment_score=least(100,
    (case when coalesce(btrim(new.telefono),'')<>'' then 25 else 0 end)+
    (case when coalesce(btrim(new.email),'')<>'' then 25 else 0 end)+
    (case when coalesce(btrim(new.website),'')<>'' then 10 else 0 end)+
    (case when coalesce(btrim(new.direccion),'')<>'' then 10 else 0 end)+
    (case when coalesce(btrim(new.ciudad),'')<>'' then 5 else 0 end)+
    round(new.score_confianza*0.25)::int
  );

  if new.no_contactar then
    new.pipeline_etapa='no_interesado';
    new.proximo_contacto_at=null;
  elsif new.estado='aprobado' and new.pipeline_etapa not in ('activo') then
    new.pipeline_etapa='aprobado';
  elsif new.estado='rechazado' then
    new.pipeline_etapa='no_interesado';
  elsif new.estado='invitado' and new.pipeline_etapa in ('nuevo','listo') then
    new.pipeline_etapa='contactado';
  end if;

  if new.estado='invitado' and old.estado is distinct from new.estado and new.contactado_at is null then
    new.contactado_at=now();
  end if;
  if new.estado='aprobado' and old.estado is distinct from new.estado and new.aprobado_at is null then
    new.aprobado_at=now();
  end if;
  return new;
end $$;

drop trigger if exists trg_touch_prospectos_scouts on public.prospectos_scouts;
create trigger trg_touch_prospectos_scouts
before update on public.prospectos_scouts
for each row execute function private.touch_prospectos_scouts();

create or replace view public.scout_demanda_categorias
with (security_invoker=true) as
with demanda as (
  select categoria_id,count(*)::int as pedidos_30d
  from public.servicios
  where created_at>=now()-interval '30 days'
  group by categoria_id
), oferta as (
  select pp.categoria_principal_id as categoria_id,count(*)::int as proveedores_activos
  from public.perfiles_proveedor pp
  join public.usuarios u on u.id=pp.usuario_id
  where u.activo=true and u.tipo::text='proveedor'
  group by pp.categoria_principal_id
)
select c.slug,c.nombre,c.emoji,
       coalesce(d.pedidos_30d,0)::int as pedidos_30d,
       coalesce(o.proveedores_activos,0)::int as proveedores_activos,
       greatest(coalesce(d.pedidos_30d,0)-coalesce(o.proveedores_activos,0),0)::int as brecha,
       case
         when coalesce(d.pedidos_30d,0)>=greatest(8,coalesce(o.proveedores_activos,0)*3) then 'alta'
         when coalesce(d.pedidos_30d,0)>=greatest(3,coalesce(o.proveedores_activos,0)*2) then 'media'
         else 'normal'
       end as prioridad
from public.categorias c
left join demanda d on d.categoria_id=c.id
left join oferta o on o.categoria_id=c.id
where c.activa=true and private.is_admin(auth.uid());

revoke all on public.scout_demanda_categorias from anon;
grant select on public.scout_demanda_categorias to authenticated;
notify pgrst,'reload schema';
