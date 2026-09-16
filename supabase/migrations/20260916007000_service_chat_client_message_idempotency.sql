-- UGO TEST · Prevent replayed chat sends from duplicating the same client attempt.
-- Legacy messages without clientMessageId remain untouched.

create unique index if not exists mensajes_sender_client_message_id_uidx
  on public.mensajes (
    servicio_id,
    emisor_id,
    ((datos->>'clientMessageId'))
  )
  where nullif(datos->>'clientMessageId','') is not null;

comment on index public.mensajes_sender_client_message_id_uidx is
  'UGO chat idempotency: one clientMessageId per service and sender; supports ambiguous INSERT recovery.';
