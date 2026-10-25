-- UGO P0: narrow private user-row reads to owner/Admin only.
-- Safe public provider discovery and contracted counterpart previews remain available
-- through explicitly whitelisted columns; neither surface returns contact PII.
-- Do not apply automatically to PROD: validate on Arena TEST with signed-in identities.
BEGIN;

CREATE OR REPLACE FUNCTION public.obter_perfiles_participantes(p_ids uuid[])
RETURNS TABLE(id uuid, nombre text, apellido text, foto_url text, karma numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT u.id, u.nombre, u.apellido, u.foto_url, u.karma
  FROM public.usuarios AS u
  WHERE auth.uid() IS NOT NULL
    AND p_ids IS NOT NULL
    AND cardinality(p_ids) BETWEEN 1 AND 20
    AND u.id = ANY(p_ids)
    AND (
      u.id = auth.uid()
      OR private.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.servicios AS s
        WHERE (s.cliente_id = auth.uid() AND s.proveedor_id = u.id)
           OR (s.proveedor_id = auth.uid() AND s.cliente_id = u.id)
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.obter_perfiles_participantes(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_perfiles_participantes(uuid[]) TO authenticated;

-- The legacy public/client.html provider catalog needs only coarse locations.
-- security_barrier stops caller predicates being pushed through this deliberate
-- safe projection; it cannot return contact information or precise coordinates.
CREATE OR REPLACE VIEW public.usuarios_publicos
WITH (security_barrier = true)
AS
  SELECT u.id, u.nombre, u.karma, u.categoria, u.tarifa_base,
         round(u.lat::numeric, 2)::double precision AS lat,
         round(u.lng::numeric, 2)::double precision AS lng,
         u.online, u.activo, u.tipo, u.foto_url, u.bio,
         pp.estado_verificacion
  FROM public.usuarios AS u
  LEFT JOIN public.perfiles_proveedor AS pp ON pp.usuario_id = u.id
  WHERE auth.uid() IS NOT NULL
    AND u.activo IS TRUE
    AND u.tipo = 'proveedor';

REVOKE ALL ON TABLE public.usuarios_publicos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.usuarios_publicos TO authenticated;

-- Cross-user direct SELECT previously exposed email, phone, address and GPS.
-- Owner and real Admin can still load their full authorized records.
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT private.is_admin(auth.uid())));

COMMIT;
