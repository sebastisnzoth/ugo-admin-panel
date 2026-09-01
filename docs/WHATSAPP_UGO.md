# UGO por WhatsApp

UGO usa `api/whatsapp/send.js` como gateway bidireccional de WhatsApp Cloud API (Meta).

## Qué hace

- Verifica el webhook de Meta.
- Recibe mensajes de texto, botones/listas y ubicación.
- Mantiene memoria por número en `whatsapp_conversaciones`.
- Deduplica webhooks con `whatsapp_eventos`.
- Hugo extrae categoría, descripción, urgencia, dirección y presupuesto.
- Si no hay presupuesto, usa el promedio real de tarifas base disponibles de esa categoría.
- Crea/reutiliza un cliente WhatsApp en Supabase Auth + `usuarios` + `perfiles_cliente`.
- Crea un `servicio` real y llama `iniciar_matching_backend`, que reutiliza el matching oficial.
- El cliente puede escribir `estado` / `status` para consultar su último servicio.
- Sigue permitiendo invitaciones salientes desde Scout, pero restringidas a Admin/same-origin legacy.

## Variables de servidor

Configurar en Vercel Production/Preview según corresponda. No usar `VITE_*` para secretos.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (opcional)
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `UGO_WHATSAPP_WEBHOOK_SECRET` (recomendado)
- `WHATSAPP_GRAPH_VERSION` (opcional, default actual del código: `v22.0`)

## Callback de Meta

URL base de producción:

`https://ugo-admin-panel-sebastisnzoths-projects.vercel.app/api/whatsapp/send`

Si se configura `UGO_WHATSAPP_WEBHOOK_SECRET`, usar:

`https://ugo-admin-panel-sebastisnzoths-projects.vercel.app/api/whatsapp/send?hook=<MISMO_SECRETO>`

En Meta Developers > WhatsApp > Configuration:

1. Callback URL: la URL anterior.
2. Verify token: exactamente el valor de `WHATSAPP_VERIFY_TOKEN`.
3. Suscribirse al campo `messages`.
4. Asegurarse de que el `phone_number_id` corresponda a `WHATSAPP_PHONE_NUMBER_ID`.

## Flujo de ejemplo

Cliente: `Preciso de um eletricista hoje. A tomada da cozinha está faiscando.`

Hugo pregunta solo lo faltante, por ejemplo dirección/ubicación.

Cliente comparte ubicación.

Hugo responde con resumen y tarifa de referencia real, y pide `SIM`.

Al confirmar:

`WhatsApp -> UGO webhook -> Supabase -> servicio -> iniciar_matching_backend -> ofertas a proveedores`

El servicio queda visible inmediatamente en las apps Cliente/Proveedor/Admin porque comparte el mismo backend.

## Seguridad

- Nunca colocar access tokens o service-role keys en el frontend o en GitHub.
- `iniciar_matching_backend` solo puede ejecutarlo `service_role`.
- Los webhooks se deduplican por `message_id`.
- El botón/confirmación del usuario es obligatorio antes de crear el servicio.
- Si se usa `UGO_WHATSAPP_WEBHOOK_SECRET`, Meta debe apuntar a la URL con `?hook=` para bloquear POSTs no autorizados.
- El `WHATSAPP_VERIFY_TOKEN` se usa solo para la verificación GET de Meta.

## Próxima mejora

Agregar notificaciones salientes automáticas de cambios de estado (`proveedor aceptó`, `en camino`, `llegó`, `pago confirmado`, `aprobación`) desde eventos backend. No deben depender de que una pestaña web esté abierta.
