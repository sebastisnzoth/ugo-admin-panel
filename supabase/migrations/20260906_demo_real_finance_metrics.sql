-- UGO: separación formal entre operaciones DEMO y REAL.
-- Aplicada en producción el 2026-09-06.

alter table public.servicios add column if not exists ambiente text not null default 'real';
alter table public.pagos add column if not exists ambiente text not null default 'real';
alter table public.retiros add column if not exists ambiente text not null default 'real';

alter table public.servicios drop constraint if exists servicios_ambiente_check;
alter table public.servicios add constraint servicios_ambiente_check check (ambiente in ('real','demo'));
alter table public.pagos drop constraint if exists pagos_ambiente_check;
alter table public.pagos add constraint pagos_ambiente_check check (ambiente in ('real','demo'));
alter table public.retiros drop constraint if exists retiros_ambiente_check;
alter table public.retiros add constraint retiros_ambiente_check check (ambiente in ('real','demo'));

-- Backfill conservador de datos históricos.
update public.servicios s set ambiente='demo'
where coalesce(s.tarifa,0)<=1
   or coalesce(lower(s.metadata->>'demo'),'false') in ('true','1','yes')
   or exists(select 1 from public.pagos p where p.servicio_id=s.id and (p.procesador='demo' or p.metodo='pix_demo'));

update public.pagos p
set ambiente=case
  when p.procesador='demo' or p.metodo='pix_demo'
    or exists(select 1 from public.servicios s where s.id=p.servicio_id and s.ambiente='demo')
  then 'demo' else 'real' end;

update public.retiros r
set ambiente=case
  when exists(select 1 from public.pagos p where p.id=r.pago_id and p.ambiente='demo')
  then 'demo' else 'real' end;

create index if not exists idx_servicios_ambiente_created on public.servicios(ambiente,created_at desc);
create index if not exists idx_pagos_ambiente_created on public.pagos(ambiente,created_at desc);
create index if not exists idx_retiros_ambiente_created on public.retiros(ambiente,created_at desc);

-- Una cuenta @ugo.test o metadata.demo=true siempre genera servicios DEMO.
create or replace function public.ugo_set_servicio_ambiente()
returns trigger language plpgsql as $$
begin
  if new.ambiente='demo'
     or coalesce(lower(new.metadata->>'demo'),'false') in ('true','1','yes')
     or lower(coalesce(auth.jwt()->>'email','')) like '%@ugo.test'
  then new.ambiente:='demo';
  else new.ambiente:='real';
  end if;
  return new;
end;$$;

drop trigger if exists trg_ugo_set_servicio_ambiente on public.servicios;
create trigger trg_ugo_set_servicio_ambiente
before insert or update of metadata,ambiente on public.servicios
for each row execute function public.ugo_set_servicio_ambiente();

-- El ambiente del servicio se propaga al pago.
create or replace function public.ugo_set_pago_ambiente()
returns trigger language plpgsql as $$
declare v_ambiente text;
begin
  select ambiente into v_ambiente from public.servicios where id=new.servicio_id;
  if new.procesador='demo' or new.metodo='pix_demo' or v_ambiente='demo'
  then new.ambiente:='demo'; else new.ambiente:='real'; end if;
  return new;
end;$$;

drop trigger if exists trg_ugo_set_pago_ambiente on public.pagos;
create trigger trg_ugo_set_pago_ambiente
before insert or update of servicio_id,procesador,metodo,ambiente on public.pagos
for each row execute function public.ugo_set_pago_ambiente();

-- El ambiente del pago se propaga al retiro.
create or replace function public.ugo_set_retiro_ambiente()
returns trigger language plpgsql as $$
declare v_ambiente text;
begin
  select ambiente into v_ambiente from public.pagos where id=new.pago_id;
  new.ambiente:=coalesce(v_ambiente,'real');
  return new;
end;$$;

drop trigger if exists trg_ugo_set_retiro_ambiente on public.retiros;
create trigger trg_ugo_set_retiro_ambiente
before insert or update of pago_id,ambiente on public.retiros
for each row execute function public.ugo_set_retiro_ambiente();
