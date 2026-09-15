# UGO — Testing & Release Master

**Versión:** 2.6 · 15 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama de integración:** `main`

> `IMPLEMENTED ≠ VALIDATED ≠ MEASURED ≠ RELEASED`. Cada tramo crítico debe demostrar estado real, permisos reales y recuperación real.

---

# 1. Quality Gates

```text
L0 TypeScript/Lint
→ L1 Contract tests / UX states
→ L2 Domain/RPC/API
→ L3 RLS/roles/Storage
→ L4 Integration/Realtime/Pagos/Mapas
→ L5 E2E Cliente↔Proveedor↔Admin
→ L6 Dispositivo físico
→ L7 Deploy/Smoke/Rollback readiness
```

No declarar `VALIDATED`, `MEASURED` ni `RELEASED` sin evidencia de ejecución correspondiente.

---

# 2. Scripts y gates actuales

```text
npm run build      ✅ disponible
npm run lint       ✅ disponible
npm run test       ✅ disponible
npm run test:e2e   ⬜ no es el gate autoritativo actual
```

`npm test` incluye contratos y el harness de integración aislado. El harness real está en:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Ese harness sólo se habilita cuando existen estas 8 variables:

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

Con `UGO_REQUIRE_ISOLATED_INTEGRATION=1`, la ausencia de variables debe fallar el gate. Sin ese modo, el caso remoto puede quedar explícitamente omitido.

El harness rechaza cualquier Supabase que no sea el TEST designado `tmossnqfwfwjrtzwcbmm` y rechaza explícitamente producción `trfsjuseqjxlhrxuvdsm` antes de ejecutar el recorrido.

En `UGO Core CI`, la URL y la publishable/anon key públicas de UGO TEST están fijadas en el workflow; las 6 credenciales humanas Cliente/Proveedor/Admin se leen exclusivamente desde GitHub Secrets. Nunca guardar passwords en repo, commits, docs o logs.

---

# 3. E2E autenticado autoritativo

Una corrida válida debe crear un servicio NUEVO y conservar un único `serviceId` de punta a punta:

```text
Cliente autenticado
→ crea servicio
→ matching dirigido
→ Proveedor recibe oportunidad redactada
→ Proveedor acepta
→ Cliente + Admin observan el mismo servicio
→ chat Cliente↔Proveedor en public.mensajes
→ Admin audita el mismo chat
→ selección de pago
→ en_camino
→ llegado
→ evidencia REAL antes en Storage
→ en_progreso
→ ampliación si corresponde
→ evidencia REAL después en Storage
→ confirmación de pago
→ revisión/aprobación Cliente
→ completado
→ Cliente + Proveedor + Admin convergen al mismo estado
→ Admin observa pago + chat + evidencias del mismo serviceId
```

Bucket canónico:

```text
service-evidence
```

La evidencia E2E debe ser objeto real de Supabase Storage. Insertar sólo metadata/path no cuenta como evidencia y el guard debe rechazarlo.

El harness actual sube dos PNG reales (`antes`, `despues`) y comprueba que una evidencia con path inventado sea rechazada.

El fixture E2E queda preservado en TEST para auditoría con metadata:

```text
integration_test = true
source = rpc-rls-harness
e2e_run_id = <uuid>
preserve_e2e_evidence = true
```

No se debe borrar sólo Storage dejando filas de evidencia huérfanas.

---

# 4. Cobertura contractual vigente

Los contratos actuales protegen, entre otros:

```text
radio de llegada backend = 200 m
evidencia Antes/Durante/Después según lifecycle
guards de inicio/finalización
efectivo presencial
orden efectivo: en_progreso → Después → confirmar_pago_efectivo → esperando_aprobacion → aprobar_servicio
checkout separado para delta de ampliación
idempotency/external_reference de ajuste
validación de monto antes de incorporar delta
review Cliente con ownership + proveedor asignado
producción rechazada por el harness antes de red
credenciales Admin requeridas en el E2E de 3 roles
Storage real requerido para evidencia del E2E
```

Contrato verde no sustituye ejecución remota autenticada.

---

# 5. Pagos electrónicos

Probar selección, creación, autorización, webhook, retención/protección, retry, duplicados, liberación, reembolso/disputa y ampliación financiada.

Aserción: ningún servicio avanza por condición financiera inexistente.

La política financiera de saldo/retiro definitiva sigue bloqueada por decisión de producto. No inventar `saldo_proveedor()` ni `solicitar_retiro(...)` mientras esa política siga ambigua.

---

# 6. Efectivo

Probar selección, habilitación, copy correcto, confirmación Proveedor, duplicado, registro financiero, comisión/ledger, cierre Cliente y disputa sin promesa de reembolso automático.

Aserción: efectivo nunca se describe como electrónicamente protegido.

Orden ejecutable:

```text
en_progreso
→ evidencia Después
→ confirmar_pago_efectivo
→ esperando_aprobacion
→ aprobar_servicio
```

Pedir revisión antes de confirmar efectivo debe fallar. Repetir confirmación debe devolver el mismo pago sin nuevos importes, referencias o timestamps.

Un servicio cancelado/incompleto nunca debe convertirse accidentalmente en saldo retirable. La regla exacta de saldo/retiro permanece BLOCKED hasta definición financiera explícita.

---

# 7. Llegada + evidencia

```text
pago no habilitado → no en_camino
pago habilitado → en_camino
>200 m → llegado rechazado cuando aplica geofence
<=200 m → llegado permitido
llegado sin Antes → inicio rechazado
llegado + Antes real en Storage → inicio permitido
Antes fuera de llegado → rechazado
Durante fuera de en_progreso → rechazado
Después antes de en_progreso → rechazado
en_progreso + Después real → cierre elegible según método
```

---

# 8. Ampliaciones + dinero

```text
extra 0 → aprobable
sin pago + extra → total antes del checkout
efectivo pendiente + extra → reajuste consistente
pago fallido/reembolsado → siguiente intento ajustado
electrónico activo + extra → checkout separado
checkout pendiente → reutilizable
approved monto/moneda válidos → incorpora una vez
mismatch → no incorpora
rechazado/cancelado → retry
webhook duplicado → sin doble incremento
refunded después de aplicado → pendiente_ajuste + bloqueo cierre
actor no Cliente → denegado
```

Resolver una ampliación ya resuelta debe rechazarse. Los retries idempotentes válidos deben conservar el mismo estado persistido.

---

# 9. Admin / Super Admin

El E2E autoritativo usa una tercera identidad Admin/Super Admin real y exige:

```text
Admin activo
rol admin/superadmin real
lectura del mismo serviceId
lectura del chat del mismo serviceId
lectura del pago final del mismo serviceId
lectura de las dos evidencias reales del mismo serviceId
```

Query params/UI nunca escalan privilegios.

Para endpoints Admin privilegiados:

```text
sin Bearer → 401
sesión inválida → 401
usuario no admin → 403
admin/super activo → respuesta autorizada
respuesta nunca contiene secretos
```

Una función `admin_*` no debe convertirse automáticamente en `SECURITY DEFINER`; sólo cuando necesite privilegio elevado y con validación interna de identidad/rol/activo/ownership/permisos.

---

# 10. RLS / RPC / SECURITY DEFINER

Por cada tabla/bucket sensible:

```text
autorizado → permitido
no participante → denegado
anónimo → denegado salvo público explícito
admin → privilegio real y justificado
```

Los guards críticos `SECURITY DEFINER` ya fueron revisados con negativos reales en UGO TEST. No reabrir esa auditoría completa salvo regresión demostrable.

Pendientes de producción: leaked-password protection y cualquier advisor que represente riesgo real.

---

# 11. Concurrencia e idempotencia

Probar doble aceptación, doble click, doble webhook, doble efectivo, doble checkout/confirmación de ampliación, doble cierre/retiro y retry tras timeout.

Reaceptar la misma oferta por el mismo Proveedor es un retry idempotente: debe devolver el mismo servicio sin reasignar ni recalcular.

Errores de red, Auth, RPC ausente o queries RLS fallidas no cuentan como denegaciones de dominio válidas.

---

# 12. Realtime

Validar evento correcto, ausencia de duplicados, cleanup, reconexión/refetch, cambio de usuario/serviceId y convergencia al mismo estado persistido.

Backend/recovery ya está `VALIDATED`; la convergencia visual Cliente↔Proveedor en dos celulares sigue `MEASURED` pendiente.

---

# 13. Prueba física obligatoria

No marcar `MEASURED` sin dispositivo real.

Cliente:

```text
login
pedido
Hugo voz
Hugo texto
categorías/proveedores reales
matching
tarjeta proveedor
cancelación
seguimiento
chat
pago
revisión
historial
```

Proveedor:

```text
login
online/offline
oportunidad
aceptar/rechazar
trabajo activo
mapa
en_camino
llegada
GPS
cámara
evidencia Antes
iniciar trabajo
chat
ampliación
evidencia Después
cierre
ingreso visible
```

Dos dispositivos:

```text
Realtime sin refresh
reconnect
background/foreground
GPS caminando
cámara
Storage
push
Hugo micrófono
barge-in
STOP
fallback texto
teclado
safe areas
overlays
botones táctiles
```

---

# 14. Responsive + accesibilidad

Breakpoints mínimos: `360×800`, `390×844`, `430×932`, tablet, `1280`, `1440`.

Objetivo WCAG AA: foco visible, teclado, labels/aria, contraste, estado no sólo color, targets ≥48 px, errores accionables.

---

# 15. CI actual

`UGO Core CI` ejecuta:

```text
npm ci --include=dev
npm audit --audit-level=high
preflight de credenciales E2E
npm run build
npm test
lint crítico operacional
lint ClientApp con deuda legacy registrada aislada
lint general como reporte de deuda
```

Estado verificado el 15/09/2026:

```text
UGO Core CI #761
run: 34925210746
SHA: 2d585734b8428e80831d0ea7f2184c7253def1bc
status: completed
conclusion: success
```

La metadata del job confirma que pasaron:

- dependency security gate;
- preflight de credenciales;
- TypeScript + build;
- core lifecycle/market/integration tests;
- lint crítico;
- ClientApp lint;
- lint general.

No marcar el nuevo E2E autenticado como `VALIDATED` hasta tener evidencia positiva de una corrida que produzca un `serviceId` NUEVO + `runId` + dos objetos Storage reales + chat/pago/cierre convergentes en los 3 roles.

---

# 16. Vercel / Smoke

Release funcional exige deploy/smoke verificable; CI verde no sustituye Vercel `READY`.

Smoke mínimo:

```text
landing
?app=client
?app=provider
?app=admin
Auth
Supabase data
/api/admin/integrations-status
API pagos crítica
```

El cliente pre-Stitch fue restaurado en `main` mediante `442d772e30a20a8b7725bcfbc329eb663ac2e789`; ese estado obtuvo CI verde y deployment Vercel `READY` antes del ajuste posterior exclusivo de CI.

Cambios sólo documentales/CI no deben interpretarse como nuevo release funcional de frontend/backend.

---

# 17. Severidad

```text
P0 seguridad · datos · auth · dinero · core roto
P1 flujo principal degradado · integración/Realtime/UX crítico
P2 secundaria · consistencia · escala
P3 polish
```

No release comercial con P0 conocido.

---

# 18. Definition of Done

```text
contrato definido
UI/UX compatible
persistencia correcta
RLS/RPC correcto
método de pago correcto
happy/error/offline
build/lint/npm test
RPC/RLS/E2E cuando aplican
integraciones seguras y observables
CI/deploy/smoke
prueba física cuando aplica
rollback evaluado
maestros + roadmap actualizados
```

---

# 19. Release checklist

```text
[ ] main esperado
[ ] build
[ ] lint
[ ] npm test
[ ] E2E autenticado aplicable
[ ] serviceId/runId nuevo preservado
[ ] 2 objetos reales service-evidence
[ ] mismo chat/pago/evidencias en Cliente/Proveedor/Admin
[ ] permisos/RLS
[ ] concurrencia/idempotencia
[ ] pagos method-aware
[ ] ampliaciones financiadas
[ ] Realtime/reconexión
[ ] integraciones Admin sin secretos
[ ] prueba física dos dispositivos
[ ] mobile/desktop/accesibilidad
[ ] CI
[ ] Vercel READY
[ ] smoke
[ ] rollback
[ ] maestros
[ ] roadmap
```

---

# 20. Regla final

**UGO está listo cuando el circuito real y sus integraciones funcionan, resisten errores, preservan integridad y pueden demostrarse; no porque exista código o se vea bien.**
