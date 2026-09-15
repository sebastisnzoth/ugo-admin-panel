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

Las superficies de Realtime corregidas rehidratan persistencia al montar/cargar, recuperar `online`, volver a `visibilityState=visible`, recibir `SUBSCRIBED` y recibir el evento correspondiente; además limpian listeners/canales al desmontar.

Commit funcional:

```text
678ffe5b2879e9391376940fe23a55e212d1d607
fix(realtime): resync critical surfaces after reconnect
```

Contrato:

```text
tests/contracts/realtime-resync-recovery.test.mjs
```

Estado:

```text
Realtime backend/config + recovery contracts: VALIDATED
Realtime visual Cliente↔Proveedor en dos dispositivos: MEASURED pendiente
```

## CI FUNCIONAL AUTORITATIVO

```text
UGO Core CI #737
run: 34919576195
SHA: 678ffe5b2879e9391376940fe23a55e212d1d607
status: completed
conclusion: success
```

Pasaron:

- `npm ci`;
- `npm audit --audit-level=high`;
- build + TypeScript;
- `npm test`;
- critical lint;
- ClientApp lint;
- full repo lint.

### Integration aislado

NO está validado en CI. El harness se omite porque faltan variables TEST.

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No imprimir ni guardar esos secretos en repo/docs.

## RELEASED

Vercel desplegó el SHA funcional exacto:

```text
deployment: dpl_6AQRxdRRnWEzWWgiAxesP8c5SSo8
SHA: 678ffe5b2879e9391376940fe23a55e212d1d607
state: READY
target: production del proyecto web UGO TEST
branch: main
```

El commit documental posterior `c5346ddaa24bd063bd82aa5d27230f58f0af4a7c` también quedó READY en `dpl_A5upmCSDUj9yRkB7FUiAzFKLxm8s`; no agrega funcionalidad.

Smokes del alias UGO TEST:

```text
/?app=client   → 200
/?app=provider → 200
/?app=admin    → 200
/assets/index-TePIMTmi.js → 200
```

Supabase PRODUCCIÓN no fue tocado.

## GPS / TRACKING · REVALIDADO EN TEST

RPCs canónicos:

```text
actualizar_ubicacion_y_distancia(...)
obtener_tracking_servicio_cliente(...)
```

Validación transaccional en Supabase TEST con `ROLLBACK`:

- Proveedor Sebastián asignado → actualización permitida y tracking legible por el Cliente dueño;
- Proveedor TEST distinto intentando actualizar el mismo servicio → rechazado: `Servicio no asignado al proveedor`;
- Cliente dueño → lectura permitida;
- Cliente ajeno → rechazado: `No autorizado`;
- latitud inválida `123.45` → rechazada: `Coordenadas inválidas`;
- servicio fuera de estados de tracking → actualización con ese `serviceId` rechazada;
- la prueba transaccional no dejó cambio persistente en TEST.

Estado:

```text
GPS/RPC backend: VALIDATED
GPS físico caminando/tracking visual: MEASURED pendiente
```

Migración aplicada/versionada:

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

- `public.mensajes` es tabla canónica;
- `emisor_id = auth.uid()`;
- rol Cliente/Proveedor/Admin debe coincidir con identidad real;
- participantes tienen `SELECT` + `INSERT`;
- UPDATE queda restringido a `leido_at`;
- legacy `mensajes_servicio` se migra/elimina si existe.

## EVIDENCIAS / STORAGE

El guard `service_evidence_storage_integrity_guard` sigue aplicado/versionado:

- una fila `evidencias_servicio` necesita objeto real en `storage.objects`;
- bucket canónico: `service-evidence`;
- path/ownership deben corresponder a usuario + `serviceId`;
- una evidencia con path falso ya fue rechazada;
- el integration harness usa `.upload()` real antes de registrar evidencia.

### Estado de la corrida E2E nueva

```text
serviceId E2E nuevo: NO CREADO
oferta E2E nueva: NO CREADA
Storage inicial: NO SUBIDO
Storage final: NO SUBIDO
```

Motivo: este entorno no expone upload real a Supabase Storage y GitHub Actions no dispone de las credenciales TEST requeridas para ejecutar el harness autenticado. No reutilizar #28/#14 ni insertar metadata/objetos falsos para aparentar cierre.

## BLOCKED · FINANZAS · PRODUCT DECISION REQUIRED

La auditoría de masters + implementación confirma que NO hay una política suficiente para implementar saldo/retiro definitivo sin decidir producto.

### Lo que sí está definido

`docs/UGO_DATA_BACKEND_MASTER.md` establece:

```text
efectivo: seleccionado → presencial pendiente → proveedor confirma recepción → registrado/liberado
```

También establece que:

- efectivo nunca representa custodia electrónica UGO;
- cada obligación financiera debe conservar bruto, comisión, neto, estado, fecha y referencia;
- el saldo mostrado en UI nunca es autoridad suficiente para autorizar un retiro;
- retiro y liberación/reembolso son operaciones críticas atómicas/auditables.

`docs/UGO_TESTING_RELEASE_MASTER.md` fija para efectivo:

```text
en_progreso → Después → confirmar_pago_efectivo → esperando_aprobacion → aprobar_servicio
```

y exige probar comisión/ledger e idempotencia.

`UGO_ROADMAP_MASTER.md` deja explícitamente pendiente una decisión de producto sobre modelo financiero de producción antes de implementar saldo/retiro/reembolso definitivo.

### Lo que existe en código

La UI/API esperan:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Ambos RPC siguen ausentes en Supabase TEST.

Infraestructura existente:

- `pagos.ganancia_proveedor`;
- tabla `retiros`;
- lectura de retiros por Proveedor;
- `admin_actualizar_retiro(...)`, con estados `procesando|pagado|fallido` y referencia externa obligatoria para `pagado`;
- `ProviderPayoutPanel` modela retiro manual/legado con mínimo R$50 y describe Mercado Pago Split como camino principal cuando esté activo.

### Caso conflictivo real

```text
servicio #28 = cancelado
método = efectivo
pago = pendiente
```

No existe una definición inequívoca para resolver automáticamente:

1. qué pagos alimentan `saldo_disponible`;
2. si `pendiente/procesando` de retiro comprometen saldo y exactamente cuándo;
3. qué hacer con pago efectivo `pendiente` al cancelar el servicio;
4. si el retiro interno/manual se mantiene como producto o queda sólo como legado frente a Split;
5. semántica de cancelado/fallido/reembolsado/anulado en pagos donde actualmente no hay regla explícita suficiente.

**No implementar nuevos RPC, fórmula de saldo, enum ni semántica financiera hasta decisión explícita de producto.**

## HUGO · ESTADO CONSERVADO

```text
04d8dfa39b944bbfd81019473a1255fdbe418ca2
fix(hugo): make client voice flow responsive and interruptible
```

Preservar voz/texto en el mismo Draft, MediaRecorder→`/api/test`, retry 422 sin voz, parser/confirmación/selección de proveedor, Inicio/Actividad/Cancelar, STOP abortable, sin `speechSynthesis` y sin listeners Hugo competidores.

La latencia post-fix todavía NO es `MEASURED` sin nueva prueba física.

## EVIDENCIA HISTÓRICA — NO USAR COMO NUEVO E2E

```text
#28 3558ce63-5216-4a58-beed-30febf0581ba · cancelado
#14 68ef8d25-b382-4e98-986a-21c510cc78f1 · completado histórico
```

No sustituyen la corrida NUEVA requerida después del hardening de Storage/chat/tracking.

## MEASURED PENDIENTE · FÍSICO

No marcar como `MEASURED` sin dispositivo real:

- micrófono / latencia Hugo / barge-in / STOP→texto;
- cámara y evidencia desde teléfono;
- GPS caminando y tracking visual;
- Cliente + Proveedor en dos dispositivos con Realtime sin refresh;
- Web Push real;
- teclado móvil, safe areas, overlays y UX táctil.

## NEXT

```text
1. definir explícitamente la política financiera mínima
2. habilitar en entorno seguro las credenciales TEST del harness sin escribirlas en repo
3. ejecutar E2E nuevo + dos uploads reales a service-evidence hasta completado
4. verificar el mismo serviceId como Cliente, Proveedor y Admin
5. realizar pasada física de dos dispositivos
6. sólo después evaluar checklist de promoción
```

Nunca tocar Supabase producción hasta autorización explícita de promoción.
