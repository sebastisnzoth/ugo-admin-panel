-- Canonical backend matching cycle deadline shared by Client and Provider.
alter table public.servicios add column if not exists matching_expires_at timestamptz;

create or replace function public.iniciar_matching(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
set search_path to 'public','private','pg_temp'
as $$
declare
  v_deadline timestamptz := clock_timestamp() + interval '5 minutes';
begin
  update public.servicios
     set matching_expires_at=v_deadline
   where id=p_servicio_id
     and (cliente_id=auth.uid() or private.is_admin(auth.uid()));
  if not found then raise exception 'No autorizado'; end if;
  return query select * from private.iniciar_matching_impl(p_servicio_id);
end
$$;

create or replace function private.sync_offer_matching_deadline()
returns trigger language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $$
declare v_deadline timestamptz;
begin
  select matching_expires_at into v_deadline from public.servicios where id=new.servicio_id;
  if v_deadline is not null and new.estado='pendiente' then new.expira_at:=v_deadline; end if;
  return new;
end
$$;

drop trigger if exists trg_offer_matching_deadline on public.ofertas_servicio;
create trigger trg_offer_matching_deadline
before insert or update of expira_at,estado on public.ofertas_servicio
for each row execute function private.sync_offer_matching_deadline();

revoke execute on function private.sync_offer_matching_deadline() from public, anon, authenticated;

comment on column public.servicios.matching_expires_at is 'Backend source of truth for the current five-minute matching cycle.';
notify pgrst,'reload schema';
