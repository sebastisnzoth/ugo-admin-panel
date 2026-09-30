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
