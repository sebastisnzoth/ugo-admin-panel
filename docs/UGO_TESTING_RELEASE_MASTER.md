# UGO — Testing & Release Master

**Versión:** 3.2 · 16 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama única:** `main`

## 1. Madurez canónica

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

Un paso no sustituye al siguiente.

## 2. Quality Gates

```text
L0 TypeScript/build/lint
L1 contratos/estados UX
L2 dominio/RPC/API
L3 RLS/roles/Storage
L4 Integration/Realtime/pagos/mapas
L5 E2E Cliente↔Proveedor↔Admin + A+B+C
L6 Android físico Cliente↔Proveedor
L7 publicación/smoke/rollback
```

## 3. Checkpoint CI actual

```text
SHA: c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run: 35052952138
conclusion: SUCCESS
```

Resultado: security gate, TypeScript/build, **319 tests/contratos**, lint crítico, ClientApp y lint global verdes. Los E2E autenticados se omiten cuando faltan las seis credenciales TEST y no cuentan como runtime validation.

## 4. Regla Sentinel para mutaciones críticas

```text
operación devuelve error
→ verificar estado persistido exacto
→ éxito persistido: éxito recuperado, SIN P0
→ fallo persistido confirmado: P0/P1 según contrato
→ persistencia no verificable: recovery telemetry, no readiness falso
```

Esta regla cubre matching, cancelación, aceptación/rechazo de oferta, disponibilidad, lifecycle, GPS, chat send, rating y pagos críticos.

## 5. Chat

El envío es idempotente por intento mediante `clientMessageId`. TEST aplica un índice único parcial por `servicio_id + emisor_id + clientMessageId`. Un error de INSERT sólo se convierte en P0 después de confirmar que el intento exacto no quedó persistido.

Aun así, `CHAT-REALTIME` permanece `implemented` hasta probar visualmente Cliente→Proveedor y Proveedor→Cliente en dos sesiones reales, con reload/reconnect, quick replies, bloqueo de contacto y aislamiento por `serviceId`.

## 6. Cliente / Actividad / Rating / Pago

- Actividad tiene una única navegación de estado: Activos ahora / Próximos / Finalizados + Todos/refresh.
- Rating reconcilia persistencia exacta antes de incidente.
- Pago mantiene P0 `PAYMENT-CLOSE` sólo para mutación confirmadamente fallida; errores de carga/Realtime son P1 de sincronización foreground+online.
- A+B+C continúa protegido por contratos, pero necesita evidencia runtime actual.

## 7. Proveedor / Matching / GPS

- online/offline reconcilia estado persistido y fallo confirmado clasifica `MATCH-ONLINE` server-side.
- rechazo de oferta reconcilia estado `rechazada` exacto.
- GPS reconcilia `ultima_ubicacion_at` antes de reportar fallo de persistencia.
- Agenda debe mostrar todos los trabajos futuros/asignados; misión activa sólo representa el `serviceId` accionable.

## 8. Android TEST

El APK para prueba física debe construirse desde el **SHA final exacto** posterior a esta sincronización documental, con:

```text
bundleRuntime = local-dist
environment = TEST
VITE_APP_REVISION = SHA exacto
```

Compilar ≠ probar. El artifact final debe instalarse y pasar dos sesiones/dispositivos.

## 9. Prueba física mínima

Cliente:

```text
login → A+B+C → Actividad → cancelación selectiva → matching/radar → chat → tracking → pago → rating
```

Proveedor:

```text
login → online → oferta → aceptar/rechazar → Agenda → en camino → llegada/GPS → chat → trabajo → cobro/cierre
```

Dos sesiones/dispositivos: Realtime, reconnect, background/foreground y aislamiento entre pedidos.

## 10. Gates bloqueados

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promover por contratos, persistencia aislada, CI o compilación.

## 11. Publicación

No disparar Vercel para documentación, para generar APK ni para sustituir QA Android. Publicar sólo cuando exista necesidad funcional de release y registrar revisión exacta + smoke + rollback/mitigación.

**UGO se valida por evidencia. Supabase PROD permanece fuera de alcance.**

### Admin/Super Admin · prueba API/UI exacta (18/10/2026)

`role-ui-runtime.yml` usa identidades efímeras por ejecución y API local en loopback a partir de `api/operations.ts` e `api/admin/integrations-status.ts` del mismo checkout, sin mock de Supabase ni secretos escritos a archivos. El frontend TEST usa `VITE_API_BASE_URL=http://127.0.0.1:4174`. Casos: login/reload/logout Admin y Super Admin; edición Cliente/Proveedor y categorías con lector DB independiente; creación con auditoría, contraseña verificada por otro cliente Auth, activación/desactivación, rechazo de privilegios y cero filas; SHADOW→OFF sin ejecutar ON. El probe de respuesta cero filas es controlado en HTTP y se distingue del RLS real. Cleanup verifica Auth/perfil; diagnósticos acotados al fixture. Pages fija base API canónica y conserva callback query/hash en su entrada raíz. Un PASS de este harness no sustituye Customer #1, GPS físico ni prueba de finanzas con dinero real.

### Admin/Super Admin follow-up — 2026-10-18

Profile editing now uses `admin_update_user_profile`: active Admin/Super Admin authorization, reserved target restriction, field allowlists, locked base/profile records and one audit append in a single transaction. Migration applied only to UGO TEST. UI reads persisted values independently after RPC. Exact-source runtime includes a real missing-profile rejection and unchanged base-record assertion; no human acceptance is inferred.

Independent review findings (partial saves and competing autonomy probes) addressed. UI and scheduled proof share one autonomy-state concurrency group. The proof formerly ran hourly while readiness expires after 45 minutes, guaranteeing a stale window; cadence is now every 15 minutes. GitHub scheduling delays can still block readiness; no gate is bypassed. Equivalent auth/profile refreshes no longer remount the client onboarding gate. Review accepted source changes; same-SHA browser/CI and publication remain pending at this entry.


### P0 Proveedor — persistencia de sesión · 2026-10-19 · PR #531

Base inspeccionada: `fa939296d9228e6ae569542676e54e52cfb7ee61`. La prueba de comportamiento de `useRoleSession` reprodujo: confirmación SIGNED_OUT obsoleta borrando un SIGNED_IN nuevo, error de transporte tratado como sesión ausente y perfil tardío restaurado después del logout. Durante la reparación también se detectó y cubrió renovación concurrente con la primera carga de perfil. El hook ahora verifica versión/época, comprueba los errores del SDK y diferencia bootstrap pendiente de ausencia confirmada. Proveedor muestra recuperación/reintento mientras no existe una comprobación autoritativa; no crea tokens ni modifica RLS.

Prueba: `tests/contracts/role-session-concurrency-behavior.test.mjs` ejecuta el hook real con orden de IO controlado; nueve casos pasan tras observar los fallos anteriores. Las pruebas estructurales existentes se ajustaron únicamente a la nueva desestructuración de error y al límite del efecto, conservando sus aserciones de seguridad. Diagnósticos `ugo:session-diagnostic` contienen sólo categorías, evento y tiempo; sin identidad, tokens, correos ni respuestas de API.

Se reutilizan los commits existentes de GPS/matching y el E2E de #529/#530, conservando su historia. `scripts/p0-client-provider-e2e.mjs` exige TEST, credenciales de Actions y SHA: login UI → Online → dos GPS persistidos → JWT validado por Auth → refresh SDK → red interrumpida/restaurada → reload → Offline/Online → oferta real → aceptación UI → JWT navegador → logout explícito. La ubicación del navegador está simulada por Playwright; no equivale a prueba física. El script registra un hash del session_id, nunca el JWT.

Estado: corrección en rama aislada, CI/runtime en verificación; sin fusión ni publicación. La prueba previa de #530 (`ef8ae3d5`) pasó login pero se bloqueó al activar Online; la captura muestra sesión activa y operación pendiente, no logout. No atribuir ese bloqueo a autenticación sin nueva evidencia de red/GPS. Gates: suite completa, Core CI y runtime del mismo SHA; después recién merge y Vercel READY/sha/smoke. No se tocó `trfsjuseqjxlhrxuvdsm` ni usuarios reales.

Evidencia incremental del bloque: `4de26a61f231f7a98167be86b0d816278b2aab6a`, run `39341206264`, login UI + Online + Auth `/user` 200 y JWT no expirado: PASS; primera renovación GPS: FAIL. El artefacto `p0-ui-failure.json` muestra sólo un SIGNED_IN, ningún SIGNED_OUT y GPS rechazado por muestra vieja. Se corrige la fuente de muestras Playwright cada 15 s; la política GPS del producto no cambia. La comprobación de oferta ya no recarga la página ni absorbe un timeout de asignación. Pruebas locales completas: 1462 totales, 1454 PASS, 8 SKIP por credenciales de integración ausentes, 0 FAIL; esas pruebas remotas siguen exigidas en Actions, no se interpretan como PASS local. Build y lint completos pasan (warnings existentes). Ver estado vivo y SHA definitivo en PR #531; la publicación continúa condicionada.

Dependencia P0 descubierta al ejecutar el recorrido: el trigger `private.apply_service_pricing_snapshot` rellenaba comisión/ganancia en BEFORE INSERT, contradiciendo `servicios_insert`, que exige ambos NULL. Reproducido en Auth real (42501) y PostgreSQL local con las migraciones reales. Corrección acotada: preservar tarifa/cotización en INSERT, calcular settlement en UPDATE de asignación y dejar los valores financieros suministrados por el cliente intactos para que RLS siga rechazándolos. El Cliente deja de enviar comisión/ganancia. No cambia RLS, matching, porcentaje, saldos ni registros existentes. Migración `20261019233520_defer_insert_settlement_until_assignment.sql` aplicada sólo a Arena TEST; pruebas positivas y negativas pasan localmente. El E2E repetirá creación de pedido con tarifa 120, sin sustituirla por NULL ni crear el pedido con service-role.

La revisión `c962490a`, run `39341798592`, mantuvo JWT de navegador válido en Online, dos GPS persistidos, refresh SDK, pérdida/restauración de red, reload y Offline/Online; quedó bloqueada en la incompatibilidad INSERT/precio anterior, sin logout. No usar ese resultado parcial como evidencia de aceptación o publicación. El workflow P0 instala Playwright fuera del árbol de dependencias y comprueba versiones contra package-lock para que runtime use el mismo Supabase/Vite que build.

Recorrido `1ab97634`, run `39342623656`: creación autenticada del pedido con tarifa 120 PASS; oferta persistida y visible sin reload PASS; la lectura inicial del test fue prematura (la expresión “Trabajo activo” también coincidía con “Sin trabajo activo”). Una consulta independiente posterior confirmó `asignado`; ese FAIL no se cambia a PASS. La prueba ahora espera `.provider-active-job` con la descripción exacta antes de comprobar DB/JWT y volver por Inicio al perfil para logout. Cleanup detiene primero el navegador para no borrar fixtures mientras siguen GPS/Realtime/RPC; se limpiaron y verificaron exclusivamente las dos identidades temporales y el servicio de ese run, que habían quedado por timeouts. El contrato de tarifa exige ahora settlement server-side y las pruebas PostgreSQL positivas/negativas lo verifican; no se debilitan aserciones financieras. La regresión de Admin busca explícitamente su usuario temporal en los filtros/buscador reales antes de editar, evitando depender de la página inicial de 50 registros.

Auditoría adicional de revocación: `AdminGate.verify/login` rechazaban una cuenta no administrativa con `signOut()` (scope global por defecto). Esto podía revocar refresh tokens del mismo usuario en Proveedor/otros dispositivos pese a storage keys separadas. Reproducido ejecutando la función real `verify` en `admin-denied-session-scope-behavior.test.mjs` (RED con scope undefined; rol siguió denegado). Corrección mínima: scope local en ambos rechazos; no altera autorización, RLS ni roles. El E2E abre Admin con la cuenta temporal Proveedor, exige denegación y HTTP logout scope local, y después renueva realmente la sesión Proveedor. No atribuir este mecanismo al incidente particular de Sergio sin una captura de sus eventos.

Gate exacto de ejecución: Core CI ahora hace checkout explícito de `pull_request.head.sha` (o `github.sha` en push), evitando atribuir al head una ejecución del merge SHA sintético. La prueba transaccional de radio usa los actores TEST fijos y comparte la concurrency `ugo-test-shared-provider-fixture` con RPC/RLS; no aumenta timeouts ni omite aserciones. El fallo 57014 observado se conserva en los runs anteriores y se reintenta el SHA vigente. Un error `email_exists` en creación de un fixture de regresión también se conserva y se reintenta con un intento nuevo, sin recuperar ni modificar cuentas ajenas.

Evidencia `6f794e9b`, run `39343763378`: Admin denegó el rol Proveedor con logout scope local y el Proveedor renovó su JWT real manteniendo el mismo session_id protegido; también pasaron GPS, reconexión, reload y toggle. El run recibió ofertas de otro E2E activo: ambas ejecuciones usaban una descripción constante, de modo que el selector podía abrir otra oferta antes de recibir la propia. Ese FAIL no se transforma en PASS. Cada ejecución usa ahora una descripción única por SHA/nonce y espera la suya, conservando `iniciar_matching` global y sus guardas. No se retiran proveedores ajenos ni se cambia matching para aislar el test.
