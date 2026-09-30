-- UGO readiness cross-idempotency
-- One completed service may receive at most one review from each side.
-- This database invariant closes the race where duplicate clicks/requests could
-- persist multiple ratings before the UI reconciles.

alter table public.resenas
add constraint resenas_servicio_autor_unique
unique (servicio_id, autor_tipo);

comment on constraint resenas_servicio_autor_unique on public.resenas is
'Idempotency invariant: one rating per service and actor type (cliente/proveedor).';
