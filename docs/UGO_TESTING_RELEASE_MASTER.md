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

### Restauración unificada Cliente → Proveedor — 20/10/2026

Rama de reparación desde main `cbd671b6a71a238bdde661bfb23d5396b8901a85`, solicitada explícitamente por Sergio. Reutiliza selectivamente #533 (`a0512524`) y la protección Admin/evidencia #531 (`770ca5f3`); conserva las mejoras posteriores al 17/10. Sin fusión ni publicación autorizada.

Hallazgos comprobados: main permite que la confirmación tardía de SIGNED_OUT borre una sesión nueva; el rechazo de rol Admin usa signOut global; el INSERT del Cliente envía liquidación incompatible con RLS. TEST ya tiene las migraciones `20261019233520` y `20261020000050`: no se reaplicaron. RLS activo y SELECT authenticated en las cinco tablas revisadas; servicios/ofertas/notificaciones/perfiles_proveedor están en supabase_realtime.

La referencia 17/10 se inspeccionó por #491/#492 y commits 30b1780, 771116e, 8e593ae, 44f344c, 8e6a08a. Zonas agregan una restricción de 3 km y se revalidan al aceptar; banners sólo consideran eventos frescos de 90 s. No se eliminan estos controles. La descripción de #492 deja QA Realtime pendiente: no acredita funcionamiento completo de ese día.

Evidencia previa reejecutada: https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/39376942635 (intento 2, SHA 7f5daa0d) PASS, cleanup PASS. El intento 1 falló en bootstrap con PGRST002. Ese harness usa RPC para crear y recarga antes de aceptar: NO prueba alerta automática ni se atribuye a esta rama.

Cambios: sesión pendiente separada de ausencia confirmada; generaciones para respuestas tardías; logout local de Admin; renovación GPS sin forzar Online; recuperación de perfil y Realtime; rechazo de canales creados después de desmontar tracking; precios calculados por backend al asignar. El E2E exige dos contextos, pedido creado desde Cliente, matching automático, IDs exactos de pedido/oferta/notificación y alerta DOM sin reload, aceptación UI y confirmación Cliente. GPS automatizado proviene de Playwright, nunca se presenta como sensor físico.

Estado de esta revisión: código PREPARADO; TypeScript/lint/tests/build y E2E SAME-SHA PENDIENTES al escribir este checkpoint. No entorno de ejecución local disponible: validación mediante Actions. Producción `trfsjuseqjxlhrxuvdsm` no modificada, sin despliegues Vercel. Human GPS/two-device acceptance PENDIENTE.
