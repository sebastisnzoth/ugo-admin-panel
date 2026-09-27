-- UGO P0 · Defense in depth: a provider blocked by 3+ real UGO debts cannot accept a new pending offer.
-- Matching already excludes blocked providers and the debt trigger expires pending offers.
-- This acceptance guard closes the stale/race window at the mutation boundary.

do $$
declare
  v_def text;
  v_anchor text := E'  if v_oferta.estado <> ''pendiente'' then return null; end if;\n';
  v_guard text := E'  if v_oferta.estado <> ''pendiente'' then return null; end if;\n\n  if private.proveedor_bloqueado_por_deuda_ugo(v_uid) then\n    raise exception ''Tenés 3 servicios con comisión UGO pendiente. Pagá a UGO antes de aceptar otro pedido.'';\n  end if;\n';
begin
  select pg_get_functiondef('private.aceptar_oferta_impl(uuid)'::regprocedure) into v_def;
  if position('Tenés 3 servicios con comisión UGO pendiente' in v_def)=0 then
    if position(v_anchor in v_def)=0 then
      raise exception 'No se encontró el punto seguro para insertar el guard de deuda';
    end if;
    v_def := replace(v_def,v_anchor,v_guard);
    execute v_def;
  end if;
end
$$;

notify pgrst,'reload schema';
