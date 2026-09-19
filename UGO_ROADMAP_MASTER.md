# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Último checkpoint:** 18/09/2026  
**Principio:** **Un pedido. Un profesional. Sin vueltas.**

## Objetivo

Llevar UGO desde TEST operativo hasta producción comercial real con Cliente + Proveedor + Admin compartiendo la misma realidad persistida por `serviceId`, con múltiples pedidos independientes por cliente, Android instalable, seguridad, dinero trazable y prueba física.

UGO no se considera terminado por una demo, build verde o deploy `READY`.

## Invariantes vigentes

```text
borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

- un único `serviceId` durante cada journey;
- un cliente puede tener múltiples journeys simultáneos;
- un pedido nunca sobrescribe otro pedido del mismo cliente;
- cancelación, chat, tracking, pago, evidencia, ampliación y disputa pertenecen al `serviceId` concreto;
- proveedor puede conservar varios trabajos futuros no solapados en Agenda;
- Realtime rehidrata persistencia, no crea segunda verdad;
- Hugo no inventa datos ni infiere arbitrariamente “el último pedido”;
- Supabase PROD `trfsjuseqjxlhrxuvdsm` no se usa para pruebas.

## BASE FUNCIONAL / CI AUTORITATIVA

```text
5d827021cfa87e4d21aecd50326ab9d90a83136b
fix(client-ui): load desktop shell hardening last
```

Commits documentales posteriores con `[skip ci]` pueden adelantar `main` sin cambiar esta base funcional.

### Core CI

```text
UGO Core CI #1337
run: 35417306630 · attempt 2
SHA: 5d827021cfa87e4d21aecd50326ab9d90a83136b
conclusion: success
```

Gates verdes: dependency audit, entorno TEST, TypeScript/build, tests, contratos, lint crítico incluyendo Hugo canónico, ClientApp lint y full lint.

El E2E autenticado real sigue omitido porque faltan las 6 credenciales humanas TEST.

### Android actual

Nativo canónico:

```text
Build UGO Android APKs #14
run: 34935021499
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
```

No hubo cambios posteriores en `android-apk/`; estos wrappers cargan el Web TEST actual.

Artefactos:

```text
UGO Cliente · com.ugo.client · 1.0.0 (1)
SHA-256 47a8396c543ddf27aa8225c34dc1553c435cf69d4fde1933584e002cb49144f9

UGO Proveedor · com.ugo.provider · 1.0.0 (1)
SHA-256 c0ca825d54f55131fa259b280f808d4ba2c6a52ce52d607b3766656bdd88a07a
```

QA current-head:

```text
UGO Android TEST APK #5
run: 34937373061
SHA: 097ad6e89d08b5d0999f9d7e96ab6821e67239be
conclusion: success
```

## P0-1 · MÚLTIPLES PEDIDOS A+B+C

Estado:

```text
IMPLEMENTED
VALIDATED real: BLOCKED — missing TEST credentials
```

Objetivo de validación:

```text
A Electricista mañana 15:00
B Plomero hoy
C Limpieza viernes 10:00
```

Los tres deben coexistir con IDs distintos. Cancelar B debe dejar A y C intactos.

Implementado y protegido por contratos:

- backend TEST sin restricción global de un activo por cliente;
- idempotencia por `request_draft_id` del mismo draft;
- Cliente puede volver a Inicio y crear otro pedido;
- matching puede continuar en background;
- Actividad abre cada pedido por ID;
- cancelación requiere ID explícito + ownership;
- chat/tracking/pago/review/ampliaciones por ID;
- Hugo crea pedidos nuevos aunque existan activos y desambigua status/cancelación;
- Hugo canónico quedó tipado y cubierto por lint crítico;
- superficies de voz legacy fueron retiradas para evitar dobles fuentes de verdad;
- disputas no seleccionan arbitrariamente el último servicio;
- Agenda Proveedor conserva trabajos futuros compatibles y abre por ID.

Auditoría directa Supabase TEST del 15/09/2026:

```text
servicios_cliente_estado_created_idx = PRESENTE · NON-UNIQUE
servicios_cliente_request_draft_uidx = PRESENTE · UNIQUE sólo para cliente_id + request_draft_id no vacío
servicios_cliente_single_active_uidx = AUSENTE
trg_guard_single_active_client_service = AUSENTE
trg_sync_service_schedule_canonical = PRESENTE
```

## P0-2 · E2E AUTENTICADO 3 ROLES

Estado:

```text
IMPLEMENTED
BLOCKED — missing GitHub TEST credentials
```

Harness:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Credenciales humanas ausentes:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No inventar service IDs. Cuando existan las credenciales, la corrida debe demostrar A+B+C, cancelación selectiva y journey Cliente↔Proveedor↔Admin con chat, pago y Storage reales.

## P0-3 · ANDROID / DOS CELULARES

Estado:

```text
APK Cliente: IMPLEMENTED
APK Proveedor: IMPLEMENTED
Gradle nativo CI: VALIDATED
APK QA current-head: VALIDATED
prueba física: MEASURED pendiente
```

Ruta móvil canónica: `android-apk/`.

La prueba física debe cubrir:

```text
Cliente: login → A → B → C → Actividad → cancelar sólo B → Hugo → chat → Realtime
Proveedor: login → online → oportunidad → aceptar → Agenda → trabajo correcto → GPS → cámara Antes → iniciar → chat → Después → finalizar
Admin: mismo serviceId/estado/chat/evidencias/pago
```

Además: reconnect, background/foreground, micrófono, STOP/fallback texto, teclado, safe areas y Storage real.

No marcar `MEASURED` sin dos dispositivos físicos.

## P0-4 · FINANZAS

Estado:

```text
BLOCKED — PRODUCT DECISION REQUIRED
```

No implementar todavía:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Pendiente definir saldo disponible, liberación, reserva de retiros, doble retiro, efectivo cancelado, reembolso/anulación, Mercado Pago Split y conciliación.

Invariante ya decidido: dinero de servicio incompleto/cancelado no puede convertirse accidentalmente en saldo retirable.

## VERCEL TEST

Deployment del HEAD funcional actual:

```text
deployment: dpl_BdANPVwqFmVk9iVhwwbkr1bjA2UC
commit: 5d827021cfa87e4d21aecd50326ab9d90a83136b
state: READY
alias: https://ugo-admin-panel.vercel.app
aliasError: null
```

Smoke verificado:

```text
/?app=client   HTTP 200
/?app=provider HTTP 200
/?app=admin    HTTP 200
```

## Core cerrado salvo regresión

```text
multi-pedido estructural: IMPLEMENTED
Hugo multi-pedido contracts: VALIDATED por CI
Realtime recovery: VALIDATED
GPS/tracking backend: VALIDATED
chat canónico: VALIDATED
Storage integrity guard: VALIDATED
RLS/RPC críticos: VALIDATED
SECURITY DEFINER críticos + negativos TEST: VALIDATED
Android native debug build: VALIDATED
Android QA current-head: VALIDATED
Vercel current HEAD: RELEASED a TEST
```

## P1 · UX operativa

### Cliente

```text
Qué necesitás → dónde/cuándo → confirmar → encontrar profesional
```

Debe poder repetir el flujo para nuevos pedidos sin bloquear los anteriores.

### Proveedor

Active Job como misión:

```text
Problema → siguiente acción → mapa → evidencia → chat → terminar
```

Regla: **menos diálogo, más solución.**

Agenda separa trabajos futuros de la misión activa.

Flujo efectivo validado por contrato/CI:

```text
Proveedor: TRABAJO LISTO
→ Cliente confirma el trabajo
→ UGO muestra monto en efectivo
→ Cliente toca YA PAGUÉ
→ pago liberado/registrado
→ servicio completado
→ proveedor recibe “El cliente pagó”
```

La RPC canónica `confirmar_pago_efectivo_cliente(serviceId)` está aplicada en Supabase TEST. El proveedor no confirma el efectivo desde su app.

### Admin

Inbox operativo prioritario:

```text
KYC pendiente
disputas
pagos/conciliaciones
servicios atascados
alertas críticas
```

## P2 · Seguridad producción

Pendientes:

```text
MFA Admin
leaked password protection
api/* privilegiadas: Bearer/Auth/ownership/rol
rate limit
secrets
auditoría
backups
observabilidad
rollback
protección de main
```

No promover comercialmente con estos riesgos abiertos.

## P3 · Deuda técnica

No priorizar antes de E2E/prueba física:

```text
React Router
monorepo
reescritura Admin
limpieza CSS total
Stitch
rediseño completo
migraciones arquitectónicas grandes
```

No reescribir frontend desde cero.

## Criterio de salida a producción comercial

UGO sólo puede promoverse cuando:

- CI del candidato esté verde;
- deploy candidato esté `READY`;
- A+B+C autenticado esté `VALIDATED` con IDs reales;
- journey Cliente/Proveedor/Admin real esté verde;
- prueba física dos Android esté `MEASURED`;
- dinero/comisión/cancelación/reembolso/retiro estén definidos y auditables;
- seguridad, secrets, backups, logs, monitoreo y rollback estén preparados;
- no quede P0 de integridad, seguridad, dinero o continuidad.

## Próximo checkpoint

```text
1. si aparecen las 6 credenciales TEST, ejecutar E2E A+B+C y registrar IDs reales
2. instalar las APK Cliente/Proveedor en dos Android físicos y ejecutar el runbook
3. corregir cualquier bug reproducible y volver a Core CI + Android build
4. mantener finanzas BLOCKED hasta decisión explícita
5. mantener PROD fuera de alcance
```

No queda un P0 técnico automatizable conocido fuera de los bloqueos externos y la evidencia física pendiente.

**Supabase PRODUCCIÓN `trfsjuseqjxlhrxuvdsm` NO FUE TOCADO.**