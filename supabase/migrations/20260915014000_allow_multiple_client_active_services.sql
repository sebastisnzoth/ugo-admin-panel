-- UGO TEST · P0 multiple concurrent client requests.
-- "Un pedido. Un profesional. Sin vueltas." means one provider per service,
-- not one active service per client. Remove the obsolete global client lock
-- while preserving efficient client activity queries.

DROP TRIGGER IF EXISTS trg_guard_single_active_client_service ON public.servicios;
DROP INDEX IF EXISTS public.servicios_cliente_single_active_uidx;
DROP FUNCTION IF EXISTS private.guard_single_active_client_service();

CREATE INDEX IF NOT EXISTS servicios_cliente_estado_created_idx
  ON public.servicios (cliente_id, estado, created_at DESC);
