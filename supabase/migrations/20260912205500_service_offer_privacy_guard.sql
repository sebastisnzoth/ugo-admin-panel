-- UGO · P0 privacy guard for service rows before provider assignment
--
-- Pending opportunities are intentionally exposed through the redacted
-- obtener_ofertas_proveedor() RPC. A provider who merely received an offer must
-- not be able to bypass that contract by selecting the full servicios row,
-- which contains the client's exact address and operational metadata.

alter policy servicios_select
on public.servicios
using (
  cliente_id = (select auth.uid())
  or proveedor_id = (select auth.uid())
  or private.is_admin((select auth.uid()))
);
