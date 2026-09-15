# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Último checkpoint:** 15/09/2026  
**Principio:** **Un pedido. Un profesional. Sin vueltas.**

## Objetivo

Llevar UGO desde TEST operativo hasta producción comercial real con Cliente + Proveedor + Admin compartiendo un único `serviceId`, estado, evidencias y realidad financiera.

UGO no se considera terminado por una demo, build verde o deploy `READY`. Producción exige dinero trazable, seguridad, prueba física, soporte operativo y recuperación ante fallos.

## Invariantes vigentes

```text
borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

- un único `serviceId` durante todo el journey;
- `asignado → en_camino` requiere forma de pago habilitada;
- llegada es backend-authoritative cuando aplica geofence; radio operativo 200 m;
- evidencia `Antes` real antes de iniciar;
- evidencia `Después` real antes de cierre/revisión;
- ampliación conserva descripción + costo + tiempo + aprobación + trazabilidad;
- efectivo pendiente no permite entrar en revisión;
- Cliente, Proveedor y Admin convergen al mismo estado persistido;
- Realtime rehidrata persistencia, no crea segunda verdad;
- Hugo no inventa datos;
- Supabase PROD `trfsjuseqjxlhrxuvdsm` no se usa para pruebas.

## HEAD / CI actual

HEAD documental actual después de sincronizar masters:

```text
0a655944b3fa968e503d1dbf59b6d2341dde8f4d
docs(handoff): sync main CI and e2e readiness
```

Base funcional/CI:

```text
2d585734b8428e80831d0ea7f2184c7253def1bc
ci(e2e): align core test target and report credential readiness
```

Cliente pre-Stitch restaurado:

```text
442d772e30a20a8b7725bcfbc329eb663ac2e789
revert(client-ui): restore pre-Stitch client experience
```

Último CI completamente confirmado antes de los commits documentales:

```text
UGO Core CI #761
run: 34925210746
SHA: 2d585734b8428e80831d0ea7f2184c7253def1bc
conclusion: success
```

El CI confirmó dependency audit, preflight E2E, TypeScript/build, tests y lints.

## P0-1 · E2E autenticado nuevo

Estado:

```text
IMPLEMENTED
VALIDATED pendiente
```

Harness:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Variables que conoce el harness:

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

En Core CI, URL + publishable key de UGO TEST son públicas y están fijadas en workflow. Faltan/son externas al repo las 6 credenciales humanas Cliente/Proveedor/Admin, que deben vivir en GitHub Secrets.

Una corrida válida debe crear servicio NUEVO y probar sobre el mismo `serviceId`:

```text
Cliente crea
→ matching
→ Proveedor recibe/acepta
→ Cliente + Admin ven mismo servicio
→ chat Cliente↔Proveedor
→ Admin audita chat
→ pago
→ en_camino
→ llegado
→ upload REAL Antes
→ en_progreso
→ ampliación
→ upload REAL Después
→ confirmar pago
→ aprobar Cliente
→ completado
→ Cliente/Proveedor/Admin convergen
```

Debe producir evidencia verificable:

```text
serviceId nuevo
runId nuevo
2 objetos reales en service-evidence
chat real
pago real TEST
estado completado
lectura convergente de 3 roles
```

No reutilizar:

```text
#14 68ef8d25-b382-4e98-986a-21c510cc78f1
#28 3558ce63-5216-4a58-beed-30febf0581ba
```

## P0-2 · Finanzas

Estado:

```text
BLOCKED — PRODUCT DECISION REQUIRED
```

No implementar todavía:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Pendiente definir:

- pagos que forman saldo disponible;
- momento en que `ganancia_proveedor` queda disponible;
- reserva por retiro pendiente/procesando;
- prevención de doble retiro;
- efectivo pendiente en servicio cancelado;
- semántica cancelado/fallido/reembolsado/anulado;
- retiro manual vs Mercado Pago Split;
- conciliación definitiva.

Invariante ya definido:

> dinero de servicio incompleto/cancelado no puede transformarse accidentalmente en saldo retirable.

Caso real TEST a conservar como referencia:

```text
servicio #28 = cancelado
método = efectivo
pago = pendiente
```

Se permite detectar inconsistencias y agregar tests de invariantes ya decididos. No inventar fórmula financiera.

## P0-3 · Prueba física en dos celulares

Estado:

```text
PREPARAR
MEASURED pendiente
```

Cliente:

```text
login
pedir servicio
Hugo voz/texto
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
iniciar
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

No marcar `MEASURED` sin dispositivo real.

## Core ya cerrado salvo regresión

```text
Realtime recovery: VALIDATED
GPS/tracking backend: VALIDATED
chat canónico: VALIDATED
Storage integrity guard: VALIDATED
RLS/RPC críticos: VALIDATED
SECURITY DEFINER guards críticos + negativos TEST: VALIDATED
Hugo contracts: VALIDATED
```

No reabrir auditorías completas sin regresión demostrable.

## P1 · UX operativa

Después de E2E/prueba física preparada:

### Cliente

Reducir a:

```text
Qué necesitás → dónde/cuándo → confirmar → encontrar profesional
```

Feedback siempre real:

```text
buscando profesionales
cantidad real disponible
ofertas recibidas
profesional asignado
estado actual
siguiente acción
```

Hugo es atajo/conversación, no única forma de operar.

### Proveedor

Active Job debe comportarse como misión:

```text
Problema → siguiente acción → mapa → evidencia → chat → terminar
```

Regla: **menos diálogo, más solución.**

### Admin

Inbox Operativo único:

```text
KYC pendiente
disputas
pagos/conciliaciones
servicios atascados
alertas críticas
```

Orden: severidad + antigüedad.

## P2 · Seguridad producción

Pendientes reales:

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

Una función `admin_*` no se convierte automáticamente en `SECURITY DEFINER`. Sólo cuando necesite privilegio elevado y valide internamente identidad, rol, activo, ownership y permiso específico.

## P3 · Deuda técnica

No priorizar antes de E2E:

```text
React Router
monorepo
dividir ClientGuidedRequest
dividir ProviderOnboardingGate
reescritura Admin
limpieza total CSS
nueva capa Stitch
rediseño completo
migraciones arquitectónicas grandes
```

Después de estabilizar: dividir monolitos, reducir `as any`, regenerar tipos, unificar design system y evaluar router/monorepo.

No reescribir frontend desde cero.

## Vercel TEST

El estado cliente pre-Stitch restaurado por `442d772e...` obtuvo Vercel `READY`.

```text
https://ugo-admin-panel.vercel.app
```

Los commits posteriores `2d585734...`, `48b1fb4...` y `0a655944...` son CI/documentación; no representan cambio funcional de frontend/backend.

Supabase PRODUCCIÓN no fue tocado.

## Criterio de salida a producción comercial

UGO sólo puede promoverse cuando:

- CI del SHA candidato esté verde;
- deploy candidato esté `READY`;
- E2E autenticado Cliente/Proveedor/Admin esté verde con nuevo `serviceId`;
- prueba física en dos dispositivos esté `MEASURED`;
- Admin vea/opere la misma realidad;
- dinero/comisión/cancelación/reembolso/retiro estén definidos, implementados y auditables;
- secretos, permisos, backups, logs, monitoreo y rollback estén preparados;
- soporte, disputas y privacidad/LGPD tengan flujo operativo;
- no quede P0 de seguridad, dinero, integridad o continuidad.

## Próximo checkpoint

```text
1. verificar CI del HEAD documental final
2. si existen las 6 credenciales humanas TEST, ejecutar E2E autenticado
3. si faltan, mantener BLOCKED y no inventarlas
4. preparar prueba física dos celulares sin marcar MEASURED
5. mantener finanzas BLOCKED hasta decisión explícita
6. después avanzar UX operativa sin refactor grande
```

Hasta entonces: **TEST avanzado + backend core fuerte; producción comercial todavía no autorizada.**
