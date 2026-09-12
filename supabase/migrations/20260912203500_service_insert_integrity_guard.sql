-- UGO · P0 service creation integrity guard
--
-- A client must be able to create its own request, but it must not be able to
-- forge assignment/lifecycle/financial settlement fields during INSERT.
-- Matching, provider assignment and lifecycle progression remain server-authoritative.
--
-- This migration intentionally changes only the INSERT RLS contract. Existing
-- table grants are preserved because Admin operations may legitimately rely on
-- direct table privileges while still being constrained by Admin-only RLS.

alter policy servicios_insert
on public.servicios
with check (
  private.is_admin((select auth.uid()))
  or (
    cliente_id = (select auth.uid())
    and proveedor_id is null
    and estado in ('borrador','buscando')
    and aceptado_at is null
    and iniciado_at is null
    and completado_at is null
    and cancelado_at is null
    and comision_ugo is null
    and ganancia_proveedor is null
    and (
      private.is_demo_account((select auth.uid()), 'cliente')
      or (
        ambiente = 'real'
        and coalesce(lower(metadata->>'demo'),'false') not in ('true','1','yes')
      )
    )
  )
);
