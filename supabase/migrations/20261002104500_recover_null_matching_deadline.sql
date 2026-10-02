-- UGO P0 · Recover matching rows that were persisted before a matching deadline existed.
-- This does not fabricate a provider or advance lifecycle state. It only gives stale
-- searching/offered services a canonical expired deadline so clients can retry safely.

update public.servicios
   set matching_expires_at=coalesce(updated_at,created_at,clock_timestamp()) + interval '5 minutes'
 where estado in ('buscando','ofrecido')
   and proveedor_id is null
   and matching_expires_at is null;

comment on column public.servicios.matching_expires_at is
  'Backend source of truth for the current five-minute matching cycle. NULL on a matching state is treated as recoverable/expired by clients.';

notify pgrst,'reload schema';
