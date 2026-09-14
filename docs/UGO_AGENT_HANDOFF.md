# UGO — Agent Handoff

**Estado:** operativo en UGO TEST  
**Rama:** `main`  
**Uso:** buzón compartido entre ChatGPT, Codex y otros agentes  
**Regla:** verificar contra `main` antes de confiar en este archivo.

## CURRENT P0

Revalidar físicamente Hugo Cliente en el navegador/dispositivo con el flujo exacto conversación → recomendación → elección por nombre → confirmación → oferta al proveedor. Backend, matching multirubro, contratos y CI ya están corregidos; la voz Gemini TTS todavía requiere una escucha real desde el navegador después del deploy final.

UGO TEST designado:

```text
Supabase: tmossnqfwfwjrtzwcbmm
Web: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
```

Producción `trfsjuseqjxlhrxuvdsm` permanece fuera de alcance hasta promoción explícita.

## ESTADO ACTUAL

14/09/2026:

- Cliente, Proveedor y Admin apuntan al mismo UGO TEST.
- Vercel despliega `main` dentro del límite Hobby de 12 funciones; validar siempre que el SHA final del bloque esté `READY` antes de darlo por liberado.
- La migración `20260913005000_auxiliary_tables_rls_hardening.sql` fue aplicada en UGO TEST y se verificó RLS activo en las 13 tablas auxiliares cubiertas.
- Se ejecutó una corrida real de backend/RPC/RLS con identidades TEST Cliente, Proveedor y Admin usando contexto `authenticated` + claim de usuario real de TEST, sin tocar producción.
- Esa corrida utilizó un único `serviceId`: `68ef8d25-b382-4e98-986a-21c510cc78f1` (servicio #14) y terminó `completado`.
- El E2E detectó y corrigió el drift de efectivo antes de revisión mediante `20260914202500_restore_cash_review_ordering_guard.sql`.

### Hugo Cliente · recuperación P0 del 14/09

La prueba física del usuario detectó que Hugo podía quedar trabado al decir “sí, confirmar pedido” o al elegir un profesional por voz, que las recomendaciones no mantenían el contexto del pedido y que la salida terminaba usando voz del navegador.

Se auditó el flujo completo y se corrigieron estos puntos:

- `browserVoiceBridge.ts` usa MediaRecorder → `/api/test` → Gemini como camino canónico en navegadores compatibles; Web Speech queda sólo como último recurso de entrada cuando MediaRecorder no existe.
- `422 Gemini no detectó voz` dejó de ser un error fatal: ahora es silencio/reintento y no apaga la conversación.
- Hugo Cliente ya no cambia silenciosamente a `speechSynthesis` para hablar. La salida intenta Gemini TTS; si TTS falla, deja la respuesta escrita y mantiene el flujo vivo.
- “sí, confirmar pedido” y variantes naturales entran como confirmación válida.
- selección por nombre hablado usa coincidencia tolerante; `Sebastián Soto oficial` puede resolver el proveedor real `sebastianzothoficial` cuando está dentro de los candidatos reales.
- buscar/recomendar un profesional ahora crea y conserva el mismo `Draft`; elegir proveedor y confirmar continúa sobre ese mismo contexto.
- creación + dispatch quedó idempotente a nivel de conversación: una vez insertado el servicio se conserva su `serviceId`; un fallo posterior de matching no provoca una segunda inserción al reintentar.
- `ClientGuidedRequest` dejó de estar montado permanentemente junto con Hugo: sólo se monta en `flow.screen==='request'`, evitando dos flujos conversacionales escuchando al mismo tiempo.
- el evento de apertura de Hugo quedó unificado con el radar (`ugo:open-hugo`).

### Radar y matching multirubro

Se encontró drift entre frontend y base: el frontend esperaba `categoria_ids`, pero la vista real `public.proveedores_mapa` sólo exponía la categoría principal. Además, tanto `private.iniciar_matching_impl` como `public.iniciar_matching_dirigido` validaban sólo `categoria_principal_id`.

Correcciones aplicadas a UGO TEST:

- `20260914210000_provider_radar_multirubro_view.sql`: `proveedores_mapa` expone `categoria_ids` con categoría principal + rubros activos derivados de `proveedor_subcategorias`/`subcategorias`.
- Cliente filtra tarjetas por categoría principal **o** `categoria_ids`.
- al elegir una tarjeta, se conserva el rubro pedido por el cliente en lugar de reemplazarlo por el rubro principal del proveedor.
- `20260914212500_matching_multirubro_consistency.sql`: matching automático y dirigido aceptan rubros secundarios activos y priorizan principal → secundario → legacy null.
- se ejecutó una prueba transaccional real con `Proveedor UGO Test`: principal Reparaciones + Electricidad como rubro secundario temporal; `iniciar_matching_dirigido` generó una oferta Electricidad válida de BRL 120 y luego `ROLLBACK`, sin dejar cambios de prueba.

CI confirmado verde para el bloque funcional hasta `82c5ef4fe6c4f0b1f0ba87e4e905c87203068a84`: UGO Core CI run `#721`, incluyendo TypeScript, build, contratos core y lint.

## IMPLEMENTED

Baseline P0 Cliente ↔ Proveedor ↔ Admin:

- matching dirigido con privacidad pre-asignación;
- matching automático y dirigido consistente con multirubro real;
- aceptación atómica e idempotente;
- pago con gate antes de `en_camino`;
- evidencia `Antes` antes de `en_progreso`;
- ampliación aprobable sólo por Cliente y reconciliación de importes;
- evidencia `Después` antes del cierre;
- efectivo presencial debe quedar `liberado` antes de habilitar revisión;
- aprobación final exclusiva del Cliente;
- Admin puede observar el mismo servicio y pago bajo RLS;
- hardening RLS auxiliar aplicado en UGO TEST;
- Hugo Cliente conserva contexto de búsqueda, proveedor elegido y `serviceId` durante confirmación/retry;
- Gemini transcription es camino canónico de voz en navegador con MediaRecorder;
- regresiones de voz, multirubro y orden de cierre efectivo cubiertas en CI.

## VALIDATED

Evidencia confirmada sobre UGO TEST:

- RLS activo en `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos` y `whatsapp_notificaciones`.
- Servicio E2E `68ef8d25-b382-4e98-986a-21c510cc78f1` completó Cliente → Proveedor → Admin con pago `875d5b2f-d050-4aa5-96a2-d9da6e611ce2`, ampliación aprobada y cierre consistente.
- trigger de efectivo previo a revisión revalidado después de detectar el drift.
- `proveedores_mapa` en TEST expone `categoria_ids`; Angel Ariel y `sebastianzothoficial` aparecen online/disponibles en Electricidad y la vista devuelve esa categoría en el array.
- `iniciar_matching_dirigido` fue validado transaccionalmente con un rubro secundario real temporal y `ROLLBACK` posterior.
- CI #721 terminó `success` sobre `82c5ef4fe6c4f0b1f0ba87e4e905c87203068a84` antes de esta actualización documental.

## PENDIENTE / BLOCKED

### B1 · Login HTTP real del workflow aislado

El harness `UGO Isolated RPC RLS` requiere contraseñas de las identidades TEST. Las herramientas actuales permiten validar DB/RPC/RLS con identidades reales y claims autenticados, pero no leer ni resetear de forma segura las contraseñas de Supabase Auth ni cargar GitHub Secrets.

Se requieren fuera del repositorio:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar contraseñas en GitHub, código, commits ni documentos públicos.

### B2 · Validación física de navegador/dispositivo

Pendiente escuchar/usar desde un navegador real el deploy final de Hugo Cliente para validar micrófono, Gemini TTS, autoplay/WebAudio y la secuencia hablada completa. También siguen pendientes la pasada física global de cámara, GPS, Storage, Realtime/reconexión y UX táctil antes de promoción.

## NEXT

1. confirmar CI verde y Vercel `READY` sobre el último SHA de `main` posterior a este handoff;
2. prueba manual Cliente: “buscame un electricista” → escuchar recomendación → “elegí a Sebastián Soto oficial” → completar datos → “sí, confirmar pedido”;
3. verificar que se crea **un solo** servicio y que la oferta llega al proveedor elegido;
4. verificar que la voz escuchada sea Gemini; si TTS falla, revisar `/api/hugo/chat` en runtime logs, sin reintroducir voz local silenciosa;
5. completar cámara/GPS/Storage/Realtime y, cuando existan las seis credenciales TEST en GitHub Secrets, ejecutar `UGO Isolated RPC RLS` con login real;
6. sólo entonces evaluar promoción controlada a producción.

## HANDOFF CONTRACT

El agente que termina un bloque actualiza este archivo si cambió el estado operativo. No borrar bloqueos reales. El agente que entra verifica primero `main` y continúa desde CURRENT P0/NEXT sin pedir al usuario reconstruir contexto.
