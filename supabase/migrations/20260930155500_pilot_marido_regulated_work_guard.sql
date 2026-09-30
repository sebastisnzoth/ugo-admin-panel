-- UGO Pilot P0 · Marido de Aluguel is not a bypass for regulated/high-risk work.
-- Fail closed at matching and assignment while preserving the request for reclassification/review.

create or replace function private.pilot_servicio_generico_permitido(p_servicio_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public','private','extensions','pg_temp'
as $
declare
  v_slug text;
  v_description text;
  v_height text;
begin
  select lower(coalesce(c.slug,'')), lower(coalesce(s.descripcion,'')),
         lower(coalesce(s.metadata->'pilot_details'->>'height',''))
  into v_slug,v_description,v_height
  from public.servicios s
  join public.categorias c on c.id=s.categoria_id
  where s.id=p_servicio_id;

  if not found then return false; end if;
  if v_slug <> 'marido-de-aluguel' then return true; end if;

  if v_height like '%más de 2%' or v_height like '%mais de 2%' then return false; end if;
  if unaccent(v_description) ~ '(gas|quadro eletrico|tablero electrico|instalacion eletrica|instalacion electrica|instalacao eletrica|estructura(l)?|estrutura(l)?|cableado principal|disyuntor|disjuntor)' then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function private.pilot_servicio_generico_permitido(uuid) from public,anon,authenticated;

create or replace function private.pilot_guard_asignacion_generica()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if (new.proveedor_id is distinct from old.proveedor_id and new.proveedor_id is not null)
     or (new.estado is distinct from old.estado and new.estado in ('asignado','confirmado','en_camino','llegado','en_progreso')) then
    if not private.pilot_servicio_generico_permitido(new.id) then
      raise exception 'PILOT_REGULATED_WORK_REQUIRES_RECLASSIFICATION';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pilot_guard_asignacion_generica on public.servicios;
create trigger trg_pilot_guard_asignacion_generica
before update of proveedor_id,estado on public.servicios
for each row execute function private.pilot_guard_asignacion_generica();

do $$
declare v_def text;
begin
  select pg_get_functiondef('private.proveedor_puede_recibir_oferta(uuid,uuid)'::regprocedure) into v_def;
  if position('pilot_servicio_generico_permitido(p_servicio_id)' in v_def)=0 then
    if position('begin' in lower(v_def))=0 then raise exception 'MATCHING_GUARD_FUNCTION_NOT_FOUND'; end if;
    v_def := regexp_replace(v_def,'begin',E'begin\n  if not private.pilot_servicio_generico_permitido(p_servicio_id) then return false; end if;',1,1,'i');
    execute v_def;
  end if;
end
$$;

notify pgrst,'reload schema';
