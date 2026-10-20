# UGO Hive — checkpoint de implementación autorizada

Solicitud: 18/10/2026. Alcance: ramas aisladas, pruebas locales, lectura remota; US$0. No merge, no deploy, no cambios remotos de datos/secretos. La orden actual autoriza implementación local y prevalece sobre el permiso documental histórico de las secciones18–20.

**Estado global: BLOCKED_HUMAN para publicar las ramas; IN_PROGRESS para HU1–HU3. Hive NO está operativo.** No hay autorización para inferencia ni Empresa Autónoma ON. Los resultados locales no acreditan almacenamiento remoto, facturación ni producción.

## Fuente exacta y conservación de los PR

| Repo | main revalidado | PR/base de trabajo | SHA fuente del PR | SHA de código local |
|---|---|---|---|---|
| UGO | `79311730801fad2b717c36ee552421ed5302272b` | [#515](https://github.com/sebastisnzoth/ugo-admin-panel/pull/515), `codex/hive-openrouter-test-router-20261018` | `b2ed42a99891d87806cd912e3ea72047b88a81ee` | `94c589b8d48a9b8c551a44526f1f12a36241c901` |
| FreeLLMAPI | `47c3a451e88242a97d274777a29a4dbf289e3e17` | [#1](https://github.com/sebastisnzoth/freellmapi/pull/1), `docs/ugo-render-free-deployment-plan-20261018` | `83617bcaae874c656124e5b5c82c83ee5ff67001` | `2cebd76a61957c4b6fd94495e15f3850b631fb52` |

Ramas locales: `work/hive-durable-router` y `work/hive-persistence`, derivadas de los HEAD anteriores; ningún cambio previo se eliminó. Ambos PR están abiertos, en borrador y sin conflictos según GitHub al inspeccionarlos. No se actualizaron referencias remotas: el SHA del PR #515 tiene estados de previews Vercel/Netlify, por lo que un push puede desplegar. El tag `[ugo-test-only]` sólo acredita la guarda Vercel del repo; no permite asumir que los demás proyectos y Netlify omitan el despliegue.

CI fuente del PR #515: Core39166529052, Cross Security39166529047 y Hugo Timeout39166529054, todos success para `b2ed42a…`. [Core CI](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/39166529052). PR #1 no devolvió runs para `83617b…`. Ningún verde anterior se atribuye a los nuevos commits locales.

## Unidades implementadas y límites

### HU0 — auditoría

Se leyeron los cambios completos de ambos PR, código de backup/restore, Dockerfile, entrypoint, boot/config, tests y workflows relacionados. Licencia FreeLLMAPI: MIT; esto no autoriza automáticamente los proveedores. No se aprobó ninguno para inferencia real.

Se conserva el scheduler existente: `scripts/ugo-scheduler-engine.mjs`, `docs/UGO_SCHEDULER_POLICY.json`, `autonomous_claim_job`, `autonomous_worker_cycle`, `autonomous_jobs`, catálogo/capabilities y ledgers. Capacidad actual de política: `model-router=1`, `openrouter=1`, `ugo-test-worker=1`; no se modificaron ni se crearon agentes, misiones o un scheduler alternativo. El claim existente exige ON/SAFE_MODE y respeta kill switches; no se lo eludió.

Supabase Arena TEST `tmossnqfwfwjrtzwcbmm` fue consultado en solo lectura. Sus buckets privados sirven documentos/KYC/evidencias; ninguno está dedicado a FreeAPI. No reutilizar esos dominios. Render devuelve un workspace accesible, pero `list_services=null` es ambiguo y no prueba ausencia de servicios. No se verificaron tarjeta, cuota restante, permisos de repo en Render ni facturación del workspace.

### HU1 — persistencia preparada y probada localmente

FreeAPI mantiene el envelope `FAPIBK1\0 + IV12 + tag16 + AES-256-GCM(gzip(SQLite))`; claves de 32 bytes hex, con `FREEAPI_DB_BACKUP_KEY` separado de `ENCRYPTION_KEY`. El token bearer es otra credencial y el receptor no conoce ninguna clave de descifrado.

Cambios: snapshot consistente `VACUUM INTO` en directorio privado, límite8MiB cifrado/64MiB restaurado, GCM + header SQLite + quick_check antes de instalación atómica sin sobrescribir archivos existentes. El modo estricto exige HTTPS/token, no sigue redirects, rechaza GET404/204/200vacío y exige ETag. Un archivo SQLite vacío existente requiere recuperar en una ruta nueva: no se sobrescribe a ciegas. Datos creados desde el último snapshot exitoso pueden perderse; no se afirma RPO cero.

El ETag confirmado se guarda en un sidecar owner-only ligado a URL y ruta del SQLite. Un proceso nuevo reutiliza esa versión, nunca hace un GET para legitimar arbitrariamente un SQLite viejo. Versiones antiguas reciben412. No modificar el sidecar manualmente para resolver conflictos. Una respuesta perdida puede exigir reconciliación humana: se prefiere bloquear a sobrescribir una copia más nueva.

Receptor `supabase/functions/ugo-hive-backup-receiver`: bearer dedicado, guarda estricta TEST, sólo GET/PUT, cuerpo acotado, magic envelope, SHA256 y Storage privado con objetos inmutables. PostgreSQL confirma el puntero por CAS y conserva3 versiones. La cola durable de limpieza se escribe ANTES de subir bytes, admite como máximo 32 subidas pendientes y conserva tombstones hasta eliminación confirmada. Limpieza y commit comparten advisory lock; las etapas vencidas no pueden confirmarse. Se usa `clock_timestamp()` y READ COMMITTED. Hay1 hora de gracia para lecturas en curso. Una caída al limpiar no pierde el registro y una nueva petición reintenta; sin tráfico la limpieza no es un worker continuo. Backlog lleno bloquea nuevas subidas. GET rechaza copias de más de24 horas para revisión explícita de frescura/revocaciones.

El máximo de35objetos administrados de8MiB es un límite conservador de diseño, no cuota gratuita comprobada. Auditar otros objetos/consumo y egress antes de crear el bucket. La copia completa contiene cuentas/sesiones del SQLite: no equivale al exportador lógico de backups, que tiene otras exclusiones.

**No se creó bucket ni se desplegó receptor.** Para la etapa autorizada siguiente: bucket NUEVO `hive-freeapi-backups`, privado, máximo8388608bytes y MIME octet-stream, sin políticas públicas; migración aditiva local de este cambio; función con verificación del token dedicado (configurar explícitamente su `verify_jwt=false` o flag correspondiente al desplegar). `service_role` permanece únicamente en la Edge Function, nunca en Render. Bootstrap: subir una copia cifrada previamente validada, reservar etapa con `hive_stage_backup`, confirmar con expectedNULL; verificar recuperación antes de arrancar Render en modo estricto. No hay endpoint público de bootstrap/force/rollback.

### HU2 — Render preparado, NO creado

FreeAPI `deploy/render.hive-test.yaml` valida contra el esquema actual de Render; plan free, Docker, HOST0.0.0.0, PORT10000, healthcheck/api/ping, previews off, autoDeployTrigger off,1 instancia, sin discos/databases/addons. Está fuera de la ruta de Blueprint por defecto y no se sincronizó. Conserva Docker/entrypoint existentes con caída a usuario node; no se ejecutó Docker porque el runtime no lo ofrece. Build Node pasó; compatibilidad de contenedor y memoria512MiB siguen pendientes.

`FREEAPI_HIVE_LOCKDOWN=true`: healthcheck mínimo; resto exige token y devuelve HIVE_INFERENCE_NOT_ENABLED aun con token válido. No hay flag para activar inferencia en ese middleware. La manifest selecciona una rama mutable: antes de crear/desplegar deberá fijarse y comprobarse el commit publicado exacto mediante el mecanismo de deploy específico; no basta copiar el YAML.

Fuente actual leída: https://render.com/docs/free.md y https://render.com/docs/blueprint-spec.md; schema https://render.com/schema/render.yaml.json. Free web: suspensión15min, reactivación≈1min,750 horas compartidas/mes, filesystem efímero. Con método de pago, excesos de banda/build pueden facturarse; sin método, el servicio/build se suspende. Por eso no se declaró costo de cuenta verificado ni se creó servicio. No usar pings artificiales. Un timeout15s de inferencia no resuelve cold start1min: el scheduler deberá esperar/reintentar de forma acotada sin reenviar solicitudes de resultado desconocido.

### HU3 — seguridad y cuotas preparadas, inferencia bloqueada

Se eliminó Map del gateway. Mantiene autorización real `auth.getUser` + perfil activo Super Admin y URL exacta TEST. Métodos/JSON/payload se validan con lectura streaming acotada; no se consulta proveedor mientras el gate está cerrado.

SQL `hive_reserve_model_call`: reserva durable, atómica, idempotente y sólo service_role; exige actor Super Admin activo y job canónico RUNNING propiedad del actor. No crea jobs. Límites conservadores:20 llamadas globales/día UTC,10/actor/día,5/job total,15/proveedor/día,20000 tokens reservados/día,2048/reserva. Errores, caídas y requests duplicados no devuelven cuota. Las cuotas están fuera del SQLite y no se restauran con él. Circuit breaker persistido y fallos429 acotados. La semántica multi-sesión debe probarse en PostgreSQL real: PGlite comprueba SQL/persistencia, pero no equivale a stress multi-conexión remoto.

`policy.mjs` prepara allowlist exacta, todos los precios explícitos cero, evidencia backend de términos/factura, TTL máximo1 hora, timeout15s, sin redirects, tamaño de respuesta y tokens acotados, rechazo de modelo diferente/precio ambiguo y metadatos de uso sanitizados. Su preparación NO consulta un catálogo real ni prueba factura cero. OpenRouter permanece sujeto al gate principal; no se usó su secreto.

**Hallazgo bloqueante:** FreeAPI puede unificar un modelID entre proveedores y hacer fallback interno. Por tanto se rechazan TODAS sus rutas en la política, aunque alguien declare `pinning_verified=true`. Sigue pendiente un contrato ejecutable que fije proveedor+modelo+endpoint, niegue fallback interno y confirme el proveedor servido. El respaldo no puede simular que existe un primario seguro. Ninguna función ni variable habilita la inferencia actualmente.

### HU4/HU5

No ejecutados: llamada gratuita real, facturación cotejada, integración Reina, misión versionada autorizada, worker, intercambio entre agentes, evidencias Judge/Sentinel y resultado en Super Admin. Dependen de infraestructura/secretos/autorizaciones y del contrato de pinning. No hay118 procesos ni Empresa Autónoma ON.

## Pruebas y revisión

Evidencia reproducible en `docs/ugo-hive/evidence/`, identificada por SHA del código. La prueba conjunta `FREEAPI_CHECKOUT=../freellmapi node scripts/hive-backup-local-integration.mjs` usa cliente compilado real, receptor real, HTTPS loopback con CA efímera confiable, PostgreSQL embebido y archivos desechables. Restauró2 filas después de eliminar SQLite/reabrir receptor+PostgreSQL; otro proceso continuó mediante sidecar; probó concurrencia,401,412,502 y fallo de limpieza seguido de recuperación. No contacta modelos ni Storage remoto. No declarar persistencia REMOTA verificada.

Revisión independiente por subagente de code-review (no el ejecutor): detectó y provocó las correcciones de ETag, restore vacío, CAS no estricto, pinning y carrera de limpieza. Esto es revisión de código; no sustituye Judge/Sentinel desplegados. Las guardas de código siguen OFF. Sentinel remoto fue consultado en lectura: hay incidentes históricos de ratings/agenda/otros SHAs; ausencia de incidentes para commits no desplegados NO es PASS runtime. No se cerró ningún incidente ni checklist.

La suite completa FreeAPI fue bloqueada por revisión automática al intentar api.test.com mediante SOCKS; no se reintentó esa conexión. Se ejecutó únicamente el subconjunto local específico y migraciones. UGO conserva warnings preexistentes de lint; distinguir0 errores de0 warnings.

## Checkpoint canónico

`TASK_ID | STATUS | REPO | BRANCH | SOURCE_SHA | RESULT_SHA | TESTS | RUN_ID | EVIDENCE | JUDGE | SENTINEL | COST | BLOCKER | NEXT_TASK`

| TASK_ID | STATUS | REPO/BRANCH | SOURCE_SHA → RESULT_SHA | TESTS/EVIDENCE/RUN_ID | JUDGE / SENTINEL | COST | BLOCKER / NEXT_TASK |
|---|---|---|---|---|---|---|---|
| HU0 | IN_PROGRESS | Ambos, ramas locales indicadas | fuentes→SHAs código anteriores | PR/CI/lecturas/archivos, run local-HIVE-20261018 | code-review independiente / runtime no ejecutado | no recursos creados | Render inventario/billing ambiguos; revalidar tras permiso |
| HU1-LOCAL | IN_PROGRESS | Ambos | fuentes→SHAs código anteriores | backup+SQL+HTTPS, evidencia local | code-review / runtime no ejecutado |0 llamadas modelo | falta bucket/Storage real; probar restore remoto autorizado |
| HU2-PREP | IN_PROGRESS | FreeAPI/work/hive-persistence |83617bc→2cebd76 | schema+build+guard | code-review / runtime no ejecutado |0 servicios | falta Docker/plan/cuenta/SHA publicado/aprobación |
| HU3-PREP | IN_PROGRESS | UGO/work/hive-durable-router |b2ed42a→94c589b | SQL+política+auth+gate | code-review / runtime no ejecutado |0 llamadas modelo | pinning+catálogo+cuotas remotas+factura+permiso |
| HU4 | BLOCKED_HUMAN | TEST, sin escrituras | ninguno | no ejecutado | no ejecutado / no ejecutado | no consumo | no infraestructura/inferencia autorizada |
| HU5 | PENDING | scheduler existente | sin cambios | no ejecutado | no ejecutado / no ejecutado | no consumo | dependeHU4 |
| PUBLISH-PRS | BLOCKED_HUMAN | PR #515 y PR #1 sin actualizar | conservados | estados de previews existentes | revisión código local | no nuevosdeploys | autorizar previews o bloquearlos antes del push |

Ninguna fase se autocertifica VERIFIED. Las pruebas locales aprobadas tienen su resultado propio; las casillas globales remotas permanecen abiertas.

## Siguiente paso y rollback

1. Autorizar actualización de PR #515/PR #1 considerando sus previews automáticos, o autorizar un mecanismo que los omita de forma comprobable. No fusionar. Los bundles y patches adjuntos conservan los cambios sin activar hooks.
2. Antes de cualquier recurso: terminar pinning FreeAPI y auditar proveedor gratuito concreto; confirmar cuenta/plan, US$0, cuota y sin tarjeta/overages; fijar SHA final. Agrupar aprobación de bucket/receptor/migración/secretos/RenderTEST y ensayo remoto con alcance preciso. No solicitar activación de inferencia por copiar este documento.
3. Crear sólo tras esa aprobación, medir restore/redeploy/coldstart y cuota global multi-sesión; comparar facturación. Después, permiso independiente para llamada pública mínima, misión y worker canónicos.

Rollback local: descartar estas ramas conservando los HEAD originales; no reset ni force. Rollback futuro remoto: mantener inferencia OFF, revocar token dedicado/suspender únicamente el servicio TEST creado, conservar copias cifradas y evidencias; no restaurar cuotas desde SQLite ni borrar tablas/buckets sin autorización. Las claves de backup y ENCRYPTION_KEY se rotan por procedimientos separados, con recifrado/restore de ensayo y retención controlada; nunca imprimirlas. Rotar el token invalida el anterior y exige coordinar receptor/cliente, sin revivir sesiones o claves revocadas desde copias antiguas.

### Resultado final de validación local

Código UGO `94c589b8…`: suite general **1438 PASS / 8 SKIP / 0 FAIL**; suite focal Hive + contratos originales **18 PASS**; build y Deno check aprobados; lint **0 errores y978 warnings**, mismos warnings que la corrida inicial. Código FreeAPI `2cebd76…`: **19 PASS / 1 SKIP / 0 FAIL**, build y lint aprobados. La omisión FreeAPI corresponde a ACL Windows; las8omisiones UGO no prueban los gates remotos aislados.

Interoperabilidad HTTPS local: PASS; restore local42ms en la última ejecución,2filas conservadas, reinicio de proceso separado+receptor+PostgreSQL, rechazo401/412/502, concurrencia y fallo/recuperación de limpieza. No extrapolar ese tiempo a Render. Esquema Render: PASS; Docker: NO EJECUTADO.

La revisión independiente final no encontró bloqueos concretos restantes para este código de preparación. Judge/Sentinel runtime, Storage remoto, facturación y proveedor real siguen sin ejecutar. Los archivos de evidencia identifican el SHA de código; el commit posterior sólo añade documentación/evidencia y conserva ese árbol funcional. Ver `evidence/results.json`, `evidence/source-manifest.json` y logs.

### Autorización persistente — 18/10/2026 18:49 BRT

El usuario indicó: «dejar todo siempre documentado y sí lo autorizo si está verificado y no rompen nada». Se aplica a la solicitud concreta anterior: actualizar PR515/PR1 y sus previews TEST, condicionados a evidencia de verificación, ausencia de regresiones detectadas y costo US$0. No promete riesgo cero ni autoriza merge/producción/Render/secretos/migraciones/inferencia. No volver a pedir la misma autorización; comprobar las condiciones antes de ejecutar.

Se revalidaron fuentes y ambos HEAD remotos continúan b2ed42a y83617bc. Netlify reportó plan Free; las respuestas Vercel de team/project/deployment no exponen plan/billing suficiente para acreditar US$0. Por tanto no se hizo push ni se activaron previews. Se actualizaron de forma remota las descripciones de PR515 yPR1, conservando sus cuerpos anteriores y agregando autorización, SHAs locales, pruebas y bloqueos. Los nuevos commits de implementación siguen fuera de las ramas remotas. Reanudar publicación cuando se verifique costo cero o una omisión de builds comprobable; no reinterpretar la autorización como gasto permitido.

### Canal web vigente — 18/10/2026 18:53 BRT

El usuario informó que pausó Vercel y descartó Netlify: GitHub Pages es el único destino web. Esta instrucción desbloquea actualizar las ramas de desarrollo; los títulos de PR515/PR1 incluyen `[skip netlify]` para omitir Deploy Previews. No se cambian ni se crean recursos Vercel/Netlify. La pausa Vercel fue informada por el usuario, no una modificación ejecutada por este agente. El bloqueo anterior de publicación por previews queda superado para este push, manteniendo el presupuestoUS$0 y CI exact-SHA.

No incluye merge/main, deploy Pages, Render, secretos, migraciones ni inferencia. Pages sirve el frontend estático; FreeAPI/SQLite/workers/Edge Functions necesitan backend separado autorizado. No presentar las funciones preparadas como ejecutables dentro de Pages. Mantener documentados los resultados de CI de los nuevos HEAD.

### Publicación del código en los PR — 18/10/2026

Este checkpoint reemplaza el estado anterior «código sólo local / push bloqueado por previews». Se publicó el árbol completo verificado sin modificar main y sin force: UGO commit `f69b429c1dc64ff78fc10cf3707f69ebc3913725`, tree `2fe8d0731f83713e9e8b00fdcd51435ec8db9056`; FreeAPI commit `d097ca1dcee6c5e87618a6e6e37b1617b1260895`, tree `1e8b8556282fcc8e4e7e19809c61d2b59287f07b`. Los árboles remotos coinciden exactamente con los árboles locales preparados; los hashes de código revisado no cambiaron. La conexión GitHub autorizada permitió publicar después de que git por terminal fallara por ausencia de credenciales. Los nuevos commits conservan como padres los HEAD originales de PR515/PR1 y no reescriben historia.

En UGO comenzaron Core CI39169988034, Cross Security39169988008 y Hugo Timeout39169988135 para f69b429c. Sus resultados sólo corresponden a ese SHA; consultar los runs del HEAD actual antes de informar CI validado. FreeAPI no devolvió runs para d097ca1: no atribuirle CI remoto aprobado. Pruebas locales y revisión independiente siguen documentadas, sin sustituir los gates remotos. Netlify omitido por título `[skip netlify]`; Vercel fue pausado por el usuario. GitHub Pages es el único destino web y no se publicó ningún cambio en main/Pages. Hive sigue sin infraestructura/inferencia/worker real autorizados.


### Fusión autorizada y verificada — 18/10/2026 22:23 UTC

Este checkpoint reemplaza las restricciones históricas de «no merge/main» anteriores: el usuario solicitó «ya esta ok verifica para fusionar». PR515 se fusionó en `41919783ce14e859f63366297c98ea276ccdd34a` (tree `bb3114c8543f1a25f3615131c0bd037707885e4b`); PR1 en `77daf32976c83ecfe51a344d0c39ce3a1c86f842` (tree `67a81a04800e4ce552e2817be55c19285d6f7c37`). Los dos árboles son exactamente los de sus PR revisados; merge sin conflictos ni reescritura y preservando ambos padres. No se modificó código funcional después de las pruebas.

Revalidación: Hive18/18PASS; FreeAPI19PASS/1SKIP. CI de PR515 HEAD38c8397: Core39170105838, CrossSecurity39170105845 y HugoTimeout39170105823, todosSUCCESS. FreeAPI no tiene evidencia de CI remoto; Docker y suite completa no verificados. La revisión independiente acredita únicamente preparación de código. Evidencia local completa permanece versionada en ambos repositorios.

Los merge commits incluyen `[skip ci] [skip netlify] [ugo-test-only]`: se omite deliberadamente CI de push, porque el CI general UGO contiene probes reales de modelos y escrituras TEST y Docker FreeAPI publica imágenes en GHCR al recibir pushmain. No se declaran los SHA de merge como CI VALIDATED. Esta fusión no autoriza ni ejecuta esas consecuencias. El CI previo es evidencia de los checks del PR: no se puede inferir de ello ausencia absoluta de llamadas de sus probes ni facturación cero; no se auditaron consumos/facturas del proveedor. Las afirmaciones anteriores «0 llamadas» se refieren al ensayo local y ausencia de invocación manual directa, no a esos workflows existentes.

GitHub Pages es el único canal web. A las22:23UTC, `/status.json` todavía publicaba7931173, de21:32:39UTC. Su workflow programado sigue habilitado, pero cron no garantiza puntualidad; no se declara la nueva revisión PUBLISHED. El conector disponible no ofrece workflow_dispatch, y relanzar un job antiguo no publica HEAD actual. Próximo paso de publicación: ejecutar `UGO GitHub Pages` en main o esperar el schedule y verificar success+source_sha público. No se activa Vercel/Netlify.

No se creó/desplegó Render ni se modificaron schema/bucket/secrets/Edge remotos. Inferencia conserva HIVE_INFERENCE_NOT_ENABLED; Empresa AutónomaOFF. El gateway continúa rechazando FreeAPI hasta pinning verificable. No se crearon recursos pagos; presupuestoUS$0, factura no auditada.

Consulta Sentinel/readiness de sólo lectura: ningún incidente observado para los nuevos SHA no demuestra runtimePASS, todavía no publicados. Persisten incidentes históricosP1 (incluye PROVIDER-AGENDA en otras revisiones); no se resuelven ni aprueban checklist ajenos a Hive. Los gates de Storage remoto, cuota multi-sesión real, facturación, primera misión y Judge/Sentinel runtime siguen pendientes.

`TASK_ID | STATUS | REPO | BRANCH | SOURCE_SHA | RESULT_SHA | TESTS | RUN_ID | EVIDENCE | JUDGE | SENTINEL | COST | BLOCKER | NEXT_TASK`

`MERGE-PREP | VERIFIED | both | main | UGO38c8397/FreeAPIf3d2fb4 | UGO4191978/FreeAPI77daf32 | árboles idénticos;18PASS;19PASS/1SKIP | CI39170105838/39170105845/39170105823+local-revalidation | merges+logs+PR515/PR1 | code-review independiente | consulta read-only;runtime no validado | sin recursos pagos nuevos;factura no auditada | ninguno para integración;gates backend abiertos | comprobar Pages y preparar pinning sin habilitar inferencia`

`PUBLISH-PAGES | BLOCKED_EXTERNAL | ugo-admin-panel | main | 4191978 | no publicado observado | HTTP200/source_sha7931173 | último Pages39168233907 | status.json público | no ejecutado | no runtime nuevo | no gasto contratado | schedule pendiente/dispatch no disponible en conector | Run workflow UGO GitHub Pages/main y comprobar source_sha`

Rollback de integración: nuevo commit revert revisado que revierta exclusivamente estos merges (parentmain), conservando trabajo concurrente; nunca reset/force. Reversión no elimina datos porque no se aplicaron migraciones remotas. Mantener bloqueos de inferencia y no restaurar cuotas desde SQLite.


## 2026-10-19/20 — PR #533, integración P0 Cliente/Proveedor

- PR: https://github.com/sebastisnzoth/ugo-admin-panel/pull/533 (rama `integration/arena-green-provider-gps-20261020`; **sin fusionar**).
- Base verde Arena `28b3e42e8653445529e3d2bfd574f7011e80d8e5`: 13 workflows exitosos. Cambios transportados desde #532: adquisición GPS paralela en `ProviderLocationTracker.tsx` y dos pruebas de contrato GPS. SHA de integración inicial `bcd78349806805e2d508f7ec79a62ab406c34ca0`.
- Evidencia CI sobre `bcd7834`: 12 de 13 workflows exitosos; matching E2E Cliente→Proveedor, Admin Realtime, Provider Actions, seguridad, CI base y cobertura GPS pasan. Ejecución fallida UI multirrol: https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/39350771531 (móvil Cliente, `PROFILE_QUERY_TIMEOUT`, página muestra recuperación de sesión sin expulsar al usuario). **No afirmar 13/13 ni E2E completo** hasta la nueva ejecución exitosa.
- Acción 2026-10-19/20: reejecución del job fallido `118394162168` aceptada por GitHub. Resultado aún pendiente al redactar este checkpoint; verificar CI antes de fusionar.
- Política: sin cambios a producción ni a los datos de usuarios; no simular prueba GPS en dispositivo físico. Se requiere aceptación humana para esta última prueba.
