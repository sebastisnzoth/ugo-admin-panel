-- Shared pool is derived from existing unassigned services; no persistent duplicate queue.
-- Eligibility is checked both when listing and under the service lock when claiming.
CREATE OR REPLACE FUNCTION private.pending_request_eligible(p_provider uuid,p_service uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.servicios s
  JOIN public.usuarios u ON u.id=p_provider
  JOIN public.perfiles_proveedor pp ON pp.usuario_id=u.id
  WHERE s.id=p_service AND s.proveedor_id IS NULL AND s.estado IN ('buscando','ofrecido')
   AND (s.programado_para IS NULL OR s.programado_para >= now())
   AND s.created_at <= now()-interval '5 minutes'
   AND s.cliente_id<>u.id AND u.tipo='proveedor' AND u.activo=true
   AND pp.disponible=true AND pp.online=true AND pp.estado_verificacion='verificado'
   AND pp.onboarding_completo_at IS NOT NULL AND pp.termos_aceitos_at IS NOT NULL
   AND private.proveedor_trabaja_categoria(u.id,s.categoria_id)
   AND NOT private.proveedor_bloqueado_por_deuda_ugo(u.id)
   AND private.proveedor_puede_recibir_oferta(u.id,s.id)
   AND ((s.tarifa IS NOT NULL AND s.tarifa>0) OR (pp.tarifa_base IS NOT NULL AND pp.tarifa_base>0))
   AND s.ubicacion_cliente IS NOT NULL AND pp.ubicacion IS NOT NULL
   AND pp.ubicacion_updated_at BETWEEN now()-interval '90 seconds' AND now()+interval '5 seconds'
   AND pp.ubicacion_accuracy_m>0 AND pp.ubicacion_accuracy_m<=250
   AND NOT (abs(extensions.st_y(pp.ubicacion::extensions.geometry))<0.0001 AND abs(extensions.st_x(pp.ubicacion::extensions.geometry))<0.0001)
   AND extensions.st_dwithin(s.ubicacion_cliente,pp.ubicacion,private.provider_operating_radius_m(u.id)+0.01)
   AND NOT EXISTS (SELECT 1 FROM public.ofertas_servicio o WHERE o.servicio_id=s.id AND o.proveedor_id=u.id AND o.estado='rechazada')
   AND NOT EXISTS (SELECT 1 FROM public.ofertas_servicio o WHERE o.servicio_id=s.id AND o.proveedor_id=u.id AND o.estado='pendiente' AND (o.expira_at IS NULL OR o.expira_at>now()))
 );
$$;
REVOKE ALL ON FUNCTION private.pending_request_eligible(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.obtener_pedidos_pendientes_proveedor()
RETURNS TABLE(id uuid, descripcion text, categoria text, zona text, tarifa numeric, programado_para timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $$
 SELECT s.id,s.descripcion,c.nombre,nullif(concat_ws(', ',pc.barrio,pc.ciudad),''),s.tarifa,s.programado_para,s.created_at
 FROM public.servicios s LEFT JOIN public.categorias c ON c.id=s.categoria_id
 LEFT JOIN public.perfiles_cliente pc ON pc.usuario_id=s.cliente_id
 WHERE auth.uid() IS NOT NULL AND private.pending_request_eligible(auth.uid(),s.id)
 ORDER BY s.created_at ASC,s.id LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.obtener_pedidos_pendientes_proveedor() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obtener_pedidos_pendientes_proveedor() TO authenticated;

CREATE OR REPLACE FUNCTION public.tomar_pedido_pendiente(p_servicio_id uuid)
RETURNS public.servicios LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $$
DECLARE v_user uuid:=auth.uid(); v_service public.servicios%rowtype; v_offer uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
 SELECT * INTO v_service FROM public.servicios WHERE id=p_servicio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no disponible'; END IF;
 -- An ambiguous retry succeeds only for this exact already assigned service.
 IF v_service.proveedor_id=v_user AND v_service.estado NOT IN ('cancelado','disputado') THEN RETURN v_service; END IF;
 IF NOT private.pending_request_eligible(v_user,p_servicio_id) THEN RAISE EXCEPTION 'Pedido no disponible o ya asignado'; END IF;
 INSERT INTO public.ofertas_servicio AS o(servicio_id,proveedor_id,estado,tarifa_ofrecida,expira_at)
 SELECT p_servicio_id,v_user,'pendiente',coalesce(nullif(v_service.tarifa,0),pp.tarifa_base),now()+interval '5 minutes'
 FROM public.perfiles_proveedor pp WHERE pp.usuario_id=v_user
 ON CONFLICT ON CONSTRAINT ofertas_servicio_servicio_id_proveedor_id_key DO UPDATE
 SET estado='pendiente',tarifa_ofrecida=excluded.tarifa_ofrecida,expira_at=excluded.expira_at,respondida_at=NULL
 WHERE o.estado<>'rechazada'
 RETURNING o.id INTO v_offer;
 IF v_offer IS NULL THEN RAISE EXCEPTION 'Pedido no disponible'; END IF;
 v_service:=private.aceptar_oferta_impl(v_offer);
 IF v_service.id IS NULL OR v_service.proveedor_id<>v_user THEN RAISE EXCEPTION 'Pedido no disponible o ya asignado'; END IF;
 RETURN v_service;
END;
$$;
REVOKE ALL ON FUNCTION public.tomar_pedido_pendiente(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tomar_pedido_pendiente(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
