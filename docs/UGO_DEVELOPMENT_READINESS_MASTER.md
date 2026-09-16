# UGO — Development Readiness Master

**Versión:** 1.2 · 16 de septiembre de 2026  
**Objetivo:** una sola verdad medible para llegar al primer cliente real.  
**Fuente privada/autorizada:** `public.development_checklist` en UGO TEST.  
**Panel público:** `/?app=development`.

## 1. Regla principal

El checklist se actualiza en el mismo bloque en el que cambia la realidad del producto.

```text
código integrado                    → implemented
prueba técnica aplicable superada   → validated
prueba/aceptación requerida superada→ approved
prueba falla                         → failed
trabajo activo                       → in_progress
bloqueo externo comprobado           → blocked
```

Sólo `approved` cuenta en el porcentaje de preparación verificada.

## 2. Relación con la madurez de release

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

El checklist y el release no son exactamente la misma máquina:

- `implemented` refleja existencia en `main`;
- `validated` refleja la validación técnica exigida por ese item;
- `approved` exige el criterio de aceptación final de ese item, normalmente runtime/E2E cuando corresponde;
- `PUBLISHED` debe demostrarse por un item de release específico o por evidencia de release; no se infiere desde `approved`.

## 3. Checkpoint de evidencia actual

Checkpoint CI funcional/test que supersede al anterior:

```text
53d04bada63e69a3c19212cba206acd585edbd8a
UGO Core CI run 35047491737 → SUCCESS
```

Cambio funcional asociado:

```text
c3a414566becb81e90dde5dbec477eb31b8e7ec7
fix(sentinel): verify offer acceptance before P0
```

La aceptación de oferta del Proveedor usa recuperación triestado: persistencia confirmada = éxito recuperado; ausencia confirmada = P0; persistencia no verificable = P1. No se aprueba ningún item runtime por este cambio de código/CI.

## 4. Panel Desarrollo público

Durante desarrollo, `/?app=development` es **público, sin login y read-only**.

El frontend público sólo consume proyecciones sanitizadas:

```text
development_checklist_public
development_checklist_events_public
development_incidents_public
+ señal realtime no sensible
```

Las tablas base, evidencia completa, actor de cambio, stack, metadata privada, reporter IDs y `serviceId` de incidentes no se exponen públicamente.

Público significa “observable”, no “editable”. La mutación del readiness continúa protegida.

Snapshot directo en Supabase TEST:

```text
27 filas checklist público
80 eventos públicos
6 incidentes públicos
6/6 incidentes con runtimeRevision NULL
```

Esos incidentes son históricos/no atribuibles al build candidato y no deben bloquearlo como incidentes del build actual.

## 5. Centinela / Sentinel

Centinela sirve para detectar regresiones reales en UGO TEST.

Contrato:

- cada runtime lleva `runtimeRevision`;
- dashboard distingue `BUILD ACTUAL` de incidentes históricos;
- mensajes/stack/metadata se sanitizan antes de persistir/reportar;
- emails, teléfonos, links y claves privadas no deben filtrarse al feed público;
- fallos anónimos seguros pueden quedar en una cola local limitada y enviarse después;
- acciones core instrumentadas se clasifican server-side;
- Cliente: matching, cancelación, status y persistencia de ubicación son observables;
- Proveedor: aceptación, transiciones, cierre y cobro críticos son observables;
- para mutaciones ambiguas, un P0 sólo se registra después de comprobar que el cambio no quedó persistido; estado no verificable = P1.

**Centinela nunca muta `development_checklist` ni convierte un incidente resuelto en `approved`.** La observabilidad aporta evidencia; la aceptación sigue el contrato del item.

## 6. Evidencia runtime actual

Consulta read-only en Supabase TEST:

```text
proveedores verificados + online + disponibles = 3
servicios con mensajes persistidos de Cliente y Proveedor = 1
servicios activos actuales = 0
clientes con 2+ pedidos activos actuales = 0
```

Esto permite afirmar disponibilidad backend y persistencia bidireccional de al menos un chat. No permite afirmar convergencia visual realtime, A+B+C actual ni lifecycle completo.

## 7. Evidencia

No marcar `approved` porque exista:

- una pantalla;
- un commit;
- un build;
- un test de otro SHA;
- un HTTP 200;
- un deploy viejo;
- un INSERT aislado de chat;
- un APK que todavía no fue probado físicamente.

La evidencia debe identificar el resultado comprobable: SHA/run CI, dispositivo, rol/cuenta TEST, `serviceId` cuando es privado/autorizado, consulta persistida, smoke o E2E.

## 8. Porcentaje

```text
sum(weight de approved) / sum(weight total) × 100
```

`implemented`, `validated` o `in_progress` no inflan el porcentaje.

## 9. Prioridad

`P0` impide atender correctamente al primer cliente real o compromete seguridad, identidad, datos, dinero o integridad.

```text
failed P0
→ in_progress P0
→ implemented/validated P0 sin aprobación requerida
→ blocked P0
→ pending P0
→ P1/P2/P3
```

## 10. P0 chat

No está cerrado hasta demostrar con dos sesiones reales y el mismo `serviceId`:

1. Cliente → Proveedor realtime.
2. Proveedor → Cliente realtime.
3. reconnect/reload rehidrata historial.
4. respuestas rápidas funcionan en ambas superficies.
5. teléfonos, WhatsApp, emails, links y otros datos de contacto se bloquean antes de enviar/persistir.
6. no se mezclan mensajes entre servicios.

`CHAT-REALTIME` permanece `implemented` hasta completar esta prueba. Que existan mensajes DB de ambos roles no cambia ese estado por sí solo.

## 11. P0 multi-pedido

Caso mínimo:

```text
A Electricista
B Plomero sin cerrar A
C Limpieza sin cerrar A/B
```

Debe demostrar IDs distintos, Actividad A+B+C, apertura por `serviceId`, cancelación selectiva de B y A/C intactos. El snapshot actual tiene cero servicios activos, por lo que no existe evidencia runtime A+B+C vigente.

## 12. Matching

`Buscando` no puede ser estado terminal visual. Debe existir recuperación para sin proveedor, timeout/error/offline, retry y cancelar.

TEST tiene actualmente tres proveedores verificados/online/disponibles; el próximo smoke debe demostrar que Cliente los refleja correctamente y que no presenta offline como online.

## 13. Gates bloqueados

Se mantienen sin promoción:

```text
TWO-DEVICES = blocked
FULL-E2E = blocked
GO-LIVE = blocked
```

Además, el harness autenticado de CI no dispone actualmente de las seis credenciales TEST Cliente/Proveedor/Admin; los tests dependientes quedan omitidos y no constituyen runtime validation.

## 14. Gate final

`GO-LIVE` sólo puede ser `approved` cuando:

- no quedan P0 necesarios en `pending`, `in_progress`, `implemented`, `validated` sin aceptación requerida, `failed` o `blocked`;
- Cliente ↔ Proveedor ↔ Admin se probó con evidencia real;
- chat, matching, cancelación, pago/lifecycle y multi-pedido aplicables convergen;
- seguridad/release requeridos están cerrados.

## 15. Regla de reporte

Toda respuesta sobre avance distingue:

```text
avance verificado = approved ponderado
implementado sin validar
CI validado sin runtime
runtime validado sin publicar
bloqueos P0
publicación actual por revisión
```

No sustituirlo por porcentaje subjetivo.
