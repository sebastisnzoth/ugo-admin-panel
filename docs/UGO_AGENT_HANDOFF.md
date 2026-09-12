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
- doble asignación impedida; retry del mismo proveedor devuelve el mismo servicio;
- retry de efectivo devuelve el mismo pago sin duplicar cobro ni fechas;
- doble cierre denegado;
- retry/webhook duplicado idempotente;
- reembolso de ampliación consistente;
- convergencia Realtime tras reconexión.

## LAST COMPLETED

Bloque del 12/09/2026 sobre `9f77d7c`: push de ese commit a `origin/main` confirmado; fetch posterior verificó `HEAD = origin/main = 9f77d7cb86daa312d97c0201d02744e52520483f` antes de editar. Se recuperó el gate contractual de ownership de push, separando las asignaciones `SET` del filtro `WHERE`. Tres mutaciones controladas verifican que el test siga rechazando cambio de dueño, ausencia de filtro y bypass mediante `OR true`. La migración y el backend no se modificaron.

Bloque anterior (`9f77d7c`): harness aislado corregido para orden de pago/cierre, retries idempotentes, errores de dominio específicos, persistencia/dinero y rechazo de UGO Arena.

Baseline anterior:

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
- `tests/contracts/isolated-harness.test.mjs`
- Gate de ownership y mutaciones en `tests/contracts/push-subscription-ownership.test.mjs`
- `supabase/migrations/20260912222000_expansion_refund_integrity.sql`
- `tests/contracts/expansion-refund-integrity.test.mjs`
- `tests/contracts/realtime-convergence.test.mjs`
- Realtime recovery en Cliente y Proveedor
- request evidence opcional en `ClientGuidedRequest`
- regresión contractual para request evidence opcional

## VALIDATED

Ejecución local del 12/09/2026:

- `npm ci --include=dev`: instalación reproducible terminada; audit de instalación reportó 0 vulnerabilidades. Vite 8.0.16, TypeScript 6.0.3, ESLint 10.5.0 y Supabase JS 2.108.1 coinciden con el lockfile.
- `npm test`: 43 casos, 42 pasan, 0 fallos y 1 omitido (RPC/RLS sin credenciales). El gate contractual general vuelve a pasar; el P0 aislado sigue sin ejecución real.
- `node --test tests/contracts/push-subscription-ownership.test.mjs`: 6/6 pasan. Antes del cambio se reprodujo el fallo de la aserción original; después, la migración vigente pasa y las tres mutaciones inseguras son rechazadas.
- `npm run build`: pasa TypeScript + Vite 8.0.16; conserva warning de chunks >500 kB.
- Lint crítico del bloque anterior (`9f77d7c`): ejecutada la lista exacta de 31 superficies de `core-ci.yml`; 0 errores, 2 warnings de hooks preexistentes. No se volvió a ejecutar ese gate separado en el bloque de ownership.
- `npm run lint`: falla con 638 errores y 13 warnings de deuda general preexistente; mismo resultado antes y después de reinstalar dependencias. No se modificaron superficies TypeScript en este bloque.
- Falso positivo de push resuelto: la prohibición de `usuario_id` se aplica sólo al `SET`; el `WHERE` debe conservar el ownership exacto. La evidencia es contractual estática y no prueba RLS/concurrencia contra DB.
- La regresión ejecuta los rechazos de producción/Arena y la ausencia obligatoria de credenciales con `fetch` interceptado; no contacta esos proyectos ni equivale a un E2E real.
- Logs del bloque actual: `.playwright-mcp/p0-validation/push-tests.log`, `push-build.log` y `push-lint.log` (ignorados por Git). En el bloque anterior el disco del sistema dio `ENOSPC`; se reutilizaron caché npm y `TMPDIR` en el volumen del repo.

Evidencia histórica conservada:

- Contract tests previos del lifecycle Cliente ↔ Proveedor existen.
- Baseline anterior de CI fue verde para varios guards P0 ya cerrados.
- El bloque de pagos hasta el commit de regresión de refund llegó a Vercel `READY`.

No declarar como validado todavía:

- E2E RPC/RLS aislado completo;
- refund de ampliación contra DB aislada;
- convergencia Realtime E2E real;
- últimos commits de UX/Realtime bajo release verificable.

## RELEASED

- El push de `9f77d7c` está confirmado; no se verificó deploy/smoke ni se usó producción en esta orden. El cambio de ownership de este bloque queda en commit local.
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

**Verificación:** las seis variables siguen ausentes en el entorno local. En el bloque anterior, MCP listó únicamente UGO y UGO Arena, sin branches UGO; tampoco había Docker/Podman/Colima ni configuración Supabase local. Esta orden no consultó producción ni Arena.

**Acción mínima del usuario solicitada:** configurar las seis variables como repository secrets en GitHub → `sebastisnzoth/ugo-admin-panel` → Settings → Secrets and variables → Actions, apuntando a una base aislada con esquema UGO vigente, categoría activa y usuarios Cliente/Proveedor distintos. El proveedor debe estar verificado, online, disponible y con tarifa válida. Confirmar cuando esté listo, sin pegar contraseñas en el chat.

**Resultado esperado y reanudación:** ejecutar `UGO Isolated RPC RLS`, corregir fallos observados y repetir el gate. Si el entorno requiere gasto o creación de recursos no autorizada, solicitar esa decisión específica antes de crearlos.

**No hacer:** usar producción; usar UGO Arena; crear infraestructura paga sin aprobación.

### B2 · Vercel build rate limit

Los últimos commits pueden quedar `IMPLEMENTED` sin `RELEASED` si Vercel rechaza builds por cuota/rate limit.

No confundir rate limit con fallo funcional del código.

### B3 · Deuda de lint general

El fallo contractual de ownership de push quedó resuelto y `npm test` pasa con 42 aprobados y 1 omitido. No requiere acción manual.

El lint general tampoco está verde (638 errores, 13 warnings); el workflow lo trata como reporte de deuda. El lint crítico sí pasó localmente. No declarar todos los gates ni CI verdes.

## NEXT

Mientras B1 siga activo, continuar únicamente con P0/P1 que puedan cerrarse de forma segura sin producción destructiva:

1. auditar journey Cliente → matching → Proveedor para errores/retry/dead ends;
2. endurecer guards contractuales faltantes;
3. preparar smoke/E2E reproducible para cuando exista entorno aislado;
4. auditar Admin/Super Admin sólo si no desplaza el P0 principal;
5. mantener UX canónica: estado → contexto → próxima acción.

El harness corregido cubre efectivo y metadata de evidencia. Aún faltan escenarios reales de pago electrónico/refund/webhook, competencia entre proveedores distintos, upload/Storage, geolocalización, Admin y reconexión Realtime; su primer verde no cerrará por sí solo todo el CURRENT P0.

Cuando B1 se resuelva:

```text
npm run build
npm test
UGO_REQUIRE_ISOLATED_INTEGRATION=1 npm run test:integration
```

Corregir cualquier fallo real y repetir hasta verde.

## COMMITS RELEVANTES

Bloque actual: `test(p0): restore push ownership contract gate` (consultar SHA en `git log`; commit local, sin push ni release).

```text
9f77d7c  test(p0): align isolated harness with persisted RPC contracts — push confirmado a origin/main
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
