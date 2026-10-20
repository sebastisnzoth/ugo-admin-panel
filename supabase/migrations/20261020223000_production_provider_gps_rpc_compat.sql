-- P0 additive compatibility bridge for the existing production provider GPS API.
-- Does NOT replace matching, notification triggers, policies, or payment logic.
ALTER TABLE public.perfiles_proveedor
  ADD COLUMN IF NOT EXISTS ubicacion_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ubicacion_accuracy_m double precision;

CREATE OR REPLACE FUNCTION public.activar_disponibilidad_proveedor(
  p_lat double precision, p_lng double precision,
  p_captured_at timestamptz, p_accuracy_m double precision
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','private','extensions','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_age_ms double precision;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sesión requerida'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180
     OR (abs(p_lat) < 0.0001 AND abs(p_lng) < 0.0001)
  THEN RAISE EXCEPTION 'Coordenadas GPS inválidas'; END IF;
  IF p_captured_at IS NULL THEN RAISE EXCEPTION 'Timestamp de captura GPS requerido'; END IF;
  v_age_ms := extract(epoch FROM (now() - p_captured_at)) * 1000;
  IF v_age_ms < -5000 OR v_age_ms > 30000
  THEN RAISE EXCEPTION 'Ubicación GPS antigua o con reloj inválido'; END IF;
  IF p_accuracy_m IS NULL OR p_accuracy_m <= 0 OR p_accuracy_m > 250
  THEN RAISE EXCEPTION 'Precisión GPS insuficiente'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    JOIN public.perfiles_proveedor pp ON pp.usuario_id=u.id
    WHERE u.id=v_uid AND u.tipo='proveedor' AND u.activo=true
      AND pp.estado_verificacion='verificado'
      AND pp.onboarding_completo_at IS NOT NULL
      AND pp.termos_aceitos_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Perfil de proveedor incompleto o no verificado'; END IF;

  PERFORM set_config('ugo.trusted_provider_location',v_uid::text,true);
  UPDATE public.perfiles_proveedor
  SET ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
      ubicacion_updated_at=p_captured_at,ubicacion_accuracy_m=p_accuracy_m,
      online=true,disponible=true,updated_at=now()
  WHERE usuario_id=v_uid
    AND (ubicacion_updated_at IS NULL OR p_captured_at >= ubicacion_updated_at);
  IF NOT FOUND THEN RAISE EXCEPTION 'La posición GPS es anterior a la última ubicación persistida'; END IF;
  PERFORM set_config('ugo.trusted_provider_location','',true);

  UPDATE public.usuarios SET lat=p_lat,lng=p_lng,updated_at=now() WHERE id=v_uid;
  RETURN jsonb_build_object('status','online','captured_at',p_captured_at,'accuracy_m',p_accuracy_m);
END;
$$;

-- The location tracker uses this API after the provider is Online.
CREATE OR REPLACE FUNCTION public.publicar_ubicacion_disponibilidad_proveedor(
  p_lat double precision, p_lng double precision,
  p_captured_at timestamptz, p_accuracy_m double precision
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','private','extensions','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_age_ms double precision;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sesión requerida'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180
     OR (abs(p_lat) < 0.0001 AND abs(p_lng) < 0.0001)
  THEN RAISE EXCEPTION 'Coordenadas GPS inválidas'; END IF;
  IF p_captured_at IS NULL THEN RAISE EXCEPTION 'Timestamp de captura GPS requerido'; END IF;
  v_age_ms := extract(epoch FROM (now()-p_captured_at))*1000;
  IF v_age_ms < -5000 OR v_age_ms > 30000
  THEN RAISE EXCEPTION 'Ubicación GPS antigua o con reloj inválido'; END IF;
  IF p_accuracy_m IS NULL OR p_accuracy_m <= 0 OR p_accuracy_m > 250
  THEN RAISE EXCEPTION 'Precisión GPS insuficiente'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    JOIN public.perfiles_proveedor pp ON pp.usuario_id=u.id
    WHERE u.id=v_uid AND u.tipo='proveedor' AND u.activo=true
      AND pp.online=true AND pp.disponible=true
  ) THEN RAISE EXCEPTION 'Proveedor no disponible para recibir pedidos'; END IF;

  PERFORM set_config('ugo.trusted_provider_location',v_uid::text,true);
  UPDATE public.perfiles_proveedor
  SET ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
      ubicacion_updated_at=p_captured_at,ubicacion_accuracy_m=p_accuracy_m
  WHERE usuario_id=v_uid
    AND (ubicacion_updated_at IS NULL OR p_captured_at >= ubicacion_updated_at);
  IF NOT FOUND THEN RAISE EXCEPTION 'La posición GPS es anterior a la última ubicación persistida'; END IF;
  PERFORM set_config('ugo.trusted_provider_location','',true);

  UPDATE public.usuarios SET lat=p_lat,lng=p_lng,updated_at=now() WHERE id=v_uid;
  RETURN jsonb_build_object('status','published','captured_at',p_captured_at,'accuracy_m',p_accuracy_m);
END;
$$;

REVOKE ALL ON FUNCTION public.activar_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.publicar_ubicacion_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activar_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_ubicacion_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) TO authenticated;
NOTIFY pgrst,'reload schema';
