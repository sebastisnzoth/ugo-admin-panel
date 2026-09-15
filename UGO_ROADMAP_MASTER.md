# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Principio:** los MD maestros son fuente de verdad; Skills definen cómo trabajar; herramientas conectadas ejecutan y validan.  
**Último checkpoint:** 15/09/2026.

## Objetivo de producto

**Objetivo final no negociable: PRODUCCIÓN COMERCIAL REAL.**

UGO no se considera terminado por tener una demo, un deploy `READY`, un build verde ni un backend funcional. El objetivo es operar comercialmente con clientes y proveedores reales, dinero real, comisión UGO trazable, seguridad, soporte operativo y capacidad de recuperación ante fallos.

Cerrar un ecosistema operativo Cliente + Proveedor + Admin/Super Admin con lifecycle único, pagos trazables, evidencia temporal correcta, ampliaciones dentro de plataforma, Realtime, UX consistente y release reproducible.

Pregunta permanente de producto:

> **¿Qué impide hoy que mañana un cliente real pague, un proveedor real trabaje, UGO cobre su comisión y todo quede seguro, trazable y recuperable?**

Toda prioridad P0/P1 debe responder a esa pregunta. TEST, demo e inversores son hitos intermedios; no son el objetivo final.

## Definición de producción comercial

UGO alcanza producción comercial cuando, sin intervención manual excepcional del equipo técnico:

- un Cliente real puede registrarse, pedir y pagar un servicio;
- un Proveedor real puede registrarse, ponerse disponible, recibir, aceptar, ejecutar y cobrar;
- UGO registra y concilia su comisión correctamente;
- Cliente, Proveedor y Admin comparten el mismo `serviceId`, estado y realidad financiera;
- cancelaciones, reembolsos, disputas, retiros y excepciones tienen reglas definidas y auditables;
- cámara, GPS, Storage, voz y Realtime funcionan en dispositivos reales;
- secretos, RLS, permisos, backups, logs, auditoría y límites operativos son adecuados para producción;
- CI/E2E protegen el release y existe rollback/recovery razonable;
- términos operativos, privacidad/LGPD, soporte y tratamiento de incidentes están definidos;
- no queda ningún P0 de seguridad, dinero, integridad o continuidad operativa abierto.

## Contrato transversal vigente

`borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado`

Excepciones: `cancelado`, `disputado`.

Invariantes:

- un único `serviceId` durante todo el journey;
- `asignado → en_camino` requiere pago electrónico protegido/verificable o efectivo explícitamente seleccionado;
- llegada es backend-authoritative cuando aplica ubicación exacta; radio operativo 200 m;
- evidencia `Antes` antes de iniciar y evidencia `Después` antes de cierre/revisión;
- ampliación conserva descripción + costo + tiempo + aprobación + trazabilidad financiera;
- efectivo es presencial y auditable: si el pago efectivo sigue pendiente, el servicio **no puede** entrar en `esperando_aprobacion`;
- Cliente, Proveedor y Admin convergen al mismo estado persistido;
- Realtime rehidrata persistencia, no crea una segunda verdad;
- Hugo no inventa disponibilidad, estado, precio, dinero ni permisos;
- producción Supabase `trfsjuseqjxlhrxuvdsm` no se usa para pruebas destructivas.

## Estado por bloques

### 1. Cliente · journey principal — AVANZADO

- Home / Radar / Mapa / Categorías / Búsqueda migrados al design system.
- Hugo es entrada conversacional principal y voz/texto comparten contexto.
- Categorías salen del catálogo live.
- Disponibilidad de profesionales y tarjetas comparten `providerRadarStore`.
- Voz fuerza refresh live con `refreshProviderRadar(sb,true)` antes de anunciar disponibilidad.
- Creación, matching, cancelación, seguimiento, pago, aprobación, historial y disputas conectados a backend.
- Matching no encierra al Cliente: existen salida en background, retry y cancelación persistida.
- Realtime crítico re-sincroniza estado persistido tras reconnect/online/visibility.

**Pendiente de dispositivo:** cámara, GPS, permisos de micrófono/voz, Firefox/móvil y UX táctil real.

### 2. Proveedor · mercado y perfil — AVANZADO

- Online/offline, oportunidades, demanda, agenda, trabajo activo, historial, perfil e ingresos conectados.
- Oportunidades se consumen por RPC redactado antes de asignación; no exponen la fila completa del servicio.
- Aceptación es server-authoritative e idempotente.
- Proveedor no puede mantener asignaciones activas incompatibles.
- Radar/demanda usan geografía backend real.
- Realtime de oportunidades/servicios/pagos rehidrata persistencia.
- Perfil y configuración multirubro fueron incorporados en `main`; validar su recorrido visual junto con la prueba física.

### 3. Proveedor · ejecución del servicio — BACKEND HISTÓRICO CERRADO / NUEVO E2E PREPARADO / DISPOSITIVO PENDIENTE

El 14/09/2026 se ejecutó una corrida real DB/RPC/RLS en UGO TEST con identidades TEST y un único servicio:

```text
serviceId: 68ef8d25-b382-4e98-986a-21c510cc78f1
servicio: #14
oferta: 068b6cc3-a19e-45f2-a3a1-73014e682e92
pago: 875d5b2f-d050-4aa5-96a2-d9da6e611ce2
ampliación: ae661e88-b1a1-4f14-b8d5-5d51f708d3c2
resultado: completado
```

Validado en esa corrida:

- solicitud Cliente y matching dirigido;
- privacidad pre-asignación;
- oportunidad redactada para Proveedor;
- aceptación + retry idempotente;
- gate de pago antes de `en_camino`;
- `en_camino → llegado`;
- rechazo de inicio sin evidencia `Antes`;
- inicio con evidencia `Antes`;
- ampliación sólo resoluble por Cliente;
- actualización consistente de tarifa/pago a BRL 130, comisión BRL 19,50 y ganancia BRL 110,50;
- rechazo de confirmación de efectivo sin evidencia `Después`;
- evidencia final;
- rechazo de revisión antes de recepción del efectivo;
- confirmación de efectivo idempotente;
- aprobación final exclusiva del Cliente;
- cierre `completado` visible de forma convergente por Cliente, Proveedor y Admin.

La corrida histórica no sustituye la nueva validación requerida después del endurecimiento de Storage/chat/tracking.

El harness actual ya está **IMPLEMENTED** para una nueva corrida única Cliente ↔ Proveedor ↔ Admin con:

- el mismo `serviceId` durante todo el lifecycle;
- chat canónico Cliente/Proveedor y auditoría Admin;
- dos uploads reales a `service-evidence` (`antes` + `despues`);
- pago, ampliación, idempotencia y cierre;
- verificación final del mismo servicio, pago y evidencias desde Admin;
- preservación auditada del fixture en TEST mediante `metadata.integration_test` + `e2e_run_id`.

Ese nuevo E2E todavía NO está `VALIDATED`: GitHub Actions no dispone de las credenciales TEST necesarias para ejecutarlo autenticado.

### 4. Admin / Super Admin — AVANZADO

- Operaciones, usuarios, finanzas, validación, configuración y disputas existen.
- Admin TEST fue reconocido por `private.is_admin(...)` y pudo leer el mismo `serviceId` y pago del E2E histórico final.
- El harness nuevo exige una tercera identidad Admin/Super Admin real y verifica servicio, chat, pago y evidencias sobre el mismo `serviceId`.
- Queda ejecutar esa corrida autenticada nueva y validar en UI física las acciones operativas y journeys de excepción.

### 5. Backend / Supabase TEST — P0 CORE VALIDADO

UGO TEST: `tmossnqfwfwjrtzwcbmm`.

- Auth, PostgreSQL, RPCs, RLS, Realtime y pagos forman la autoridad del lifecycle.
- `20260913005000_auxiliary_tables_rls_hardening.sql` fue aplicada el 14/09/2026.
- Se verificó RLS activo en las 13 tablas auxiliares cubiertas: `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos`, `whatsapp_notificaciones`.
- El E2E real detectó drift del orden de cierre en efectivo: con evidencia final se podía intentar `en_progreso → esperando_aprobacion` antes de cobrar.
- Se restauró el invariante con `20260914202500_restore_cash_review_ordering_guard.sql`, aplicado en UGO TEST.
- `tests/contracts/cash-review-ordering-restore.test.mjs` evita que ese guard vuelva a desaparecer del repo.
- Producción no fue modificada.

#### Seguridad SECURITY DEFINER · VALIDATED EN TEST

Los 15 warnings actuales de funciones `SECURITY DEFINER` expuestas a `authenticated` fueron revisados función por función. Los privilegios elevados son intencionales donde el RPC necesita operar sobre autoridad backend, y los guards internos de identidad/rol/ownership se conservaron.

Negativos transaccionales reales en TEST confirmaron:

- usuario Cliente no puede ejecutar `admin_get_auth_users()`;
- usuario Proveedor no puede ejecutar `admin_get_auth_users()`;
- Cliente ajeno no puede leer tracking de otro servicio;
- Proveedor no puede iniciar matching dirigido sobre servicio ajeno.

`anon` no tiene EXECUTE sobre los RPC críticos revisados.

**Pendiente antes de producción:** leaked-password protection y cualquier advisor restante que represente riesgo real, sin romper funciones privilegiadas intencionales.

### 6. QA / Release — CI VERDE / E2E LOGIN BLOQUEADO POR SECRETS

Último SHA funcional/contractual validado antes del handoff documental:

```text
936fc9361a95b87acfc4fcd52fcb28d495b811a4
```

CI autoritativo:

```text
UGO Core CI #742
run: 34922540607
conclusion: success
```

Pasaron:

- npm install reproducible;
- `npm audit --audit-level=high` sin vulnerabilidades;
- TEST environment guard;
- build + TypeScript;
- 198 tests;
- critical operational lint;
- ClientApp lint;
- full repository lint.

Vercel desplegó ese SHA como `READY`:

```text
deployment: dpl_3Ghrdg8it7GmnDC7JVxPkYvLCSGW
alias: https://ugo-admin-panel.vercel.app
```

El workflow Core CI ya referencia las ocho variables requeridas para el E2E autenticado, incluida la identidad Admin. En GitHub Actions hoy están ausentes, por lo que la integración se omite de forma explícita y segura en vez de tocar otro entorno.

El harness rechaza una URL de Supabase que no sea el TEST designado y los contratos verifican que producción sea bloqueada antes de cualquier intento de red.

La rama `main` debe evolucionar hacia protección con checks obligatorios antes de promoción comercial.

## Finanzas · BLOCKED POR DECISIÓN DE PRODUCTO

Antes de implementar saldo/retiros definitivos faltan decisiones inequívocas sobre:

- estados que alimentan saldo disponible;
- momento en que retiro pendiente/procesando compromete saldo;
- tratamiento de efectivo pendiente si un servicio se cancela;
- retiro manual interno vs Mercado Pago Split;
- semántica final de cancelado/fallido/reembolsado/anulado.

Los RPC esperados por UI siguen ausentes de Supabase TEST:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

No inventar estos contratos hasta decisión explícita de producto.

## Próximo checkpoint

**P0 actual: PRODUCTION COMMERCIAL READINESS.**

No optimizar para “tener una demo”. Cerrar lo ejecutable y separar claramente bloqueos externos/decisiones de producto:

1. configurar en GitHub Actions las 8 variables TEST requeridas, sin guardarlas en el repositorio;
2. ejecutar el E2E nuevo completo con un único `serviceId`, dos objetos reales Storage y cierre hasta `completado`;
3. verificar Cliente/Proveedor/Admin sobre ese mismo `serviceId`, chat, evidencias y realidad financiera;
4. resolver explícitamente la política financiera mínima: comisión, saldo/retiros, cancelación, reembolso y conciliación;
5. implementar y probar finanzas sólo después de esa decisión;
6. probar en dos dispositivos reales: Realtime sin refresh, reconnect/background, cámara, GPS/tracking, voz/Hugo, push y UX móvil;
7. cerrar seguridad de producción, protección de `main`, observabilidad, backups y procedimiento de rollback;
8. cerrar onboarding, soporte, disputas, privacidad/LGPD y operación comercial;
9. ejecutar un piloto controlado completo antes de apertura progresiva;
10. sólo con todos los gates verdes preparar y autorizar promoción a producción real.

## Bloqueo externo restante

GitHub Actions no tiene configuradas actualmente las ocho variables que necesita el harness nuevo:

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

Nunca guardar esos valores en código, commits o documentación pública.

También queda pendiente una decisión de producto explícita sobre el modelo financiero de producción antes de implementar saldo/retiro/reembolso definitivo.

## Criterio de salida de TEST hacia producción comercial

UGO TEST sólo puede promoverse cuando:

- CI del SHA candidato está verde y los checks de `main` son obligatorios;
- deploy candidato está `READY`;
- E2E aislado con login real Cliente/Proveedor/Admin está verde;
- Cliente + Proveedor completan el journey en dispositivos reales;
- Admin observa/opera el mismo servicio y la misma realidad financiera;
- cámara/GPS/Storage/voz/Push y Realtime funcionan en dispositivo;
- dinero real, comisión, cancelación, reembolso y retiro tienen reglas implementadas y auditables;
- secretos, RLS, permisos, backups, logs, monitoreo y rollback están preparados;
- soporte, disputas, privacidad/LGPD e incidentes tienen un flujo operativo definido;
- no queda un P0 de seguridad, dinero, integridad o continuidad operativa abierto.

Hasta entonces: **TEST avanzado y backend core fuerte; el objetivo sigue siendo PRODUCCIÓN COMERCIAL REAL.**
