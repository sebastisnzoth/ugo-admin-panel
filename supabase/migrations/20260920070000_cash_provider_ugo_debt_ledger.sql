-- UGO · Efectivo cobrado por proveedor + comisión adeudada a UGO.
-- El pago presencial nunca se convierte en saldo custodio/retirable de UGO.

create table if not exists public.deudas_ugo_proveedor (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null unique references public.pagos(id) on delete restrict,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  proveedor_id uuid not null references public.usuarios(id) on delete restrict,
  monto_servicio numeric(12,2) not null check (monto_servicio >= 0),
  comision_ugo numeric(12,2) not null check (comision_ugo >= 0),
  monto_pagado_ugo numeric(12,2) not null default 0 check (monto_pagado_ugo >= 0),
  saldo_pendiente numeric(12,2) generated always as (greatest(comision_ugo - monto_pagado_ugo, 0)) stored,
  moneda char(3) not null default 'BRL',
  ambiente text not null default 'real' check (ambiente in ('real','demo')),
  estado text not null default 'pendiente' check (estado in ('pendiente','informado','parcial','pagado','anulado')),
  referencia_pago text,
  pago_informado_at timestamptz,
  pagado_at timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deudas_ugo_proveedor_provider_estado_idx on public.deudas_ugo_proveedor(proveedor_id,estado,created_at desc);
create index if not exists deudas_ugo_proveedor_servicio_idx on public.deudas_ugo_proveedor(servicio_id);

alter table public.deudas_ugo_proveedor enable row level security;
drop policy if exists deudas_ugo_provider_select on public.deudas_ugo_proveedor;
create policy deudas_ugo_provider_select on public.deudas_ugo_proveedor for select to authenticated
using (proveedor_id=auth.uid() or private.is_admin(auth.uid()));

revoke all on table public.deudas_ugo_proveedor from anon;
grant select on table public.deudas_ugo_proveedor to authenticated;

create or replace function private.sync_cash_commission_debt()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_created boolean := false;
  v_amount_text text;
  v_fee_text text;
begin
  if new.metodo <> 'efectivo'
     or new.procesador <> 'efectivo'
     or new.modelo_pago <> 'presencial'
     or new.estado <> 'liberado'
     or coalesce(new.comision_ugo,0) <= 0 then
    return new;
  end if;

  select * into v_servicio from public.servicios where id=new.servicio_id;
  if not found then return new; end if;

  insert into public.deudas_ugo_proveedor(
    pago_id,servicio_id,proveedor_id,monto_servicio,comision_ugo,moneda,ambiente,estado
  ) values(
    new.id,new.servicio_id,new.proveedor_id,
    round(coalesce(new.monto_bruto,0)::numeric,2),
    round(coalesce(new.comision_ugo,0)::numeric,2),
    coalesce(new.moneda,'BRL'),
    coalesce(new.ambiente,'real'),
    'pendiente'
  )
  on conflict (pago_id) do update set
    monto_servicio=excluded.monto_servicio,
    comision_ugo=excluded.comision_ugo,
    moneda=excluded.moneda,
    ambiente=excluded.ambiente,
    updated_at=now()
  returning (xmax=0) into v_created;

  if v_created then
    v_amount_text := 'R$ ' || replace(to_char(round(coalesce(new.monto_bruto,0)::numeric,2),'FM999999990.00'),'.',',');
    v_fee_text := 'R$ ' || replace(to_char(round(coalesce(new.comision_ugo,0)::numeric,2),'FM999999990.00'),'.',',');

    perform private.crear_notificacion_unica(
      new.proveedor_id,
      'comision_ugo_pendiente',
      'Cobro en efectivo registrado',
      format('Recibiste %s en efectivo por el servicio #%s. Comisión UGO pendiente: %s.',
        v_amount_text,
        coalesce(v_servicio.numero::text,left(v_servicio.id::text,8)),
        v_fee_text
      ),
      jsonb_build_object(
        'servicio_id',new.servicio_id,'pago_id',new.id,'metodo','efectivo',
        'monto_cobrado',new.monto_bruto,'comision_ugo',new.comision_ugo,'moneda',new.moneda
      ),
      'pago:'||new.id||':cash:ugo-debt'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_cash_commission_debt() from public,anon,authenticated;

drop trigger if exists trg_sync_cash_commission_debt on public.pagos;
create trigger trg_sync_cash_commission_debt
after insert or update of estado,comision_ugo,monto_bruto on public.pagos
for each row execute function private.sync_cash_commission_debt();

create or replace function public.informar_pago_deuda_ugo(p_deuda_id uuid,p_referencia text)
returns public.deudas_ugo_proveedor
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_row public.deudas_ugo_proveedor%rowtype;
  v_ref text := nullif(btrim(coalesce(p_referencia,'')),'');
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if v_ref is null or length(v_ref)<4 then raise exception 'Ingresá una referencia válida del pago a UGO'; end if;

  select * into v_row from public.deudas_ugo_proveedor where id=p_deuda_id for update;
  if not found then raise exception 'Deuda inexistente'; end if;
  if v_row.proveedor_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_row.estado in ('pagado','anulado') then return v_row; end if;

  update public.deudas_ugo_proveedor
     set estado='informado',referencia_pago=v_ref,pago_informado_at=coalesce(pago_informado_at,now()),updated_at=now()
   where id=p_deuda_id
   returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.informar_pago_deuda_ugo(uuid,text) from public,anon;
grant execute on function public.informar_pago_deuda_ugo(uuid,text) to authenticated;

create or replace function public.admin_confirmar_deuda_ugo_pagada(p_deuda_id uuid,p_referencia text,p_notas text default null)
returns public.deudas_ugo_proveedor
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_row public.deudas_ugo_proveedor%rowtype;
  v_ref text := nullif(btrim(coalesce(p_referencia,'')),'');
begin
  if auth.uid() is null or not private.is_admin(auth.uid()) then raise exception 'Acceso Admin requerido'; end if;
  if v_ref is null or length(v_ref)<4 then raise exception 'La referencia de cobro a UGO es obligatoria'; end if;

  select * into v_row from public.deudas_ugo_proveedor where id=p_deuda_id for update;
  if not found then raise exception 'Deuda inexistente'; end if;
  if v_row.estado='anulado' then raise exception 'La deuda está anulada'; end if;

  update public.deudas_ugo_proveedor
     set monto_pagado_ugo=comision_ugo,estado='pagado',referencia_pago=v_ref,
         pagado_at=coalesce(pagado_at,now()),notas=coalesce(nullif(btrim(coalesce(p_notas,'')),''),notas),updated_at=now()
   where id=p_deuda_id
   returning * into v_row;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin.deuda_ugo.pagada',auth.uid(),'deuda_ugo',v_row.id,
    jsonb_build_object('proveedor_id',v_row.proveedor_id,'servicio_id',v_row.servicio_id,'pago_id',v_row.pago_id,'comision_ugo',v_row.comision_ugo,'referencia',v_ref));

  perform private.crear_notificacion_unica(
    v_row.proveedor_id,'comision_ugo_saldada','Comisión UGO saldada',
    format('UGO confirmó el pago de tu comisión de R$ %s.',replace(to_char(v_row.comision_ugo,'FM999999990.00'),'.',',')),
    jsonb_build_object('deuda_id',v_row.id,'servicio_id',v_row.servicio_id,'monto',v_row.comision_ugo,'moneda',v_row.moneda),
    'deuda:'||v_row.id||':paid'
  );

  return v_row;
end;
$$;

revoke all on function public.admin_confirmar_deuda_ugo_pagada(uuid,text,text) from public,anon;
grant execute on function public.admin_confirmar_deuda_ugo_pagada(uuid,text,text) to authenticated;

insert into public.deudas_ugo_proveedor(
  pago_id,servicio_id,proveedor_id,monto_servicio,comision_ugo,moneda,ambiente,estado,created_at,updated_at
)
select p.id,p.servicio_id,p.proveedor_id,round(p.monto_bruto::numeric,2),round(p.comision_ugo::numeric,2),
       p.moneda,p.ambiente,'pendiente',coalesce(p.liberado_at,p.fecha_confirmacion,p.created_at),now()
from public.pagos p
where p.metodo='efectivo' and p.procesador='efectivo' and p.modelo_pago='presencial'
  and p.estado='liberado' and coalesce(p.comision_ugo,0)>0
on conflict (pago_id) do nothing;

notify pgrst,'reload schema';
