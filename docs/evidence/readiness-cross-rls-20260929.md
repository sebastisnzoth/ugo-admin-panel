# UGO Functional Readiness — cross-rls

## Identificación

- **READINESS_ID:** `cross-rls`
- **Área:** Flujo transversal / Seguridad / Calidad
- **Control:** RLS/RPC y aislamiento
- **Responsable:** UGO
- **Task ID:** `readiness-cross-rls`
- **Job ID:** `UGO-READINESS-CROSS-RLS`
- **Correlation ID:** `readiness-cross-rls-20260929T205000Z-b92f288`
- **Estado final:** **VERIFIED**
- **Producción tocada:** No

## Defecto encontrado

Durante la validación aislada se detectó una brecha real en el RPC:

`public.obtener_ofertas_proveedor()`

Un usuario autenticado con rol Cliente podía invocar el RPC exclusivo del Proveedor y recibir una respuesta vacía en lugar de una denegación explícita de autorización.

## Corrección aplicada

Se endureció el RPC con:

- validación explícita de usuario autenticado;
- validación de rol `proveedor`;
- validación de proveedor activo;
- aislamiento por `auth.uid()`;
- denegación fail-closed para actores no autorizados;
- revocación de ejecución para `PUBLIC` y `anon`;
- ejecución permitida únicamente a `authenticated` y `service_role`;
- regresiones permanentes de contrato e integración.

Migración:

`supabase/migrations/20260929205900_harden_provider_offer_rpc_cross_role.sql`

Regresiones:

- `tests/integration/cross-role-rls-rpc.test.mjs`
- `tests/contracts/matching-rpc-execute-grants.test.mjs`

## Evidencia same-SHA

SHA runtime validado:

`24ec61d201be36bca5a15f099adc8f5aa272fa48`

Ese SHA contiene:

- la migración de hardening;
- el test negativo cross-role;
- el lock readiness correspondiente.

### Core CI

- **Run:** `36630244665`
- **Resultado:** PASS
- **SHA:** `24ec61d201be36bca5a15f099adc8f5aa272fa48`

### UGO Isolated RPC RLS

- **Run:** `36630426605`
- **Job:** `109618549528`
- **Checkout real:** `24ec61d201be36bca5a15f099adc8f5aa272fa48`
- **Step autoritativo:** `Required isolated Cliente ↔ Proveedor ↔ Admin RPC/RLS harness`
- **Resultado del step:** PASS
- **Tests:** 9
- **PASS:** 6
- **FAIL:** 0
- **SKIP:** 3

El workflow global terminó con failure posteriormente por controles independientes de `cross-rls` relacionados con UGO Empresas y Super Admin UI. El step autoritativo RLS/RPC ya había terminado PASS y no fue afectado por esos fallos externos al control.

## Evidencia runtime persistida

- **serviceId:** `67593d1a-e171-46ed-b30e-b10bf0a1b820`
- **runId:** `fae59f24-448c-4a8a-b495-df3cc5c76826`
- **Entorno:** UGO TEST / UGO Arena
- **Supabase TEST ref:** `tmossnqfwfwjrtzwcbmm`

## Aserciones verificadas

1. Proveedor no asignado no puede leer la fila privada de un servicio.
2. Proveedor no asignado no puede actualizar el servicio.
3. Proveedor ajeno no puede inyectar mensajes en el chat del servicio.
4. Proveedor no puede ejecutar RPC exclusiva del Cliente.
5. Cliente no puede ejecutar RPC exclusiva del Proveedor.
6. Cliente es rechazado por `obtener_ofertas_proveedor()`.
7. Proveedor no puede aprobar un servicio como Cliente.
8. Admin autorizado puede auditar el mismo `serviceId`.
9. El E2E aislado completó el flujo con GPS de disponibilidad reciente.

## Judge / Sentinel

- **Judge:** PASS
- **Sentinel:** PASS

Criterios usados:

- Core CI same-SHA en verde.
- Harness RLS/RPC same-SHA con 0 fallas.
- Evidencia TEST persistida.
- Aislamiento de producción confirmado.
- Guard de rol fail-closed.
- Producción no modificada.

## Lock autoritativo

Ruta:

`docs/ugo-work-locks/readiness-cross-rls.json`

Estado final esperado:

- `status: DONE`
- `validators_result.Judge: PASS`
- `validators_result.Sentinel: PASS`
- evidencia persistida presente;
- `runtime_validated_sha: 24ec61d201be36bca5a15f099adc8f5aa272fa48`.

## Resultado

**cross-rls = VERIFIED**

No queda trabajo delegable ni prueba humana/física propia de este control.

## Estado global luego de este cierre

- Pasos funcionales totales: **68**
- VERIFIED: **4**
- Restantes exactos: **64**
- Restantes delegables: **61**
- Pruebas humanas/físicas finales: **3**

Controles VERIFIED al momento de este cierre:

- `provider-offers`
- `admin-auth`
- `auto-departments`
- `cross-rls`
