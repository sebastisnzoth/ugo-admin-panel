-- UGO · Saldo y retiros sólo sobre fondos digitales custodiados.
create or replace function public.saldo_proveedor()
returns table(
  total_liberado numeric,
  total_retirado numeric,
  saldo_disponible numeric,
  saldo_procesando numeric
)
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_liberado numeric := 0;
  v_retirado numeric := 0;
  v_procesando numeric := 0;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if not exists(select 1 from public.usuarios where id=v_uid and tipo='proveedor' and activo=true) then
    raise exception 'Cuenta de proveedor requerida';
  end if;

  select coalesce(sum(p.ganancia_proveedor),0) into v_liberado
  from public.pagos p
  where p.proveedor_id=v_uid and p.ambiente='real' and p.estado='liberado' and coalesce(p.metodo,'')<>'efectivo';

  select coalesce(sum(r.monto),0) into v_retirado
  from public.retiros r
  where r.proveedor_id=v_uid and r.ambiente='real' and r.estado in ('pendiente','procesando','pagado');

  select coalesce(sum(p.ganancia_proveedor),0) into v_procesando
  from public.pagos p
  where p.proveedor_id=v_uid and p.ambiente='real' and p.estado='retenido' and coalesce(p.metodo,'')<>'efectivo';

  return query select round(v_liberado,2),round(v_retirado,2),round(greatest(v_liberado-v_retirado,0),2),round(v_procesando,2);
end;
$$;

revoke all on function public.saldo_proveedor() from public,anon;
grant execute on function public.saldo_proveedor() to authenticated;

create or replace function public.solicitar_retiro(p_monto numeric)
returns public.retiros
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.perfiles_proveedor%rowtype;
  v_liberado numeric := 0;
  v_comprometido numeric := 0;
  v_disponible numeric := 0;
  v_row public.retiros%rowtype;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if p_monto is null or p_monto < 50 then raise exception 'El monto mínimo de retiro es R$ 50'; end if;

  perform pg_advisory_xact_lock(hashtext('ugo-withdraw-'||v_uid::text));

  select * into v_profile from public.perfiles_proveedor where usuario_id=v_uid for update;
  if not found then raise exception 'Perfil de proveedor inexistente'; end if;
  if v_profile.estado_verificacion<>'verificado' then raise exception 'Tu perfil debe estar verificado para retirar'; end if;
  if nullif(btrim(coalesce(v_profile.cuenta_pago_externa,'')),'') is null then raise exception 'Configurá tu cuenta de cobro antes de retirar'; end if;

  select coalesce(sum(p.ganancia_proveedor),0) into v_liberado
  from public.pagos p
  where p.proveedor_id=v_uid and p.ambiente='real' and p.estado='liberado' and coalesce(p.metodo,'')<>'efectivo';

  select coalesce(sum(r.monto),0) into v_comprometido
  from public.retiros r
  where r.proveedor_id=v_uid and r.ambiente='real' and r.estado in ('pendiente','procesando','pagado');

  v_disponible := round(greatest(v_liberado-v_comprometido,0),2);
  if round(p_monto,2)>v_disponible then
    raise exception 'Saldo insuficiente. Disponible: R$ %',replace(to_char(v_disponible,'FM999999990.00'),'.',',');
  end if;

  insert into public.retiros(proveedor_id,monto,moneda,estado,ambiente,notas)
  values(v_uid,round(p_monto,2),'BRL','pendiente','real','Retiro solicitado por proveedor desde UGO')
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.solicitar_retiro(numeric) from public,anon;
grant execute on function public.solicitar_retiro(numeric) to authenticated;

notify pgrst,'reload schema';
