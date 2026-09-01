create table if not exists public.whatsapp_notificaciones (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  telefono text not null,
  evento text not null,
  estado_servicio text not null,
  mensaje text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviando','enviada','fallida')),
  intentos integer not null default 0,
  ultimo_error text,
  meta_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(servicio_id,evento)
);

alter table public.whatsapp_notificaciones enable row level security;

drop policy if exists "whatsapp_notificaciones_admin_select" on public.whatsapp_notificaciones;
create policy "whatsapp_notificaciones_admin_select" on public.whatsapp_notificaciones
for select to authenticated
using (private.is_admin(auth.uid()));

create or replace function private.queue_whatsapp_service_notification()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_phone text;
  v_event text;
  v_message text;
  v_num bigint;
begin
  if new.metadata->>'source' <> 'whatsapp' then return new; end if;
  if tg_op <> 'UPDATE' or new.estado::text = old.estado::text then return new; end if;
  v_phone := regexp_replace(coalesce(new.metadata->>'telefono',''),'\D','','g');
  if length(v_phone) < 10 then return new; end if;
  v_num := new.numero;
  v_event := 'estado:'||new.estado::text;
  v_message := case new.estado::text
    when 'ofrecido' then format('🔎 UGO: seu serviço #%s foi enviado aos profissionais disponíveis.',v_num)
    when 'asignado' then format('✅ UGO: um profissional aceitou o serviço #%s. Agora aguardamos a confirmação do pagamento.',v_num)
    when 'en_camino' then format('🚗 UGO: o profissional do serviço #%s está a caminho.',v_num)
    when 'en_progreso' then format('🛠️ UGO: o serviço #%s foi iniciado.',v_num)
    when 'esperando_aprobacion' then format('📸 UGO: o serviço #%s foi finalizado pelo profissional e aguarda sua aprovação.',v_num)
    when 'completado' then format('✅ UGO: o serviço #%s foi concluído. Obrigado por usar UGO.',v_num)
    when 'cancelado' then format('❌ UGO: o serviço #%s foi cancelado.',v_num)
    else null end;
  if v_message is null then return new; end if;
  insert into public.whatsapp_notificaciones(servicio_id,telefono,evento,estado_servicio,mensaje)
  values(new.id,v_phone,v_event,new.estado::text,v_message)
  on conflict(servicio_id,evento) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_queue_whatsapp_service_notification on public.servicios;
create trigger trg_queue_whatsapp_service_notification
after update of estado on public.servicios
for each row execute function private.queue_whatsapp_service_notification();
