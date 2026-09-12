# UGO — Agent Handoff

**Estado:** operativo  
**Rama:** `main`  
**Uso:** buzón compartido entre ChatGPT, Codex y otros agentes  
**Regla:** verificar contra `main` antes de confiar en este archivo.

## CURRENT P0

Cerrar la primera validación real Cliente ↔ Proveedor ↔ Backend en un entorno Supabase aislado, sin usar producción como banco de pruebas destructivo.

### Criterio de cierre

```text
Cliente crea solicitud
→ matching
→ Proveedor acepta
→ forma de pago válida
→ en_camino
→ llegado
→ evidencia Antes
→ en_progreso
→ ampliación opcional
→ evidencia Después
→ esperando_aprobacion
→ Cliente aprueba o disputa
→ cierre financiero
```

Debe demostrarse además:

- mismo `serviceId` en ambos roles;
- aceptación única;
- ownership/RLS correcto;
- doble aceptación denegada;
- doble confirmación de efectivo denegada;
- doble cierre denegado;
- retry/webhook duplicado idempotente;
- reembolso de ampliación consistente;
- convergencia Realtime tras reconexión.

## LAST COMPLETED

1. Se agregó gate explícito `UGO Isolated RPC RLS`.
2. El harness aislado falla si faltan credenciales cuando `UGO_REQUIRE_ISOLATED_INTEGRATION=1`.
3. El harness rechaza el project ref de producción.
4. Se endureció reembolso de ampliaciones con RPC atómico/idempotente versionado en repo.
5. Webhook Mercado Pago fue conectado al flujo de reversión de ampliación.
6. Realtime Cliente/Proveedor fue reforzado para rehidratar DB al reconectar/volver online/recuperar visibilidad.
7. La foto previa del pedido Cliente dejó de ser obligatoria; sigue draft-bound cuando existe.
8. Se verificó que producción UGO no tiene branch Supabase de desarrollo disponible.
9. Se verificó que `UGO Arena` no debe usarse en este flujo.
10. Se verificó que la migración de refund de ampliación y el guard de autoría de disputa no están demostrados como aplicados en producción.

## IMPLEMENTED

- `.github/workflows/isolated-rpc-rls.yml`
- `tests/integration/client-provider-rpc-rls.test.mjs`
- `supabase/migrations/20260912222000_expansion_refund_integrity.sql`
- `tests/contracts/expansion-refund-integrity.test.mjs`
- `tests/contracts/realtime-convergence.test.mjs`
- Realtime recovery en Cliente y Proveedor
- request evidence opcional en `ClientGuidedRequest`
- regresión contractual para request evidence opcional

## VALIDATED

- Contract tests previos del lifecycle Cliente ↔ Proveedor existen.
- Baseline anterior de CI fue verde para varios guards P0 ya cerrados.
- El bloque de pagos hasta el commit de regresión de refund llegó a Vercel `READY`.

No declarar como validado todavía:

- E2E RPC/RLS aislado completo;
- refund de ampliación contra DB aislada;
- convergencia Realtime E2E real;
- últimos commits de UX/Realtime bajo release verificable.

## RELEASED

- Baseline productivo anterior y bloque de pagos hasta `d8782df` llegaron a Vercel `READY`.

## BLOCKED

### B1 · Entorno Supabase aislado

**Falta:** un Supabase aislado seguro con las seis variables:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
```

**Por qué bloquea:** sin ese entorno no se puede demostrar RPC/RLS/concurrencia/realtime real sin arriesgar producción.

**Acción mínima del usuario si Codex no encuentra una alternativa gratuita ya existente:** aprobar/crear un entorno aislado seguro y proporcionar/configurar esas credenciales.

**No hacer:** usar producción; usar UGO Arena; crear infraestructura paga sin aprobación.

### B2 · Vercel build rate limit

Los últimos commits pueden quedar `IMPLEMENTED` sin `RELEASED` si Vercel rechaza builds por cuota/rate limit.

No confundir rate limit con fallo funcional del código.

## NEXT

Mientras B1 siga activo, continuar únicamente con P0/P1 que puedan cerrarse de forma segura sin producción destructiva:

1. auditar journey Cliente → matching → Proveedor para errores/retry/dead ends;
2. endurecer guards contractuales faltantes;
3. preparar smoke/E2E reproducible para cuando exista entorno aislado;
4. auditar Admin/Super Admin sólo si no desplaza el P0 principal;
5. mantener UX canónica: estado → contexto → próxima acción.

Cuando B1 se resuelva:

```text
npm run build
npm test
UGO_REQUIRE_ISOLATED_INTEGRATION=1 npm run test:integration
```

Corregir cualquier fallo real y repetir hasta verde.

## COMMITS RELEVANTES

```text
1cd24b4  test(p0): enforce isolated integration gate on demand
c378086  ci(p0): add explicit isolated RPC RLS gate
670d064  fix(payments): make expansion refunds atomic and idempotent
f33fa12  fix(payments): reverse funded expansion totals on refund
d8782df  test(payments): cover expansion refund integrity
fcf70d1  fix(realtime): resync provider flow after reconnect
284d014  fix(realtime): resync client tracking and scope payment events
8372897  test(realtime): cover scoped resync contracts
cb9ce63  fix(client): make request evidence optional when not useful
62e8099  test(client): keep request photos optional and draft-bound
```

## HANDOFF CONTRACT

El agente que termina un bloque debe actualizar este archivo antes de salir si cambió el estado operativo.

No borrar bloqueos reales para “limpiar” el documento. Un bloqueo desaparece sólo cuando fue resuelto y validado.

El agente que entra debe verificar primero `main`, luego continuar desde `CURRENT P0`/`NEXT` sin pedir al usuario que reconstruya contexto.