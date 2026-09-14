# UGO — Agent Handoff

**Estado:** operativo en UGO TEST  
**Rama:** `main`  
**Uso:** handoff compartido ChatGPT/Codex  
**Regla:** verificar siempre contra `main` antes de continuar.

## CURRENT P0

Repetir una prueba física de Hugo Cliente después del bloque de latencia/voz del 14/09/2026:

```text
“Necesito un electricista”
→ “Dos enchufes se me rompieron”
→ “Mañana a las 10 de la mañana”
→ elegir profesional real
→ “Sí, confirmar pedido”
→ probar “Volveme a Inicio”
→ detener voz y continuar por texto
```

UGO TEST:

```text
Supabase: tmossnqfwfwjrtzwcbmm
Web: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
```

Producción Supabase `trfsjuseqjxlhrxuvdsm` sigue fuera de alcance.

## LAST COMPLETED · P0 voz/latencia física · 14/09/2026

La prueba física real del Director reveló que Hugo respondía demasiado lento, parecía trabarse con “mañana a las 10”, no daba feedback confiable al confirmar, no entendía “volveme a la pantalla de inicio” y STOP no era una transición limpia a texto.

### Evidencia de la prueba física real

Vercel sobre el deploy anterior registró en la misma sesión:

- `/api/test`: 12 requests de voz; 11 `200` y un `422 Gemini no detectó voz` a las 22:40:07 UTC.
- `/api/hugo/chat`: múltiples respuestas `200`, pero dos `502` consecutivos a las 22:41:43/44 UTC.
- causa exacta de esos `502`: cuota Free Tier agotada para `gemini-3.1-flash-tts`, límite 10 requests, con retry sugerido de ~15 s.
- el cliente anterior hacía dos intentos TTS y mantenía la conversación serializada hasta terminar generación + reproducción.
- `browserVoiceBridge` esperaba 900 ms de silencio para cerrar turno y mantenía un fallback de consumidor de 12 s.
- la recomendación inicial hacía además una llamada Gemini de texto antes de generar TTS, aunque ya existía una recomendación determinista basada en datos reales.

La base confirma que la aparente falla de confirmación era principalmente UX/feedback, no pérdida del pedido. La sesión física creó realmente:

```text
serviceId: 96d3e438-b597-46d3-9dfc-2ed4a97394df
service #: 25
cliente real TEST: ccccaa2b-c315-4e1a-914f-7f2a53ea7553
categoría: Electricidad
programado_para: 2026-09-15 13:00:00+00 = 10:00 America/Sao_Paulo
```

Ese pedido llegó a crear dos ofertas reales: `sebastianzothoficial` y Angel Ariel. El parser antiguo persistió mal la descripción como sólo `rompieron`. El servicio #25 quedó luego `cancelado`; el cliente real TEST quedó sin servicios activos, listo para retest.

### Correcciones publicadas

Commit funcional:

```text
04d8dfa39b944bbfd81019473a1255fdbe418ca2
fix(hugo): make client voice flow responsive and interruptible
```

Cambios principales:

- nuevo `src/mvp/client/hugoVoiceIntent.ts` con parser real testeable para horario, confirmación, proveedor y comandos globales;
- “mañana a las 10”, “mañana a las 10 de la mañana”, “para mañana a las 10” y “mañana 10 de la mañana” convergen a mañana 10:00;
- `parseDescription` conserva la frase completa `Dos enchufes se me rompieron`;
- navegación global: Inicio, Actividad e intención de cancelar funcionan aun con Draft abierto;
- cancelar por voz/botón exige confirmación humana;
- selección + confirmación pueden resolverse en un solo turno;
- STOP aborta fetch TTS pendiente, audio, AudioContext y micrófono, deja `busy=false` y enfoca el composer de texto;
- el orb ya no queda deshabilitado mientras Hugo está `connecting`;
- input de texto y voz comparten el mismo Draft; frases que llegan mientras lógica está ocupada se encolan en vez de perderse;
- TTS dejó de ser barrera serial: el texto aparece inmediatamente, la escucha se rearma mientras se genera voz y el audio puede ser interrumpido por el usuario;
- se eliminó el doble retry TTS del cliente;
- TTS intenta primero `gemini-2.5-flash-preview-tts` y mantiene `gemini-3.1-flash-tts-preview` como fallback, con timeout corto y telemetría `Hugo TTS timing`;
- recomendación inicial usa directamente `voiceAvailabilityText` sobre profesionales reales y elimina una llamada Gemini intermedia;
- detección de fin de voz baja de 900 ms a 650 ms; fallback de consumidor de 12 s a 450 ms; retries de silencio/errores se rearman más rápido;
- se agregó timing de captura/transcripción en consola para medir el próximo test físico;
- guard de servicio activo sigue vigente y los errores `23505` se convierten en mensaje operativo legible.

## VALIDATED

### Código / CI

UGO Core CI `#729`, run `34906818720`, sobre `04d8dfa39b944bbfd81019473a1255fdbe418ca2`: **success**.

Pasaron:

- dependency security gate;
- TypeScript + production build;
- `npm test`, incluidos contratos core/RPC-RLS;
- test de comportamiento real de `hugoVoiceIntent.ts` ejecutando el módulo TS transpiliado, no sólo regex estático;
- casos de mañana 10:00;
- variantes de confirmación;
- selección `Sebastián Soto oficial` + confirmación en el mismo turno;
- comandos Inicio/Actividad/Cancelar;
- contratos de TTS abortable/no bloqueante, 422 retryable y aislamiento de listeners;
- lint crítico, ClientApp y reporte de lint completo.

### Backend/RPC/RLS real UGO TEST

Se hizo una nueva corrida equivalente al caso físico con identidad Cliente TEST, Proveedor y Admin bajo rol `authenticated` + claims reales:

```text
serviceId: ea3b3590-a9b5-498d-a2e7-5de18f2625f9
service #: 26
categoría: Electricidad
descripción: Dos enchufes se me rompieron
programado_para: 2026-09-15 13:00:00+00 = 10:00 America/Sao_Paulo
proveedor dirigido: eccc6d2e-c2cd-4079-bd98-f3782c0aa9c1 (sebastianzothoficial)
oferta: b82f4f7a-449a-42db-ac56-6eb7f90c841f
valor: BRL 120
```

Resultados:

- exactamente un servicio activo durante la validación;
- matching dirigido generó una oferta pendiente al proveedor elegido;
- `obtener_ofertas_proveedor()` bajo identidad Proveedor devolvió el mismo serviceId, la descripción completa, mañana 10:00 y BRL 120;
- Cliente leyó el mismo serviceId en `ofrecido`;
- Admin (`private.is_admin=true`) leyó exactamente el mismo serviceId/estado;
- Cliente ejecutó `cancelar_servicio` y #26 quedó `cancelado`;
- después de cancelar el proveedor obtuvo `0` ofertas pendientes para ese serviceId.

## RELEASED

- Vercel code deployment `dpl_BtTxzPRkr8zADYVKWFXTUzrvgrvz` está `READY` sobre `04d8dfa39b944bbfd81019473a1255fdbe418ca2`.
- target: production de UGO TEST;
- 12 funciones Node, sin sumar rutas serverless;
- alias operativo: `ugo-admin-panel.vercel.app`.

## BLOCKED

### B1 · única validación que exige dispositivo humano

Pendiente medir físicamente, con este deploy:

- latencia percibida real micrófono → texto → respuesta;
- barge-in/interrupción mientras TTS genera o habla;
- que la voz 2.5 TTS tenga cuota disponible en ese momento;
- autoplay/WebAudio y permisos de micrófono del navegador;
- STOP → escribir inmediatamente en composer;
- secuencia completa con Cliente/Proveedor visible en dispositivos reales.

El backend, parser, matching, cancelación, CI y deploy ya tienen evidencia. No declarar la latencia física `MEASURED` hasta la próxima escucha real.

### B2 · login HTTP aislado en GitHub Actions

Sigue requiriendo las credenciales TEST que no deben guardarse en repo:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

## NEXT

1. prueba física corta sobre `https://ugo-admin-panel.vercel.app/?app=client` con la secuencia de CURRENT P0;
2. mirar `UGO voice timing` y runtime `Hugo TTS timing` si vuelve a sentirse lento;
3. confirmar que STOP deja escribir sin reactivar micrófono;
4. sólo después continuar cámara/GPS/Storage/Realtime-reconnect/UX táctil;
5. no promover Supabase producción hasta cerrar validación física.
