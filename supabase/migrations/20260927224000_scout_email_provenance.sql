-- Scout email provenance and confidence tracking.
-- Keeps automated discovery from overwriting an existing human-confirmed email.

alter table public.prospectos_scouts
  add column if not exists email_source text,
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_last_seen_at timestamptz;

update public.prospectos_scouts
set email_source=coalesce(
      email_source,
      case when coalesce(btrim(email),'')<>'' then coalesce(nullif(lower(btrim(fuente)),''),'legacy') end
    ),
    email_last_seen_at=coalesce(
      email_last_seen_at,
      case when coalesce(btrim(email),'')<>'' then updated_at end
    )
where coalesce(btrim(email),'')<>'';

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
  v_email_source text;
  v_email_verified boolean;
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
    v_email_source:=coalesce(
      nullif(lower(btrim(r->>'email_source')),''),
      nullif(lower(btrim(r->>'fuente')),''),
      'scout'
    );
    v_email_verified:=lower(coalesce(r->>'email_verified','false'))='true';
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
       or (
         v_name<>'' and v_city<>'' and p.categoria=v_category
         and private.scout_norm_text(p.nombre)=v_name
         and private.scout_norm_text(p.ciudad)=v_city
       )
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
        external_id,nombre,categoria,telefono,email,email_source,email_verified,email_last_seen_at,
        website,direccion,ciudad,pais,latitud,longitud,fuente,
        score_confianza,estado,notas_hugo,pipeline_etapa
      ) values(
        v_external,coalesce(nullif(r->>'nombre',''),'Profesional'),v_category,
        nullif(r->>'telefono',''),nullif(v_email,''),
        case when v_email<>'' then v_email_source end,
        case when v_email<>'' then v_email_verified else false end,
        case when v_email<>'' then now() end,
        nullif(r->>'website',''),nullif(r->>'direccion',''),nullif(r->>'ciudad',''),
        coalesce(nullif(r->>'pais',''),'BR')::char(2),
        nullif(r->>'latitud','')::double precision,nullif(r->>'longitud','')::double precision,
        coalesce(nullif(r->>'fuente',''),'scout'),
        coalesce(nullif(r->>'score_confianza','')::integer,40),
        'prospecto_pendiente',nullif(r->>'notas_hugo',''),'nuevo'
      ) returning id into v_id;
      v_inserted:=v_inserted+1;
    else
      update public.prospectos_scouts p set
        external_id=coalesce(p.external_id,v_external),
        nombre=case when coalesce(btrim(p.nombre),'')='' then coalesce(nullif(r->>'nombre',''),p.nombre) else p.nombre end,
        telefono=coalesce(nullif(btrim(p.telefono),''),nullif(r->>'telefono','')),
        email=case when coalesce(btrim(p.email),'')='' and v_email<>'' then v_email else p.email end,
        email_source=case
          when coalesce(btrim(p.email),'')='' and v_email<>'' then v_email_source
          when v_email<>'' and private.scout_norm_email(p.email)=v_email and p.email_source is null then v_email_source
          else p.email_source
        end,
        email_verified=case
          when coalesce(btrim(p.email),'')='' and v_email<>'' then v_email_verified
          else p.email_verified
        end,
        email_last_seen_at=case
          when v_email<>'' and (
            coalesce(btrim(p.email),'')='' or private.scout_norm_email(p.email)=v_email
          ) then now()
          else p.email_last_seen_at
        end,
        website=coalesce(nullif(btrim(p.website),''),nullif(r->>'website','')),
        direccion=coalesce(nullif(btrim(p.direccion),''),nullif(r->>'direccion','')),
        ciudad=coalesce(nullif(btrim(p.ciudad),''),nullif(r->>'ciudad','')),
        latitud=coalesce(p.latitud,nullif(r->>'latitud','')::double precision),
        longitud=coalesce(p.longitud,nullif(r->>'longitud','')::double precision),
        notas_hugo=coalesce(p.notas_hugo,nullif(r->>'notas_hugo','')),
        score_confianza=greatest(
          p.score_confianza,
          coalesce(nullif(r->>'score_confianza','')::integer,p.score_confianza)
        )
      where p.id=v_id;
      v_updated:=v_updated+1;
    end if;

    v_ids:=array_append(v_ids,v_id);
  end loop;

  return query select v_inserted,v_updated,v_ids;
end $$;

revoke all on function public.admin_scout_upsert_candidates(jsonb) from public,anon;
grant execute on function public.admin_scout_upsert_candidates(jsonb) to authenticated;

notify pgrst,'reload schema';
