# WhatsApp notification worker

UGO drains `public.whatsapp_notificaciones` through the existing `/api/whatsapp/send?process_outbox=1` function.

- Supabase `pg_cron` calls the worker every minute through `pg_net`.
- Incoming WhatsApp webhooks and authorized Admin sends also opportunistically drain the queue.
- Workers claim rows atomically by moving `pendiente|error` to `procesando` before sending.
- Successful deliveries store `meta_message_id` and `sent_at`.
- Failures are retried up to five attempts.
- The worker accepts no phone number or message body from the request; it only processes internally generated outbox rows.
- Vercel Cron is intentionally not used because the project runs on the Hobby plan.

Meta delivery remains disabled until the server environment has the WhatsApp Cloud API access token and phone-number ID configured.
