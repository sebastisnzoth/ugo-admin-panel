# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Último checkpoint:** 15/09/2026  
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
7fed2b5511e4a66e946cce04f610addf7b9bf7cf
ci(android): resolve sdkmanager from runner SDK
```

Commits documentales posteriores pueden adelantar `main` con `[skip ci]` sin cambiar la base funcional.

### Core CI

```text
UGO Core CI #807
run: 34935021482
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
```

Gates verdes: audit, entorno TEST, TypeScript/build, tests, contratos, lint crítico, ClientApp lint y full lint.

### Android

```text
Build UGO Android APKs #14
run: 34935021499
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
```

Artefactos:

```text
UGO Cliente · com.ugo.client · 1.0.0 (1)
SHA-256 47a8396c543ddf27aa8225c34dc1553c435cf69d4fde1933584e002cb49144f9

UGO Proveedor · com.ugo.provider · 1.0.0 (1)
SHA-256 c0ca825d54f55131fa259b280f808d4ba2c6a52ce52d607b3766656bdd88a07a
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
- Actividad abre cada pedido por ID;
- cancelación requiere ID explícito + ownership;
- chat/tracking/pago/review/ampliaciones por ID;
- Hugo crea pedidos nuevos aunque existan activos y desambigua status/cancelación;
- disputas no seleccionan arbitrariamente el último servicio;
- Agenda Proveedor conserva trabajos futuros compatibles y abre por ID.

Auditoría Supabase TEST del checkpoint:

```text
servicios_cliente_estado_created_idx = NON-UNIQUE
servicios_cliente_request_draft_uidx = UNIQUE sólo para request_draft_id no vacío
single-active trigger = AUSENTE
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

Las seis credenciales humanas siguen ausentes en Core CI #807:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No inventar service IDs. Cuando existan las credenciales, la corrida debe demostrar A+B+C + cancelación selectiva + journey real Cliente↔Proveedor↔Admin, chat, pago y Storage.

## P0-3 · ANDROID / DOS CELULARES

Estado:

```text
APK Cliente: IMPLEMENTED
APK Proveedor: IMPLEMENTED
Gradle CI: VALIDATED
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

Deployment funcional verificado:

```text
dpl_HVdhqu99z16qmTNvoJYjUW1jrLyy
commit funcional: b2b0f753103520d7e5cbe4704e6322f11c5544b5
state: READY
alias: https://ugo-admin-panel.vercel.app
```

Smoke:

```text
/?app=client   HTTP 200
/?app=provider HTTP 200
/?app=admin    HTTP 200
```

Los commits posteriores a esa base funcional son pipeline Android/documentación y no requieren quemar otro deployment para declarar el frontend cambiado.

## Core cerrado salvo regresión

```text
Realtime recovery: VALIDATED
GPS/tracking backend: VALIDATED
chat canónico: VALIDATED
Storage integrity guard: VALIDATED
RLS/RPC críticos: VALIDATED
SECURITY DEFINER críticos + negativos TEST: VALIDATED
Android debug build: VALIDATED
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

**Supabase PRODUCCIÓN `trfsjuseqjxlhrxuvdsm` NO FUE TOCADO.**
