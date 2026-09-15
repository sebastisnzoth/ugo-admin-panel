# UGO — Agent Handoff

**Estado:** operativo en UGO TEST, todavía NO promovible a producción  
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

Cerrar únicamente los bloques que todavía impiden declarar UGO TEST listo para promoción:

1. E2E completo con **un único `serviceId`** hasta `completado`, incluyendo evidencia inicial y final con objetos reales en Storage;
2. resolver decisión financiera de saldo/retiros y cancelación con pago existente sin inventar política comercial;
3. prueba física humana de Hugo, cámara, GPS, tracking visual, Realtime en dos dispositivos, push y UX móvil;
4. habilitar credenciales aisladas TEST en GitHub Actions si se quiere convertir el E2E HTTP autenticado en gate obligatorio.

No reabrir P0 ya cerrados salvo regresión comprobada.

## LAST COMPLETED · TRACKING + CHAT CANÓNICO · 15/09/2026

### Problemas encontrados

- Supabase TEST ya tenía `actualizar_ubicacion_y_distancia(...)` y `obtener_tracking_servicio_cliente(...)`, pero la migración no estaba versionada en `main`.
- `ServiceChat.tsx` ya consumía la tabla canónica `public.mensajes`, pero un contrato viejo todavía esperaba `mensajes_servicio` y rompía CI #734.
- La policy de `public.mensajes` permitía a un participante fijar `emisor_rol` sin comprobar que coincidiera con su rol real.
- `authenticated` tenía UPDATE completo sobre `public.mensajes`, permitiendo mutabilidad de contenido además del recibo de lectura.
- Existía deuda histórica en repo alrededor de `mensajes_servicio`, aunque TEST usa solamente `public.mensajes`.

### Correcciones TEST

Migración aplicada en Supabase TEST:

```text
20260915001039 canonical_service_chat_hardening
```

Resultado:

- `public.mensajes` queda como única tabla canónica de chat;
- si existe `mensajes_servicio`, sus filas se migran una sola vez y la tabla legacy se elimina;
- `emisor_id` queda ligado a `auth.uid()`;
- `emisor_rol=cliente` exige ser el cliente del servicio;
- `emisor_rol=proveedor` exige ser el proveedor asignado;
- `emisor_rol=admin` exige `private.is_admin(auth.uid())`;
- `authenticated` conserva `SELECT` + `INSERT`;
- UPDATE de participantes queda restringido a `leido_at`.

Validación real TEST:

- Cliente intentando insertar un mensaje con `emisor_rol='admin'` → rechazado por RLS;
- Cliente insertando con `emisor_rol='cliente'` en su servicio → permitido;
- permisos de tabla de `authenticated`: sólo `SELECT` + `INSERT`;
- permiso de columna UPDATE: únicamente `leido_at`.

### Tracking reconciliado

Migración TEST existente:

```text
20260914234234 provider_client_tracking_rpcs
```

Fue recuperada y versionada en repo como:

```text
supabase/migrations/20260914234234_provider_client_tracking_rpcs.sql
```

Contratos:

- `actualizar_ubicacion_y_distancia(lat,lng,serviceId)` sólo puede ejecutar tracking como Proveedor autenticado;
- el `serviceId`, cuando existe, debe pertenecer a ese Proveedor y estar en estado operativo permitido;
- usa PostGIS con `POINT(lng lat)` y calcula distancia contra `servicios.ubicacion_cliente` o fallback a `perfiles_cliente.ubicacion`;
- `obtener_tracking_servicio_cliente(serviceId)` sólo entrega tracking al Cliente dueño del servicio.

Validación TEST:

- Proveedor autenticado puede actualizar su ubicación sin serviceId;
- intentar tracking sobre servicio de otro proveedor → `Servicio no asignado al proveedor`;
- Cliente TEST dueño del servicio #28 pudo leer proveedor, coordenadas proveedor/cliente y `provider_updated_at`;
- GPS físico sigue siendo `MEASURED` pendiente.

## COMMIT FUNCIONAL ACTUAL

```text
0e8ac7555c74d4a324499a09cbc681fbad11756b
fix(core): reconcile tracking and canonical chat
```

Incluye:

- `supabase/migrations/20260914234234_provider_client_tracking_rpcs.sql`;
- `supabase/migrations/20260915001039_canonical_service_chat_hardening.sql`;
- contratos actualizados de ServiceChat;
- nuevos contratos de tracking.

## CI

El commit anterior `fa3009b3...` tuvo CI #734 **failure** por un test stale que todavía exigía `mensajes_servicio`; build había pasado y el único fallo funcional del suite era ese contrato desactualizado.

Después de corregirlo:

```text
UGO Core CI #735
run: 34912250870
SHA: 0e8ac7555c74d4a324499a09cbc681fbad11756b
status: completed
conclusion: success
```

Pasaron build, TypeScript, tests core/contratos y lint del workflow.

## RELEASED

Vercel desplegó el SHA funcional exacto:

```text
deployment: dpl_BXNyW8m7uD5sMennj61TcCEqwFVo
SHA: 0e8ac7555c74d4a324499a09cbc681fbad11756b
state: READY
target: production del proyecto web UGO TEST
Node functions: 12
```

Smokes HTTP:

```text
/?app=client   → 200
/?app=provider → 200
/?app=admin    → 200
```

Supabase PRODUCCIÓN no fue tocado.

## REALTIME

TEST tiene publicación explícita para:

```text
servicios
ofertas_servicio
pagos
evidencias_servicio
ampliaciones_servicio
mensajes
disputas
disputa_mensajes
perfiles_proveedor
notificaciones
```

Los consumidores principales resyncan contra persistencia al reconectar; Realtime no es fuente de verdad paralela.

Estado:

```text
backend/config: VALIDATED
dos dispositivos reales sin refresh: MEASURED pendiente
```

## EVIDENCIAS / STORAGE

`service_evidence_storage_integrity_guard` permanece aplicado y versionado:

- una fila `evidencias_servicio` necesita objeto real en `storage.objects`;
- bucket canónico: `service-evidence`;
- path/ownership deben corresponder a usuario + `serviceId`;
- evidencia con path falso fue rechazada;
- harness de integración fue ajustado para subir objeto real antes de registrar fila.

Pendiente: nueva corrida E2E completa con evidencia inicial + final reales y el mismo `serviceId` hasta `completado`.

## HUGO · ESTADO CONSERVADO

Último P0 funcional Hugo:

```text
04d8dfa39b944bbfd81019473a1255fdbe418ca2
fix(hugo): make client voice flow responsive and interruptible
```

Preservar:

- voz/texto = mismo Draft;
- MediaRecorder → `/api/test` → Gemini;
- 422 sin voz = retry;
- parser mañana 10:00;
- confirmación natural e idempotente;
- selección + confirmación en un turno;
- comandos Inicio/Actividad/Cancelar;
- STOP aborta voz/TTS y deja composer de texto usable;
- sin `speechSynthesis`;
- TTS Gemini no bloquea el estado lógico;
- guided checkout y Hugo canónico no escuchan simultáneamente.

La mejora de latencia post-fix todavía NO es `MEASURED` hasta otra prueba física humana.

## E2E / EVIDENCIA HISTÓRICA ÚTIL

Servicio real de auditoría:

```text
serviceId: 3558ce63-5216-4a58-beed-30febf0581ba
service #: 28
cliente: Cliente TEST
proveedor: sebastianzothoficial
estado actual: cancelado
```

Ese servicio ya fue útil para validaciones de roles/tracking, pero NO reemplaza la corrida pendiente hasta `completado` con Storage real.

Servicio histórico completado:

```text
serviceId: 68ef8d25-b382-4e98-986a-21c510cc78f1
service #: 14
estado: completado
```

No usar evidencia histórica como sustituto de la corrida E2E nueva requerida.

## BLOCKED · FINANZAS

La UI actual todavía espera:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Ambos RPC están ausentes en Supabase TEST.

Infraestructura existente:

- `pagos` ya registra `ganancia_proveedor`, estados y métodos;
- `retiros` ya existe con estados `pendiente`, `procesando`, `pagado`, `fallido`;
- Provider puede leer sus retiros;
- Admin tiene `admin_actualizar_retiro(...)`;
- `ProviderPayoutPanel` presenta retiro manual/legado y Mercado Pago Split como camino futuro/principal cuando esté activo.

NO implementar todavía una fórmula nueva de saldo, retención, retiro, devolución o tratamiento financiero de cancelaciones sin decisión de producto explícita.

Decisiones pendientes:

1. mantener retiro interno/manual legado o esconderlo cuando Split sea el modelo elegido;
2. definir qué estado debe tomar un `pago` efectivo `pendiente` cuando el servicio se cancela antes de confirmación de cobro;
3. si se mantiene retiro interno, definir exactamente qué pagos alimentan `saldo_disponible` y qué retiros descuentan/comprometen saldo.

## BLOCKED · CREDENCIALES CI AISLADO

El workflow todavía no dispone de:

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

No guardar passwords en repo ni documentación. Los tests regulares saltan el E2E HTTP aislado cuando faltan secretos.

## MEASURED PENDIENTE · PRUEBA FÍSICA HUMANA

No marcar como `MEASURED` sin dispositivo real:

- micrófono / latencia Hugo / barge-in / STOP→texto;
- cámara y evidencia real desde teléfono;
- GPS real y tracking visual en movimiento;
- Cliente + Proveedor en dos dispositivos y Realtime sin refresh;
- Web Push real;
- safe area, teclado, overlays y UX táctil.

## NEXT

Orden recomendado:

```text
1. cerrar decisión financiera mínima
2. ejecutar E2E nuevo con un único serviceId + Storage real hasta completado
3. verificar Cliente/Proveedor/Admin sobre ese mismo serviceId
4. prueba física de dos dispositivos
5. sólo entonces preparar checklist de promoción
```

Nunca tocar Supabase producción hasta autorización explícita de promoción.
