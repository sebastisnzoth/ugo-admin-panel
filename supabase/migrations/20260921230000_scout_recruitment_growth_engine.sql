-- Scout Recruitment Growth Engine
-- Prepared as a release migration; do not apply independently from the matching UI/API release.

alter table public.prospectos_scouts
  add column if not exists invitation_expires_at timestamptz,
  add column if not exists invitation_revoked_at timestamptz,
  add column if not exists invitation_opened_at timestamptz,
  add column if not exists invitation_claimed_at timestamptz,
  add column if not exists converted_user_id uuid references public.usuarios(id) on delete set null,
  add column if not exists source_campaign_id uuid;

create table if not exists public.scout_campaigns(
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  zona text,
  canal text not null default 'mixto' check(canal in('whatsapp','email','mixto')),
  asunto text,
  mensaje text not null default '',
  estado text not null default 'borrador' check(estado in('borrador','activa','pausada','completada')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scout_campaign_members(
  campaign_id uuid not null references public.scout_campaigns(id) on delete cascade,
  prospecto_id uuid not null references public.prospectos_scouts(id) on delete cascade,
  estado text not null default 'pendiente' check(estado in('pendiente','enviado','respondio','interesado','convertido','omitido','error')),
  ultimo_envio_at timestamptz,
  respuesta_at timestamptz,
  conversion_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  primary key(campaign_id,prospecto_id)
);

create table if not exists public.scout_contact_events(
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos_scouts(id) on delete cascade,
  campaign_id uuid references public.scout_campaigns(id) on delete set null,
  canal text not null default 'sistema',
  tipo text not null,
  direccion text not null default 'system' check(direccion in('out','in','system')),
  estado text,
  mensaje text,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prospectos_scouts
  drop constraint if exists prospectos_scouts_source_campaign_id_fkey;
alter table public.prospectos_scouts
  add constraint prospectos_scouts_source_campaign_id_fkey
  foreign key(source_campaign_id) references public.scout_campaigns(id) on delete set null;

create index if not exists scout_contact_events_prospect_idx on public.scout_contact_events(prospecto_id,created_at desc);
create index if not exists scout_campaign_members_prospect_idx on public.scout_campaign_members(prospecto_id,created_at desc);
create index if not exists scout_campaigns_created_idx on public.scout_campaigns(created_at desc);
create index if not exists prospectos_scouts_invite_exp_idx on public.prospectos_scouts(invitation_expires_at) where invitation_token is not null;
create index if not exists prospectos_scouts_converted_idx on public.prospectos_scouts(converted_user_id) where converted_user_id is not null;

alter table public.scout_campaigns enable row level security;
alter table public.scout_campaign_members enable row level security;
alter table public.scout_contact_events enable row level security;

grant select,insert,update,delete on public.scout_campaigns to authenticated;
grant select,insert,update,delete on public.scout_campaign_members to authenticated;
grant select,insert,update,delete on public.scout_contact_events to authenticated;

drop policy if exists scout_campaigns_admin on public.scout_campaigns;
create policy scout_campaigns_admin on public.scout_campaigns for all to authenticated
using(private.is_admin(auth.uid())) with check(private.is_admin(auth.uid()));

drop policy if exists scout_campaign_members_admin on public.scout_campaign_members;
create policy scout_campaign_members_admin on public.scout_campaign_members for all to authenticated
using(private.is_admin(auth.uid())) with check(private.is_admin(auth.uid()));

drop policy if exists scout_contact_events_admin on public.scout_contact_events;
create policy scout_contact_events_admin on public.scout_contact_events for all to authenticated
using(private.is_admin(auth.uid())) with check(private.is_admin(auth.uid()));

create or replace function private.scout_norm_phone(p text)
returns text language sql immutable as $$select regexp_replace(coalesce(p,''),'\D','','g')$$;
create or replace function private.scout_norm_email(p text)
returns text language sql immutable as $$select lower(btrim(coalesce(p,'')))$$;
create or replace function private.scout_norm_site(p text)
returns text language sql immutable as $$
  select lower(regexp_replace(regexp_replace(btrim(coalesce(p,'')),'^https?://(www\.)?','','i'),'/.*$','',''))
$$;
create or replace function private.scout_norm_text(p text)
returns text language sql immutable as $$
  select regexp_replace(lower(coalesce(p,'')),'[^a-z0-9]+','','g')
$$;

create or replace function public.admin_scout_upsert_candidates(p_rows jsonb)
returns table(inserted integer,updated integer,prospect_ids uuid[])
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  r jsonb;
  v_id uuid;
  v_inserted integer:=0;
  v_updated integer:=0;
  v_ids uuid[]:='{}'::uuid[];
  v_phone text;
  v_email text;
  v_site text;
  v_name text;
  v_city text;
  v_category text;
  v_external text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Acceso Admin requerido'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'p_rows debe ser un array'; end if;

  for r in select value from jsonb_array_elements(p_rows)
  loop
    v_external:=nullif(btrim(r->>'external_id'),'');
    v_phone:=private.scout_norm_phone(r->>'telefono');
    v_email:=private.scout_norm_email(r->>'email');
    v_site:=private.scout_norm_site(r->>'website');
    v_name:=private.scout_norm_text(r->>'nombre');
    v_city:=private.scout_norm_text(r->>'ciudad');
    v_category:=coalesce(nullif(r->>'categoria',''),'sin_categoria');

    select p.id into v_id
    from public.prospectos_scouts p
    where (v_external is not null and p.external_id=v_external)
       or (length(v_phone)>=8 and private.scout_norm_phone(p.telefono)=v_phone)
       or (v_email<>'' and private.scout_norm_email(p.email)=v_email)
       or (v_site<>'' and private.scout_norm_site(p.website)=v_site)
       or (v_name<>'' and v_city<>'' and p.categoria=v_category
           and private.scout_norm_text(p.nombre)=v_name
           and private.scout_norm_text(p.ciudad)=v_city)
    order by
      case when v_external is not null and p.external_id=v_external then 0
           when length(v_phone)>=8 and private.scout_norm_phone(p.telefono)=v_phone then 1
           when v_email<>'' and private.scout_norm_email(p.email)=v_email then 2
           when v_site<>'' and private.scout_norm_site(p.website)=v_site then 3
           else 4 end,
      p.created_at
    limit 1;

    if v_id is null then
      insert into public.prospectos_scouts(
        external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,latitud,longitud,fuente,
        score_confianza,estado,notas_hugo,pipeline_etapa
      ) values(
        v_external,coalesce(nullif(r->>'nombre',''),'Profesional'),v_category,nullif(r->>'telefono',''),nullif(r->>'email',''),
        nullif(r->>'website',''),nullif(r->>'direccion',''),nullif(r->>'ciudad',''),coalesce(nullif(r->>'pais',''),'BR')::char(2),
        nullif(r->>'latitud','')::double precision,nullif(r->>'longitud','')::double precision,coalesce(nullif(r->>'fuente',''),'scout'),
        coalesce(nullif(r->>'score_confianza','')::integer,40),'prospecto_pendiente',nullif(r->>'notas_hugo',''),'nuevo'
      ) returning id into v_id;
      v_inserted:=v_inserted+1;
    else
      update public.prospectos_scouts p set
        external_id=coalesce(p.external_id,v_external),
        nombre=case when coalesce(btrim(p.nombre),'')='' then coalesce(nullif(r->>'nombre',''),p.nombre) else p.nombre end,
        telefono=coalesce(nullif(btrim(p.telefono),''),nullif(r->>'telefono','')),
        email=coalesce(nullif(btrim(p.email),''),nullif(r->>'email','')),
        website=coalesce(nullif(btrim(p.website),''),nullif(r->>'website','')),
        direccion=coalesce(nullif(btrim(p.direccion),''),nullif(r->>'direccion','')),
        ciudad=coalesce(nullif(btrim(p.ciudad),''),nullif(r->>'ciudad','')),
        latitud=coalesce(p.latitud,nullif(r->>'latitud','')::double precision),
        longitud=coalesce(p.longitud,nullif(r->>'longitud','')::double precision),
        notas_hugo=coalesce(p.notas_hugo,nullif(r->>'notas_hugo','')),
        score_confianza=greatest(p.score_confianza,coalesce(nullif(r->>'score_confianza','')::integer,p.score_confianza))
      where p.id=v_id;
      v_updated:=v_updated+1;
    end if;
    v_ids:=array_append(v_ids,v_id);
  end loop;

  return query select v_inserted,v_updated,v_ids;
end $$;

revoke all on function public.admin_scout_upsert_candidates(jsonb) from public,anon;
grant execute on function public.admin_scout_upsert_candidates(jsonb) to authenticated;

create or replace view public.scout_duplicate_groups
with(security_invoker=true) as
with keys as(
  select id,'phone:'||private.scout_norm_phone(telefono) duplicate_key from public.prospectos_scouts where length(private.scout_norm_phone(telefono))>=8
  union all
  select id,'email:'||private.scout_norm_email(email) from public.prospectos_scouts where private.scout_norm_email(email)<>''
  union all
  select id,'site:'||private.scout_norm_site(website) from public.prospectos_scouts where private.scout_norm_site(website)<>''
)
select duplicate_key,count(*)::int total,array_agg(id order by id) prospect_ids
from keys
where private.is_admin(auth.uid())
group by duplicate_key
having count(*)>1;

grant select on public.scout_duplicate_groups to authenticated;

create or replace function public.admin_issue_scout_invitation(p_prospecto uuid,p_campaign uuid default null,p_days integer default 14)
returns table(token uuid,expires_at timestamptz)
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  p public.prospectos_scouts%rowtype;
  v_token uuid;
  v_exp timestamptz;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Acceso Admin requerido'; end if;
  select * into p from public.prospectos_scouts where id=p_prospecto for update;
  if not found then raise exception 'Prospecto no encontrado'; end if;
  if p.no_contactar then raise exception 'Este prospecto está marcado como no contactar'; end if;

  if p.invitation_token is not null and p.invitation_revoked_at is null and p.invitation_claimed_at is null and coalesce(p.invitation_expires_at,now()-interval '1 second')>now() then
    v_token:=p.invitation_token;v_exp:=p.invitation_expires_at;
    if p_campaign is not null then update public.prospectos_scouts set source_campaign_id=p_campaign where id=p.id; end if;
  else
    v_token:=gen_random_uuid();v_exp:=now()+make_interval(days=>greatest(1,least(coalesce(p_days,14),60)));
    update public.prospectos_scouts set invitation_token=v_token,invitation_expires_at=v_exp,invitation_revoked_at=null,invitation_opened_at=null,invitation_claimed_at=null,source_campaign_id=coalesce(p_campaign,source_campaign_id) where id=p.id;
  end if;

  insert into public.scout_contact_events(prospecto_id,campaign_id,canal,tipo,direccion,estado,actor_id,metadata)
  values(p.id,p_campaign,'sistema','invite_generated','system','ready',auth.uid(),jsonb_build_object('expires_at',v_exp))
  on conflict do nothing;

  return query select v_token,v_exp;
end $$;

revoke all on function public.admin_issue_scout_invitation(uuid,uuid,integer) from public,anon;
grant execute on function public.admin_issue_scout_invitation(uuid,uuid,integer) to authenticated;

create or replace function public.admin_revoke_scout_invitation(p_prospecto uuid)
returns void
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Acceso Admin requerido'; end if;
  update public.prospectos_scouts set invitation_revoked_at=now() where id=p_prospecto;
  insert into public.scout_contact_events(prospecto_id,canal,tipo,direccion,estado,actor_id)
  values(p_prospecto,'sistema','invite_revoked','system','revoked',auth.uid());
end $$;
revoke all on function public.admin_revoke_scout_invitation(uuid) from public,anon;
grant execute on function public.admin_revoke_scout_invitation(uuid) to authenticated;

create or replace function public.scout_public_invitation(p_token uuid)
returns table(nombre text,categoria text,ciudad text,telefono text,email text,expires_at timestamptz,claimed boolean)
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare p public.prospectos_scouts%rowtype;
begin
  select * into p from public.prospectos_scouts
  where invitation_token=p_token
    and invitation_revoked_at is null
    and coalesce(invitation_expires_at,now()-interval '1 second')>now()
    and no_contactar=false
  limit 1;
  if not found then return; end if;

  if p.invitation_opened_at is null then
    update public.prospectos_scouts set invitation_opened_at=now() where id=p.id;
    insert into public.scout_contact_events(prospecto_id,campaign_id,canal,tipo,direccion,estado,metadata)
    values(p.id,p.source_campaign_id,'web','invite_opened','in','opened',jsonb_build_object('source','recruitment_landing'));
  end if;

  return query select p.nombre,p.categoria,p.ciudad,p.telefono,p.email,p.invitation_expires_at,(p.invitation_claimed_at is not null);
end $$;

revoke all on function public.scout_public_invitation(uuid) from public;
grant execute on function public.scout_public_invitation(uuid) to anon,authenticated;

create or replace function public.scout_claim_invitation(p_token uuid)
returns table(prospecto_id uuid,nombre text,categoria text,ciudad text)
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  p public.prospectos_scouts%rowtype;
  u public.usuarios%rowtype;
  v_cat uuid;
  v_slug text;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  select * into u from public.usuarios where id=auth.uid() for update;
  if not found or u.tipo::text<>'proveedor' then raise exception 'La cuenta debe ser de proveedor'; end if;

  select * into p from public.prospectos_scouts
  where invitation_token=p_token
    and invitation_revoked_at is null
    and coalesce(invitation_expires_at,now()-interval '1 second')>now()
    and no_contactar=false
  for update;
  if not found then raise exception 'Invitación inválida o vencida'; end if;
  if p.converted_user_id is not null and p.converted_user_id<>auth.uid() then raise exception 'Esta invitación ya fue utilizada'; end if;

  if u.prospecto_id is not null and u.prospecto_id<>p.id then
    update public.prospectos_scouts set
      converted_user_id=auth.uid(),
      invitation_claimed_at=coalesce(invitation_claimed_at,now()),
      pipeline_etapa=case when exists(select 1 from public.perfiles_proveedor pp where pp.usuario_id=auth.uid() and pp.estado_verificacion::text='verificado') then 'activo' else 'registro_iniciado' end,
      estado=case when exists(select 1 from public.perfiles_proveedor pp where pp.usuario_id=auth.uid() and pp.estado_verificacion::text='verificado') then 'aprobado' else 'invitado' end
    where id=p.id;
    insert into public.scout_contact_events(prospecto_id,campaign_id,canal,tipo,direccion,estado,actor_id,metadata)
    values(p.id,p.source_campaign_id,'web','existing_provider_matched','in','matched',auth.uid(),jsonb_build_object('existing_prospecto_id',u.prospecto_id));
    return query select p.id,p.nombre,p.categoria,p.ciudad;
    return;
  end if;

  v_slug:=case p.categoria
    when 'electricista' then 'electricidad'
    when 'plomero' then 'plomeria'
    when 'limpeza' then 'limpieza'
    when 'chaveiro' then 'cerrajeria'
    when 'jardinagem' then 'jardineria'
    when 'reformas' then 'reparaciones'
    else p.categoria
  end;
  select id into v_cat from public.categorias where slug=v_slug and activa=true limit 1;

  update public.usuarios set
    prospecto_id=p.id,
    telefono=coalesce(nullif(telefono,''),p.telefono),
    categoria=coalesce(nullif(categoria,''),p.categoria),
    zona=coalesce(nullif(zona,''),p.ciudad)
  where id=auth.uid();

  update public.perfiles_proveedor set
    telefono_profesional=coalesce(nullif(telefono_profesional,''),p.telefono),
    ciudad_base=coalesce(nullif(ciudad_base,''),p.ciudad),
    categoria_principal_id=coalesce(categoria_principal_id,v_cat),
    onboarding_paso=greatest(coalesce(onboarding_paso,0),1)
  where usuario_id=auth.uid();

  update public.prospectos_scouts set
    converted_user_id=auth.uid(),
    invitation_claimed_at=coalesce(invitation_claimed_at,now()),
    pipeline_etapa=case when pipeline_etapa in('activo','aprobado','documentos_pendientes') then pipeline_etapa else 'registro_iniciado' end,
    estado=case when estado='prospecto_pendiente' then 'invitado' else estado end,
    contactado_at=coalesce(contactado_at,now())
  where id=p.id;

  insert into public.scout_contact_events(prospecto_id,campaign_id,canal,tipo,direccion,estado,actor_id,metadata)
  values(p.id,p.source_campaign_id,'web','invite_claimed','in','claimed',auth.uid(),jsonb_build_object('usuario_id',auth.uid()));

  return query select p.id,p.nombre,p.categoria,p.ciudad;
end $$;

revoke all on function public.scout_claim_invitation(uuid) from public,anon;
grant execute on function public.scout_claim_invitation(uuid) to authenticated;

create or replace function private.sync_scout_provider_onboarding()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_prospect uuid;v_stage text;
begin
  select prospecto_id into v_prospect from public.usuarios where id=new.usuario_id;
  if v_prospect is null then return new; end if;
  v_stage:=case
    when new.estado_verificacion::text='verificado' then 'activo'
    when new.estado_verificacion::text='pendiente' then 'documentos_pendientes'
    when coalesce(new.onboarding_paso,0)>0 then 'registro_iniciado'
    else null end;
  if v_stage is not null then
    update public.prospectos_scouts set
      pipeline_etapa=v_stage,
      estado=case when v_stage='activo' then 'aprobado' when estado='prospecto_pendiente' then 'invitado' else estado end,
      aprobado_at=case when v_stage='activo' then coalesce(aprobado_at,now()) else aprobado_at end
    where id=v_prospect and pipeline_etapa<>'no_interesado';
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_scout_provider_onboarding on public.perfiles_proveedor;
create trigger trg_sync_scout_provider_onboarding
after update on public.perfiles_proveedor
for each row execute function private.sync_scout_provider_onboarding();

create or replace function private.sync_scout_document_upload()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_prospect uuid;
begin
  select prospecto_id into v_prospect from public.usuarios where id=new.usuario_id;
  if v_prospect is not null then
    update public.prospectos_scouts
    set pipeline_etapa=case when pipeline_etapa in('activo','aprobado') then pipeline_etapa else 'documentos_pendientes' end
    where id=v_prospect and pipeline_etapa<>'no_interesado';
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_scout_document_upload on public.documentos;
create trigger trg_sync_scout_document_upload
after insert or update on public.documentos
for each row execute function private.sync_scout_document_upload();

create or replace function private.log_scout_pipeline_change()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp
as $$
begin
  if old.pipeline_etapa is distinct from new.pipeline_etapa then
    insert into public.scout_contact_events(prospecto_id,campaign_id,canal,tipo,direccion,estado,actor_id,metadata)
    values(new.id,new.source_campaign_id,'sistema','pipeline_changed','system',new.pipeline_etapa,auth.uid(),jsonb_build_object('from',old.pipeline_etapa,'to',new.pipeline_etapa));
    if new.pipeline_etapa='activo' then
      update public.scout_campaign_members set estado='convertido',conversion_at=coalesce(conversion_at,now()) where prospecto_id=new.id;
    elsif new.pipeline_etapa='interesado' then
      update public.scout_campaign_members set estado='interesado' where prospecto_id=new.id and estado in('pendiente','enviado','respondio');
    elsif new.pipeline_etapa='respondio' then
      update public.scout_campaign_members set estado='respondio',respuesta_at=coalesce(respuesta_at,now()) where prospecto_id=new.id and estado in('pendiente','enviado');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_log_scout_pipeline_change on public.prospectos_scouts;
create trigger trg_log_scout_pipeline_change
after update of pipeline_etapa on public.prospectos_scouts
for each row execute function private.log_scout_pipeline_change();

create or replace view public.scout_campaign_metrics
with(security_invoker=true) as
select c.id,c.nombre,c.categoria,c.zona,c.canal,c.estado,c.created_at,
       count(m.prospecto_id)::int total,
       count(*) filter(where m.estado in('enviado','respondio','interesado','convertido'))::int enviados,
       count(*) filter(where m.estado in('respondio','interesado','convertido'))::int respondieron,
       count(*) filter(where m.estado in('interesado','convertido'))::int interesados,
       count(*) filter(where m.estado='convertido')::int convertidos
from public.scout_campaigns c
left join public.scout_campaign_members m on m.campaign_id=c.id
where private.is_admin(auth.uid())
group by c.id;

grant select on public.scout_campaign_metrics to authenticated;

notify pgrst,'reload schema';
