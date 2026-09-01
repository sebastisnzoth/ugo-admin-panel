create table if not exists public.whatsapp_conversaciones (
  telefono text primary key,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  nombre text null,
  idioma text not null default 'pt-BR',
  estado text not null default 'idle',
  borrador jsonb not null default '{}'::jsonb,
  ultimo_mensaje_id text null,
  ultimo_servicio_id uuid null references public.servicios(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_eventos (
  message_id text primary key,
  telefono text not null,
  direccion text not null check (direccion in ('in','out')),
  tipo text not null default 'text',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_conv_usuario_idx on public.whatsapp_conversaciones(usuario_id) where usuario_id is not null;
create index if not exists whatsapp_eventos_telefono_idx on public.whatsapp_eventos(telefono,created_at desc);

alter table public.whatsapp_conversaciones enable row level security;
alter table public.whatsapp_eventos enable row level security;

drop policy if exists whatsapp_conv_admin_select on public.whatsapp_conversaciones;
create policy whatsapp_conv_admin_select on public.whatsapp_conversaciones for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists whatsapp_eventos_admin_select on public.whatsapp_eventos;
create policy whatsapp_eventos_admin_select on public.whatsapp_eventos for select to authenticated using (private.is_admin(auth.uid()));

create or replace function public.iniciar_matching_backend(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path = 'public','private','extensions','pg_temp'
as $$
declare
  v_cliente uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Solo backend autorizado';
  end if;
  select cliente_id into v_cliente from public.servicios where id=p_servicio_id;
  if v_cliente is null then raise exception 'Servicio inexistente o sin cliente'; end if;
  perform set_config('request.jwt.claim.sub', v_cliente::text, true);
  return query select * from private.iniciar_matching_impl(p_servicio_id);
end;
$$;

revoke all on function public.iniciar_matching_backend(uuid) from public, anon, authenticated;
grant execute on function public.iniciar_matching_backend(uuid) to service_role;
