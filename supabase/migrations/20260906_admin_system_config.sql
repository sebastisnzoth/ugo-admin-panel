create table if not exists public.config_sistema (
  clave text primary key,
  valor text not null,
  descripcion text,
  grupo text not null default 'general',
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.usuarios(id) on delete set null
);

alter table public.config_sistema enable row level security;

drop policy if exists config_sistema_admin_select on public.config_sistema;
create policy config_sistema_admin_select
on public.config_sistema
for select
to authenticated
using (private.is_admin(auth.uid()));

revoke insert, update, delete on public.config_sistema from anon, authenticated;
grant select on public.config_sistema to authenticated;

create or replace function public.admin_update_config(p_clave text, p_valor text)
returns public.config_sistema
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.config_sistema%rowtype;
begin
  if v_uid is null or not private.is_admin(v_uid) then
    raise exception 'Solo administradores';
  end if;

  update public.config_sistema
  set valor = p_valor,
      updated_at = now(),
      updated_by = v_uid
  where clave = p_clave
  returning * into v_row;

  if not found then
    raise exception 'Parámetro inexistente: %', p_clave;
  end if;

  insert into public.audit_log(evento,actor_id,entidad_tipo,detalles)
  values('admin_config_actualizada',v_uid,'config_sistema',jsonb_build_object('clave',p_clave));

  return v_row;
end;
$function$;

revoke all on function public.admin_update_config(text,text) from public, anon;
grant execute on function public.admin_update_config(text,text) to authenticated;

insert into public.config_sistema(clave,valor,descripcion,grupo) values
 ('modo_operacion','produccion','Modo general de UGO: demo o produccion','general'),
 ('nuevos_registros','true','Permitir nuevos registros de usuarios','general'),
 ('matching_automatico','true','Asignación automática de proveedores compatibles','reglas'),
 ('radio_busqueda_km','15','Radio base para matching de proveedores','reglas'),
 ('timeout_oferta_segundos','60','Tiempo de respuesta de una oferta antes de continuar búsqueda','reglas'),
 ('max_proveedores_busqueda','5','Máximo de proveedores considerados por ronda','reglas'),
 ('requiere_verificacion_proveedor','true','Exigir verificación para operar como proveedor','reglas'),
 ('requiere_ubicacion_cliente','true','Exigir ubicación para crear un servicio','reglas'),
 ('comision_ugo_pct','10','Comisión base de UGO en porcentaje','reglas'),
 ('moneda_default','BRL','Moneda operativa predeterminada','general'),
 ('hugo_activo','true','Habilitar Hugo en Cliente y Proveedor','general'),
 ('hugo_voz_activa','true','Habilitar interacción por voz con Hugo','general'),
 ('mantenimiento','false','Bloquear nuevas operaciones durante mantenimiento','general')
on conflict (clave) do nothing;
