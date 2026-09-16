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

Último SHA de código/test validado antes de esta sincronización documental:

```text
51561b8aa632d74b755e8072a00d59e415097fae
test(client): align cancellation recovery contract
UGO Core CI run 35046419173 → SUCCESS
```

La corrección alineó el contrato de cancelación con la reconciliación persistida actual. No se revirtió la lógica de recovery.

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
→ comprobar persistencia
→ persistido = éxito recuperado, sin P0
→ fallo confirmado = P0
→ no verificable = P1
```

`provider.service.advance`, `completeService`, `confirmCash` y cancelación/matching Cliente deben conservar esta semántica.

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

Las mutaciones críticas deben verificar persistencia antes de registrar P0.

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

INSERT en DB por sí solo no valida chat.

## Development

Mantener:

- `?app=development` sin login;
- read-only público;
- vistas sanitizadas;
- tablas privadas protegidas;
- revisión/build visible;
- incidentes actuales separados de históricos;
- Admin protegido.

Falta smoke runtime TEST para promoción.

## Android TEST

Último artifact inspeccionado:

```text
run: 35044762155
commit: 8c0123bd9d221ec6d09a4cd2f4a83f6a2ed9d800
artifact: ugo-android-test-apk
artifact id: 10425674680
APK SHA-256: 329f74e50217f13d92322dba103513c86170a0bca5bfc30fc93fe389674e3df4
bundleRuntime: local-dist
environment: TEST
```

Es el último APK del cambio runtime Cliente, pero no corresponde al HEAD exacto `51561b8…`; por trazabilidad estricta no declararlo READY final ni RUNTIME VALIDATED.

No alterar runtime artificialmente sólo para disparar workflow.

## Gates bloqueados

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promover sin evidencia real.

## Credenciales TEST

Los E2E autenticados requieren credenciales TEST disponibles en el runner/entorno. Si faltan, el harness puede quedar omitido; registrar ese hecho y no convertir el resultado en runtime validation.

## Finanzas

Política definitiva de saldo/retiro sigue pendiente de decisión de producto. No inventar saldo disponible ni RPCs financieros sin contrato aprobado.

## NEXT

```text
1 obtener artifact Android para SHA objetivo sin deploy web
2 smoke Development + Centinela en UGO TEST
3 E2E Cliente↔Proveedor exact serviceId + chat
4 A+B+C + cancelación selectiva
5 Proveedor Agenda + lifecycle
6 prueba dos sesiones/dispositivos
7 pagos/finanzas/security
8 publicar sólo cuando corresponda
```

**No tocar Supabase PROD. No crear ramas. No desplegar para resolver trazabilidad de QA.**
