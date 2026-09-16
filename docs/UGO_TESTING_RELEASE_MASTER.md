# UGO — Testing & Release Master

**Versión:** 2.9 · 16 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama única:** `main`

> La evidencia se atribuye siempre al SHA y entorno exactos.

## 1. Madurez canónica

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

Un paso no sustituye al siguiente.

## 2. Quality Gates

```text
L0 TypeScript/build/lint
L1 contract tests / estados UX
L2 dominio/RPC/API
L3 RLS/roles/Storage
L4 Integration/Realtime/pagos/mapas
L5 E2E Cliente↔Proveedor↔Admin + multi-pedido A+B+C
L6 dispositivo físico Android Cliente↔Proveedor
L7 publicación/smoke/rollback
```

## 3. Gates del repo

```bash
npm run build
npm test
npm run lint
```

`UGO Core CI` agrega instalación reproducible, audit de dependencias, guard de entorno TEST, contratos y lint operacional.

CI verde de otro SHA no sirve como evidencia para HEAD actual.

## 4. Recuperación CI del bloque Centinela/Development

Checkpoint que expuso la regresión contractual:

```text
SHA: 19c6dcddd2410b063e0d4171cd2178b95da47ef3
run: 35040842854
conclusion: failure
```

La falla no estaba en el comportamiento de llegada del proveedor. `providerService` pasó a publicar geolocalización con `serviceId` para mantener el reporte Centinela ligado al servicio exacto, mientras `provider-arrival-location.test.mjs` todavía exigía la firma anterior sin `serviceId`.

Corrección integrada:

```text
SHA: a633575034dbdaa10d8499b2cbf2a542c646d7b1
commit: test(provider): keep arrival location contract service-scoped
run: 35042238358
status: completed
conclusion: success
```

En ese SHA pasaron instalación, security gate, TypeScript/build, suite de lifecycle/contracts y lints operacionales. Por lo tanto `a633575…` es el checkpoint **CI VALIDATED** para el código funcional que contiene Development público + Centinela.

Los E2E autenticados que dependen de credenciales TEST siguen siendo un gate separado cuando esas credenciales están disponibles; CI verde no se convierte por sí solo en `RUNTIME VALIDATED`.

## 5. Readiness / Development Dashboard

Gates contractuales ya cubiertos por el checkpoint CI verde:

- `?app=development` abre sin `AdminGate`;
- lectura pública sólo desde feeds sanitizados;
- tablas/evidencia privadas siguen protegidas;
- feed público no expone serviceId, stack, metadata privada ni reporter IDs;
- Centinela diferencia build actual/histórico;
- Centinela no muta checklist;
- acciones core se clasifican server-side.

Estado: **CI VALIDATED** en `a633575…`; falta smoke/runtime TEST para promover a `RUNTIME VALIDATED`.

## 6. E2E autenticado

Harness canónico:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Una corrida válida crea datos nuevos en Supabase TEST y conserva cada `serviceId` durante el journey.

Nunca ejecutar el harness contra Supabase PROD.

## 7. Multi-pedido A+B+C

Caso mínimo:

```text
A = Electricista · mañana 15:00
B = Plomero · hoy
C = Limpieza · viernes 10:00
```

Debe demostrar:

```text
crear A
crear B sin terminar A
crear C sin terminar A/B
IDs distintos
Actividad A+B+C
abrir cada uno por serviceId
cancelar B
A intacto
C intacto
```

Chat, tracking, pago, evidencia, ampliación y disputa deben conservar independencia por `serviceId`.

## 8. Chat P0

Con dos sesiones reales:

```text
Cliente → Proveedor realtime
Proveedor → Cliente realtime
reload/reconnect → historial persistido
quick replies → correcto serviceId
contacto off-platform → bloqueado
servicio A ≠ chat servicio B
```

Persistencia DB de un mensaje no sustituye convergencia visual en ambas sesiones.

## 9. Matching / cancelación

Probar:

- proveedor disponible;
- cero proveedores;
- timeout;
- offline/error;
- retry;
- cancelación durante búsqueda;
- cancelación exacta con varios pedidos.

No se acepta loading infinito.

## 10. Proveedor / Agenda

```text
AGENDA = múltiples trabajos futuros
MISIÓN ACTIVA = serviceId concreto accionable
```

Lifecycle visible:

```text
Aceptar
→ Estoy yendo
→ Llegué/fallback
→ Empezar trabajo
→ Listo
```

El backend conserva guards de pago/evidencia/estado.

## 11. Pagos / evidencia

Probar método electrónico y efectivo por separado, idempotencia/retry/webhook, ampliaciones con costo y cierre.

Evidencia válida requiere objeto real de Storage, ownership y timing correctos.

## 12. RLS / RPC

Por tabla/bucket sensible:

```text
autorizado → permitido
no participante → denegado
anónimo → denegado salvo lectura pública explícita y sanitizada
admin → privilegio justificado
```

La excepción del dashboard Desarrollo no amplía permisos sobre tablas privadas.

## 13. Centinela runtime

Probar:

- incidente P0 de Cliente y Proveedor;
- sanitización de contacto/secretos;
- `runtimeRevision` correcto;
- incidente histórico no contado como actual;
- cola anónima segura + flush;
- clasificación server-side;
- cero mutación automática del readiness.

## 14. Android TEST

Contrato de QA:

```text
bundleRuntime = local-dist
UI = dist del SHA del workflow
API base = backend TEST publicado
sin server.url remoto
CapacitorHttp activo cuando aplica
```

El artifact debe incluir metadata del commit y la verificación debe confirmar que el bundle contiene la revisión esperada.

La APK no pasa a `RUNTIME VALIDATED` por compilar: debe instalarse y probarse en dispositivo.

## 15. Prueba física

Cliente:

```text
login
A+B+C
Actividad
cancelación selectiva
matching/recovery
chat
tracking
pago
revisión
```

Proveedor:

```text
login
online/offline
oportunidad
aceptar/rechazar
Agenda
serviceId correcto
GPS
en camino/llegada
cámara Antes/Después
chat
cierre
```

Dos dispositivos: Realtime, reconnect, background/foreground, GPS, Storage, micrófono/Hugo, teclado/safe areas.

## 16. Publicación web

Publicación es deliberada y puede quedar detrás de `main`.

Un release web exige:

```text
revisión exacta identificada
estado READY equivalente
smoke Cliente/Proveedor/Admin/Desarrollo aplicable
backend esperado
rollback/mitigación
```

No disparar deploy para un cambio puramente documental ni afirmar que el alias actual contiene HEAD sin verificar la revisión.

La ruta de hosting retirada no forma parte del release activo.

## 17. Severidad

```text
P0 seguridad/datos/auth/dinero/core
P1 flujo principal degradado/realtime/UX crítico
P2 secundaria/consistencia
P3 polish
```

No release comercial con P0 conocido.

## 18. Definition of Done

```text
contrato definido
IMPLEMENTED en main
CI VALIDATED exact SHA
RUNTIME VALIDATED cuando aplica
persistencia/serviceId/RLS correctos
happy + error/offline/retry
hardware cuando aplica
maestros + roadmap sincronizados
PUBLISHED sólo con revisión/smoke identificados
```

## 19. Regla final

**UGO está validado por evidencia, no por intención. CI verde habilita el siguiente gate; no reemplaza la prueba runtime. Si `main` avanzó después de una publicación, esa publicación no representa `main`.**

**Supabase PROD `trfsjuseqjxlhrxuvdsm` permanece fuera de alcance.**
