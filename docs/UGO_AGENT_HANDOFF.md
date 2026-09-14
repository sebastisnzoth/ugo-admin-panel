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

Se revalidó `main` y el backend real de UGO TEST sin asumir el handoff anterior.

### Hugo / voz / recomendaciones

- `ClientRoot` monta un solo Hugo canónico; `ClientGuidedRequest` sólo existe cuando `flow.screen==='request'`, por lo que ya no compite permanentemente con Hugo.
- `browserVoiceBridge.ts` usa MediaRecorder → `/api/test` → Gemini en navegadores compatibles.
- `422 Gemini no detectó voz` se trata como silencio/retry y no apaga la conversación.
- `ClientVoiceHugoDock` usa Gemini TTS por `/api/hugo/chat`; no usa `speechSynthesis` para simular la voz de Gemini.
- búsqueda/recomendación conserva el mismo draft; la elección hablada por nombre usa coincidencia tolerante y puede resolver `Sebastián Soto oficial` contra `sebastianzothoficial` cuando ese proveedor está dentro de los candidatos reales.
- creación + matching conservan el mismo `serviceId` si la respuesta del dispatch se pierde y permiten reintentar sin insertar otro servicio.

### Radar / matching / proveedor

- `proveedores_mapa` expone categoría principal + rubros secundarios activos.
- matching automático y dirigido usan la misma regla multirubro.
- `20260914220700_matching_retry_idempotency.sql` está aplicado en UGO TEST: un retry no destruye ofertas pendientes todavía vigentes.
- `ProviderDataProvider` carga oportunidades mediante `obtener_ofertas_proveedor()` y `useProviderRealtime` escucha `ofertas_servicio` filtradas por `proveedor_id`, además de servicios/pagos y resync al volver online/visible.

### Nuevo guard P0 · un pedido activo por cliente

Se encontró un hueco real: Hugo preservaba el `serviceId` dentro de una conversación, pero la base todavía permitía que dos confirmaciones concurrentes/independientes insertaran dos servicios activos para el mismo cliente.

Se aplicó a UGO TEST `client_single_active_service_guard`:

- índice único parcial por `cliente_id` para estados activos;
- trigger con mensaje legible: `Ya tenés un servicio activo. Seguilo o cancelalo antes de crear otro pedido.`;
- la cancelación real (`cancelar_servicio`) libera nuevamente el slot activo.

No existían duplicados activos antes de aplicar el guard.

## VALIDATED · evidencia real UGO TEST

Validación P0 nueva con identidad TEST Cliente `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, proveedor real TEST `sebastianzothoficial` y Admin TEST, usando rol `authenticated` + claim real:

```text
serviceId: 6850d638-fc61-46cf-8179-fb871e921330
service #: 23
categoría: Electricidad
proveedor elegido: eccc6d2e-c2cd-4079-bd98-f3782c0aa9c1 (sebastianzothoficial)
oferta: 162e9cb5-82a2-4993-ae8b-9e81768b330f
valor ofrecido: BRL 120
```

Evidencia:

- Cliente creó `6850d638-fc61-46cf-8179-fb871e921330` en `buscando`.
- segundo insert activo para el mismo Cliente fue rechazado con SQLSTATE `23505` y el mensaje legible del guard.
- `iniciar_matching_dirigido` creó la oferta `162e9cb5-82a2-4993-ae8b-9e81768b330f` para `sebastianzothoficial`.
- bajo identidad del Proveedor, `obtener_ofertas_proveedor()` devolvió esa misma oferta, mismo `serviceId`, categoría Electricidad y BRL 120.
- bajo identidad del Cliente, el mismo servicio se leyó en estado `ofrecido`.
- bajo identidad Admin, `private.is_admin(auth.uid())=true` y se leyó exactamente el mismo `serviceId`/estado.
- Cliente ejecutó `cancelar_servicio`; el servicio terminó `cancelado`.
- después de cancelar, el Proveedor obtuvo `0` ofertas pendientes para ese `serviceId`.

La cancelación dejó el servicio #23 como evidencia TEST persistida; no quedó activo ni asignado.

## RELEASE / CI

Antes de este bloque:

- `main` estaba en `6d31bbc3ff82a73de07655c89616c6273fe0963d` (`fix(matching): preserve live offers on retry`).
- UGO Core CI #726: `success`.
- Vercel deployment `dpl_w62BCQ2m7gMLfDor5mLmSncxFWnX`: `READY`, target production de UGO TEST, commit `6d31bbc3...`, 12 Node functions.
- `20260914220700_matching_retry_idempotency.sql` figura aplicada en Supabase TEST.

Después del commit de este handoff/guard, verificar nuevamente CI y Vercel sobre el SHA final antes de declarar `RELEASED`.

## BLOCKED

### B1 · validación física humana

Único bloqueo para cerrar este P0 de navegador/dispositivo:

- escuchar realmente Gemini TTS;
- validar autoplay/WebAudio y permiso de micrófono en el dispositivo;
- ejecutar hablada la secuencia completa y comprobar visualmente Cliente + Proveedor + Admin;
- cámara/GPS/Storage/Realtime-reconnect/UX táctil siguen necesitando pasada física antes de producción.

Las herramientas actuales no pueden otorgar permisos ni oír el audio del navegador del usuario.

### B2 · workflow HTTP aislado con login real

Sigue requiriendo los seis secretos TEST:

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

1. confirmar CI y Vercel `READY` sobre el SHA final de `main`;
2. prueba física exacta de Hugo Cliente con dos sesiones/dispositivos;
3. si falla voz, capturar `/api/test` y `/api/hugo/chat` en runtime logs durante esa prueba;
4. si falla oferta/tarjeta, seguir el mismo `serviceId` en `servicios` → `ofertas_servicio` → `obtener_ofertas_proveedor()`;
5. cuando existan credenciales TEST en GitHub Secrets, ejecutar el workflow aislado con login HTTP real;
6. no evaluar producción hasta cerrar B1/B2 según el criterio de release.
