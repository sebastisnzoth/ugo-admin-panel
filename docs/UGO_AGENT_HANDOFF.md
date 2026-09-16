# UGO — Agent Handoff

**Actualizado:** 16 de septiembre de 2026  
**Estado:** UGO TEST en desarrollo; CI verde, runtime crítico aún pendiente  
**Rama única:** `main`

## Entorno

```text
Repo: sebastisnzoth/ugo-admin-panel
Supabase TEST: tmossnqfwfwjrtzwcbmm
Supabase PROD: FUERA DE ALCANCE
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
Desarrollo: /?app=development · público/read-only
```

No asumir que una publicación web vieja representa `main`.

## Madurez

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

## Checkpoint CI

Checkpoint funcional/test actual antes de esta sincronización documental:

```text
53d04bada63e69a3c19212cba206acd585edbd8a
test(provider): align offer recovery contracts
UGO Core CI run 35047491737 → SUCCESS
```

El fix funcional asociado está en `c3a414566becb81e90dde5dbec477eb31b8e7ec7` (`fix(sentinel): verify offer acceptance before P0`).

## Sentinel

Estado IMPLEMENTED + CI VALIDATED:

- `runtimeRevision` por build;
- build actual separado de incidentes históricos;
- sanitización de emails/teléfonos/links/metadata sensible;
- cola anónima local segura + flush autenticado;
- matching, cancelación, radar, status y ubicación Cliente observables;
- operaciones críticas Proveedor observables;
- clasificación server-side de acciones conocidas;
- incidentes runtime no mutan readiness.

Regla de recovery:

```text
RPC error
→ comprobar persistencia exacta
→ persistido = éxito recuperado, sin P0
→ fallo confirmado = P0
→ no verificable = P1
```

La aceptación de oferta ahora cumple esta regla y conserva el `serviceId` exacto. `provider.service.advance`, `completeService`, `confirmCash` y cancelación/matching Cliente deben conservar la misma semántica.

## Snapshot real TEST

Consulta read-only actual:

```text
3 proveedores verificados + online + disponibles
1 servicio con mensajes persistidos de ambos roles
0 servicios activos actuales
0 clientes con múltiples pedidos activos actuales
6 incidentes Sentinel públicos, todos sin runtimeRevision
```

Interpretación:

- hay proveedores reales TEST disponibles para el próximo smoke;
- DB demuestra chat en ambos sentidos, pero falta UI realtime dos sesiones;
- no hay evidencia runtime A+B+C actual;
- incidentes sin revisión son históricos, no del build candidato.

## Cliente

Canónico actual:

- pedidos simultáneos A+B+C permitidos;
- cada pedido mantiene `serviceId` propio;
- Home/Actividad/detalle abren el pedido exacto;
- cancelación usa recovery persistido;
- radar recupera estado ante gaps realtime;
- chat es service-scoped, realtime + refetch/reconnect;
- quick replies;
- filtro de contacto off-platform.

Contratos protegen el aislamiento A+B+C, pero falta E2E autenticado y dos sesiones reales.

## Proveedor

Happy path visible:

```text
Oferta
→ Aceptar
→ Estoy yendo
→ Llegué
→ Empezar trabajo
→ Listo
→ Cobro/cierre
```

Agenda debe contener todos los trabajos futuros/asignados. La misión activa puede seleccionar un `serviceId` accionable, pero nunca sustituir la Agenda completa.

Aceptación, estados, finalización y cobro no deben generar P0 hasta comprobar el estado persistido cuando una respuesta RPC es ambigua.

## Chat

P0 pendiente de evidencia runtime:

```text
Cliente → Proveedor visible realtime
Proveedor → Cliente visible realtime
reload/reconnect conserva historial
quick replies no mezclan serviceId
pedido A no contamina pedido B
contacto externo bloqueado
```

INSERT en DB por sí solo no valida chat. `CHAT-REALTIME` permanece `IMPLEMENTED`.

## Development

Mantener:

- `?app=development` sin login;
- read-only público;
- vistas sanitizadas;
- tablas privadas protegidas;
- revisión/build visible;
- incidentes actuales separados de históricos;
- Admin protegido.

Las vistas públicas responden en TEST; falta smoke de UI del build final.

## Android TEST

Artifact funcional más reciente:

```text
run: 35047317846
commit: c3a414566becb81e90dde5dbec477eb31b8e7ec7
conclusion: success
bundleRuntime: local-dist
environment: TEST
```

Incluye el fix funcional de aceptación. Todavía falta artifact del SHA final exacto después de documentación/checkpoint para entregar el candidato físico definitivo.

## Gates bloqueados

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promover sin evidencia real.

## Credenciales TEST

El runner de Core CI no tiene actualmente las seis credenciales TEST del harness autenticado Cliente/Proveedor/Admin. El skip se registra y no cuenta como runtime validation.

## Finanzas

Política definitiva de saldo/retiro sigue pendiente de decisión de producto. No inventar saldo disponible ni RPCs financieros sin contrato aprobado.

## NEXT

```text
1 generar artifact Android del SHA final exacto
2 instalarlo en dos sesiones/dispositivos
3 Cliente crea A+B+C y verifica cards/matching/cancelación
4 Proveedor acepta y completa lifecycle + Agenda
5 comprobar chat visual bidireccional/reconnect
6 pagos/rating/evidencia
7 publicar sólo cuando corresponda
```

**No tocar Supabase PROD. No crear ramas. No desplegar web para resolver trazabilidad de QA.**
