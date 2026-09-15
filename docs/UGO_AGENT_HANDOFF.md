# UGO — Agent Handoff

**Estado:** UGO TEST operativo, todavía NO promovible a producción  
**Rama de verdad:** `main`  
**Uso:** handoff compartido ChatGPT/Codex  
**Regla:** verificar siempre `main`, CI, Vercel y Supabase TEST antes de continuar.

## ENTORNO

```text
Repo: https://github.com/sebastisnzoth/ugo-admin-panel
Supabase TEST: tmossnqfwfwjrtzwcbmm
Web TEST: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
Supabase PROD: trfsjuseqjxlhrxuvdsm · FUERA DE ALCANCE
```

Principio de producto:

> **Un pedido. Un profesional. Sin vueltas.**

## CURRENT P0

Cerrar sólo los bloques todavía abiertos:

1. **BLOCKED — TEST CREDENTIALS REQUIRED:** ejecutar un E2E NUEVO con un único `serviceId` hasta `completado`, autenticado como Cliente/Proveedor/Admin.
2. **BLOCKED — REAL TEST STORAGE UPLOAD UNAVAILABLE:** ese E2E debe subir evidencia inicial + final como objetos reales al bucket `service-evidence`; no sirve insertar metadata/filas falsas.
3. **BLOCKED — PRODUCT DECISION REQUIRED:** definir política financiera de saldo/retiros y qué ocurre con un pago efectivo `pendiente` cuando el servicio se cancela.
4. **MEASURED pendiente:** Hugo físico, cámara, GPS en movimiento, Realtime visual en dos dispositivos, push y UX móvil.

No reabrir P0 ya cerrados salvo regresión demostrable.

## LAST COMPLETED · REALTIME RECOVERY + GPS REVALIDATION · 15/09/2026

### Realtime backend/config

Supabase TEST publica explícitamente en `supabase_realtime`:

```text
ampliaciones_servicio
disputa_mensajes
disputas
evidencias_servicio
mensajes
notificaciones
ofertas_servicio
pagos
perfiles_proveedor
servicios
```

Se detectaron huecos reales de recuperación: varias superficies dependían de carga inicial + eventos Realtime pero no reconstruían estado de persistencia de forma explícita al recuperar red, volver a foreground o completar la suscripción.

Se corrigieron:

```text
src/mvp/NotificationCenter.tsx
src/mvp/ServiceChat.tsx
src/mvp/ServiceExpansionPanel.tsx
src/hooks/useDisputes.ts
```

Ahora las superficies críticas afectadas resyncan contra DB al:

- montar/cargar;
- recuperar `online`;
- volver a `visibilityState=visible`;
- recibir `SUBSCRIBED`;
- recibir el evento Realtime correspondiente;
- y limpian listeners/canales al desmontar.

Nuevo contrato:

```text
tests/contracts/realtime-resync-recovery.test.mjs
```

Estado:

```text
Realtime backend/config + recovery contracts: VALIDATED
Realtime visual Cliente↔Proveedor en dos dispositivos: MEASURED pendiente
```

## COMMIT FUNCIONAL ACTUAL

```text
678ffe5b2879e9391376940fe23a55e212d1d607
fix(realtime): resync critical surfaces after reconnect
```

Parent:

```text
51fbd1cfd651c24d20ab53edd97399a7910a7a06
```

No se creó ninguna rama.

## CI

```text
UGO Core CI #736
run: 34919576195
SHA: 678ffe5b2879e9391376940fe23a55e212d1d607
status: completed
conclusion: success
```

Pasaron los gates del workflow:

- `npm ci`;
- `npm audit --audit-level=high`;
- build + TypeScript;
- `npm test`, incluidos contratos de recovery Realtime;
- critical lint;
- ClientApp lint;
- full repo lint.

### Integration aislado

NO está validado en CI. El harness se salta correctamente porque faltan variables TEST.

Faltan para RPC/RLS Cliente↔Proveedor:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
```

Para Admin faltan además:

```text
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No imprimir ni guardar estos secretos en repo/docs.

## RELEASED

Vercel desplegó el SHA funcional exacto:

```text
deployment: dpl_BH55p6VP3WWA4BTNXuVYqVBbYhbg
SHA: 678ffe5b2879e9391376940fe23a55e212d1d607
state: READY
branch: main
```

Smokes del alias UGO TEST:

```text
/?app=client   → OK
/?app=provider → OK
/?app=admin    → OK
/assets/index-TePIMTmi.js → OK
```

Supabase PRODUCCIÓN no fue tocado.

## GPS / TRACKING · REVALIDADO EN TEST

RPCs canónicos:

```text
actualizar_ubicacion_y_distancia(...)
obtener_tracking_servicio_cliente(...)
```

Validación transaccional en Supabase TEST, con servicios temporales y `ROLLBACK`:

- Proveedor Sebastián asignado → actualización permitida y distancia calculada (~14.9 m en fixture);
- Proveedor Angel intentando servicio asignado a Sebastián → rechazado: `Servicio no asignado al proveedor`;
- Cliente dueño → puede leer tracking del servicio;
- Cliente ajeno → rechazado: `No autorizado`;
- latitud inválida `91` → rechazado: `Coordenadas inválidas`;
- `servicios.ubicacion_cliente = null` → fallback a `perfiles_cliente.ubicacion` funcionó;
- persistencia de coordenadas del Proveedor se comprobó dentro de transacción y luego se revirtió para no ensuciar TEST.

Estado:

```text
GPS/RPC backend: VALIDATED
GPS físico caminando/tracking visual: MEASURED pendiente
```

Migración ya aplicada/versionada:

```text
20260914234234 provider_client_tracking_rpcs
supabase/migrations/20260914234234_provider_client_tracking_rpcs.sql
```

## CHAT CANÓNICO · ESTADO CONSERVADO

Migración:

```text
20260915001039 canonical_service_chat_hardening
```

Estado validado:

- `public.mensajes` es la tabla canónica;
- `emisor_id = auth.uid()`;
- rol Cliente/Proveedor/Admin debe coincidir con identidad real;
- participantes tienen `SELECT` + `INSERT`;
- UPDATE queda restringido a `leido_at`;
- legacy `mensajes_servicio` se migra/elimina si existe.

## EVIDENCIAS / STORAGE

El guard `service_evidence_storage_integrity_guard` sigue aplicado/versionado:

- una fila `evidencias_servicio` necesita un objeto real en `storage.objects`;
- bucket canónico: `service-evidence`;
- path/ownership deben corresponder al usuario + `serviceId`;
- evidencia con path falso fue rechazada históricamente;
- integration harness usa `.upload()` real antes de registrar evidencia.

### Estado de la corrida E2E nueva

```text
serviceId E2E nuevo: NO CREADO
oferta E2E nueva: NO CREADA
Storage inicial: NO SUBIDO
Storage final: NO SUBIDO
```

Motivo: el entorno actual no expone una acción de upload real de Supabase Storage y GitHub Actions no tiene las credenciales TEST necesarias para ejecutar el harness autenticado. No reutilizar #28/#14 ni insertar objetos/filas falsas para aparentar cierre.

## BLOCKED · FINANZAS

La UI/API esperan:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Ambos RPC siguen ausentes en Supabase TEST.

La infraestructura real ya tiene:

- `pagos.ganancia_proveedor`;
- tabla `retiros`;
- lectura de retiros por Proveedor;
- `admin_actualizar_retiro(...)` para administración;
- camino futuro/principal de Mercado Pago Split representado en UI.

Auditoría TEST confirmó un caso real:

```text
servicio #28 = cancelado
método = efectivo
pago = pendiente
```

No existe una política inequívoca que autorice a decidir automáticamente:

1. cuándo un pago entra al saldo disponible;
2. qué retiros comprometen/descuentan saldo;
3. qué ocurre con pago efectivo pendiente al cancelar;
4. si el retiro interno/manual legado debe mantenerse frente a Split;
5. semántica financiera de cancelado/fallido/reembolsado/anulado.

No implementar una fórmula/enum/semántica nueva sin decisión de producto explícita.

## HUGO · ESTADO CONSERVADO

Último P0 funcional Hugo:

```text
04d8dfa39b944bbfd81019473a1255fdbe418ca2
fix(hugo): make client voice flow responsive and interruptible
```

Preservar voz/texto en el mismo Draft, MediaRecorder→`/api/test`, retry 422 sin voz, parser/confirmación/selección de proveedor, Inicio/Actividad/Cancelar, STOP abortable, sin `speechSynthesis` y sin listeners Hugo competidores.

La latencia post-fix todavía NO es `MEASURED` sin una nueva prueba física.

## EVIDENCIA HISTÓRICA — NO USAR COMO NUEVO E2E

```text
#28 3558ce63-5216-4a58-beed-30febf0581ba · cancelado
#14 68ef8d25-b382-4e98-986a-21c510cc78f1 · completado histórico
```

No sirven como sustituto de la corrida NUEVA solicitada.

## MEASURED PENDIENTE · FÍSICO

No marcar como `MEASURED` sin dispositivo real:

- micrófono / latencia Hugo / barge-in / STOP→texto;
- cámara y evidencia tomada desde teléfono;
- GPS real caminando y tracking visual;
- Cliente + Proveedor en dos dispositivos con Realtime sin refresh;
- Web Push real;
- teclado móvil, safe areas, overlays y UX táctil.

## NEXT

```text
1. habilitar en un entorno seguro las credenciales TEST del harness sin escribirlas en repo
2. ejecutar E2E nuevo + dos uploads reales a service-evidence hasta completado
3. verificar el mismo serviceId como Cliente, Proveedor y Admin
4. cerrar decisión financiera explícita y recién entonces implementar saldo/retiro/cancel semantics
5. realizar pasada física de dos dispositivos
6. sólo después evaluar checklist de promoción
```

Nunca tocar Supabase producción hasta autorización explícita de promoción.
