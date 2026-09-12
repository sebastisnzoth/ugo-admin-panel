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

Bloque local del 12/09/2026 sobre `78e7cd3` (`main` y `origin/main` iguales tras fetch): corrección del harness aislado contra los RPC versionados. Se corrigieron el gate de pago evaluado antes de asignar, el orden revisión/cobro y las expectativas erróneas de rechazo para retries idempotentes de oferta/efectivo. Se agregaron errores de dominio específicos, comparación de persistencia/dinero, lectura final por ambos roles y rechazo explícito de UGO Arena. Regresión nueva: `tests/contracts/isolated-harness.test.mjs`.

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
- `supabase/migrations/20260912222000_expansion_refund_integrity.sql`
- `tests/contracts/expansion-refund-integrity.test.mjs`
- `tests/contracts/realtime-convergence.test.mjs`
- Realtime recovery en Cliente y Proveedor
- request evidence opcional en `ClientGuidedRequest`
- regresión contractual para request evidence opcional

## VALIDATED

Ejecución local del 12/09/2026:

- `npm ci --include=dev`: instalación reproducible terminada; audit de instalación reportó 0 vulnerabilidades. Vite 8.0.16, TypeScript 6.0.3, ESLint 10.5.0 y Supabase JS 2.108.1 coinciden con el lockfile.
- `npm test`: 40 casos, 38 pasan, 1 falla y 1 omitido (RPC/RLS sin credenciales). Las 7 regresiones nuevas del harness pasan.
- `npm run build`: pasa TypeScript + Vite 8.0.16; conserva warning de chunks >500 kB.
- Lint crítico: ejecutada la lista exacta de 31 superficies de `core-ci.yml`; 0 errores, 2 warnings de hooks preexistentes.
- `npm run lint`: falla con 638 errores y 13 warnings de deuda general preexistente; mismo resultado antes y después de reinstalar dependencias. No se modificaron superficies TypeScript en este bloque.
- Fallo reproducido por separado en el archivo preexistente `tests/contracts/push-subscription-ownership.test.mjs:20`, sin cambios respecto de `HEAD`: su regex prohíbe `usuario_id =` incluso dentro del `WHERE` de ownership que el mismo test exige.
- La regresión ejecuta los rechazos de producción/Arena y la ausencia obligatoria de credenciales con `fetch` interceptado; no contacta esos proyectos ni equivale a un E2E real.
- Logs locales en `.playwright-mcp/p0-validation/` (ignorados por Git). El disco del sistema dio `ENOSPC`; caché npm y `TMPDIR` se trasladaron sólo para estos comandos a ese directorio del volumen del repo. Reutilizar esos overrides si continúa sin espacio.

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

**Verificación de esta sesión:** MCP lista únicamente UGO y UGO Arena; UGO no tiene branches. Las seis variables faltan en el entorno local; no hay Docker/Podman/Colima disponible ni configuración Supabase local en el repo.

**Acción mínima del usuario solicitada:** configurar las seis variables como repository secrets en GitHub → `sebastisnzoth/ugo-admin-panel` → Settings → Secrets and variables → Actions, apuntando a una base aislada con esquema UGO vigente, categoría activa y usuarios Cliente/Proveedor distintos. El proveedor debe estar verificado, online, disponible y con tarifa válida. Confirmar cuando esté listo, sin pegar contraseñas en el chat.

**Resultado esperado y reanudación:** ejecutar `UGO Isolated RPC RLS`, corregir fallos observados y repetir el gate. Si el entorno requiere gasto o creación de recursos no autorizada, solicitar esa decisión específica antes de crearlos.

**No hacer:** usar producción; usar UGO Arena; crear infraestructura paga sin aprobación.

### B2 · Vercel build rate limit

Los últimos commits pueden quedar `IMPLEMENTED` sin `RELEASED` si Vercel rechaza builds por cuota/rate limit.

No confundir rate limit con fallo funcional del código.

### B3 · Gates generales preexistentes

`npm test` no está verde por la aserción de ownership de push descrita en VALIDATED. Es un fallo del test contractual, no evidencia de una reasignación permitida por el SQL. El archivo y su migración no se modificaron en este bloque del harness.

El lint general tampoco está verde (638 errores, 13 warnings); el workflow lo trata como reporte de deuda. El lint crítico sí pasó localmente. No declarar todos los gates ni CI verdes.

## NEXT

Mientras B1 siga activo, continuar únicamente con P0/P1 que puedan cerrarse de forma segura sin producción destructiva:

1. recuperar el gate contractual de ownership de push: distinguir asignaciones del `SET` del filtro `WHERE` y conservar la regresión contra cambio de dueño;
2. auditar journey Cliente → matching → Proveedor para errores/retry/dead ends;
3. endurecer guards contractuales faltantes;
4. preparar smoke/E2E reproducible para cuando exista entorno aislado;
5. auditar Admin/Super Admin sólo si no desplaza el P0 principal;
6. mantener UX canónica: estado → contexto → próxima acción.

El harness corregido cubre efectivo y metadata de evidencia. Aún faltan escenarios reales de pago electrónico/refund/webhook, competencia entre proveedores distintos, upload/Storage, geolocalización, Admin y reconexión Realtime; su primer verde no cerrará por sí solo todo el CURRENT P0.

Cuando B1 se resuelva:

```text
npm run build
npm test
UGO_REQUIRE_ISOLATED_INTEGRATION=1 npm run test:integration
```

Corregir cualquier fallo real y repetir hasta verde.

## COMMITS RELEVANTES

Bloque actual: `test(p0): align isolated harness with persisted RPC contracts` (consultar SHA en `git log`; commit local, sin push ni release).

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
