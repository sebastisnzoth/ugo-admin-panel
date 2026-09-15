-- P0 · multiple concurrent client requests
-- Distinct drafts must coexist, but retrying the same client draft must never
-- create a duplicate service row. The draft id is generated client-side and
-- stored in servicios.metadata.request_draft_id.

CREATE UNIQUE INDEX IF NOT EXISTS servicios_cliente_request_draft_uidx
  ON public.servicios (cliente_id, ((metadata->>'request_draft_id')))
  WHERE nullif(btrim(coalesce(metadata->>'request_draft_id','')), '') IS NOT NULL;
