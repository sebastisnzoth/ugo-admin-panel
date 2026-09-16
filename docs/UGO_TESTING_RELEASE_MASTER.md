# UGO — Testing & Release Master

**Versión:** 3.0 · 16 de septiembre de 2026  
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

## 3. Checkpoint CI actual

```text
SHA: 51561b8aa632d74b755e8072a00d59e415097fae
commit: test(client): align cancellation recovery contract
UGO Core CI run: 35046419173
conclusion: success
```

El fallo inmediatamente anterior era contractual: el test de cancelación todavía exigía `getStatus`, mientras la implementación ya usa lectura persistida directa para reconciliar una respuesta RPC perdida sin generar falsos P0. Se corrigió el contrato; no se degradó la lógica correcta.

Los E2E autenticados que dependen de credenciales TEST son un gate separado. Si se omiten por credenciales ausentes, CI verde no equivale a `RUNTIME VALIDATED`.

## 4. Regla Sentinel para mutaciones críticas

Aplicar a matching, cancelación, aceptación, lifecycle, cierre y cobro:

```text
RPC devuelve error
→ verificar estado persistido exacto
→ éxito persistido: éxito recuperado, SIN P0
→ fallo persistido confirmado: P0
→ persistencia no verificable: P1
```

`provider.service.advance`, `completeService`, `confirmCash` y cancelación/matching Cliente siguen este criterio en el código actual.

## 5. Readiness / Development

Contratos CI actuales mantienen:

- `?app=development` sin `AdminGate`;
- lectura pública sólo desde feeds sanitizados;
- tablas/evidencia privadas protegidas;
- feed público sin serviceId, stack, metadata privada ni reporter IDs;
- build actual separado de histórico por `runtimeRevision`;
- Centinela no muta checklist;
- clasificación server-side de acciones conocidas.

Falta smoke runtime TEST para promover.

## 6. Multi-pedido A+B+C

Debe demostrarse con datos TEST reales:

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

El repo ya contiene contratos que protegen aislamiento A/B/C; falta evidencia E2E autenticada/física.

## 7. Chat P0

Con dos sesiones reales:

```text
Cliente → Proveedor realtime
Proveedor → Cliente realtime
reload/reconnect → historial persistido
quick replies → correcto serviceId
contacto off-platform → bloqueado
servicio A ≠ chat servicio B
```

Persistencia DB no sustituye convergencia visual en ambas sesiones.

## 8. Matching / radar / cancelación

Probar proveedor disponible, cero proveedores, timeout, offline/error, retry y cancelación exacta con varios pedidos. No se acepta loading infinito.

El radar actual tiene recuperación ante gaps realtime; debe probarse contra disponibilidad real de TEST.

## 9. Proveedor / Agenda

```text
AGENDA = todos los trabajos futuros/asignados
MISIÓN ACTIVA = serviceId concreto accionable
```

Lifecycle visible:

```text
Aceptar
→ Estoy yendo
→ Llegué
→ Empezar trabajo
→ Listo
→ Cobro/cierre
```

No usar una selección única de misión activa para ocultar trabajos futuros de Agenda.

## 10. Android TEST

Último artifact inspeccionado:

```text
workflow run: 35044762155
commit: 8c0123bd9d221ec6d09a4cd2f4a83f6a2ed9d800
artifact: ugo-android-test-apk
artifact id: 10425674680
artifact digest: sha256:c53e57e44557b420ce7fb217325d8086a251f2e9f2d545e020b0dc37c9d8d982
APK SHA-256: 329f74e50217f13d92322dba103513c86170a0bca5bfc30fc93fe389674e3df4
bundleRuntime: local-dist
environment: TEST
```

Ese APK corresponde al último cambio de runtime Cliente `8c0123b…`, pero no al HEAD exacto `51561b8…`. Los commits posteriores contienen clasificación server-side y tests/contratos. Por trazabilidad estricta, Android queda **NOT READY para evidencia final del HEAD** hasta existir artifact del SHA objetivo.

Compilar ≠ probar: el artifact debe instalarse y pasar dos sesiones/dispositivos.

## 11. Prueba física

Cliente:

```text
login
A+B+C
Actividad
cancelación selectiva
matching/radar/recovery
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
Agenda completa
serviceId correcto
GPS
en camino/llegada
chat
cierre/cobro
```

Dos sesiones/dispositivos: Realtime, reconnect, background/foreground y aislamiento entre pedidos.

## 12. Gates bloqueados

Hasta evidencia real:

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promoverlos por contratos, persistencia aislada o compilación.

## 13. Publicación

La publicación web puede quedar detrás de `main`. No disparar deploy para documentación, para conseguir un SHA de APK ni para sustituir QA Android. Un release exige revisión exacta, smoke y rollback/mitigación.

## 14. Definition of Done

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

## 15. Regla final

**UGO está validado por evidencia, no por intención. CI verde habilita el siguiente gate; no reemplaza la prueba runtime.**

**Supabase PROD permanece fuera de alcance.**
