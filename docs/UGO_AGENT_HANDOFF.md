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

Debe demostrarse además: mismo `serviceId`; aceptación única; ownership/RLS; doble asignación impedida; retries idempotentes; doble cierre denegado; refund consistente; convergencia Realtime tras reconexión.

## LAST COMPLETED

12/09/2026 · auditoría guiada por maestros del journey Cliente → matching → Proveedor → pago → ejecución → evidencia → aprobación.

Se cerraron dead ends recuperables sin cambiar contratos de negocio:

1. Matching Cliente reconcilia estado persistido cuando el RPC pudo confirmar pero la respuesta se perdió.
2. Aceptación Proveedor reconcilia asignación persistida ante error ambiguo o retry.
3. Elección de pago Cliente rehidrata al reconectar, volver online o recuperar visibilidad y relee persistencia antes de mostrar un fallo ambiguo.
4. Acciones Proveedor y confirmación de efectivo releen snapshot persistido después de errores.
5. Evidencia Proveedor rehidrata readiness tras reconexión y relee filas después de upload ambiguo.
6. Aprobación final Cliente rehidrata servicios/pagos al reconectar y reconcilia persistencia antes de reportar error.
7. Un error temporal al cargar revisión final ya no borra el cierre activo conocido.

Todo lo anterior está publicado directamente en `origin/main`. Los nuevos contract tests están versionados, pero este bloque hecho vía GitHub connector no debe declararse VALIDATED hasta ejecutar los gates reales.

## IMPLEMENTED

Además del baseline P0 previo:

- recovery de matching Cliente;
- recovery de aceptación Proveedor;
- recovery/reconnect de ClientPaymentChoice;
- recovery de ProviderEvidencePanel;
- reconciliación de acciones ProviderData;
- recovery/reconnect de ClientCompletionReview;
- contract tests para matching, aceptación, pago, evidencia, acciones proveedor y cierre cliente.

Baseline conservado: harness aislado RPC/RLS, refund atómico de ampliaciones, Realtime recovery general, request evidence opcional y ownership de push.

## VALIDATED

Última evidencia ejecutada anterior a este bloque:

- `npm test`: 43 casos, 42 pasan, 0 fallos, 1 omitido por falta de entorno RPC/RLS aislado.
- `npm run build`: verde en el bloque anterior.
- lint crítico: verde en el bloque anterior; lint general mantiene deuda preexistente.

**Pendiente de validación exacta:** commits de recovery/retry publicados después de esa ejecución. No confundir contract tests versionados con tests ejecutados.

No declarar todavía como validado: E2E RPC/RLS aislado, refund contra DB aislada, Realtime E2E real, Storage/upload E2E ni los últimos commits de recovery.

## RELEASED

Los cambios recientes están publicados en GitHub `origin/main`. Publicado ≠ RELEASED. No hay evidencia nueva de deploy/smoke para este bloque.

## BLOCKED

### B1 · Entorno Supabase aislado

Faltan seis repository secrets apuntando a un Supabase aislado con esquema UGO vigente y usuarios Cliente/Proveedor distintos:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
```

Sin ese entorno no puede demostrarse RPC/RLS/concurrencia/Realtime real sin arriesgar producción. No usar producción `trfsjuseqjxlhrxuvdsm`, no usar UGO Arena `tmossnqfwfwjrtzwcbmm`, no crear infraestructura paga sin aprobación.

### B2 · Release

Los commits recientes pueden estar IMPLEMENTED/PUBLISHED sin RELEASED. Verificar Vercel sólo cuando corresponda y evitar redeploys innecesarios por rate limit.

### B3 · Lint general

Existe deuda general preexistente; no usarla para ocultar regresiones nuevas. Ejecutar gates focales + build/test y distinguir deuda previa de fallos del bloque.

## NEXT

Mientras B1 siga activo:

1. seguir auditando dead ends de `en_camino → llegado → en_progreso → esperando_aprobacion → completado/disputa`;
2. revisar recuperación de DisputeDock y cierre alternativo sin borrar estado ante fallos de red;
3. revisar geolocalización de llegada y Storage/evidencia para retries seguros;
4. ejecutar gates reales en cuanto haya un runner/local disponible;
5. preparar el E2E reproducible para B1.

Mantener siempre UX canónica: **estado → contexto → próxima acción** y persistencia como única fuente de verdad.

## COMMITS RECIENTES

```text
128bf0e  fix(p0): recover matching after ambiguous dispatch errors
74d60c0  test(p0): guard persisted matching recovery
6cf7865  fix(p0): recover provider acceptance after ambiguous rpc errors
561e581  test(p0): guard provider acceptance reconciliation
0d1e793  fix(p0): recover client payment choice after reconnect
a087ea7  test(p0): guard payment reconnect recovery
623addb  fix(p0): recover provider evidence after reconnect
17eac80  test(p0): guard provider evidence recovery
229cc8c  fix(p0): reconcile provider actions after ambiguous failures
b4285aa  test(p0): guard provider action reconciliation
f9bb2d5  fix(p0): recover client completion review after reconnect
99d96bc  test(p0): guard client completion recovery
```

## HANDOFF CONTRACT

El agente que termina un bloque actualiza este archivo si cambió el estado operativo. No borrar bloqueos reales. El agente que entra verifica primero `main` y continúa desde CURRENT P0/NEXT sin pedir al usuario reconstruir contexto.
