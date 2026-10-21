-- P0: safe server-side rematch recovery for pending customer requests.
-- Deliberately does NOT enable pg_cron. Deploy/enable only after Arena TEST gates.
-- Preconditions: the existing matching implementation verifies the customer and
-- locks the service row; client cancellation also locks that row.
CREATE OR REPLACE FUNCTION private.retry_unmatched_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_old_sub text;
  v_old_role text;
BEGIN
  -- No broad global write: operate on a bounded batch of unlocked services.
  -- Eligibility includes searching or offered requests once all offers expire.
  -- Ignore assigned, cancelled and completed work.
  v_old_sub := current_setting('request.jwt.claim.sub', true);
  v_old_role := current_setting('request.jwt.claim.role', true);
  FOR r IN
    SELECT s.id, s.cliente_id
      FROM public.servicios s
     WHERE s.estado IN ('buscando', 'ofrecido')
       AND s.proveedor_id IS NULL
       AND s.updated_at <= now() - interval '1 minute'
       AND (s.matching_expires_at IS NULL OR s.matching_expires_at <= now())
       AND NOT EXISTS (
         SELECT 1
           FROM public.ofertas_servicio o
          WHERE o.servicio_id = s.id
            AND o.estado = 'pendiente'
            AND (o.expira_at IS NULL OR o.expira_at > now())
       )
     ORDER BY s.updated_at, s.id
     LIMIT 20
     FOR UPDATE OF s SKIP LOCKED
  LOOP
    BEGIN
      -- Expire ONLY this request's already expired offers, not active ones.
      UPDATE public.ofertas_servicio
         SET estado = 'expirada', respondida_at = coalesce(respondida_at, now())
       WHERE servicio_id = r.id
         AND estado = 'pendiente'
         AND expira_at IS NOT NULL
         AND expira_at <= now();

      PERFORM set_config('request.jwt.claim.sub', r.cliente_id::text, true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      PERFORM private.iniciar_matching_impl(r.id);
      -- The existing function writes service status and holds the same row lock
      -- as cancellation. Its own eligible-provider and GPS checks remain intact.
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'UGO rematch failed for service %: %', r.id, SQLERRM;
    END;
    PERFORM set_config('request.jwt.claim.sub', coalesce(v_old_sub,''), true);
    PERFORM set_config('request.jwt.claim.role', coalesce(v_old_role,''), true);
  END LOOP;
END;
$function$;
-- Intentional: scheduled job stays disabled until tests and startup health pass.
