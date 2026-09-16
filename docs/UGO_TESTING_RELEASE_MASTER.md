# UGO — Testing & Release Master

**Versión:** 3.1 · 16 de septiembre de 2026  
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
SHA: 53d04bada63e69a3c19212cba206acd585edbd8a
commit: test(provider): align offer recovery contracts
UGO Core CI run: 35047491737
conclusion: success
```

Pasaron instalación reproducible, security gate, TypeScript/build, **301 tests/contratos**, lints críticos, lint Cliente y reporte global de deuda lint. Los E2E autenticados quedan omitidos cuando faltan sus credenciales TEST; ese skip no equivale a runtime validation.

El cambio funcional inmediatamente anterior es:

```text
c3a414566becb81e90dde5dbec477eb31b8e7ec7
fix(sentinel): verify offer acceptance before P0
```

Corrige la última ruta detectada donde una aceptación podía convertirse en P0 si el RPC fallaba y la verificación posterior también era ilegible. Ahora la reconciliación es triestado y ligada al pedido exacto.

## 4. Regla Sentinel para mutaciones críticas

Aplicar a matching, cancelación, aceptación, lifecycle, cierre y cobro:

```text
RPC devuelve error
→ verificar estado persistido exacto
→ éxito persistido: éxito recuperado, SIN P0
→ fallo persistido confirmado: P0
→ persistencia no verificable: P1
```

En el código actual esta regla cubre aceptación de oferta, `provider.service.advance`, `completeService`, `confirmCash`, matching y cancelación Cliente.

## 5. Readiness / Development

Contratos CI actuales mantienen:

- `?app=development` sin `AdminGate`;
- lectura pública sólo desde feeds sanitizados;
- tablas/evidencia privadas protegidas;
- feed público sin serviceId, stack, metadata privada ni reporter IDs;
- build actual separado de histórico por `runtimeRevision`;
- Centinela no muta checklist;
- clasificación server-side de acciones conocidas.

Snapshot TEST actual: 27 items públicos, 80 eventos públicos y 6 incidentes públicos. Los 6 incidentes existentes tienen `runtime_revision = NULL`; son históricos/no atribuibles al build candidato y no deben bloquearlo como incidentes actuales.

## 6. Evidencia runtime disponible y límites

Consulta read-only de Supabase TEST:

```text
3 proveedores verificados + online + disponibles
1 servicio con mensajes persistidos de Cliente y Proveedor
0 servicios activos actualmente
0 clientes con 2+ pedidos activos actualmente
```

Por lo tanto:

- disponibilidad real de proveedores: evidencia DB presente;
- chat bidireccional: evidencia de persistencia DB presente, **no** evidencia visual realtime en dos sesiones;
- A+B+C: sólo contratos, **sin** evidencia runtime actual;
- lifecycle completo: pendiente de sesión/dispositivo.

## 7. Multi-pedido A+B+C

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

El repo contiene contratos que protegen aislamiento A/B/C; falta evidencia E2E autenticada/física.

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

Persistencia DB no sustituye convergencia visual en ambas sesiones. `CHAT-REALTIME` debe permanecer `IMPLEMENTED` hasta esa evidencia.

## 9. Matching / radar / cancelación

Probar proveedor disponible, cero proveedores, timeout, offline/error, retry y cancelación exacta con varios pedidos. No se acepta loading infinito.

El radar actual tiene recuperación ante gaps realtime; TEST reporta tres proveedores verificados online/disponibles y la UI debe demostrar que los refleja sin falsos online/offline.

## 10. Proveedor / Agenda

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

## 11. Android TEST

Artifact funcional más reciente:

```text
workflow run: 35047317846
commit: c3a414566becb81e90dde5dbec477eb31b8e7ec7
conclusion: success
bundleRuntime: local-dist
environment: TEST
```

Ese APK contiene el fix funcional de aceptación, pero no los contratos/documentación posteriores. Antes de la prueba física final debe generarse un artifact del **SHA final exacto** y verificarse que `VITE_APP_REVISION` coincide.

Compilar ≠ probar: el artifact debe instalarse y pasar dos sesiones/dispositivos.

## 12. Prueba física

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
rating
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

## 13. Credenciales del E2E aislado

El runner actual no dispone de las seis credenciales TEST necesarias para el harness autenticado Cliente/Proveedor/Admin. El Core CI registra el skip; no debe interpretarse como PASS runtime.

## 14. Gates bloqueados

Hasta evidencia real:

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promoverlos por contratos, persistencia aislada o compilación.

## 15. Publicación

La publicación web puede quedar detrás de `main`. No disparar deploy para documentación, para conseguir un SHA de APK ni para sustituir QA Android. Un release exige revisión exacta, smoke y rollback/mitigación.

## 16. Definition of Done

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

## 17. Regla final

**UGO está validado por evidencia, no por intención. CI verde habilita el siguiente gate; no reemplaza la prueba runtime.**

**Supabase PROD permanece fuera de alcance.**
