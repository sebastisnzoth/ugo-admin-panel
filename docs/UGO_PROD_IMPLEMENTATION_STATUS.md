# UGO PROD — Estado de implementación y gates

Fecha: 2026-10-30. Rama: `feat/ugo-prod-safe-activation-audit`. Objetivo: Cliente / Proveedor / Admin usando PROD `trfsjuseqjxlhrxuvdsm` sin pérdida de datos.

## Hecho y evidencia
- Supabase PROD respondió SELECT 1 y conteos previos: usuarios 9, perfiles cliente 3, proveedor 3 y servicios 56. PROD preservado, sin escritura.
- TEST conserva más datos (últimos conteos exitosos: usuarios 148, clientes 87, proveedores 34, servicios 1752), no equivalentes a PROD.
- Las ocho tablas principales están presentes en ambos proyectos.
- Diferencias confirmadas en columnas: PROD no tiene `perfiles_proveedor.faxina_productos_lleva`, `faxina_productos_valor`, `pilot_capabilities`; falta `servicios.zona`.
- `src/lib/supabaseProject.ts` sigue apuntando a TEST. Ningún cutover aplicado.
- Corrección propuesta en esta rama: las claves de almacenamiento Auth de Cliente/Proveedor/Admin usan `UGO_ENVIRONMENT`; en TEST conservan sus valores originales. Es una preparación para aislar sesiones por entorno. **No implica que el inicio de sesión esté validado.**

## Gate de seguridad
- Backups PROD/TEST: NO VERIFICADOS.
- Inventario completo de RPC, RLS, Storage, Edge Functions, Auth identities: PENDIENTE.
- Autenticación real Cliente/Proveedor/Admin PROD: PENDIENTE.
- Build, TS, lint, CI y E2E en esta rama: PENDIENTE.
- Pagos reales: PROHIBIDOS en pruebas.
- Migraciones PROD y redireccionamiento: BLOQUEADOS hasta respaldos, compatibilidad, autorización explícita.

## Próxima tarea verificable
1. Comprobar CI del PR y compatibilidad actual del almacenamiento Auth.
2. Confirmar backups en Dashboard sin restaurar.
3. Reconciliar funciones/constraints/roles/RLS, preparar migraciones aditivas en rama; no ejecutarlas en PROD.
4. Implementar preview restringido y E2E de cada rol sin operaciones reales de pago.
5. Solicitar autorización antes de cualquier cambio de producción o cutover.

## Ejecución posterior al Prompt Maestro — 2026-10-30
- PR #603 abierta, draft y mergeable; CI disponible: estado `pending` de Vercel para SHA `e9f9ab607d573c03186b645304776b5b82e8a030`. No equivale a CI PASS.
- Configuración actual en la rama: sigue apuntando a TEST; sin cutover.
- Se confirmaron en TEST los tipos exactos de diferencias conocidas: `faxina_productos_lleva boolean NOT NULL DEFAULT false`, `faxina_productos_valor numeric NOT NULL DEFAULT 0`, `pilot_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb` y `servicios.zona text NULL`.
- Preparado el candidato de migración **no ejecutable automáticamente** en `docs/sql/UGO_PROD_COMPATIBILITY_CANDIDATE_REVIEW_ONLY.sql`, commit `359e584f`. No se alteró PROD.
- Gates todavía pendientes: backup validado, comparación de RPC/RLS/identidades, CI PASS, Auth y E2E por rol. Próxima tarea: validar compatibilidad funcional y seguridad sin escribir en PROD.

## PR #603 — seguimiento de CI y corrección concreta (2026-10-30)

- SHA inspeccionado: `02723eeea6318c32f37dde6f552a1a79adf0c9ce`.
- UGO Roadmap Traceability, UGO Hugo Timeout Runtime TEST y UGO Cross Security Runtime TEST: `success` en ese SHA. UGO Groq authenticated smoke: `skipped`.
- UGO Core CI run `41100584983`: `failure` por **2 literales JSX accionables** en `src/mvp/UgoSupportChat.tsx` (enlaces a app cliente/proveedor). Se reemplazaron por etiquetas pt/es/en en commit `2c0483eec54d5f73bfd039b81888ea409bbe5f6d`. Requiere revalidación en nuevo SHA; no marcar CI PASS anticipadamente.
- UGO Admin Realtime Runtime TEST run `41100585019`: `failure` durante lectura del perfil admin de TEST, `Could not query the database for the schema cache. Retrying.` en `scripts/admin-realtime-runtime.mjs:23`. Los 10 contratos Admin Realtime pasaron; la prueba física/runtime quedó sin completar por dependencia TEST. No se relajaron assertions ni se omitió el runtime.
- El estado Vercel del SHA inspeccionado sigue `pending`; PR #603 continúa `draft`, abierta y sin merge.
- Gates de release aún no cumplidos: CI completo, runtime real TEST, respaldo verificable, Auth/RLS y validación de no regresión. PROD no modificada; sin cambio de URL, secretos ni tráfico.
- Próximo paso: reejecutar y verificar Core CI tras la corrección de traducciones; recuperar salud de TEST para validar Admin Realtime sin generar consultas de monitoreo en bucle. Solo considerar merge cuando se cumplan las garantías del PR.

## Verificación independiente PR #603 — 2026-10-30 15:17 BRT

- SHA HEAD comprobado: `bf006265bd032f01cea07528365d4b96396f2d8b`. PR sigue **OPEN / DRAFT / mergeable**, sin fusión.
- GitHub Actions en ese SHA: **UGO Core CI PASS** (`41104354246`), **Roadmap Traceability PASS** (`41104354276`), **Cross Security Runtime TEST PASS** (`41104354288`), **Hugo Timeout Runtime TEST PASS** (`41104354255`); Groq smoke **SKIPPED** (`41104354213`).
- **Cross-role UI Runtime TEST FAIL** (`41104354263`): `scripts/role-ui-fixtures.mjs:44`, `auth.admin.createUser` devuelve `AuthRetryableFetchError: Gateway Timeout`, HTTP **504**; el escenario browser real no alcanzó a ejecutarse por falta de identidad TEST.
- **Admin Realtime Runtime TEST FAIL** (`41104354264`): 10/10 contratos PASS, pero `scripts/admin-realtime-runtime.mjs:20` no pudo obtener sesión `signInWithPassword` debido a **504 Gateway Timeout** de Supabase Auth TEST. No se obtuvo prueba runtime completa.
- Diagnóstico corroborado por logs de Supabase TEST, ventana **18:09–18:14 UTC**: 12 registros `auth_logs` con `status=504` y `level=error`. La API de gestión declara proyecto `ACTIVE_HEALTHY`, lo que **no** equivale a Auth funcional. No se imprimen direcciones IP ni credenciales.
- Conclusión: fallos de integración bloqueados por dependencia externa **Supabase TEST Auth**, no evidencia de regresión en el aislamiento de sesiones. No maquillar con skips, mocks o relajación de assertions; evitar reintentos en bucle que saturen TEST.
- Estado Vercel para ese SHA: `pending`. Backups, matriz completa Auth/RLS/RPC y E2E por rol continúan pendientes. **NO MERGE**, no cambio de PROD, secretos ni tráfico.
- Próximo gate verificable: recuperar disponibilidad de Auth TEST, reejecutar ambos runtimes en el mismo SHA, confirmar PASS y evidencia de limpieza de fixtures; luego evaluar aprobación de PR y fusión segura.

## Cliente + Proveedor — conexión opt-in preparada
- Commit `c8e96683`: `src/lib/roleSupabase.ts` permite usar la URL y clave **publicable** de UGO PROD solo al configurar `VITE_UGO_ROLE_DATABASE_TARGET=prod-preview`; sin esa variable se mantiene TEST. Las sesiones locales se separan por base y rol. Admin (`src/lib/supabase.ts`) sigue TEST.
- Test de contrato añadido (`tests/contracts/service-chat.test.mjs`) en commit `98a0dbf1`.
- **ADVERTENCIA**: esto conecta el cliente Supabase por rol, **no demuestra** que todas las consultas, RPC, funciones serverless, Storage y Realtime de las aplicaciones usen el mismo proyecto. Prohibido desplegar o habilitar la variable públicamente hasta auditar dependencias, backups, RLS y Auth y pasar E2E.
- Autenticación Cliente/Proveedor en PROD no probada. Ninguna modificación de base realizada. CI de commit pendiente.

## Verificación posterior — 2026-10-30 16:49 BRT
- SHA inspeccionado: `dc8645dafcd2b02f43db3386a9c4388c81a61d54`; PR #603 OPEN/DRAFT. 7 workflows: Roadmap PASS, Groq SKIPPED, Core CI + Cross Security + Admin Realtime + Hugo Timeout + Cross-role UI FAIL.
- **Causa raíz comprobada en logs:** todos los cinco FAIL terminan en `npm run verify:test-env`: `src/lib/roleSupabase.ts` contenía referencia directa al ref de Supabase PROD. El opt-in `VITE_UGO_ROLE_DATABASE_TARGET=prod-preview` y la clave publicable PROD introducidos en esta rama contradecían el guard TEST, aunque no hubiera cutover activo.
- **Corrección:** commit `6db01445` elimina la ruta opcional PROD y mantiene `UGO_SUPABASE_URL`/`UGO_SUPABASE_PUBLISHABLE_KEY` con almacenamiento aislado por entorno/rol. Commit `ae25733c` reemplaza el contrato de opt-in por aserciones de aislamiento TEST y prohibición de override. Sin escrituras de base ni cambio de secretos, despliegue o tráfico.
- **Gates:** nuevo CI exact-SHA pendiente; tras superar guard, comprobar si Auth TEST vuelve a devolver HTTP 504 en runtimes. No marcar PASS antes de ejecución. Backups, compatibilidad RPC/RLS y E2E reales pendientes. **NO MERGE** mientras no haya garantías completas.
- Siguiente acción verificable: observar Core CI y los 4 runtimes del nuevo SHA, leer logs de fallos reales y corregirlos en la misma rama, sin relajar assertions.


## Verificación CI exact-SHA — 2026-10-30 17:25 BRT

- PR #603 continúa **OPEN/DRAFT**, mergeable pero `mergeable_state=unstable`. HEAD evaluado `5095c9bc926dd34c64215383414b95cbfdaf35aa`; `main` permanece `9d07fcee653b6035b9aa3977134d40e442e89b01`.
- GitHub Actions para ese HEAD: **Core CI PASS** (`41118615102`), **Cross Security PASS** (`41118615023`), **Hugo Timeout PASS** (`41118614921`), **Roadmap Traceability PASS** (`41118615031`), Groq smoke SKIPPED (`41118615176`).
- **Admin Realtime FAIL** (`41118614941`): build + contratos PASS; browser runtime `scripts/admin-realtime-runtime.mjs:110` agotó 20 s esperando `.ugo-admin2-status` después del login. No se probó el cambio realtime ni se generó evidencia runtime aprobada. No afirmar causa interna de la sesión sin trazas adicionales.
- **Cross-role UI FAIL** (`41118615020`): `ADMIN_SESSION_FAILURE operator desktop` y `ROLE_UI_FIXTURE_CLEANUP_FAILED`; `usuarios` DELETE reportó `canceling statement due to statement timeout` y Auth DELETE `Gateway Timeout`. La comprobación posterior reportó identidad/registro TEST remanentes. Esto constituye un **riesgo de fixtures huérfanos**; no volver a ejecutar creación masiva de fixtures hasta verificar/limpiar en TEST de manera controlada. Nunca intentar limpiar en PROD.
- La evidencia muestra indisponibilidad o degradación de operaciones TEST, pero no permite demostrar que el frontend sea libre de regresiones. No suavizar aserciones ni marcar fallos como PASS.
- **NO MERGE**: runtime Auth/UI/Realtime, limpieza verificable de fixtures, backup, RLS/RPC y E2E pendientes. Sin modificaciones de PROD, secretos ni tráfico.
- **Próximo paso verificable**: consulta acotada y solo lectura en TEST para comprobar el fixture huérfano y disponibilidad de Auth/DB; ejecutar cleanup TEST controlado solo cuando el servicio responda, y repetir runtimes exact-SHA con evidencia. Si TEST sigue degradado, mantener bloqueo y trabajar en aislamiento de CI offline sin fingir E2E.

## Seguimiento exact-SHA — 2026-10-30 18:28 BRT

- PR #603 **OPEN / DRAFT**, mergeable, HEAD `8d4aa92fd902ac6ab82b0bc5d1be2978bdb5898f`. No merge.
- GitHub Actions del HEAD: Core CI **PASS** (`41123157630`), Cross Security **PASS** (`41123157597`), Hugo Timeout **PASS** (`41123157818`), Roadmap Traceability **PASS** (`41123158025`), Groq smoke **SKIPPED** (`41123158112`). Admin Realtime **FAIL** (`41123157459`) y Cross-role UI **FAIL** (`41123157838`).
- Admin Realtime: build y 10/10 contratos PASS, pero el runtime abortó al iniciar sesión `signInWithPassword` por HTTP **504 Gateway Timeout** (`scripts/admin-realtime-runtime.mjs:20`). No hay prueba de Realtime completa.
- Cross-role UI: build y prueba visual de chat Proveedor en anchos 390 y 430 px PASS, pero la preparación de fixtures abortó con `ROLE_UI_FIXTURE_CLEANUP_FAILED`: `usuarios.delete` reportó `canceling statement due to statement timeout`. No hay E2E por roles aprobado.
- **Verificación posterior de solo lectura en Supabase TEST:** para el fixture `5b3a76fd-f45d-4c18-8426-4ed7c3cbf884`, `profile_exists=false` y `auth_exists=false`. Por lo tanto, ese fixture específico **ya no existe** en ninguno de los dos stores al momento de la consulta, aunque el test falló legítimamente al no poder verificar limpieza durante su ejecución. No declarar PASS retrospectivo.
- Inventario agregado de fixtures `role-ui-%@example.com` en TEST: **35** identidades Auth y **34** perfiles `usuarios`; **1** identidad Auth sin perfil y **0** perfiles sin Auth. No atribuir todos esos registros a esta PR sin auditar fecha/propietario. No eliminar masivamente ni modificar PROD.
- Estado externo Vercel para ese SHA: **pending**. Backup/rollback, revisión de Auth/RLS/RPC y runtime E2E continúan sin certificación. **NO MERGE**.
- Siguiente paso verificable: diagnosticar latencia y timeout en Auth/PostgREST TEST, identificar el único fixture Auth sin perfil y su origen mediante lectura, preparar limpieza TEST acotada y auditable, y repetir ambos runtimes exact-SHA cuando TEST esté estable. Mantener assertions de limpieza y no saturar TEST con reintentos.

## Seguimiento exact-SHA — 2026-10-30 20:37 BRT

- PR #603 sigue **OPEN/DRAFT**, mergeable, HEAD previo a este informe `a835e85c3272cc0a7dce4ccf3292a498e2515a1b`; **NO MERGE**.
- GitHub Actions exact-SHA: Core CI **PASS** (`41131465068`), Cross Security **PASS** (`41131465012`), Hugo Timeout **PASS** (`41131465127`), Roadmap **PASS** (`41131465140`); Groq **SKIPPED**. Admin Realtime **FAIL** (`41131465030`) y Cross-role UI **FAIL** (`41131465075`).
- Admin Realtime: `signInWithPassword` devolvió HTTP 504 `Gateway Timeout` en `scripts/admin-realtime-runtime.mjs:20`; sin prueba realtime real aprobada.
- Cross-role UI: chat Proveedor visual **PASS** en 360/390/430 px; `ADMIN_SESSION_FAILURE admin desktop` y `ROLE_UI_FIXTURE_CLEANUP_FAILED`. La limpieza reportó timeout SQL y 504 Auth para fixture `0b8d87ac-9a1a-4c61-8b8d-44991aa60f8e`.
- **Nuevo hallazgo material:** consulta SQL **solo lectura** posterior en Supabase TEST confirmó `auth_exists=true` y `profile_exists=true` para ese fixture específico. A diferencia del fixture de la ejecución previa, este **sí permanece** en ambos stores. La misma conexión TEST permitió leer `pg_stat_activity` (4 idle ClientRead, 2 active, 2 Extension), lo cual no prueba salud de Auth ni descarta timeouts.
- **Bloqueo de integridad:** no repetir masivamente creación de usuarios temporales ni borrar cuentas por patrón; primero identificar y limpiar exclusivamente fixtures atribuibles a pruebas, con control de propietario, respaldo y verificación posterior. No se efectuaron DELETE, cambios de secretos, cutover ni escrituras en PROD.
- Siguiente paso verificable: aislar y limpiar de manera auditable ese fixture TEST cuando Auth/PostgREST respondan; investigar 504 y latencia, repetir ambos runtimes en el **mismo SHA** con limpieza comprobada, verificar backups y Auth/RLS. No forzar merge ni convertir tests en SKIP.
