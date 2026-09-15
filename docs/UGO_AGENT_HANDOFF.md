# UGO — Agent Handoff

**Estado:** UGO TEST operativo, todavía NO promovible a producción comercial  
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

1. **BLOCKED — TEST CREDENTIALS REQUIRED:** GitHub Actions no tiene configuradas las 8 variables necesarias para ejecutar el E2E autenticado nuevo.
2. **BLOCKED — PRODUCT DECISION REQUIRED:** definir política financiera de saldo/retiros y qué ocurre con pagos/retiros/cancelaciones antes de crear `saldo_proveedor()` o `solicitar_retiro(...)`.
3. **MEASURED pendiente:** Hugo físico, cámara, GPS en movimiento, Realtime visual en dos dispositivos, push y UX móvil.

El antiguo bloqueo separado “REAL TEST STORAGE UPLOAD UNAVAILABLE” ya NO describe correctamente el estado del repo: el harness implementa `.storage.from('service-evidence').upload(...)` real para evidencia `antes` y `despues`. Lo que impide hoy ejecutar ese recorrido en CI son las credenciales TEST ausentes.

No reabrir P0 cerrados salvo regresión demostrable.

## LAST COMPLETED · E2E HARNESS 3 ROLES + CI · 15/09/2026

Se endureció el harness aislado para que una sola corrida futura use el mismo `serviceId` de punta a punta y lo verifique como Cliente, Proveedor y Admin.

### Implementado

`tests/integration/client-provider-rpc-rls.test.mjs` ahora cubre:

- Cliente autenticado crea el servicio;
- matching dirigido y oferta redactada;
- Proveedor autenticado acepta;
- Cliente y Admin observan el mismo servicio asignado;
- chat canónico Cliente → Proveedor → Cliente sobre `public.mensajes`;
- Admin puede auditar esos mensajes del mismo `serviceId`;
- gate de pago antes de salida;
- evidencia falsa sin objeto Storage rechazada;
- upload REAL de evidencia `antes` al bucket `service-evidence`;
- lifecycle `en_camino → llegado → en_progreso`;
- ampliación y guards de ownership/idempotencia;
- upload REAL de evidencia `despues`;
- confirmación de efectivo e idempotencia;
- aprobación exclusiva del Cliente;
- cierre `completado` convergente Cliente/Proveedor/Admin;
- Admin observa el mismo pago final;
- Admin observa exactamente las dos evidencias reales del E2E.

El fixture nuevo, cuando corra, queda deliberadamente preservado en TEST con:

```text
metadata.integration_test = true
metadata.source = rpc-rls-harness
metadata.e2e_run_id = <uuid>
metadata.preserve_e2e_evidence = true
```

No se intenta un DELETE ficticio: `servicios` no expone política DELETE al Cliente y borrar sólo los objetos Storage dejaría evidencia inconsistente. La evidencia E2E real debe quedar auditable.

### Commits de esta pasada

```text
cef3d1b46dc3cd32c30ea347113f12ceabaea3f2
test(e2e): cover admin chat and preserve real evidence

1207d7871a1f5600ae61d4730164c1c370a5f667
ci(test): wire admin credentials for isolated e2e

850b1c7c77638105e954d0f2d4b64e04c2e711e2
test(contracts): align first-client e2e readiness

71d85da5ebce5b6f4a1b80729666998822a941c6
test(contracts): align isolated e2e guards

936fc9361a95b87acfc4fcd52fcb28d495b811a4
test(contracts): assert production preflight rejection
```

## CI AUTORITATIVO ACTUAL

```text
UGO Core CI #742
run: 34922540607
SHA: 936fc9361a95b87acfc4fcd52fcb28d495b811a4
status: completed
conclusion: success
```

Pasaron:

- `npm ci --include=dev`;
- `npm audit --audit-level=high` → 0 vulnerabilities;
- TEST environment guard;
- build + TypeScript;
- `npm test` → 198 tests, con integration real correctamente SKIPPED por credenciales ausentes;
- critical operational lint;
- ClientApp lint;
- full repository lint.

### Bloqueo exacto del E2E autenticado

GitHub Actions actualmente no recibe ninguna de estas 8 variables:

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

El workflow ya referencia las 8. Falta configurarlas de forma segura fuera del repositorio.

No imprimir ni guardar esos valores en repo/docs/logs.

### Estado de la corrida E2E nueva

```text
serviceId E2E nuevo: NO CREADO
oferta E2E nueva: NO CREADA
Storage inicial: NO SUBIDO
Storage final: NO SUBIDO
chat E2E nuevo: NO CREADO
cierre E2E nuevo: NO EJECUTADO
```

No marcar este recorrido como `VALIDATED` hasta que las 8 variables estén disponibles y el mismo harness termine verde autenticado.

## RELEASED · UGO TEST

El SHA funcional/contractual validado también llegó a Vercel:

```text
deployment: dpl_3Ghrdg8it7GmnDC7JVxPkYvLCSGW
SHA: 936fc9361a95b87acfc4fcd52fcb28d495b811a4
state: READY
target: production del proyecto web UGO TEST
branch: main
alias: https://ugo-admin-panel.vercel.app
```

Supabase PRODUCCIÓN no fue tocado.

## SEGURIDAD SUPABASE TEST · SECURITY DEFINER

Se revisaron los 15 warnings actuales de Supabase sobre funciones `SECURITY DEFINER` ejecutables por `authenticated`.

Funciones cubiertas:

```text
abrir_disputa
actualizar_ubicacion_y_distancia
admin_get_auth_users
admin_resolver_disputa
admin_set_usuario_activo
cancelar_servicio
desactivar_push_suscripcion
guardar_push_suscripcion
iniciar_matching_dirigido
obtener_demanda_proveedor
obtener_ofertas_proveedor
obtener_tracking_servicio_cliente
proponer_ampliacion_servicio
resolver_ampliacion_servicio
responder_disputa
```

Resultado:

- `anon` no tiene EXECUTE sobre los RPC críticos revisados;
- Admin valida `private.is_admin(...)`;
- cancelación valida Cliente dueño o Admin;
- matching dirigido valida Cliente dueño/Admin y elegibilidad;
- actualización GPS exige Proveedor autenticado y servicio asignado;
- lectura tracking exige Cliente dueño;
- disputas/ampliaciones validan participante/rol;
- push queda ligado a `auth.uid()` y ownership del endpoint.

Pruebas negativas reales en Supabase TEST, siempre transaccionales/sin persistir cambios:

- Cliente normal → `admin_get_auth_users()` rechazado: `Solo administradores`;
- Cliente ajeno → tracking de servicio ajeno rechazado: `No autorizado`;
- Proveedor → `admin_get_auth_users()` rechazado: `Solo administradores`;
- Proveedor → matching dirigido sobre servicio ajeno rechazado: `No autorizado`.

Estado:

```text
SECURITY DEFINER guards revisados + negativos TEST: VALIDATED
Advisor genérico SECURITY DEFINER: clasificado, no silenciar rompiendo RPC privilegiados intencionales
Leaked Password Protection: pendiente antes de producción
```

## REALTIME / GPS / CHAT / STORAGE · ESTADO CONSERVADO

### Realtime

`678ffe5b2879e9391376940fe23a55e212d1d607` sigue siendo el commit funcional de recovery Realtime. Superficies críticas rehidratan persistencia en mount/load, `online`, `visibilityState=visible`, `SUBSCRIBED` y eventos correspondientes.

```text
Realtime backend/config + recovery contracts: VALIDATED
Realtime visual Cliente↔Proveedor en dos dispositivos: MEASURED pendiente
```

### GPS / tracking

RPCs canónicos:

```text
actualizar_ubicacion_y_distancia(...)
obtener_tracking_servicio_cliente(...)
```

Ya se validaron ownership, proveedor asignado, cliente dueño, cliente ajeno, coordenadas inválidas y estados válidos.

```text
GPS/RPC backend: VALIDATED
GPS físico caminando/tracking visual: MEASURED pendiente
```

### Chat

`public.mensajes` es tabla canónica; identidad y rol están ligados al usuario real; participantes tienen SELECT/INSERT y UPDATE queda restringido a lectura.

```text
Chat schema/RLS/contracts: VALIDATED
Chat del NUEVO E2E autenticado: BLOCKED por credenciales CI
```

### Evidencias / Storage

El guard `service_evidence_storage_integrity_guard` exige un objeto real en `storage.objects`; bucket canónico: `service-evidence`.

```text
Storage integrity guard: VALIDATED
Nuevo upload real E2E antes/despues: IMPLEMENTED en harness, ejecución BLOCKED por credenciales CI
```

## BLOCKED · FINANZAS · PRODUCT DECISION REQUIRED

La auditoría de masters + implementación confirma que NO existe una política suficiente para implementar saldo/retiro definitivo sin decidir producto.

Definido hoy:

```text
efectivo: seleccionado → presencial pendiente → proveedor confirma recepción → registrado/liberado
```

Además:

- efectivo nunca representa custodia electrónica UGO;
- cada obligación conserva bruto, comisión, neto, estado, fecha y referencia;
- saldo mostrado en UI no autoriza por sí solo un retiro;
- retiro/liberación/reembolso deben ser atómicos y auditables.

La UI/API esperan pero Supabase TEST todavía NO tiene:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Infraestructura existente:

- `pagos.ganancia_proveedor`;
- tabla `retiros`;
- lectura de retiros por Proveedor;
- `admin_actualizar_retiro(...)`;
- `ProviderPayoutPanel` con camino manual/legado y Mercado Pago Split como camino futuro principal.

Caso conflictivo real:

```text
servicio #28 = cancelado
método = efectivo
pago = pendiente
```

Siguen sin definición inequívoca:

1. qué estados de pago alimentan `saldo_disponible`;
2. cuándo un retiro pendiente/procesando compromete saldo;
3. qué ocurre con efectivo `pendiente` al cancelar servicio;
4. si retiro interno/manual queda como producto o sólo legado frente a Split;
5. semántica completa de cancelado/fallido/reembolsado/anulado.

**No implementar nuevos RPC, fórmula de saldo, enum ni semántica financiera hasta decisión explícita de producto.**

## HUGO · ESTADO ACTUAL

Se conserva el flujo canónico de voz/texto y el CI actual valida:

- voz y texto comparten estado;
- Gemini es camino canónico de transcripción browser;
- Firefox/browser sin SpeechRecognition usa audio grabado;
- salida usa Gemini TTS rápido con reproducción abortable/no bloqueante;
- STOP deja el compositor de texto utilizable;
- parser/confirmación/selección de proveedor usa datos reales;
- disponibilidad de proveedores comparte fuente de verdad con radar;
- Hugo no debe inventar proveedor, rating, precio, disponibilidad, pago o estado.

No hubo errores nuevos de Hugo en runtime durante la revisión más reciente; el único ruido observado fue una deprecación `url.parse()` en `/api/whatsapp/send` con HTTP 200.

```text
Hugo contracts: VALIDATED
Hugo físico/latencia/barge-in/micrófono real: MEASURED pendiente
```

## EVIDENCIA HISTÓRICA — NO USAR COMO NUEVO E2E

```text
#28 3558ce63-5216-4a58-beed-30febf0581ba · cancelado
#14 68ef8d25-b382-4e98-986a-21c510cc78f1 · completado histórico
```

No sustituyen la corrida NUEVA posterior al hardening de Storage/chat/tracking.

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
1. configurar de forma segura las 8 variables TEST del workflow fuera del repo
2. ejecutar Core CI con E2E autenticado habilitado
3. capturar serviceId/runId nuevo y comprobar 2 objetos reales en service-evidence
4. confirmar mismo serviceId/pago/chat/evidencias como Cliente, Proveedor y Admin
5. resolver explícitamente la política financiera mínima de producción
6. implementar saldo/retiro/reembolso sólo después de esa decisión
7. realizar pasada física en dos dispositivos
8. sólo después evaluar checklist de promoción comercial
```

Nunca tocar Supabase producción hasta autorización explícita de promoción.
