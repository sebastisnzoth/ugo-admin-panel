# UGO — El camino al primer servicio confiable y a la empresa autónoma

**Para Sebastián · Auditoría y dirección de ejecución · 28 de septiembre de 2026**

## Decisión central

UGO tiene dos resultados encadenados:

1. **Producto:** un cliente real consigue y completa un servicio confiable dentro de UGO en Florianópolis.
2. **Empresa autónoma:** los departamentos operan y controlan ese producto mediante acciones delimitadas, verificadas y auditables, con intervención humana sólo donde corresponde.

El primer resultado fija la verdad del producto. El segundo se construye sobre procesos reales y medidos. No se considera operativo a un departamento por tener nombre, agente, pantalla, modelo o tabla.

**Regla de selección:** sólo iniciar un bloque si corrige el primer paso fallido del recorrido de servicio, elimina un riesgo P0 de seguridad/datos/dinero o es un requisito indispensable para medir o recuperar ese recorrido. Excepciones y cambios de prioridad deben registrar motivo, evidencia e impacto. Un bloqueo externo permite continuar trabajo independiente sin falsificar su cierre.

## Estado verificado al corte

- Repositorio principal: `sebastisnzoth/ugo-admin-panel`; último `main` consultado: `de26b6d6f17b716a49ccbd541e381de498c9e0ce`. Revalidar HEAD antes de cada cambio.
- UGO TEST: `tmossnqfwfwjrtzwcbmm`; autonomía global `OFF` al consultar.
- `CUSTOMER_1`: `BLOCKED` por `QA_COVERAGE_INCOMPLETE`, `QA_RUN_FAILURE` y `CUSTOMER_ACCEPTANCE_NOT_APPROVED`.
- Checklist de primer cliente: 3 de 27 ítems `approved`; 13 de 121 puntos de peso, **10,7 % de readiness aprobado**. Este porcentaje no mide la completitud del código ni de la empresa autónoma.
- 13 departamentos registrados: D1–D12 y D14; D13 se omite deliberadamente. 22 agentes `IDLE`, 96 `DISABLED`. `last_action_at` aparece en seis agentes D9 y uno D14; en los demás departamentos no aparece actividad de agente bajo ese campo. Este campo es una señal, no una auditoría exhaustiva de todos los jobs.
- Cobertura `COVERED`: radio, pagos y lifecycle. `UNCOVERED`: permisos/RLS, roles, GPS/geofence, Realtime, GPS físico de dispositivo, bytes recuperables de fotos y aceptación humana.
- Últimas QA de permisos, roles, GPS/geofence y Realtime: `BLOCKED` con `CALLER_OBSERVATIONS_NOT_AUTHORITATIVE`. Los scripts observaron resultados, pero aún no existe veredicto independiente persistido suficiente para el gate. Las últimas QA de radio, pagos, lifecycle y Meta-QA figuran `PASSED`.
- La consulta de runs para el SHA `de26b6d6` no devolvió workflows; no atribuirle CI verde sin volver a verificar. Documentos de readiness/roadmap conservan como “checkpoint actual” el SHA `c89a9bf…` del 16 de septiembre: es histórico respecto de `main` consultado.

## Por qué se perdió el rumbo

Los maestros ya explicaban la meta, la jerarquía de evidencia y los gates. El problema fue permitir que tareas, agentes y documentos avanzaran como entregas separadas mientras el recorrido completo no tenía una puerta de aceptación que gobernara la elección y cierre de trabajo. La diferencia entre `IMPLEMENTED`, `CI VALIDATED`, `RUNTIME VALIDATED` y `PUBLISHED` se narró de forma inconsistente. El checklist y la matriz corporativa miden cosas distintas y se confundieron. Es una inferencia a partir de los documentos y estados auditados, no un juicio sobre cada sesión pasada.

## Protocolo único para cada bloque

**Entrada:** leer `AGENTS.md`, Governance, Master Index, maestro funcional relevante, HEAD de `main`, CI exacto, UGO TEST, checklist, gate, Sentinel e incidente activo. Elegir una sola hipótesis comprobable. Registrar actor, `serviceId` o entidad, estado anterior/nuevo, permiso, error/recuperación y criterio de salida.

**Ejecución:** reproducir; identificar causa; aplicar cambio mínimo en la capa responsable; probar caso permitido, prohibido y recuperación; integrar de forma segura en `main` según Governance, preservando trabajo concurrente; ejecutar CI aplicable y runtime TEST del mismo SHA.

**Salida:** evidencia enlazada a SHA, entorno, cuenta/rol y `serviceId`; verificador independiente cuando el riesgo lo requiere; actualización de checklist y maestros afectados; próximo fallo exacto. Si falla una condición, el bloque sigue abierto. No cambiar estados para hacer verde un tablero.

**Handoff entre sesiones:** mantener un solo registro operativo canónico con bloqueo activo, criterio de aceptación, SHA base/actual, evidencia, intento y siguiente acción. El agente que retoma debe leerlo y reconciliarlo con las fuentes vivas. Un documento por sí solo no ejecuta el gate: CI y el verificador deben impedir cierres falsos. No crear una segunda fuente de verdad paralela al checklist y a los ledgers existentes.

## Secuencia de entrega y puertas de salida

### Etapa 0 — Verdad y control de ejecución

- [ ] Reconciliar `main`, CI, migraciones TEST, runtime revision, checklist y gate. Separar snapshots históricos de estado actual.
- [ ] Seleccionar una sola ejecución P0 canónica y un registro de handoff; limitar trabajo en curso a ese bloque, salvo riesgo crítico o dependencia independiente.
- [ ] Definir prueba ejecutable con `serviceId` y pasos Cliente/Proveedor/Admin; el reporte indica el primer paso fallido y no sólo un PASS global.

**Sale cuando:** cualquier sesión puede responder qué bloque está activo, qué prueba lo cerrará y cuál fue el último SHA/entorno verificado sin preguntarle a Sebastián.

### Etapa 1 — Integridad del servicio mínimo

- [ ] Crear pedido y preservar `serviceId` exacto; permitir pedidos A+B+C independientes.
- [ ] Proveedor elegible ≤20 km recibe oferta; >20 km no la recibe; aceptación atómica, disponibilidad real y recuperación sin proveedor/timeout/cancelación.
- [ ] Cliente y Proveedor observan asignación y estados convergentes; chat bidireccional Realtime, reload/reconnect y aislamiento entre servicios.
- [ ] GPS reciente real, 0,0/stale rechazados, llegada dentro de 200 m y error claro sin avanzar estado.
- [ ] Cámara/galería, subida a Storage privado y lectura de bytes con ownership; evidencia inicial y final.
- [ ] Aprobación, pago según método, efectivo/deuda UGO, cierre y calificaciones bilaterales; permisos negativos para usuario ajeno y `anon`.

**Sale cuando:** un mismo `serviceId` completa el trayecto en UGO TEST con persistencia, contraparte, fallos y recuperación verificables. Una demo de DB demuestra lógica, no GPS físico, fotos reales o aceptación comercial.

### Etapa 2 — QA que detecta errores reales

- [ ] Resolver el `QA_RUN_FAILURE` de raíz: permisos/roles/GPS/Realtime necesitan verificador independiente sobre evidencia persistida, no booleanos del caller.
- [ ] Repetir pruebas negativas: distancia >20 km, GPS viejo/0,0, geofence, usuario ajeno, agente DISABLED, límite de deuda, kill switch y gate sin aceptación.
- [ ] Probar Meta-QA con defecto sembrado detectado, corrección y regresión permanente.
- [ ] Core CI, RPC/RLS, Worker, Android y runtime TEST corresponden al **mismo SHA**; Sentinel sin hallazgos críticos actuales.

**Sale cuando:** toda cobertura P0 requerida tiene prueba reproducible y fuente independiente apropiada; las fallas no se pueden convertir en verde por un payload autodeclarado.

### Etapa 3 — Prueba física y primer cliente

- [ ] Compilar Android TEST del SHA final con revisión embebida y probar dos sesiones/dispositivos.
- [ ] Ejecutar Cliente → Proveedor → Admin, chat, GPS, fotos recuperables, pago, rating, A+B+C, reconnect y recuperación de excepción sin editar DB.
- [ ] Registrar aceptación humana explícita de `FULL-E2E` y `TWO-DEVICES`; evaluar `CUSTOMER_1` a partir de evidencia real.

**Sale cuando:** Customer #1 aceptado y Launch Gate `READY` conforme al Master. Sin prueba humana, el gate sigue bloqueado aunque toda automatización técnica pase.

### Etapa 4 — Autonomía por capacidades, 13 departamentos

- [ ] Inventariar para cada departamento su primer trabajo útil ligado a una señal real del producto, con trigger, input confiable, autoridad GREEN/YELLOW/RED, executor, verificador, costo, ledgers y recuperación.
- [ ] Probar el worker sin navegador en `SHADOW`, luego una acción GREEN reversible en `ON` dentro de TEST; comprobar kill switch, SAFE_MODE y restauración a `OFF` tras la prueba.
- [ ] Probar YELLOW con doble control y RED con humano. Ningún agente puede otorgarse permiso ni cerrar su propio hallazgo crítico.
- [ ] Promover especialistas `DISABLED` sólo uno por uno, después de prueba positiva/negativa, CI exacto, runtime TEST y auditoría D14. Una agencia sin necesidad operativa aún no exige automatizar 99 especialistas.
- [ ] Validar Model Router y fallback con llamada autenticada, telemetría y costo; una clave configurada o modelo asignado no prueba ejecución.

**Sale cuando:** las funciones elegidas de cada uno de los 13 departamentos producen y verifican acciones reales dentro de límites, y el panel ON muestra estado, actividad, excepciones, costos y forma de detener/recuperar. “No preocuparme por nada” se traduce en supervisión por excepción, no ausencia de control humano para dinero, seguridad o decisiones legales.

### Etapa 5 — Publicación gradual

- [ ] Separar integración `main`, TEST, Preview/Android y producción; comprobar revisión real en cada canal.
- [ ] Revisar secretos, observabilidad, rollback y criterios de parada; activar una zona/categoría controlada y monitorizar servicios completados, fallos y recuperación.
- [ ] Ampliar categorías/zonas sólo tras repetibilidad y estabilidad. UGO B puede aportar UX demostrada, compartiendo contrato de backend, sin convertirse en segundo producto o segundo gate.

**Sale cuando:** el servicio real se repite sin intervención técnica improvisada; fallos se detectan, contienen y reparan; expansión sigue resultados medidos.

## Tablero mínimo para Sebastián

| Indicador | Fuente | Significado |
|---|---|---|
| Servicios confiables completados | Servicios/pagos/evidencias/ratings persistidos | Resultado central del producto |
| Primer paso fallido del recorrido | E2E por SHA y `serviceId` | Próximo bloqueo a corregir |
| Readiness aprobado | `development_checklist` TEST | Aceptación, no volumen de código |
| Customer #1 Gate | `autonomous_release_gate` TEST | Bloqueos exactos de lanzamiento |
| Capacidad autónoma validada | Jobs + Decision/Evidence Ledger + verificador | Departamentos que realmente actúan |
| Hallazgos críticos y recuperación | D14/Sentinel/CI | Riesgo actual y tiempo de resolución |

Reporte de cada bloque: **objetivo → resultado comprobado → evidencia/SHA → bloqueo restante → siguiente acción**. Sin porcentajes subjetivos ni “listo” genérico.

## Qué hace Sebastián

Definir políticas comerciales y límites que no estén aprobados; facilitar dos dispositivos y personas para el piloto; aceptar o rechazar el recorrido real; autorizar publicación, gastos y acciones RED cuando corresponda. El equipo técnico/agentes asume diagnóstico, implementación, pruebas, documentación y seguimiento; no le devuelve a Sebastián decisiones técnicas rutinarias.

## Referencias de método

DORA documenta trabajo en lotes pequeños, límite al trabajo en curso, integración continua y pruebas automatizadas para feedback rápido. Uber describe pruebas integradas de extremo a extremo previas al despliegue y lanzamientos graduales con observabilidad. Son principios aplicables a UGO; no implican copiar la infraestructura ni la escala de Uber.

- DORA, *Working in small batches*: https://dora.dev/capabilities/working-in-small-batches/
- Google Cloud/DORA, *DevOps capabilities*: https://docs.cloud.google.com/architecture/devops
- DORA, *Continuous integration*: https://dora.dev/capabilities/continuous-integration/
- Uber Engineering, *Shifting E2E Testing Left*: https://www.uber.com/us/en/blog/shifting-e2e-testing-left/
- Uber Engineering, *Building Automated Feature Rollouts on Robust Regression Analysis*: https://www.uber.com/au/en/blog/autonomous-rollouts-regression-analysis/

**Primera acción de ejecución:** etapa 0. Obtener HEAD/CI/runtime actuales y una ejecución canónica del recorrido que identifique el primer fallo; después corregir ese fallo. Este documento es una dirección auditada, no una afirmación de que las etapas estén cerradas.

## Registro de continuidad entre sesiones

Este registro indica dónde retomar, pero nunca certifica un estado vivo por sí mismo. Actualizarlo al cerrar cada bloque con fecha, SHA, entorno, identificador de ejecución y evidencia verificable; no publicar secretos, datos personales ni un `serviceId` sensible. Si otra sesión avanzó `main` o TEST, reconciliar primero. Mantener explícito `por verificar` cuando falte evidencia.

| Campo | Estado inicial |
| --- | --- |
| Bloqueo activo | Etapa 0: identificar en UGO TEST el primer paso fallido del recorrido canónico |
| Criterio de cierre | Ejecución identificada por SHA, entorno y servicio; primer fallo y evidencia registrados |
| SHA/CI/runtime actuales | Por verificar al iniciar la próxima sesión |
| Evidencia | Estado auditado al corte arriba; revalidar antes de usar |
| Próxima acción | Verificar `origin/main`, CI y TEST; ejecutar el recorrido disponible y registrar la primera falla |
| Dependencia humana | Sólo la que surja de la ejecución; aceptación Customer #1 requiere evidencia humana real |

Al cerrar un bloqueo, registrar el resultado y el siguiente fallo exacto. Si CI o TEST fallan, conservarlo abierto. No cambiar `approved` ni el Launch Gate para reflejar avances que aún carecen de su verificador requerido.

### Avance del bloque GPS · 28 de septiembre de 2026

- Base verificada al iniciar: `6b91f3a1b4ef457b17f70f707987f2801a96133e` en `main`.
- El harness P0 de UGO TEST ahora comprueba en su propio servicio demo `en_camino` los rechazos de 0,0, GPS vencido, precisión insuficiente y llegada fuera de 200 m. Comprueba que la llegada rechazada no cambia el estado ni crea un evento `llegado`, y luego acepta una ubicación válida dentro del radio.
- La ejecución de prueba terminó dentro de una transacción con `ROLLBACK`; el servicio temporal no persistió. La migración está aplicada en UGO TEST. El SHA final de GitHub y su CI siguen por verificar.
- **Bloqueo activo:** falta persistir y verificar independientemente el resultado de este probe para `gps-geofence`; la cobertura permanece `UNCOVERED`. GPS físico en dos dispositivos tiene su propio criterio y tampoco está demostrado.

### Control de asociación de evidencia QA · 29 de septiembre de 2026

- La migración `20260929144500_qa_evidence_service_binding.sql` impide registrar evidencia independiente de otro servicio o escenario. Al cambiar el servicio de un escenario, invalida su cobertura anterior; la promoción exige que la evidencia corresponda al servicio vinculado.
- Estado: migración aplicada en UGO TEST; prueba reversible positiva y negativa superada, sin filas de prueba persistidas. No confundir este control con GPS físico o cierre de Customer #1.

### Bloqueo Worker GPS · 29 de septiembre de 2026

- En `ecbe9121`, Core CI y RPC/RLS pasaron; Autonomous Worker TEST falló en GPS con `SERVICE_ROLE_REQUIRED`. La ACL real de UGO TEST permite ejecutar la RPC sólo a `service_role`; el claim JWT redundante no existe en llamadas con secret key.
- Cambio preparado: `20260929150000_qa_gps_service_role_claim_compat.sql` preserva la función y su ACL, quitando únicamente ese guard incompatible. Cierre pendiente: migración TEST aplicada, rechazo `anon`/`authenticated`, ejecución GPS independiente y Worker/Sentinel del mismo SHA verdes.
- Resultado `85986f5f`: la primera función ya acepta secret key, pero el harness P0 anidado conserva el mismo guard antiguo y falla antes del juez. La corrección aditiva `20260929151500_qa_p0_harness_secret_key_compat.sql` conserva toda la lógica P0 y el permiso exclusivo `service_role`; aún requiere ejecución y gate completo en TEST.


## Command Center resource safety · 30/09/2026 · pending integration

Base: `08f8823959aee8000764faa38c0770423444a913`. The functional readiness engine now reserves resources from every live global job, including jobs outside the functional catalog and additional resources in its lease. Expired global leases release capacity. This prevents an AVAILABLE control from competing with a global worker for the same resource.

Local verification: three regression cases, 11 readiness tests, 14 scheduler/Command Center tests, full suite 1058 passed / 0 failed / 8 skipped, TypeScript/build and changed-file lint passed. Evidence: `docs/evidence/command-center-resource-safety-20260930.json`. This is not same-SHA CI, TEST runtime, Judge/Sentinel certification or VERIFIED.

Next: integrate safely after confirming automatic Vercel/Netlify deployments cannot violate the no-deploy instruction, then validate the resulting main SHA. Keep readiness unchanged until the required independent validators pass. No production changes or branch ref movement.


## Provider dispute integration · 30/09/2026

PR #307 supplied the active-job dispute entry and a TEST lifecycle probe. Its original Judge/Sentinel only checked caller booleans, so historical PASS is insufficient for authoritative DONE. The integration keeps this control IN_PROGRESS and preserves historical run references. The strengthened Judge independently queries persisted ownership, resolution, audit, notices and actual uploaded synthetic image bytes. Cleanup verifies fixture ownership and reports errors; Sentinel independently checks absence of database, Auth and Storage fixtures. The workflow runs on main in UGO TEST only. Anonymous opening and provider self-resolution are negative probes.

Next: same-SHA runtime/Core CI/Pages, then persist the independent artifacts before closing the lock. Synthetic media is automation evidence; physical camera/GPS and human Customer #1 acceptance remain separate. No deployment to production.

## Recuperación de alertas del proveedor · 02/10/2026

Bloque `provider-notification-recovery`, base `2c7e23b434d68e5e5feb2e3bdb21e64059add633`. `NotificationCenter` suscribe Realtime antes de consultar avisos o inicializar Web Push. La espera de Service Worker tiene un límite de 5 s; su fallo no cancela el canal foreground. Un INSERT válido alerta directamente y la reconciliación posterior se serializa. Focus/online/visibility y un resync visible cada 20 s recuperan eventos perdidos. La selección salta ofertas vencidas o ya alertadas y respeta Offline/deuda. El banner conserva X y cierre a 5 s.

La migración de convergencia de expiración versiona el arreglo de PR #322 que ya existe en Arena TEST: no reemplazar una expiración futura por un deadline de servicio vencido. No cambia GPS, radio, permisos ni estado lifecycle. No se aplicó DDL a producción.

Regresión del consumidor: el código base falla antes de SUBSCRIBED con Push pendiente; el corregido pasa los siete casos del navegador (`scripts/provider-notification-recovery-browser.mjs`). Backend de esos casos controlado: no constituye prueba de matching real, sonido audible ni vibración física. Suite local: 1197 PASS, 0 FAIL, 8 SKIP; build y lint sin errores. CI y runtime deben comprobarse en el SHA integrado; ningún readiness se promueve por estos resultados locales.

Vercel Git deployment queda pausado para respetar la orden de validar sin desplegar; restaurarlo requiere una publicación deliberada. Netlify no se invoca; los commits llevan `[skip netlify]`.

Validación adicional del mismo bloque: run `37029628074`, SHA `e02d6a855f9215ee3872aa8c6e48726153c772b0`, PASS en navegador con matching dirigido autenticado, oferta/notificación persistidas y aceptación. Artifact `11237425414`, digest `sha256:dc40339fb87dd79b2bd25f0a0288ffbd4231c450aa77682c8dd1302dff2797a1`. Los validadores originales sólo inspeccionaban booleanos; se agrega un proceso Persistence Judge que lee DB antes de cleanup y un Sentinel que verifica ausencia de fixtures DB/Auth después. Pendiente ejecutar estos validadores reforzados en su SHA exacto. No prueba matching automático por proximidad ni sonido/vibración físicos.

La regresión agrega un octavo caso: una consulta atrasada de una suscripción retirada no puede alertar luego de pasar Offline. `load()` valida la vigencia del consumidor después de cada await antes de modificar estado o emitir atención. Los resync de un canal retirado no afectan a su reemplazo.

Run `37030359501`: Persistence Judge PASS por lecturas independientes, pero Sentinel FAIL detectó cleanup silencioso: `pagos` impide borrar el servicio por FK. El harness ahora valida ownership/sha/ephemeral antes de limpiar, elimina primero el pago temporal y comprueba errores de cada operación. El residuo exacto de ese run se retiró en una transacción acotada a TEST; DB/Auth confirmados vacíos. El fallo histórico permanece registrado y no se convierte en verde.

Cierre del bloque: código `e701586183b76f12a0fe8ec87aa1efb7a9fab719`; run `37031245964` intento 2 PASS. Ocho regresiones del consumidor, matching dirigido por cliente autenticado, alerta Realtime sin refresh y aceptación por proveedor. Persistence Judge lee DB independientemente; Sentinel confirma eliminación real DB/Auth. Core CI `37031246194` y Provider Alerts `37031246109` PASS. Artifact `11237304347`, digest `sha256:ce8a0b13966658ca00fde1d382915d60ba39295f85cf9b20fc01fa09b6a41ad3`. Sentinel consultado: cero incidentes abiertos para ese SHA. Intento 1 del último runtime falló entrando al proveedor antes del matching; causa no establecida y cleanup comprobado, se conserva histórico. Lock DONE sólo para recuperación de avisos, sin promover readiness global. Sonido/vibración: invocación verificada, no prueba física; matching automático por proximidad fuera del alcance. No producción/Vercel. Este cierre documental no cambia el código probado.

## Matching automático autenticado · 03/10/2026

Base `e148a4b224e17183fe19a12b6e2419b0027e4b15`. Incidentes recientes `client.request.matching` no quedan explicados por la alerta foreground: se reprodujo SQLSTATE 42501 `permission denied for function iniciar_matching_impl` usando el rol SQL real authenticated sobre un servicio propio. La puerta pública `iniciar_matching` es SECURITY INVOKER, pero la implementación privada sólo tenía EXECUTE para service_role. Los QA SECURITY DEFINER podían pasar con un JWT cambiado sin ejercitar este permiso.

La migración `20261003000211_authenticated_matching_gateway.sql` concede sólo EXECUTE authenticated sobre la implementación privada ya protegida por auth.uid y owner/admin. No cambia SECURITY DEFINER/INVOKER, RLS, GPS, radio, deuda, estados ni políticas. PUBLIC/anon siguen sin ejecución. Aplicada exclusivamente a TEST. Rollback: revocar EXECUTE authenticated de la función privada. Probe transaccional bajo rol authenticated: una oferta para fixture con ubicación TEST fresca; no-owner rechazado por wrapper y privada; anon rechazado 42501. Todo ROLLBACK.

El runtime web deja de usar matching dirigido: invoca iniciar_matching con cliente autenticado real, prueba negativos no-owner/anon, refresca posición sintética TEST antes del matching y conserva Judge independiente DB + Sentinel DB/Auth. El harness de consumidor ahora distingue callbacks por tabla/evento y cubre offer INSERT sin aviso y deduplicación offer/notice. Diez regresiones PASS; suite 1282 PASS / 8 SKIP / 0 FAIL, build y lint de archivos modificados PASS. Pendiente evidencia del SHA integrado. GPS/audio/vibración físicos no demostrados.

Para respetar no-deploy se conserva la reactivación existente de deploymentEnabled, pero Vercel ignoreCommand omite commits marcados [ugo-test-only]. Estos commits también llevan [skip netlify]. No se ejecuta publicación ni se toca Supabase producción.

Además se reprodujo y corrigió el click en el banner fallback: su ID temporal offer:<uuid> no corresponde a notificaciones.id. Se omite marcar lectura sólo para ese aviso transitorio exacto y se conserva la apertura del oferta_id. Regresión 11 PASS. Run 37080731560 falló por permiso geolocation prompt: la UI actual puso Offline al fixture, correctamente; el harness debe conceder ubicación sintética sólo al contexto TEST. Se incorpora apertura y aceptación desde UI real, además de lectura DB independiente. No se desactiva el guard de permisos del producto.

Prueba completa `60fa1677faa3d71774f0641249477ea1b7e235a5`: run `37081054367` PASS; cliente real autenticado inicia matching automático, una oferta/notificación correlacionadas, banner sin refresh, apertura y aceptación por UI del proveedor y servicio asignado persistido. Persistence Judge y Sentinel independientes PASS; artifact `11259425363`, digest `sha256:1b29733588b5ed19bfc652775d8ed73cd35fb45c342b8e5e2a5e59252a3baae2`. Core CI `37081054318` PASS; suite local final 1290 PASS / 8 SKIP. El workflow antiguo Provider Alerts `37081054227` falló por geolocation prompt/Offline: se ajusta su contexto sintético TEST y se agregan lecturas independientes de persistencia y cleanup, sin convertir ese probe de notificación directa en matching. En el harness integral se cierra primero el navegador para evitar snapshot loads contra el actor que se está eliminando. Pendiente revalidar ambos workflows. Accessibility `37081054229` falla fuera de este bloque; no certificamos todo el proyecto ni borramos incidentes históricos.

Cierre de última regresión de recepción: la clave offer:<uuid> silenciaba una nueva alerta de oferta reactivada con el mismo UUID. Reproducido timeout del banner renovado; se normaliza el timestamp de expira_at en la clave común offer/notice. Así se deduplica un ciclo y se permite alertar el siguiente. La identificación de aviso transitorio permanece independiente de esa clave para no volver a escribir un ID ficticio en notificaciones. Doce casos navegador PASS (working tree); nueva prueba exact-SHA pendiente. Ambos runtimes anteriores `37081539183` y `37081539151` pasaron en `895c6e84a19e08ae950d5caab985b091d1964964`; Sentinel sin incidentes abiertos en esa revisión.

Cierre verificado del bloque de alertas/matching automático: código `355b5a2e9d66a3758d243d3ba7fbd120a20ffc86`; runtime `37081816627` PASS con matching automático de cliente autenticado, oferta/notificación correlacionadas, banner sin refresh, apertura exacta y aceptación por UI. Doce regresiones PASS. Persistence Judge independiente DB y Sentinel independiente DB/Auth PASS; fixtures eliminados. Artifact `11259262212`, digest `sha256:2c5ae2d1e5637e865da49bfa7b9878f332881b8152cc66d3789f128d7d3c3892`. Provider Alerts `37081816564` PASS con validadores reforzados; Core CI `37081816562` PASS. Vercel hook cancelado por ignored-build-step (`dpl_8XYDb9szsejQbevgj5RYw1VxVcz5`), sin publicación ni Supabase producción. Lock DONE sólo para este alcance; checklist/readiness global no modificados. GPS/audio/vibración físicos siguen sin certificación. Sentinel consultado: sin incidentes actuales de matching/oferta/notificación; quedan CLOSED de agenda/rating fuera del bloque. Accessibility `37081816607` FAIL fuera del alcance, sin afirmar CI global verde. Este cierre documental no cambia el código probado y conserva fallos históricos.

## Reparación Admin/Super Admin · 18/10/2026 · validación en curso

Continuación de PR #503 y #504 sobre `6ab7d84f`. Se integran la verificación de escritura/lectura de usuarios y la conservación del error de autonomía. La consulta actualizada en UGO TEST a las 03:10 UTC devolvió `AUTONOMY_ON=READY`; el snapshot anterior con `AUTOMATABLE_QA_COVERAGE_INCOMPLETE` estaba desactualizado. Esto no activa el modo ON ni acredita Customer #1, GPS físico o aceptación humana.

La recarga de datos usa un error separado del resultado de las acciones para que Realtime no borre un rechazo. OFF/SAFE_MODE no dependen de consultar primero el gate de encendido; la RPC del servidor conserva su autorización. La prueba de comportamiento reproduce el intento de apagar con evaluación ON caída y la pérdida del mensaje ante un modo no persistido.

Los workflows que comparten proveedor TEST conservan exclusión mutua y agregan `queue: max`: la cola de un solo pending reemplazaba/cancelaba las pruebas multirrol antes de crear jobs. Referencia: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency . No se elimina el lock ni se permite ejecución concurrente sobre el fixture.

Se añade al runtime multirrol una cuenta cliente efímera para probar edición desde UI, lectura independiente DB, rechazo a otro cliente y feedback ante cero filas. El probe HTTP de cero filas no sustituye la prueba RLS real. Limpieza de Auth y perfil comprobada. Estado de ejecución y cierre: `docs/ugo-work-locks/admin-superadmin-repair-20261018.json`. CI/runtime same-SHA, Judge y Sentinel pendientes; no certificar reparación integral por los contratos locales.

La primera corrida con queue:max también se canceló antes de crear jobs (`39092971122`), por lo que no se da por corregida con YAML. Se reemplaza la dependencia del fixture compartido de la prueba multirrol por tres identidades robot efímeras exclusivas de cada ejecución (Cliente, Proveedor y Super Admin), con cleanup comprobado de Auth/perfil incluso al fallar setup. La exclusión de workflows que siguen usando el proveedor compartido se conserva sin cambios; multirrol obtiene su propio grupo por SHA porque ya no accede a ese fixture ni invalida sus sesiones. Validación remota de esta revisión pendiente.

La corrida aislada `39093124413` ya ejecutó el navegador (no cancelada); falló antes de Admin porque el cliente robot nuevo no tenía teléfono/dirección/términos del fixture de onboarding. Se completan sólo sus datos sintéticos TEST, sin acreditar consentimiento ni Customer #1 de una persona real. Las cuentas de esa corrida fueron limpiadas; se conserva el FAIL histórico.

Se amplía el formulario Admin: teléfono y foto por URL en `usuarios`; dirección/barrio/ciudad/teléfono en `perfiles_cliente`; contacto profesional, ciudad, bio, experiencia y categoría principal en `perfiles_proveedor`; categorías múltiples en `usuarios.categorias_ids`. Cada tabla modificada exige fila devuelta y lectura posterior concordante. Los mensajes nuevos tienen pt-BR/es/en. El formulario tiene scroll vertical acotado para móvil. Runtime suma edición de Cliente y Proveedor, categorías, desactivación/reactivación y negativos sobre una identidad efímera; no modifica usuarios reales ni finanzas. La validación remota del nuevo SHA está pendiente.

Publicación: el enlace raíz Pages `/?app=admin` respondía 200 con el observatorio, no con la aplicación instalada en `/app/`. Se agrega routing explícito de las cinco entradas conocidas, conservando query/hash de recuperación y sin redirigir el observatorio normal. Seis casos fallan antes y siete pasan con el script. Runtime de perfiles `39093480685` pasó edición Cliente y negativo de cero filas antes de fallar al esperar el rol cambiado por setup externo; se recarga exclusivamente al preparar el fixture Proveedor. El guardado de producto sigue probándose por UI sin recarga que lo maquille. CI Core, Seguridad y Auth de las revisiones anteriores PASS; nueva revisión pendiente.

Regresión de idioma reproducida: al iniciar por primera vez una cuenta Admin sin preferencia remota, la selección del login se reemplazaba por pt-BR y el navegador de prueba dejaba de encontrar la navegación española. La prueba de comportamiento falla con `pt-BR !== es` y pasa usando la preferencia local del login como fallback; las preferencias propias de la cuenta siguen teniendo prioridad y los cuatro contratos anteriores pasan. Se conserva captura de diagnóstico de login para confirmar el siguiente resultado runtime, sin atribuirle éxito todavía.

Permisos: se reprodujo que un Admin podía editar el perfil de otro Super Admin mediante UPDATE directo pese al botón protegido. Se cerró esa ruta en el trigger existente, preservando self-profile, autoelevación y ACL. Negativo SQL autenticado PASS, positivo Super Admin PASS, ambos ROLLBACK; migración aplicada exclusivamente a TEST. Runtime incorpora negativo PostgREST con los actores efímeros, sin usar cuentas humanas. Detalle canónico en `UGO_DATA_BACKEND_MASTER.md`.

Se corrigió otro corte de Pages: el build no definía `VITE_API_BASE_URL`, por lo que crear/importar/restablecer cuentas pedía `/api` al host estático. Pages apunta ahora al backend canónico. `integrations-status` además rechazaba OPTIONS antes de auth; el caso reproducido devolvía 401 y ahora devuelve 204 sólo con CORS allowlisted, manteniendo GET sin bearer en 401. La API comparte los aliases de credencial TEST existentes y reporta Supabase como TEST.

La prueba multirrol levanta las APIs reales del SHA compiladas localmente (sin deploy) y un frontend con base API explícita; prueba creación auditada y reset de contraseña de cuenta efímera, edición/estado y SHADOW→OFF mediante UI/API/lectura DB. OFF se restaura y sólo se compensa un SHADOW de su propio actor. No se pulsa ON ni se acreditan pagos/aceptación humana. Se precisa el nombre accesible del selector de categoría; los diagnósticos nuevos se limitan al diálogo/cuenta temporal y estado de login, sin volcar el directorio.

### Admin/Super Admin follow-up — 2026-10-18

Profile editing now uses `admin_update_user_profile`: active Admin/Super Admin authorization, reserved target restriction, field allowlists, locked base/profile records and one audit append in a single transaction. Migration applied only to UGO TEST. UI reads persisted values independently after RPC. Exact-source runtime includes a real missing-profile rejection and unchanged base-record assertion; no human acceptance is inferred.

Independent review findings (partial saves and competing autonomy probes) addressed. UI and scheduled proof share one autonomy-state concurrency group. The proof formerly ran hourly while readiness expires after 45 minutes, guaranteeing a stale window; cadence is now every 15 minutes. GitHub scheduling delays can still block readiness; no gate is bypassed. Equivalent auth/profile refreshes no longer remount the client onboarding gate. Review accepted source changes; same-SHA browser/CI and publication remain pending at this entry.

### Continuidad — Hive, orden explícita 18/10/2026

El usuario seleccionó HU0/HU1 y preparación HU2/HU3 como alcance del bloque. Se conserva scheduler/claims/catálogo existentes; no se activó autonomía ni se abrió un frente de producto. Retomar desde [checkpoint Hive](ugo-hive/IMPLEMENTATION_STATUS.md), revalidando fuentes y bloqueos. Los incidentes Sentinel de otros SHAs no se cerraron por estas pruebas locales. Publicar ramas exige resolver previews automáticos Vercel/Netlify conforme a la orden actual; ningún verde local habilita producción.


Hive preparación fusionada: PR515→4191978 y FreeAPI PR1→77daf32, árboles idénticos a PR revisados; revalidación18PASS y19PASS/1SKIP. Backend/inferenciaOFF; Pages observado aún7931173. Ver checkpoint vigente en docs/ugo-hive/IMPLEMENTATION_STATUS.md; CI del merge omitido para no ejecutar probes/modelos/GHCR, CI del PR documentado.


### 20/10/2026 — Proveedor Auth: recuperación tras SIGNED_OUT transitorio

Cambio aplicado en `src/mvp/shared.tsx` (`ad695b4f`) y contrato ajustado (`710744f`): cuando el SDK emite SIGNED_OUT pero `getSession()` confirma una sesión válida, se recupera también el perfil y se finaliza la carga; antes sólo se restauraba el objeto de sesión y podía quedar la interfaz esperando indefinidamente. La condición de autenticación verdadera sigue respetada. **Estado: IMPLEMENTADO; falta CI del SHA integrado, smoke autenticado de Online/GPS/refresh y E2E cliente-proveedor.** No confundir con validación de producción. Próxima ejecución: pruebas exact-SHA y corregir cualquier regresión observada antes de publicar.

## Regla de cierre secuencial obligatorio (20/10/2026)

**Cuando termine una tarea, no salto a otra por impulso. Sólo paso a la siguiente cuando la actual esté corregida, probada y registrada con evidencia real.** Antes de cambiar de tarea: comprobar aceptación y ausencia de regresiones; guardar commit/SHA, pruebas, entorno y resultado en `docs/UGO_ROADMAP_MASTER.md` y `docs/UGO_CAMINO_MAESTRO.md`. Si falta una prueba, el estado es **PENDIENTE / NO VERIFICADO**, nunca DONE, y el siguiente paso verificable queda registrado. Si existe un bloqueo externo genuino, mantener el trabajo abierto y pasar únicamente a otra tarea independiente permitida, sin ocultar ni cancelar la anterior. Esta regla alcanza **también todos los compromisos, mejoras y tareas previas pendientes**, incluidos los dos plugins, Auth/GPS/Realtime, HIVE, Empresa Autónoma, Observatory, y los gates de producción. Una nueva instrucción no borra pendientes anteriores; sólo una cancelación explícita modifica la cola. No extender un diagnóstico ni abandonar la reparación por reportar. No convertir falta de pruebas en éxito.


### 2026-10-20 — P0 GPS Proveedor, compatibilidad API productiva (PR #545)

- Estado: **IMPLEMENTADO EN RAMA / NO APLICADO EN PRODUCCIÓN**. La app `main` usa `activar_disponibilidad_proveedor` y `publicar_ubicacion_disponibilidad_proveedor`, RPC ausentes en UGO producción y presentes en Arena TEST.
- Cambio: migración aditiva `20261020223000_production_provider_gps_rpc_compat.sql` con 2 columnas GPS ausentes y RPC autenticadas, autorización de proveedor y rechazo de GPS viejo/inexacto, sin sustituir matching ni políticas o triggers.
- Evidencia pendiente: ejecución en clon del esquema productivo, pruebas runtime de seguridad y E2E Cliente → Proveedor → Oferta, aprobación de migración productiva. No declarar VERIFIED hasta completar la validación.
- CI SHA de PR #545: `60dbe330e61f78e00809ca7f9b887ddee58f068a`; roadmap gate exige esta actualización. Core CI muestra `npm audit` Vite high preexistente y debe remediarse o verificarse sin obviar seguridad.
- Próximo paso: validar contra esquema real sin datos personales, resolver CI, y sólo entonces evaluar promover a `main` y desplegar migración con verificación y rollback.


### 2026-10-20 — Recuperación Cross Regression tras GPS PROD
- Incidente: workflow de push `39514154593` (merge SHA `48f49214`) falló porque `scripts/cross-regression-runtime.mjs` exigía el literal retirado `Reintentar pedido`; UI actual usa `t('clientMatch.searchNow')` con `restartMatching(service.id,true)`.
- Corrección mínima: actualizar solo el guard para exigir el handler real y la clave i18n; no alterar acciones del producto. Rama `fix/p0-cross-regression-retry-label-20261020`.
- Estado: IMPLEMENTADO; antes de DONE exigir Cross Regression TEST same-SHA PASS, resto CI, y preservar P0 GPS/Proveedor prueba física todavía pendiente.


### 2026-10-20 — P0 deslogueo transitorio Proveedor (pendiente de aceptación)
- Reporte humano vigente: Proveedor sigue volviendo al login pese a la reparación GPS productiva PR #545. No marcar AUTH como resuelto.
- Implementación rama `fix/p0-provider-transient-signed-out-grace-20261020`: confirmación de `SIGNED_OUT` vacío tras 1200ms, conservando pantalla y sesión mientras el SDK renueva token; el logout explícito continúa limpiando inmediatamente la sesión. Dos contratos de regresión para desaparición transitoria y confirmación auténtica.
- Estado: IMPLEMENTADO EN RAMA, PENDING_VERIFICATION; requiere same-SHA CI, runtime con cuenta Proveedor y GPS, reconexión, dispositivo físico. Sin publicar hasta validar.


### 2026-10-20 — P0 Proveedor: persiste logout tras PR #548
- Estado **NO RESUELTO** por reporte de prueba humana inmediatamente posterior al despliegue `31c50d7`. No repetir parches de temporización sin conocer la causa.
- Se inspeccionaron `useRoleSession`, guard de `providerData` y cliente Supabase. Lecturas vacías repetidas de `getSession` pueden representar pérdida real del refresh token y los tests de race no identifican esa causa.
- Implementación en rama `fix/p0-provider-auth-trace-20261020`: registro acotado de 40 eventos de Auth (motivo, tipo, hora, sin JWT ni IDs) persistente después de reabrir login; botón para copiar diagnóstico en login Proveedor; test de privacidad.
- Próxima acción: CI same-SHA, despliegue sólo si controles superados, reproducir con Proveedor real y recibir trace saneado. Verificar error Auth/refresh y reparar causa raíz. **No marcar P0 DONE ni aceptación piloto**.


### 2026-10-20 — P0 Proveedor: tormenta de canales Realtime tras refresh
- Evidencia humana traza saneada: 20+ `TOKEN_REFRESHED` y `channel_ready` alternados en ~20 segundos, termina `SIGNED_OUT` y `login_confirmed_signed_out`. Se ve en Vercel y Pages, ambos usando Supabase Arena TEST.
- Causa encontrada en código: `useProviderRealtime` dependía de callback `onChange` recreado en cada render, provocando unsubscribe/subscribe reiterados; el canal del perfil dependía del objeto completo `session` que cambia tras `TOKEN_REFRESHED`. Suscripción inestable alimenta exceso de reconexiones y carga Auth/Realtime. No confundir correlación con prueba definitiva de que es el único origen de logout.
- Cambio P0 rama `fix/p0-provider-realtime-subscription-storm-20261020`: refs al callback y a sesión actual, dependencias por ID estable, dos tests de contrato; sin cambiar negocio GPS/matching.
- Estado `PENDING_VERIFICATION`: ejecutar CI same-SHA, comprobar reducción de renovaciones y canales en navegador real, y retest humano; no declarar DONE sólo por contrato.


### 2026-10-20 — P0 renovación de token en bucle: Calendar opcional
- La nueva traza humana tras PR #550 muestra aproximadamente 35 `TOKEN_REFRESHED` en ~12s, sin tormenta `channel_ready` equivalente, y termina `SIGNED_OUT`/`login_confirmed_signed_out`. Auth **NO DONE**.
- Ruta de código adicional encontrada: `src/mvp/provider/providerCalendar.ts` forzaba `auth.refreshSession()` por todo 401 de API Calendar; `ProviderCalendarIntegration.tsx` carga estado con `accessToken` como dependencia. Un 401 persistente puede crear lazo 401→refresh→token nuevo→status Calendar→401. No se ha comprobado que el usuario estuviera en esa pantalla; verificar vía nuevo test humano.
- Reparación rama `fix/p0-provider-calendar-refresh-loop-20261020`: Calendar opcional no fuerza renovación Auth por 401; informa error sin cerrar sesión ni refrescar token; contratos para evitar regresión, sin tocar GPS o matching.
- Pendiente: CI same-SHA, postmerge check, evidencia de sesión de proveedor en navegador; P0 permanece PENDING_VERIFICATION.


### 2026-10-21 — P0 ubicación manual del Proveedor y matching
- Baseline `main` `8c9e1276f4daf3ea3ba8e67efed610075c9bb41d` (Vercel READY); pedido real de Electricidad a las 16:45 de Florianópolis registrado `buscando`, sin oferta, con logs `provider_dispatch eligible_count=0`.
- Root causes concurrentes: horario del proveedor Online 08:00–18:00 vs duración estimada 120 min (inicio 16:45 permitido, finalización fuera de horario), y GPS que puede caducar al pasar 90 s. Bloqueo RLS impide renovar `matching_expires_at` desde RPC invocadora.
- Cambio aislado de esta rama: al elegir **Actualizar ubicación** estando Online/disponible, además de guardar ubicación base se publica una posición GPS fresca para matching y se actualiza snapshot local, sin activar Online a quien está Offline. Prueba de contrato `provider-manual-location-refresh-matching.test.mjs`. No modifica reglas de matching, ubicación confiable, horarios ni permisos.
- El backend de horario + vencimiento se propone por separado en PR #560; el control de seguridad impidió aplicar la migración a UGO Arena TEST, por lo que **no se aplicó, no hay E2E backend y no debe fusionarse a ciegas**.
- Estado de esta mejora UI: IMPLEMENTADA EN RAMA / CI Y VALIDACIÓN RUNTIME PENDIENTES, nunca marcar matching end-to-end como DONE por este cambio. Siguiente paso: CI same-SHA y validación no regresiva de botón GPS; resolver migración autorizada en TEST y verificar oferta/alerta real.


### 2026-10-21 — P0 nueva_oferta suprimida pese a matching válido · recuperación foreground
- Evidencia read-only UGO Arena TEST: pedido real Electricidad `c27498a3-f5f4-4b96-8b69-573a69023d09`, proveedor elegible a ~3,11 km, oferta `pendiente` creada el 21/10 a 20:09:30 UTC tras actualizar horario 08:00–23:00. PostgreSQL registró `provider_dispatch eligible_count=1`, pero `provider_offer_alert_suppressed` a las 20:09:31–32 UTC; no existe fila `nueva_oferta` persistida para ese servicio/proveedor. Causa exacta: matching GPS <=90s vs trigger de notificaciones <=30s. Hasta alinear backend, Web Push fuera de UGO puede seguir sin emitirse.
- Corrección backend segura diseñada por separado en PR #560 (`20261021201500_provider_offer_alert_gps_freshness_parity.sql`) para unificar los 90s, manteniendo GPS preciso, radio, identidad, disponibilidad y dedupe. La herramienta bloqueó la escritura SQL anterior en Arena TEST; **ninguna migración se aplicó**. No declarar push/cierre P0.
- Corrección frontend independiente (esta rama): `NotificationCenter` recibe las ofertas persistidas ya cargadas por `ProviderData`, recupera alerta visual, sonido y vibración para ofertas `pendiente` con expiración del ciclo de 5 min dentro de los primeros 90 s, incluso si no hay fila `notificaciones`. Reutiliza `signalProviderAlert`, dedupe `oferta_id+expira_at`, guard de disponibilidad, sin lecturas extra, cambios RLS ni notificaciones sintéticas en DB.
- Estado: IMPLEMENTADO EN RAMA / tests del mismo SHA y validación runtime pendientes. El fallback sólo es una alerta **con la app abierta**; no sustituye Web Push. Revisar CI y P0 E2E antes de merge.


### 2026-10-21 — P0 GPS del Proveedor: recuperación directa desde radar (candidato)
- Baseline GitHub `main` `c2ab5c57fd4efeff36367cc239409433ae0da6da` publicado en Vercel. Arena TEST: varios perfiles Online/disponible con GPS superior a 90 s; no se los debe considerar aptos para matching. De los cuatro pedidos reales consultados, cuatro tuvieron al menos una oferta histórica; esto NO demuestra recepción actual de alertas.
- Mitigación mínima en rama `fix/p0-provider-gps-retry-from-radar-20261021`: los avisos `Online sem GPS válido` y `Localização desatualizada` incluyen el botón `Atualizar GPS`. Sólo dispara `getFreshBrowserPosition()` y el RPC existente `publicar_ubicacion_disponibilidad_proveedor` para un proveedor que ya figura Online, con timestamp y precisión validados; **nunca** altera Online/Offline ni amplía tolerancia 90 s/250 m.
- Se agregó contrato `tests/contracts/provider-radar-gps-manual-retry-20261021.test.mjs`, traducciones pt-BR/es/en y control táctil 44 px; validar CI same SHA y Android real antes de declarar DONE. No se creó migración, no se aplicó SQL, ni se modificó Supabase PROD.
- La migración en PR #560 (horario inmediato y deadline) sigue sin ejecutar en TEST por bloqueo de seguridad y conflicto con `main`; no fusionarla ni sustituir E2E real con contratos.
- Objetivo medible: volver a publicar GPS reciente desde la alerta sin que se desloguee el Proveedor y comprobar nueva oferta + notificación + sonido + aceptación en dos sesiones. Estado `IMPLEMENTED / CI PENDING / HUMAN E2E PENDING`.


### 2026-10-21 — CI exact-SHA: accesibilidad Admin y pruebas de navegador sin falsos bloqueos
- Base de corrección: `main` `d0f501c7e2515d3a6094b34a4bac2f2b757f6084` (UGO TEST / Vercel READY); PR #564 `fix/ci-a11y-provider-visual-20261021`.
- `UGO Cross Accessibility Runtime TEST` run 39676501503: AXE confirmó contraste insuficiente en `.mvp-kicker` y el submit del login de Admin. Corregido el kicker blanco/negro con prioridad CSS y botón Admin `#075bb8` para texto blanco WCAG AA. No cambia el color violeta de Super Admin.
- `UGO Provider Readiness Batch TEST` run 39676501536: selector basado en nombre literal `Trabajo` fallaba porque el nombre accesible cambia a `Agenda` o estado del servicio. Se comprueban los cuatro `data-testid` existentes con `waitFor(state: visible)`, sin omitir controles.
- `UGO Cross Visual Runtime TEST` run 39676501530: `ECONNREFUSED 127.0.0.1:4174` porque invocaba `role-ui-runtime.mjs` sin levantar el backend API de TEST. Se inicia el servidor local de la misma revisión (`scripts/admin-api-runtime-server.mjs`) con `UGO_TEST_ONLY`, `VITE_API_BASE_URL`, verificación `/__health` y cierre de procesos por trap. No se mockea la API.
- Contratos en `tests/contracts/ci-a11y-provider-visual-20261021.test.mjs`. Mantener pruebas reales Auth/RLS, matching y alertas separadas. Fase `IMPLEMENTED / CI CHECK`; no declarar corregido lo que sólo tenga prueba estructural.
- Sin cambios de SQL, matching, notificaciones, Auth, GPS, secretos ni Supabase PROD. Verificar la revisión exacta y el navegador antes de fusionar a `main`.

- Revalidación del PR #564: `UGO Cross-role UI Runtime TEST` run 39678359088 falló sólo en `testTranslations()` después del recorrido desktop: esperaba `.ugo-client-root` tras reload, aunque artefacto `role-ui-client-desktop.png` demuestra Cliente autenticado en `Tu perfil` (`.ugo-client-profile-panel`). Se actualizó el locator para esperar sólo Home o Profile autenticados, sin admitir login; nuevo contrato de persistencia. Fase `FIXED IN PR / SAME-SHA BROWSER RETEST PENDING`. Core CI anterior PASS para las reparaciones de contraste/nav/API, pero el nuevo HEAD requiere CI nuevamente.

## Continuidad 21/10/2026 — método y compromisos del chat (prioridad operativa)

### Mandato del usuario: **resolver la manera de trabajar**
La conversación insistió repetidamente en que UGO está desordenado porque se atienden incidentes aislados, se abre otro frente, y nunca se entrega un **proceso completo cerrado y verificado**. El usuario reclamó ejecutar todas las decisiones aprobadas, no sólo reconocerlas, explicar por qué falló, ofrecer otro prompt o crear un issue. No convertir ejemplos (como la ficha del trabajo) en un nuevo alcance separado cuando la instrucción trata de la metodología general. No pedir al usuario vigilancia continua ni hacerle repetir decisiones. Esta regla ya consta en `AGENTS.md` y `UGO_LECCION_PERMANENTE_CONTINUIDAD_20261020.md`; aplicar, no duplicar sistemas.

### Cola canónica de compromisos expresados y situación al corte (VERIFICAR LIVE AL RETOMAR)

| Prioridad | Proceso completo / obligación | Evidencia disponible | Estado de entrega y puerta de salida |
| --- | --- | --- | --- |
| P0 transversal | **Metodología única**: un bloqueo activo, todos los pendientes previos conservados, continuidad entre chats, mejoras aprobadas ejecutadas, no interrupciones con arreglos sueltos, cierre con evidencia y sin regresión | `AGENTS.md` y este handoff; el propio chat denunció incumplimiento reiterado | **REGLA DOCUMENTADA; ADOPCIÓN OPERATIVA A VERIFICAR**. En cada sesión, reconciliar estado vivo + cola y demostrar trabajo real sobre el proceso priorizado |
| P0 producto | **Cliente → pedido → matching → oferta → alerta/sonido → proveedor acepta → asignación**; respetar ubicación y horarios, sin pérdida/demora injustificada | Issue #567; recuperación foreground en commits previos; pruebas humanas de ofertas demoradas | **NO E2E VERIFICADO 21/10**. Identificar primer fallo con `serviceId`, validar backend, NotificationCenter, UI y Persistencia mismo SHA |
| P0 producto | **Proveedor estable ONLINE**: no deslogueo, GPS autorizado y refresco automático confiable en Chrome Mac, radar real; diferenciar Online de elegibilidad; errores de Auth/Realtime sin tormenta | Incidentes y trazas en este documento; issue #567 | **NO RESUELTO CONFIRMADO**. Prueba real de renovación más allá de 90s y reconexión sin login |
| P1 servicio | **Ficha y recorrido completo de trabajo**, UX ordenada: información cliente/dirección/horario/instrucciones y acciones coherentes (en camino, llegada, iniciar, terminar), sin botones inconexos ni etapas trancadas | Conversación sobre “ficha de trabajo”; el usuario aclaró que es un **ejemplo de problema de método**, no la prioridad por encima del sistema | **PENDIENTE evaluación E2E**. Verificar transiciones con ambos roles y persistencia |
| P1 servicio | **Navegación** desde “Ir a mapa” hacia ubicación real del cliente en Android (Google Maps/Waze/fallback), no destino genérico | Issue #567; fallo humano en teléfono | **PENDIENTE** prueba Android real |
| P1 agenda | **Dos trabajos programados compatibles**, agenda sin bloqueo indebido, poder proponer reprogramación con aceptación/rechazo/contraoferta del cliente y conservar hora original hasta acuerdo | Pedido #2509 22/10 y “consertar tomacorriente” 24/10, ambos aceptados tras demora | **PENDIENTE reprogramación**. Dos reservas simultáneas sí observadas; no inventar bloqueo total |
| P1 agenda | **Modo disponible 24h** con validación UI/backend de medianoche, conflictos y descansos; no prometer push con navegador cerrado sin infraestructura | Issue #567, agenda actual con tramos que rechazan cruce de medianoche | **PENDIENTE** |
| P0 release | Integrar a `main` TODO código validado con CI y runtime del SHA exacto, no publicar regresiones, distinguir documentado/implementado/validado/publicado, consultar Sentinel y checklist | AGENTS.md y múltiples órdenes directas del usuario | **REGLA VIGENTE**. Cualquier PR sin E2E queda abierto, no DONE |
| P1 ecosistema | HIVE/Empresa Autónoma/Observatory, plugins, Admin, fotos, pagos, APK, diseño y traducciones se mantienen en el roadmap; no abrir infraestructura paralela ni darlos por finalizados | Roadmap, maestros y locks históricos | **CONSERVAR EN COLA**, priorizar sólo tras primer servicio P0 salvo dependencia crítica |

### Acción y trazabilidad concreta de este chat
- **Issue #567** https://github.com/sebastisnzoth/ugo-admin-panel/issues/567 creado como registro de síntomas, propuestas de producto y criterios de aceptación. **No es reparación.**
- **PR #568** https://github.com/sebastisnzoth/ugo-admin-panel/pull/568 , HEAD `b56522638dc380a0791d637825d3fa53d1200819`. Se hizo **un parche parcial** sobre presentación de timeout de GPS (30s vs 90s de elegibilidad); se abrió mientras el usuario reclamaba metodología, ejemplo explícito de desviación. **NO VALIDADO, NO MERGED**, no soluciona adquisición GPS automática. Comprobar CI/diff/conflictos y priorizarlo sólo si contribuye al P0 completo; no fusionar a ciegas. El usuario NO autorizó tratarlo como resolución de metodología.
- **Medida estructural aplicada**: ampliación de `AGENTS.md` y este registro canónico para que cualquier chat lea los mandatos antes de trabajar. **Esto es documentación efectiva, NO prueba de que el flujo operativo ya esté resuelto.**

### Handoff sin preguntas repetidas
**Bloqueo activo:** cumplimiento operativo de la metodología, seguido de primer fallo del flujo completo Cliente → Proveedor. **Próximo agente:** 1) leer este bloque y `AGENTS.md`, issue #567, roadmap; 2) contrastar `main`, PR #568, CI, TEST, Sentinel/checklist y despliegues; 3) seleccionar primera transición P0 fallida y ejecutar corrección mínima con regresiones del proceso completo; 4) validar antes de integrar cambios de producto a `main`; 5) registrar commit, run, runtime y próximo bloqueo aquí, no crear una nueva cola ni contestar sólo con planes. **Intervención humana** sólo para prueba física indispensable o autorización material; no simularlas.

### 21/10/2026 — Handoff de riesgos del método antes del piloto de Florianópolis

**Orden más reciente del usuario:** examinar ventajas, contras, errores previos y fallos futuros de la ejecución automatizada; corregirlos, repetir pruebas y establecer una metodología **validada** antes del piloto. **Este chat NO ha validado todavía la automatización ni el piloto.** Consulta el registro de riesgos R1–R12 y sus pruebas de fallo en `docs/UGO_ROADMAP_MASTER.md`, sección “Revisión preventiva de metodología y piloto Florianópolis”. Ése es el checklist de riesgos; no duplicarlo en issues nuevos.

**Avance real:** se escribió el análisis preventivo R1–R12 en `main`; sin ejecución de fallos inyectados ni modificaciones a worker/cola. Se prohíbe activar Empresa Autónoma ON, dar status DONE o declarar que se evitarán todos los incidentes sin las pruebas requeridas. Continuidad del PR #568: sigue siendo parche acotado sin CI/runtime confirmado; no asumir merge ni reemplazar la misión central por otro parche GPS.

**Primer bloque técnico pendiente, accionable y medible:** inspeccionar el mecanismo existente de jobs/locks/worker/HIVE/Judge/Sentinel y baseline vigente (SHA/CI/TEST, costo, límites, estado de despliegue). Ensayar en TEST cuatro escenarios: **R1** reintento tras caída sin efecto duplicado; **R3** 429/timeout sin tormenta; **R5** fallo artificial bloquea DONE/merge; **R11** reinicio recupera cola sin falso 24/7. Si falla, corregir componente existente, volver a ejecutar las cuatro pruebas y documentar evidencias SHA/run. Si no hay posibilidad técnica de test, dejar BLOCKED con la dependencia exacta, nunca VERIFIED.

**Después:** pruebas R2/R4/R6–R10/R12, luego E2E del primer servicio y aceptación física de dos dispositivos para Florianópolis. Los P0 reales de Cliente/Proveedor conservan prioridad cuando degradan operación; no interrumpir su solución con infraestructura que no sea indispensable. Registrar owner, estado probado, entorno, artefactos y próxima acción. No crear segunda cola o plataforma; reutilizar `development_checklist`, jobs y ledger canónicos.

**Criterio de aceptación global:** metodología controlada por gates efectivos + un servicio completo real comprobado, sin regresiones nuevas, publicado en canal autorizado y revalidado. El simple guardado de documentos o creación de PR **no alcanza**.


---

## Integración operativa con UGO Roadmap Master

**Fuentes complementarias, no paralelas:** `docs/UGO_ROADMAP_MASTER.md` registra alcance, hitos y estados técnicos; este Camino Maestro determina prioridades, verificación y cierre. Ante discrepancias, consultar `main`, CI del SHA exacto, Arena TEST y la aplicación publicada antes de actualizar cualquiera de los dos. Los checkpoints históricos no prueban el estado actual.

**Metodología vinculante por bloque:** recuperar antecedentes → reproducir el primer fallo → corregir lo mínimo necesario → probar funcionalidad, seguridad y regresiones → fusionar a `main` todo cambio independiente completamente verificado → comprobar el SHA de `main` y la publicación correspondiente → registrar evidencia y cerrar. Un commit, PR o test verde aislado no significa entrega funcional. Los cambios no validados permanecen identificados como abiertos, sin bloquear indefinidamente los cambios independientes seguros.

**Incidente P0 en seguimiento (21/10/2026, sujeto a revalidación):** PR [#566](https://github.com/sebastisnzoth/ugo-admin-panel/pull/566), GPS de Proveedor y matching Cliente → Pedido → Oferta → Alerta → Aceptación → Asignación. El último control conversacional confirmó el PR abierto y sin fusionar; el estado de merge y las ejecuciones posteriores requieren consulta en vivo. Antecedente de Arena TEST: proveedor Online sin GPS vigente (umbral del motor: 90 s), pedido en búsqueda sin ofertas. No interpretar cron ejecutado, proveedor Online ni oferta insertada como evidencia de recepción real. Verificar primero el estado del pedido y la ubicación persistida, evitando reusar snapshots históricos como vigentes.

**Cierre del P0:** reconciliar SHA y CI → resolver incompatibilidades con `main` preservando trabajo ajeno → validar GPS actualizado en backend y recuperación permitida por navegador → probar rematching sin duplicados/cancelaciones indebidas → comprobar alerta, aceptación y asignación en Arena TEST → integrar los cambios aprobados → verificar `main` y canal publicado. La prueba de GPS, sonido/vibración y flujo físico en dispositivos reales sigue diferenciada del E2E automatizado; no simular aceptación humana ni alterar Supabase producción sin los gates correspondientes.

**Handoff obligatorio entre sesiones:** registrar en este Camino Maestro el bloqueo P0, SHA de `main` y del PR, ejecuciones y resultados exactos, entorno, evidencia, fusión efectuada o no, revisión publicada y siguiente paso accionable. Actualizar el Roadmap Master con el mismo hito y madurez (`IMPLEMENTED`, `CI VALIDATED`, `RUNTIME VALIDATED`, `PUBLISHED`) para evitar estados contradictorios. No pedir reiteradamente pruebas ya aportadas; marcar sólo las pruebas humanas realmente pendientes.


### P0 2026-10-21 — Recuperación automática del matching (PR #566)
- Preparada migración `20261021223000_safe_automatic_rematch_recovery.sql`: reintenta lotes de hasta 20 servicios `buscando`/`ofrecido` sin ofertas vigentes, omite asignados/cancelados, usa `FOR UPDATE SKIP LOCKED` y reutiliza controles existentes de autorización, GPS, deudas, categoría y horario.
- Agregado contrato `tests/contracts/p0-safe-automatic-rematch.test.mjs`. `UGO Core CI` run 39695166059 PASS; verificación de trazabilidad falló por falta de estas entradas, corregida en este PR.
- **No desplegado:** `pg_cron` de TEST sigue deshabilitado tras errores `job startup timeout`; producción no intervenida. Falta resolver PR #560, aplicar y validar migraciones TEST, verificar cancelación/aceptación simultáneas y E2E de ciclos de 5 minutos antes de activar cron o fusionar.
- Estado: `IMPLEMENTED IN DRAFT PR / TEST E2E AND MIGRATION PENDING`. La aprobación de requisitos no es evidencia de 12 pruebas completas.

- Integración P0 2026-10-21: consolidación del PR #560 dentro del PR #566 de las migraciones de horario inmediato/deadline y paridad GPS 90 s de notificación, junto con contratos. HEAD de integración requiere SAME-SHA CI y pruebas sobre Arena TEST. **No se aplicó SQL ni habilitó cron; no fusionar hasta confirmar E2E sin regresiones.**

- P0 GPS Pro 2026-10-21: captura de UGO Pro muestra proveedor Online fuera del radar, timeout GPS y estado Procesando. Se corrigió carrera comprobable en el código: refresco manual, primer heartbeat y refresco de foco podían iniciar capturas GPS simultáneas; ahora comparten una única adquisición en curso, con limpieza tras éxito/error, preservando validación de 90 s y precisión 250 m. Se agregó test contractual `provider-gps-singleflight-acquisition-20261021.test.mjs`. **PENDIENTE**: CI same-SHA, prueba navegador con GPS real, validación Auth/RLS, matching de alerta/aceptación/cancelación y merge; no afirmar recuperación E2E todavía.

- 2026-10-21 P0: opción voluntaria «Recibir ofertas las 24 horas» en agenda de Proveedor (schedule.receive24h=false por defecto). Solamente elimina restricción horaria para ofertas inmediatas; trabajos programados, GPS fresco, Online, zonas, deuda, calendario de conflictos y autorización permanecen. SQL `20261022014500_provider_opt_in_24h_offers.sql`, contrato `provider-24h-offers-opt-in.test.mjs`. Pendiente CI SAME-SHA, instalación controlada TEST y E2E navegador; sin aplicar producción.

- 2026-10-21 P0 opciones 24h: Core CI del SHA d4e2a9e falló en auditoría i18n JSX (una etiqueta literal de Proveedor). Corregido con `providerPortfolio.receive24h` localizado pt-BR/es/en en `extended.ts`, uso `t(...)` en UI y contrato actualizado. Matching E2E automatizado del SHA anterior SUCCESS, pero no equivale a prueba humana de aviso sonoro y aceptación. Esperar CI mismo SHA y prueba de dispositivo antes de merge.

- 2026-10-21/22 P0 avance: migración `20261022020000_rematch_on_fresh_provider_gps.sql` instalada en Arena TEST: reintenta pedidos sin ofertas tras 60 s de cooldown si existe proveedor Online/disponible con GPS <=90 s y precisión <=250 m, sin esperar vencimiento 5 min; conserva SKIP LOCKED, 20 por lote y filtros de ofertas vigentes/cancelación/asignación. Contrato `provider-fresh-gps-early-rematch.test.mjs`. Cron observado 41 SUCCESS/1 FAIL (startup timeout 01:44 UTC). Pedido real f94bb5da... aún buscando a las 01:56 UTC; pendiente proveedor GPS real estable, confirmación oferta y alerta/aceptación. Mantener PROD sin cambios.

- 2026-10-21 P0 GPS watcher: corregido reinicio de watchPosition con timeout pendiente: startWatch cancela restartTimer obsoleto y pone watchId=null tras clearWatch; callback descarta ID del timer; prueba `provider-gps-watch-restart-recovery.test.mjs`. En SHA 3d0cd6d Cross-role UI falló `AUTONOMY_UI_STATE_MISMATCH` (Super Admin), aunque Core y Matching E2E pasaron. Nuevo CI same SHA pendiente; GPS y alerta reales aún sin certificar. No fusionar ni producción.


### 2026-10-22 — PR #569: sincronización de prueba UI de autonomía
- Tras la integración P0 del PR #566 en `main` (`03b29a13`), el runtime multirrol falló en `AUTONOMY_UI_STATE_MISMATCH` por observar `aria-checked=false` antes de confirmar hidratación de la vista.
- Cambio del PR #569: esperar selección efectiva de la radio, releer el modo de autonomía persistido y mantener aserción estricta de coincidencia; no activar ni modificar Empresa Autónoma ni su gate. Core CI y Cross-role UI aprobaron el commit `8d6fddec` en PR; nuevo SHA requiere repetir controles.
- Cierre pendiente: Roadmap Traceability, demás controles del SHA final, fusión a `main`, comprobación postmerge; sin afirmar pruebas físicas GPS/oferta/sonido. Hugo Presence, RPC/RLS y Visual siguen como incidencias independientes.


### 2026-10-22 — Postmerge PR #569: compatibilidad Playwright runner
- En `main` be7377c8, Cross-role UI (run 39837869684) y Cross Visual (run 39837869745) fallaron antes de ejecutar Chromium: `Playwright 1.56.1 does not support chromium on ubuntu26.04-x64` al usar `ubuntu-latest`. No es evidencia de defecto de producto.
- Corrección acotada: fijar `runs-on: ubuntu-24.04` en `.github/workflows/role-ui-runtime.yml` y `.github/workflows/cross-visual-runtime.yml`, sin relajar las aserciones, la seguridad ni modificar la app. Estado IMPLEMENTADO EN RAMA, pendiente CI/navegador del SHA final y verificación tras fusión.
- Otras pruebas de RPC/RLS, GPS real y entrega de ofertas en dispositivo siguen pendientes de comprobación independiente.


### PR #558 — CI runtime regression fixes reconciled with current main (2026-10-23)
- Prior UI navigation and WCAG login contrast fixes already exist on newer main and are preserved intact. The missing immutable SHA handoff (`UGO_RUNTIME_SHA`) was added to the GPS/geofence workflow step, and its exact runtime contract test is included.
- No business logic, Supabase schema, production settings or autonomy permissions changed. Verify the merged branch SHA in CI and runtime before main integration.


### 2026-10-23 — PR #572: integración incremental de Agent Skills en UGO
- Objetivo: reforzar reparación P0, pruebas, revisión, seguridad, CI y publicación con 8 skills de ingeniería externas, preservando todas las skills propias `ugo-*` y el protocolo `AGENTS.md`.
- Fuente auditada: `sebastisnzoth/agent-skills` commit `aeac41d4d005999432bb7312f7ff06383a91d59d` (MIT). Copias exactas en `.agents/skills/`, licencia incluida en `docs/third-party/agent-skills-LICENSE` y guía `docs/UGO_AGENT_SKILLS_INTEGRACION.md`.
- Cambio de integración: enrutamiento de skills dentro de `AGENTS.md`, prueba `tests/contracts/agent-skills-integration.test.mjs` ejecutable desde Core CI; **ninguna modificación de lógica Cliente/Proveedor, Supabase, configuración productiva, secretos ni autonomía**.
- Evidencia parcial: preflight comparó los 8 blobs origen/destino y validó enrutamiento/licencia; en el primer SHA de PR `145a9f1b` falló Roadmap Traceability por falta de estos registros (no por fallo funcional). Este commit agrega la trazabilidad faltante. Requerido: checks actualizados del nuevo SHA y merge seguro; no marcar DONE antes de verificarlos.
- P0 Cliente → Pedido → Proveedor, Auth/GPS/Realtime y prueba humana siguen **pendientes de validación funcional**, no se declaran resueltos por importar instrucciones. No se habilita Empresa Autónoma.


### 2026-10-23 — P0: prueba real de alerta sin recarga (skills: debugging, TDD, QA)
- Se identificó un falso positivo estructural: `scripts/p0-client-provider-e2e.mjs` forzaba `page.reload()` inmediatamente antes de demostrar la oferta. Eso verificaba persistencia/RPC pero **no** alerta en vivo, que es el reclamo del piloto.
- Cambio acotado: observador de alerta visible armado **antes** de crear el pedido; registra `offerId` y `serviceId` exactos del popup en la sesión del Proveedor; exige la coincidencia antes de aceptar, sin recargar. Se preserva prueba de sesión y aceptación. El popup expone esos IDs sólo al usuario autenticado para atribución determinista en UI TEST.
- Runner de E2E fijado a `ubuntu-24.04` para Playwright 1.56.1 y contrato preventivo `tests/contracts/p0-live-offer-before-reload.test.mjs`.
- No se cambian RPC, políticas RLS, bases, disponibilidad, deuda, GPS, backend de matching ni producción. **Pendiente** Core CI, browser E2E en TEST, validación de smoke postmerge y prueba de dos dispositivos (no declarar P0 resuelto hasta superar puertas). Si falla alerta, bloquear merge y usar esa traza para reparar el componente real.

- **Incidencia CI confirmada (run 39935340702):** Provider Notifications Runtime completó sus 18 tests previos (18 PASS), pero la instalación de Chromium terminó con `Playwright does not support chromium on ubuntu26.04-x64`; era falla de infraestructura, NO prueba de defecto de alerta. Corrección mínima en el workflow de notificaciones: `runs-on: ubuntu-24.04`, mismo Playwright 1.56.1, sin deshabilitar checks ni modificar lógica. Reejecutar E2E y Judge/Sentinel sobre SHA actualizado para evaluar alerta de verdad.

### 2026-10-23 — P0 postmerge: restaurar runners de pruebas de navegador
- Evidencia reproducible exact SHA `6e0e8ab7`: Provider Alerts [run 39936811451] y Cross Accessibility [run 39936811417] terminaron FAIL **antes de ejecutar el navegador** por `Playwright does not support chromium on ubuntu26.04-x64` al usar `ubuntu-latest` con `playwright@1.56.1`. No adjudicar este fallo a Auth, GPS ni matching.
- Reparación mínima: fijar `ubuntu-24.04` en workflows existentes Provider Alerts, Cross Accessibility, Provider UI y Client Notifications, conservando Playwright y aserciones; se añade contrato `tests/contracts/playwright-runner-compatibility-20261023.test.mjs` para prevenir regresión. Ni lógica de producto, ni SQL, ni secretos, ni bases de datos modificados.
- Estado: **cambio pendiente de CI exact SHA, Judge/Sentinel y pruebas browser postmerge**. La prueba P0 de matching live sin recarga ya pasó para PR #573; no equivale a prueba humana de dos celulares, ni acredita que Cliente haya creado la solicitud desde su propia UI. No habilitar Empresa Autónoma ni declarar piloto READY.

### 2026-10-23 — Core CI: remediación de Zod, candidato independiente
- Baseline revalidado: `8c753669f8b9051c3926a5b29860bd70da293bcf`, también HEAD de `origin/main`. El run `40031488931` y `npm audit` local reprodujeron `GHSA-mrhx-c7xc-m3w5` (high) en `zod@4.4.3`; la dependencia es transitiva de desarrollo de `eslint-plugin-react-hooks@7.1.1`, directamente y mediante `zod-validation-error`.
- `npm update zod --package-lock-only --ignore-scripts` regeneró únicamente la entrada de Zod en `package-lock.json` a `4.6.7`, versión disponible, corregida (`>=4.6.6`) y dentro de la gama `^3.25.0 || ^4.0.0` del consumidor. Sin `--force`, sin editar integridades, sin añadir dependencia directa y sin relajar el gate.
- Verificación local del candidato: `npm ci` limpio y `npm audit --audit-level=high` con 0 vulnerabilidades; TypeScript/build PASS; contrato GPS focalizado e i18n PASS; suite 1508 PASS / 0 FAIL / 8 SKIP por credenciales TEST ausentes, igual que baseline; lint 0 errores y 986 warnings preexistentes. La verificación adicional de firmas no pudo contactar Sigstore y no se usa como evidencia.
- Estado: **corrección local comprobada; CI del SHA exacto e integración pendientes**. No cambia lógica de producto, SQL, Supabase TEST/PROD, Empresa Autónoma ni publicación por sí solo. Siguiente puerta: Core CI remoto same-SHA y merge controlado; después continuar Hive/matching sin atribuirles este verde.

### PR #552 — Reconexión Realtime de Proveedor y prueba P0 reforzada (2026-10-23)
- Se conservó el handler `online` con resync/reconnect y cleanup simétrico. Esa refactorización por sí sola no se considera recuperación demostrada: el E2E ahora fuerza `offline/online` en Chromium, exige un nuevo `channel_ready`, mantiene la sesión y entrega después la oferta Realtime en la misma página.
- La prueba también exige una única oferta para el proveedor y repite `aceptar_oferta`: debe devolver el mismo servicio sin cambiar asignación, economics, timestamps ni ofertas. No se añadieron migraciones ni acceso a PROD.
- Árbol integrado local: 1522 tests, 1514 PASS / 0 FAIL / 8 SKIP; build/TypeScript PASS; i18n JSX/keys PASS; lint 0 errores / 986 warnings preexistentes. Pendiente P0 E2E y Cross-role del SHA final antes de cualquier merge. GPS de Chromium no equivale a GPS físico.

### 2026-10-23 — P0 presión de Supabase TEST / Super Admin Realtime (PR #552)
- Evidencia real: Cross-role UI run `40039204694` falló `ADMIN_CREATE_API_FAILED` (HTTP 500). Logs de Supabase TEST del 23-10 23:26 UTC muestran `POST /admin/users` con `request_timeout`/504 y `autonomous_jobs` PostgREST 500; **no es prueba de fallo de credenciales ni de la lógica de matching**.
- Causa de amplificación identificada en frontend: `SuperAdminCommandCenter` suscribía 18 tablas Realtime y cada evento podía disparar una recarga integral tras 250 ms, con múltiples `count:exact`, páginas y consultas por departamento. Se limita solo el refresco disparado por Realtime: intervalo mínimo 8 s, coalescencia de ráfagas, máximo una recarga Realtime concurrente, refresco pendiente y omisión cuando la pestaña está oculta. Las acciones manuales y carga inicial mantienen su ruta previa.
- Verificación previa: prueba de ejecución del scheduler con tres eventos seguidos => una sola carga, y segundo evento a +500 ms => espera 7500 ms. Se añadió contrato automatizado; CI exact-SHA, Cross-role, P0 E2E, ausencia de regresiones y smoke publicado siguen **PENDIENTES**. No se tocó PROD ni se activó Empresa Autónoma.

### PR #568 — GPS timestamp integrity (2026-10-23)
- On the reconciled branch, GPS errors during Online availability retain the last genuinely captured fix for at most 90 s; route mode retains 30 s. Rehydration and Realtime use persisted capture timestamps, reject expired/future/out-of-order fixes, and never extend freshness by reloading the UI. Contract tests accompany the fix. CI and physical E2E remain required before merging to main.

### 2026-10-24 — P0 PR #580: notificaciones del Proveedor tras Auth tardía
- Baseline main `393346831f9e63741d14c5fc16e2922d8cb70a97`. `NotificationCenter` consultaba `getSession()` una sola vez; si devolvía null antes de `SIGNED_IN`, no instalaba el canal Realtime.
- Cambio mínimo en `src/mvp/NotificationCenter.tsx`: escucha Auth antes de consultar sesión; crea canal cuando llega `SIGNED_IN`, evita re-suscripción por `TOKEN_REFRESHED` y elimina listener/canal al desmontar o salir.
- Regresión en `scripts/provider-notification-recovery-browser.mjs`: sesión inicial null, SIGNED_IN, no duplicación tras TOKEN_REFRESHED, limpieza; el mock conserva la sesión al remontar el componente, igual que Auth real.
- GitHub Actions para PR #580 (`40056574862`) encontró timeout en el test al remontar el componente porque el mock anterior siempre devolvía sesión null; reparado el mock en el mismo PR. Roadmap Traceability (`40056574850`) exige actualizar roadmap y continuidad; se conservó este gate.
- Estado: **candidato corregido en PR #580, CI del SHA nuevo aún pendiente; NO MERGE / NO PROD / E2E física HUMAN_REQUIRED**. Próximo paso: comprobar Provider Notifications Runtime, Core CI, Cross-role y seguridad del SHA vigente; corregir fallas reales antes de integrar.

### 2026-10-24 — P0 browser UI-first: eliminar falsos positivos
Se actualizó el E2E existente en PR #580 para que un pedido en modo browser nazca desde el formulario real del Cliente y para que la activación Online del Proveedor no sea suplida por RPC. La prueba solo reconoce ofertas que provengan del matching iniciado por la UI. Se mantiene TEST estricto, JWT de roles, limpieza de fixtures y GPS Playwright simulado. Pendiente: CI y runtime exact-SHA tras último commit; no se debe considerar comprobación humana ni integrar a main mientras Pages/Vercel publiquen producción automáticamente.

### 2026-10-24 — P0 #580: proteger cambios de identidad durante Auth/Realtime
- `b2b8bda046aa95212a5a1f73fddd4760d08bd281` corrige otra carrera concreta: un `getSession()` iniciado antes de `SIGNED_IN` o `SIGNED_OUT` podía devolver una identidad obsoleta y reemplazar el canal vigente; las lecturas Realtime anteriores también podían actualizar la UI después del cambio de usuario. Se incorpora revisión de eventos Auth, comprobación de identidad en callbacks/lecturas y limpieza visual al cambiar de usuario.
- `2d62d19c3df7938f14d1d2bb6c1d4c28b105a5bf` amplía el test browser con respuesta inicial de Auth demorada, identidad obsoleta, lectura pendiente tras cierre de sesión y reconexión. La suite todavía **NO se ejecutó sobre este SHA**: el conector devuelve 0 runs PR y Vercel `pending`; PR #580 sigue `draft`, `mergeable=false` (32 commits de main por reconciliar). No fusionar ni desplegar sin CI exact-SHA, E2E TEST, antirregresión y comprobación publicada. Sin escritura en Supabase PROD; Empresa Autónoma OFF.

### 2026-10-24 — P0 Auth/Realtime: aislamiento de resync entre sesiones (PR #580)
- Causa reproducible en código: `syncing` era global al efecto. Un SELECT `notificaciones` colgado durante SIGNED_OUT mantenía `syncing=true` y bloqueaba el resync de la siguiente sesión; si el mismo usuario volvía a ingresar, la lectura antigua podía superar el control basado solo en `currentId`.
- Corrección en `NotificationCenter.tsx`: `identityEpoch` se incrementa en cada cambio de identidad, invalida lecturas anteriores y reinicia el candado de sincronización. El `finally` de una lectura obsoleta no modifica el estado de una sesión posterior.
- Regresión browser: SIGNED_OUT y SIGNED_IN del mismo usuario mientras el SELECT anterior sigue pendiente; exige resync nuevo antes de liberar el viejo y ausencia de filtración del aviso antiguo. Estado: IMPLEMENTADO en PR #580, pendiente CI exact-SHA, E2E TEST y smoke; no integrado ni desplegado.

### 2026-10-24 — Proveedor HTTP 404: evidencia del E2E P0 (PR #582)
- La ejecución [40072927408](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/40072927408) PASS en TEST identificó los HTTP 404 residuales: solicitudes `POST /api/calendar/sync` al host Vite local `127.0.0.1:4173`. No son HTTP 404 del matching ni de Supabase. El módulo de calendario llama a un endpoint ausente de ese servidor Vite de pruebas. La captura en `scripts/p0-client-provider-e2e.mjs` registra método, ruta y tipo de recurso sin query strings ni tokens.
- Esta instrumentación no repara el endpoint. Próximo paso: revisar integración real de API de calendario con el servidor correcto y la topología Vite / Pages / Vercel antes de decidir proxy/mock o corrección runtime; no ocultar errores ni simular funcionamiento de calendario.
- E2E Cliente→Proveedor mantiene PASS de TEST, GPS simulado; #582 DRAFT no se integra sin gates de lanzamiento. #581 sigue pendiente. No tocar PROD ni modificar permisos RLS.

### 2026-10-24 — Reparación acotada de 404 de calendario en E2E
- El endpoint `POST /api/calendar/sync` está mapeado por `vercel.json` a `api/test.ts` (serverless Vercel), pero no existe en Vite dev ni en GitHub Pages estático. `useProviderCalendarAutoSync` conserva sincronización en hosts compatibles y ahora omite llamadas automáticas en `import.meta.env.DEV` y `*.github.io`, sin respuestas simuladas ni reintentos 404. La pantalla manual requiere backend real y no se declara funcional en Pages. Se agregó contrato `provider-calendar-sync-hook.test.mjs`.
- Verificación runtime del SHA nuevo y CI pendientes. PR #582 DRAFT, NO MERGE / NO DEPLOY hasta gates de publicación. Esta corrección no demuestra Google Calendar configurado ni conectado en Vercel.

### 2026-10-24 — Google Calendar por usuario UGO (candidato TEST, PR #582)
- API OAuth de calendario permite a cualquier usuario UGO **activo y autenticado** (Cliente, Proveedor, Admin, SuperAdmin) enlazar su **propia** cuenta mediante su JWT; los secretos OAuth y refresh_token siguen server-only, sin ampliar grants ni RLS. Cada conexión está aislada por `usuarios.id` en la tabla existente `proveedor_calendar_conexiones` (nombre histórico, FK genérica a `usuarios`); no hay migración de datos ni ejecución SQL. Se agrega UI en el perfil de Cliente mediante `UserGoogleCalendarConnect`. El Proveedor conserva su UI existente. Admin/SuperAdmin tienen autorización API, aún sin pantalla propia dedicada.
- **Sólo el Proveedor** sincroniza sus trabajos UGO como eventos mediante el mirror existente. Los demás roles pueden conectar/desconectar su propia cuenta; no se crean ni importan eventos de trabajo automáticamente para ellos. El calendar serverless sólo funciona en hosts con backend; Pages y Vite local no ofrecen OAuth activo.
- La capacidad para **cualquier cuenta Google** en producción depende de configurar GOOGLE_CALENDAR_CLIENT_ID/SECRET/STATE_SECRET, redirect URI HTTPS y publicar/verificar la app OAuth externa de Google para el scope Calendar sensible. No se accedió a secretos ni se publicó el consentimiento; estado = IMPLEMENTED, VALIDATION PENDING.
- Mantener NO MERGE / NO PROD hasta CI exact-SHA, revisión del contrato de OAuth y del gate de publicación de Pages + ambos proyectos Vercel. No simular conexiones Google reales.

- Extensión completada en PR #582: Admin y SuperAdmin también disponen del control de conexión personal en Admin → Configuración → Sistema, reutilizando `UserGoogleCalendarConnect` y JWT de sesión individual; contratos actualizados. La implementación de todos los roles es candidato TEST, no está fusionada ni publicada. La autorización pública para cualquier Google Account sigue dependiendo del consentimiento OAuth externo de Google y su verificación según scopes.

### 2026-10-24 — Páginas legales públicas para OAuth Google Calendar (candidato)
- Se agregaron `public/privacidade.html` y `public/termos.html` en portugués de Brasil; cubren marketplace de servicios, conexión voluntaria Google OAuth, alcance `calendar.events`, utilización de eventos UGO, posibilidad de revocación, derechos LGPD y contacto de soporte. Son páginas estáticas para raíz Vercel (`/privacidade.html`, `/termos.html`) y el artefacto GitHub Pages (`/ugo-admin-panel/app/privacidade.html`, `/ugo-admin-panel/app/termos.html`) después de publicación.
- No son aún URLs públicas verificadas: la PR #582 sigue sin fusionar por el gate de despliegue y la revisión jurídica del operador. El texto señala expresamente que la identificación legal completa, disputas y condiciones contractuales necesitan revisión antes del lanzamiento comercial. No cargar enlaces en Google Cloud antes de comprobar acceso público real y contenido final.

### 2026-10-24 — Cierre CI Calendar / runtimes (PR #582)
- `Core CI` SHA `1d595fa` falló en `ugo-i18n-audit` por 10 textos JSX nuevos del control Calendar sin traducciones. Se corrigió `src/mvp/UserGoogleCalendarConnect.tsx` con copias pt-BR/es/en reales, manteniendo mismo flujo OAuth.
- `cross-performance-runtime.yml` y `admin-realtime-runtime.yml` fallaron al instalar Playwright Chromium 1.56.1 bajo runner flotante `ubuntu26.04`; se fija `runs-on: ubuntu-24.04` sin desactivar pruebas. Resultado de los nuevos workflows pendiente para el SHA vigente.
- Vercel `ugo-admin-panel`: existen las 4 variables `GOOGLE_CALENDAR_*` por nombre, sin inspeccionar secretos; falta prueba OAuth de usuario TEST y release controlado. Pages y PROD no se modificaron.

### 2026-10-24 — Separación de PR legales
- Se quitaron los duplicados `public/privacidade.html` y `public/termos.html` de la PR técnica #582. Los textos de la fase personal de pruebas permanecen exclusivamente en la PR #583 (`release/legal-pages-personal-test-20261024`). No se eliminaron las páginas de #583. El cambio elimina conflicto y evita arrastrar Google Calendar al publicar documentos legales. Pendiente CI del SHA actualizado y gate seguro de despliegue.


### 2026-10-24 07:35 BRT — P0 TEST: infra degradada; reducir llamadas opcionales Calendar (PR #582)
- Baseline de main: `8077edae7e4083439ced9056770003d995876d1f`. PR #580 ya fusionado; PR #582 permanece sin integrar.
- CI del SHA `7e9202c4`: P0 E2E run 40082696473 FAIL antes del flujo en `read categories` con PostgREST `PGRST002`; Admin Realtime 40082696576 y Cross-role 40082696650 fallan con Auth `504`; Cross Performance 40082696469 falla Auth `504`. Core CI, Cross Security, Auth Isolation, Hugo y Roadmap PASS. No atribuir los errores de infraestructura al matching.
- Supabase TEST `tmossnqfwfwjrtzwcbmm` reporta `ACTIVE_HEALTHY` en control plane, pero SQL de solo lectura termina con `Connection terminated due to connection timeout`. Logs PostgreSQL entre 08:00–10:30 UTC: 37 `cron job 3 job startup timeout`, 40 arranques del job `private.retry_unmatched_services()`, 2 ejecuciones completadas; entre 09:00–10:30 UTC hubo 46 `canceling statement due to statement timeout`. Correlación observada; causa raíz aún no probada. No reiniciar, cancelar cron ni ejecutar DDL a ciegas.
- Corrección de carga independiente: el hook opcional de Calendar consultaba `/api/calendar/sync` cada 5 minutos y en cada cambio de servicio aun sin conexión Google. En PR #582 se comprueba primero `status`, se cachea por token, se omite el sync cuando está desconectado, se invalida al cambiar de cuenta y se mantiene el gate de host Vercel. No cambia Auth, matching, RLS ni Supabase.
- Test focalizado en Node con TypeScript transpile y mocks de React: PASS para cuenta desconectada, cambio de identidad, cuenta conectada y Pages sin backend. Pendientes Core CI, seguridad, P0 E2E y cross-role sobre el SHA final, además de recuperación de PostgreSQL TEST y pruebas humanas GPS. **NO MERGE / NO DEPLOY** hasta verificar.


### 2026-10-24 11:45 BRT — Contención P0 Auth/Realtime y CI (PR #582; NO MERGE)
- Evidencia nueva en Supabase TEST, ventana 12:30–14:30 UTC: 3.522 GET fallidos a `/rest/v1/usuarios` con la misma consulta de perfil desde un navegador; 2.628 HTTP 504, 820 HTTP 503, 31 HTTP 522 y 5 HTTP 524. El origen de código coincide con `useRoleSession.loadProfile` en `src/mvp/shared.tsx`. La relación con la saturación global de PostgreSQL es una hipótesis, **no una causa raíz demostrada**. No se registran identificadores de usuario ni credenciales.
- Reparación aislada en la rama existente: `withProfileTimeout` ahora aborta el fetch PostgREST subyacente al vencer 4,5 s y limpia su temporizador; no inicia un retry obsoleto si cambió la generación de sesión; `SUBSCRIBED` de Realtime limita la recarga del perfil a una cada 30 s y `CHANNEL_ERROR/TIMED_OUT/CLOSED` reconecta sin emitir una consulta inmediata. Mantiene actualización inmediata en evento real `UPDATE`, online y regreso a primer plano.
- Pruebas nuevas: timeout abortable, respuesta rápida sin aborto tardío, promesas de test no abortables y simulación de flapping del canal con verificación de ausencia de lecturas redundantes. El workflow `Cross Errors` falló antes de UI por Chromium no soportado en `ubuntu26.04`; se fijó `ubuntu-24.04` y se reemplazó `vite dev` por preview del build SHA exacto, con contrato ejecutable.
- Control plane TEST informó `ACTIVE_HEALTHY`, pero `SELECT 1` falló con `Connection terminated due to connection timeout`; cron 3 `private.retry_unmatched_services()` continuó con startup timeouts. Los E2E previos del SHA `ddffe219` fallaron en bootstrap/Auth (HTTP 522/504), no demuestran matching. **CI/E2E del SHA final pendiente; NO MERGE / NO DEPLOY / PROD intacta / Empresa Autónoma OFF.**


### 2026-10-24 — PR #582 integrada y #581 reconciliada (TEST)
- PR #582 fusionada a main SHA `91938e2657b23b2706c736e58e7a42c889b27bb9`. Candidato `3c8e81fe297fc38cefc205520a93f7928b46ac5c`: Core CI, Cross-role, Cross Security, Admin Realtime, Cross Errors, Cross Performance y P0 E2E `40139263536` SUCCESS. El E2E comprobó alerta Realtime sin recarga, oferta aceptada, servicio `asignado`, sesiones activas y cleanup. Publicación de main exact-SHA y QA físico requieren verificación independiente.
- Preview Vercel `dpl_Dexy9sFd2ycKgh5Gv6DGMmRYpZ2C` READY: HTTP 200 + contenido correcto en Cliente, Proveedor, privacidade y termos (no fallback SPA). Las páginas legales copiadas idénticas de main.
- #581 conserva en main actualizado solo la prueba de modo Empresa Autónoma de solo lectura y un contrato que rechaza clicks/mutaciones en esa prueba. Consulta TEST el 24-10 observó `SHADOW` sin determinar autoría: no cambiar estado compartido sin gate; se reporta SKIPPED sin probar transición. PROD intacta.
- P0 de seguridad pendiente: la política `usuarios_select` deja visibles registros de usuarios activos a cualquier authenticated, incluidos datos de contacto y ubicación en la tabla. Necesita proyección segura y pruebas de roles/matching antes del piloto; trigger `trg_00_usuario_sensitive_guard` restringe updates sensibles, no afirmar escalada de rol.
- Evidencias y bloqueos documentados en issue #543. CI/QA same-SHA e integración de #581 todavía pendientes.

### 2026-10-23 — Client Notifications: mantener cerrado DONE y revalidar sin lease ficticio
- Tras restaurar Chromium en Ubuntu 24.04 (main `8c753669`), el workflow de Notificaciones Cliente run [39939428615](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/39939428615) falló **antes de ejecutar la UI**: `client-notifications-runtime.mjs:22` esperaba `IN_PROGRESS`, pero `docs/ugo-work-locks/readiness-client-notifications.json` conserva legítimamente `DONE` desde 2026-09-30 con Judge/Sentinel PASS, lock sin lease y evidencia.
- Corrección: validador de modo explícito `IN_PROGRESS` (lease vigente, cierre permitido) o `DONE` (readiness histórica verificable, regresión E2E/QA completa **sin reabrir lock** ni reescribir cierre). Otros estados fallan cerrados; no se relajan los chequeos de Auth, Realtime, servicio, pago demo, Judge, Sentinel ni limpieza de fixtures.
- `Persist authoritative readiness closure` sólo corre cuando el lock está `IN_PROGRESS` y conserva su revalidación de owner/correlación antes del push. La ejecución `DONE` genera evidencia efímera exact SHA para CI pero nunca vuelve a afirmar ni escribir una nueva validación histórica.
- `tests/contracts/client-notifications-done-regression-gate-20261023.test.mjs` cubre ambos modos y leases vencidos. **No se cambia producción ni Supabase. Pendiente CI/Runtime/Judge/Sentinel exact SHA y postmerge.**
- Gate antes de fusionar: evento `pull_request` limitado a este harness, checkout del `head.sha` real, build/runtime/Judge/Sentinel/evidencia del mismo SHA. El cierre persistido de la tarea está prohibido durante PR incluso si otro job reabre un lock; no se reescribe `main` desde este ensayo. Se conserva exclusión mutua del runtime TEST.

- P0 auth transitoria durante PR #575: primera prueba exact SHA `5d278342` alcanzó el runtime pero Supabase GoTrue devolvió 504 `Gateway Timeout` al realizar `signInWithPassword`; no prueba contraseñas inválidas ni un fallo de alertas. Proyecto Arena reportado `ACTIVE_HEALTHY` y `SELECT now()` respondió en paralelo, indicando incidente de Auth/transporte de una ruta específica. Se añadió utilidad de TEST con máximo 3 intentos, esperas 1,2/3,2 s solo para 500/502/503/504 o error de red reconocible; 400/401/403/429 siguen fallando al primer intento. Exigir sesión real y ciclo UI/Realtime completo, no declarar PASS por reintentar.

- **TDD seguridad Auth (23-10-2026):** detectado caso 4xx con nombre `AuthRetryableFetchError` y mensaje de timeout que el helper de PR #575 consideraba transitorio. Prueba negativa reproducida RED y corregida GREEN: un HTTP explícito 400/401/403/404/409/429 nunca se reintenta; sólo 500/502/503/504 y fallos de red genuinos sin código HTTP (o status 0). HTTP 520 no se reintenta automáticamente. Este arreglo no acredita disponibilidad de TEST ni desbloquea E2E por sí solo.

- 2026-10-23 22:xx BRT — Client Notifications run `40048446279` (SHA `039730da`) alcanzó Chromium y falló al insertar un segundo `pagos` para el mismo `servicio_id` (`pagos_servicio_id_key`). Causa comprobada en Arena TEST: trigger `trg_materialize_cash_payment_on_assignment` crea automáticamente un pago `efectivo` cuando `requested_payment_method=efectivo` al asignar; el harness intentaba insertar Pix incondicionalmente. Reparación acotada en rama: consultar preferencia persistida y pago existente; validar el pago cash real si corresponde, o insertar pago Pix protegido sólo si la preferencia es Pix y no existe pago. Sin alterar preferencias del usuario TEST ni RPC/PROD. Contrato nuevo; **pendiente CI/Runtime/Judge/Sentinel same-SHA, merge y smoke postmerge**.

- 2026-10-23 — PR #575 CI `40050042274` (SHA `a76db315`): el E2E pasó asignación, pago compatible con trigger y `en_camino`, pero falló al esperar el título crudo de DB `Tu profesional llegó` en el banner, cuyo texto visible traducido por `NotificationCenter` es `Llegó tu profesional`. No es evidencia de que faltó la notificación: el harness comparaba dos representaciones distintas. Reparación: derivar títulos visibles del catálogo es-AR/es vigente, conservar título persistido en evidencia separada, exigir banner realmente visible, estado y aislamiento. Test preventivo. **Pendiente nuevo Runtime/Judge/Sentinel same-SHA, merge y smoke.**

### 2026-10-24 — PR #575: reparar gate omitido para Judge/Sentinel
- Causa comprobada en `.github/workflows/client-notifications-runtime.yml`: el filtro `pull_request.paths` no incluía `scripts/client-notifications-judge.mjs`, `scripts/client-notifications-sentinel.mjs` ni `scripts/lib/testAuthRetry.mjs`; por eso un cambio de validadores podía quedar sin nueva prueba browser exact-SHA. `push.paths` también omitía helpers/contratos.
- Reparación en rama: ambos filtros cubren runtime, Judge, Sentinel, helper de Auth, contratos, timeline y traducciones involucradas. Contrato automático nuevo verifica ambas listas de archivos. Commit de reparación `017f7c41a792720f0a398f08eb0410205102a860`.
- Validación: consistencia estructural de las listas comprobada antes del commit; GitHub Actions del SHA nuevo no devolvió ejecuciones al consultar. PR diverge de `main` (34 ahead/60 behind en la comprobación). **NO MERGE / NO DEPLOY** hasta reconciliar, ejecutar Core CI + Client Notifications E2E + Judge/Sentinel en el mismo SHA, comprobar ausencia de regresiones y smoke publicado. Supabase PROD intacto; Empresa Autónoma OFF.

### 2026-10-24 — Alineación visual del chat Proveedor con chat Cliente (PR #584)
- Evidencia de pantalla aportada: el chat Cliente presenta pastillas horizontales en Respostas Rápidas, burbujas suaves, encabezado claro y compositor integrado. En Proveedor el mismo componente `ServiceChat` quedaba sin esos estilos debido a que las reglas `ugo-service-chat-quick` estaban únicamente bajo `.ugo-client-root`, mostrando botones cuadrados de tamaños distintos, salto de filas y texto desbordado.
- Se corrige únicamente la variante compacta `.ugo-provider-root .ugo-service-chat.compact` en `src/mvp/service-chat.css`. Mantiene el componente único, datos, permisos, envío, guardia antifuga de contactos, avatares, mensajes y Realtime existentes. Se aplica el diseño visual del Cliente a Proveedor: chat blanco, mensajes propios verde tenue/recibidos claros, pastillas horizontales con scroll táctil, teclado y controles legibles, y formulario responsivo de dos columnas. No modifica el CSS de Cliente, pagos, ni base de datos.
- Se incorpora contrato `tests/contracts/provider-chat-client-parity.test.mjs` y prueba Chromium `scripts/provider-chat-visual-runtime.mjs` sobre CSS compilado del mismo SHA, con tamaños 320/360/390/430 px, overflow horizontal contenido en las respuestas, tap target mínimo 44 px, colores calculados, input, envío y captura de pantalla. Se ejecuta mediante el workflow Cross-role existente; sin activar servicios ni manipular datos TEST.
- Base de trabajo `main=da5f3b0bf5a282dd3c7dc50cc7be893d3178e78f`; PR #584. Estado: corrección implementada en rama, CI/Chromium/Preview/fusión/publicación aún a validar sobre HEAD definitivo. Producción Supabase intocable.

### Continuidad 2026-10-25 — Primer fallo pendiente: sincronización del estado Cliente
- **Base:** `main=e60231a01f3ee935c11e95dc1a70678c0800aa8b`. PR [#587](https://github.com/sebastisnzoth/ugo-admin-panel/pull/587), rama `fix/p0-client-status-stale-realtime-20261025`. No mezclar con PR #586 (Super Admin).
- **Reproducción:** run [40241537487](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/40241537487), artefacto 12617008898: `servicios.estado=en_progreso` para un servicio TEST y lectura RLS Cliente HTTP 200, pero timeline visible `llegado/arrived` y E2E timeout; `page_errors=[]`. No se atribuye sin evidencia una causa única a Realtime.
- **Cambio acotado:** reconciliación visible/online 10 s en `ClientLiveTracking` y `ClientServiceDetail`, este último con refresco silencioso; intervalos cancelados al desmontar. Workflow de Client Status habilitado para PR y checkout SHA real, cierre que escribe en main bloqueado en PR. Contrato de regresión.
- **Puerta pendiente:** validar el HEAD final del PR con Core CI, Auth Isolation, seguridad, Client Status E2E, Judge, Sentinel y no regresión; si verde, fusionar y comprobar CI y versión publicada sobre SHA final. Prohibido afirmar DONE por commit. `CUSTOMER_1=BLOCKED`; Empresa Autónoma OFF (lectura TEST 2026-10-25). No tocar PROD ni habilitar autonomía.

- **Siguiente intento (PR #587):** run [40245729135](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/40245729135) FAIL en creación de fixture: `Asignación bloqueada. Falta completar: ubicación`. La reparación del harness mantiene el guard: crea borrador, publica pickup con RPC cliente, GPS fresco con RPC proveedor, asigna después y respeta pago efectivo/Pix real de TEST. Contrato añadido. Sigue PENDIENTE de CI/E2E/Judge/Sentinel exact-SHA; no se declara arreglada la UI hasta reproducirla.
