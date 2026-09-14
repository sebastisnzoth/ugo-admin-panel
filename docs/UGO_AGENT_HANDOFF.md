# UGO — Agent Handoff

**Estado:** operativo en UGO TEST  
**Rama:** `main`  
**Uso:** handoff compartido ChatGPT/Codex  
**Regla:** verificar siempre contra `main` antes de continuar.

## CURRENT P0

Cerrar la validación física real de Hugo Cliente en navegador/dispositivo:

```text
“Buscame un electricista”
→ recomendación con profesionales reales
→ “Elegí a Sebastián Soto oficial”
→ completar descripción/dirección/cuándo
→ “Sí, por favor, confirmar pedido”
→ un solo serviceId
→ oferta visible para el proveedor elegido
→ mismo serviceId visible en Cliente y Admin
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

## LAST COMPLETED · 14/09/2026

### Hugo / voz / listener ownership

- Hugo canónico usa `ClientVoiceHugoDock` en Home y superficies normales.
- `browserVoiceBridge.ts` usa MediaRecorder → `/api/test` → Gemini en navegadores compatibles.
- `422 Gemini no detectó voz` se trata como silencio/retry y no apaga la conversación.
- salida de Hugo usa Gemini TTS por `/api/hugo/chat`; no usa `speechSynthesis` como falso Gemini.
- búsqueda/recomendación conserva el mismo draft; la elección hablada puede resolver `Sebastián Soto oficial` contra `sebastianzothoficial` cuando ese proveedor está entre los candidatos reales.
- creación + matching conservan el mismo `serviceId` frente a retry/respuesta perdida.
- se encontró que `ClientGuidedRequest` todavía escucha eventos propios de Hugo cuando está montado en `request`. Para impedir dos motores escuchando a la vez, `ClientRoot` ahora monta **o** `ClientGuidedRequest` **o** `ClientHugoBridge`: nunca ambos durante `flow.screen==='request'`.
- la selección por tarjeta del radar sigue usando checkout guiado; la selección por voz usa Hugo canónico. Ambos terminan en el mismo `getDispatchProvider()`/matching real, pero ya no compiten por eventos simultáneamente.

### Radar / matching / proveedor

- `proveedores_mapa` expone categoría principal + rubros secundarios activos.
- matching automático y dirigido usan la misma regla multirubro.
- `20260914220700_matching_retry_idempotency.sql` está aplicado en UGO TEST: un retry automático no destruye ofertas pendientes todavía vigentes.
- `ProviderDataProvider` carga oportunidades mediante `obtener_ofertas_proveedor()`.
- `useProviderRealtime` escucha `ofertas_servicio` por `proveedor_id`, servicios, pagos y resync al volver online/visible.

### Guard P0 · un pedido activo por cliente

Se encontró un hueco real: Hugo preservaba el `serviceId` dentro de una conversación, pero la base todavía permitía que dos confirmaciones concurrentes/independientes insertaran dos servicios activos para el mismo cliente.

Aplicado a UGO TEST: `client_single_active_service_guard`.

- índice único parcial por `cliente_id` para estados activos;
- trigger con mensaje legible: `Ya tenés un servicio activo. Seguilo o cancelalo antes de crear otro pedido.`;
- cancelación real (`cancelar_servicio`) libera nuevamente el slot activo;
- no existían duplicados activos antes de aplicar el guard.

## VALIDATED · evidencia real UGO TEST

Validación con Cliente TEST `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, proveedor `sebastianzothoficial` y Admin TEST bajo rol `authenticated` + claims reales:

```text
serviceId: 6850d638-fc61-46cf-8179-fb871e921330
service #: 23
categoría: Electricidad
proveedor: eccc6d2e-c2cd-4079-bd98-f3782c0aa9c1
oferta: 162e9cb5-82a2-4993-ae8b-9e81768b330f
valor: BRL 120
```

Resultados:

- Cliente creó el servicio en `buscando`.
- un segundo servicio activo para el mismo Cliente fue rechazado con SQLSTATE `23505` y el mensaje del guard.
- `iniciar_matching_dirigido` creó la oferta para `sebastianzothoficial`.
- bajo identidad Proveedor, `obtener_ofertas_proveedor()` devolvió la misma oferta/serviceId, Electricidad y BRL 120.
- bajo identidad Cliente, el mismo serviceId quedó `ofrecido`.
- bajo identidad Admin, `private.is_admin(auth.uid())=true` y se leyó el mismo serviceId/estado.
- Cliente ejecutó `cancelar_servicio`; el servicio quedó `cancelado`.
- después de cancelar, el Proveedor obtuvo `0` ofertas pendientes para ese serviceId.
- servicio #23 queda como evidencia TEST persistida, no activo.

También se revalidó como Cliente autenticado que Angel Ariel y `sebastianzothoficial` están online/disponibles en Electricidad y que la categoría aparece en `categoria_ids`.

## CI / RELEASE

Baseline verificado antes del último aislamiento de listeners:

- commit `b156638ff182538f536b8beeb6667361e50dc216` · `fix(client): enforce one active service per client`;
- UGO Core CI #727 alcanzó build, contratos core y lint sobre ese bloque;
- Vercel `dpl_3dNMhC8WtHvoD4GY6tYdLuSDjG4b` quedó `READY`, target production de UGO TEST, 12 Node functions.

El commit siguiente agrega únicamente el aislamiento `request` entre Hugo canónico y checkout guiado + su contrato. Verificar CI y Vercel sobre el SHA final antes de declarar ese último cambio `RELEASED`.

## BLOCKED

### B1 · validación física humana

Único bloqueo del P0 de navegador/dispositivo:

- escuchar realmente Gemini TTS;
- validar autoplay/WebAudio y permiso de micrófono;
- ejecutar hablada la secuencia completa;
- comprobar visualmente Cliente + Proveedor + Admin;
- pasada física de cámara/GPS/Storage/Realtime-reconnect/UX táctil antes de producción.

Las herramientas actuales no pueden otorgar permisos ni oír el audio del navegador del usuario.

### B2 · workflow HTTP aislado con login real

Requiere los seis secretos TEST:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar esas contraseñas en repo, commits ni documentación pública.

## NEXT

1. confirmar CI + Vercel `READY` del SHA final de `main`;
2. ejecutar prueba física de Hugo Cliente con dos sesiones/dispositivos;
3. si falla voz, seguir `/api/test` y `/api/hugo/chat` en runtime logs durante esa prueba;
4. si falla oferta/tarjeta, seguir el mismo `serviceId` en `servicios` → `ofertas_servicio` → `obtener_ofertas_proveedor()`;
5. cuando existan credenciales TEST en GitHub Secrets, ejecutar workflow aislado con login HTTP real;
6. no promover producción hasta cerrar los bloqueos de release.
