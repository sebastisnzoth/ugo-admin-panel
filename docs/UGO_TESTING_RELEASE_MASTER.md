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
