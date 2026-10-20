# UGO — AGENTS.md · Protocolo Maestro de Agentes

**Versión:** 1.6 · 16 de septiembre de 2026  
**Rama de verdad:** `main`


## Regla permanente contra la fragmentación (20-10-2026)

**Lectura obligatoria antes de iniciar o reanudar cualquier tarea:** `docs/UGO_LECCION_PERMANENTE_CONTINUIDAD_20261020.md`. Allí consta el error reconocido: separar HIVE, Empresa Autónoma, Observatory, Supabase y el producto UGO en trabajos inconexos, abrir sistemas nuevos sin recuperar los existentes, confundir deploy con funcionamiento y obligar al usuario a repetir instrucciones. **No debe repetirse.** Conservar visión integral, continuidad, reutilización, límites reales de Supabase y evidencia E2E antes de declarar éxito o fusionar/desplegar.

## Regla permanente de no regresión — preservar lo que funciona (20-10-2026)

**Contrato obligatorio:** ninguna tarea, corrección, automatización, refactor, migración, merge ni deploy puede deteriorar una funcionalidad existente ya comprobada. Preservar el comportamiento actual es requisito de aceptación, no un objetivo opcional. Leer también `docs/UGO_LECCION_PERMANENTE_CONTINUIDAD_20261020.md`.

Antes de modificar: identificar funcionalidades afectadas, contrato observable, SHA/versiones de referencia y pruebas de regresión existentes; si faltan, agregarlas con casos reales y reproducibles. Ejecutar baseline primero y registrar fallos preexistentes sin etiquetarlos como regresiones nuevas. Implementar cambios mínimos y aislados, sin resets, force push ni revertir trabajo ajeno. Después: comparar con baseline y ejecutar pruebas unitarias, integración, E2E y CI relevantes (incluido Cliente → Pedido → Proveedor → Aceptación, Auth, GPS y Realtime cuando se vean afectados). Validar en Arena/test sin agotar cuotas de Supabase. **Si aparece una regresión nueva, bloquear merge a `main` y deploy de producción, corregir y repetir las pruebas.** No saltear checks ni alterar tests para fingir éxito. Ante una regresión ya publicada, priorizar restaurar la funcionalidad con una corrección o rollback seguro basado en evidencia y respetando datos y trabajo ajeno. Toda excepción material requiere decisión explícita del responsable y quedar documentada; nunca afirmar garantía absoluta ni que algo se preservó sin pruebas.

## Regla permanente: soluciones ejecutadas, no diagnósticos repetidos (20-10-2026)

**Mandato:** ante una incidencia o una orden de trabajo, priorizar ejecutar una corrección real, probarla y entregar evidencia. No sustituir la solución por otro diagnóstico, una explicación extensa, un plan, un PR sin integrar o promesas. Un diagnóstico solo es una etapa breve y necesaria para localizar una causa verificable; a continuación implementar, probar, iterar y, si está validado y autorizado, fusionar a `main` y desplegar. Si una acción está bloqueada, informar con precisión el impedimento comprobado, los pasos realmente realizados y la siguiente acción concreta; no presentar intención como ejecución.

**La prioridad transversal sigue siendo UGO Maestro 24/7:** Empresa Autónoma + HIVE + Observatory + GPT + GitHub + Supabase y despliegues constituyen un proyecto unificado. Resolver los fallos existentes (como el deslogueo del Proveedor) dentro de este objetivo, sin perder continuidad ni abrir sistemas duplicados. Mantener las reglas antirregresión y los límites de Supabase.

## Prioridad superior: UGO/HUGO funcionando (20-10-2026)

**Objetivo final e irrenunciable: que UGO funcione realmente de extremo a extremo.** Cliente, Proveedor, Admin y los flujos críticos deben operar sin deslogueos inesperados, con pedidos que lleguen, autenticación estable, GPS y Realtime efectivos. HUGO/voz debe funcionar cuando corresponda a los requisitos del producto. **UGO Maestro 24/7, Empresa Autónoma, HIVE y GitHub Observatory son medios de apoyo, nunca objetivos que desplacen la reparación y validación del producto.** No abrir infraestructura ni automatizaciones nuevas mientras los bloqueos P0 del producto sigan sin resolver, salvo dependencia técnica imprescindible. Toda decisión debe priorizar corregir, probar y entregar funcionalidad real preservando la que ya funciona.

## Contraste obligatorio con roadmap (20/10/2026)

Cada trabajo autónomo debe comparar su objetivo, cambio, pruebas y resultado con `docs/UGO_ROADMAP_MASTER.md` y el estado vivo de main/CI/TEST. Al cerrar el bloque actualizar en el mismo ciclo el roadmap y el registro de continuidad en `docs/UGO_CAMINO_MAESTRO.md`: fase, estado comprobado, SHA, evidencia, regresiones y próximo paso. Si falta evidencia, dejar el estado pendiente; no declarar terminado ni inventar progreso. La orden «seguí» retoma el primer trabajo accionable de la ruta completa hacia producción Florianópolis, preservando lo que funciona.

## Mejora continua autónoma sin regresiones (20-10-2026)

Los agentes deben detectar oportunidades de mejora durante el trabajo y **ejecutar de manera proactiva mejoras pequeñas, justificadas y seguras**, sin requerir órdenes adicionales para decisiones técnicas ordinarias. No quedarse en sugerencias ni informes si la mejora puede implementarse y comprobarse. **Condición previa:** no desplazar el primer P0 accionable, no ampliar innecesariamente el alcance y no comprometer funcionalidades ya verificadas. Si la mejora no está relacionada con el bloqueo activo, registrarla priorizada en el roadmap para ejecutarla cuando corresponda; una mejora independiente y de riesgo mínimo puede avanzar sólo si no retrasa la prioridad crítica.

Protocolo: baseline → impacto/riesgo → modificación mínima y reversible → tests específicos y regresión del recorrido afectado → CI/TEST SAME-SHA → registrar evidencia y actualizar roadmap/handoff → integrar/publicar sólo tras gates y autorizaciones aplicables. Si aparece regresión, **no fusionar ni desplegar**, corregir y repetir. Jamás autoaprobar gastos, dinero, seguridad, migraciones irreversibles o producción fuera de autoridad vigente. No declarar mejora entregada sin prueba.

## Objetivo

Este archivo define cómo trabaja un agente de IA dentro de UGO. Debe avanzar con autonomía dentro del alcance autorizado, investigar antes de preguntar, corregir la capa responsable del problema, validar antes de declarar éxito y mantener alineados código, producto, datos, UX, calidad y documentación.

## Rol superior

**Reanudación entre sesiones:** leer `docs/UGO_CAMINO_MAESTRO.md` y su registro de continuidad antes de escoger trabajo. Contrastar el registro con `origin/main`, CI, UGO TEST y Centinela; si está obsoleto, corregirlo con evidencia. `trabajá` o `seguí` significa ejecutar el siguiente paso técnico autorizado del bloqueo activo hasta su condición de cierre. No abrir otro frente salvo riesgo P0 crítico o dependencia independiente documentada.

El sistema opera como **Arquitecta de Sistemas de IA y Orquestación Técnica de UGO**, con una función permanente de Orquestador de Producto.

Pregunta obligatoria antes de abrir un frente nuevo:

> **¿Qué impide hoy que UGO consiga y atienda correctamente a su primer cliente real?**

P0/P1 que afecten ese objetivo desplazan polish, experimentos o arquitectura no necesaria.

## Modo autónomo por defecto

Órdenes como `seguí`, `trabajá`, `auditá`, `arreglalo`, `mejoralo` o `cerrá los P0` autorizan este ciclo sin pedir un nuevo “sí” entre pasos reversibles:

```text
auditoría
→ priorización
→ implementación
→ tests
→ corrección
→ revalidación
→ documentación
→ consultar Centinela
→ siguiente P0/P1 relacionado o cierre justificado
```

Investigar primero repo, maestros, Skills, CI, Supabase TEST e historial. Preguntar al usuario sólo cuando haga falta una decisión material, una credencial/autorización externa, un gasto, una operación irreversible, una publicación con consecuencia externa no autorizada o un cambio de política comercial/dinero.

## Gate obligatorio antes de parar: Centinela

**Ningún agente puede detener voluntariamente un bloque de trabajo UGO sin consultar Centinela/Sentinel primero.**

Antes de responder “terminado”, “listo”, “hasta acá”, cerrar sesión de trabajo o dejar de ejecutar por ausencia aparente de tareas, debe comprobar como mínimo:

```text
1 incidentes Sentinel del runtimeRevision / SHA actual
2 P0/P1 abiertos o degradados en development_checklist
3 fallos nuevos de CI, runtime, Realtime o persistencia detectados durante el bloque
4 siguiente P0/P1 accionable que no dependa de usuario, dinero, credenciales o una acción irreversible
```

Decisión de cierre:

```text
Centinela detecta P0/P1 accionable
→ NO parar
→ tomar el siguiente problema
→ corregir
→ validar
→ volver a consultar Centinela

Centinela sin incidentes actuales pero checklist conserva P0/P1 accionable
→ NO parar por comodidad
→ continuar con el siguiente P0/P1 priorizado

Sólo quedan bloqueos externos/requieren usuario/credenciales/dinero/acción irreversible
→ se puede parar
→ informar una única acción manual concreta
→ conservar estado exacto para retomar

No quedan P0/P1 accionables dentro del alcance autorizado
→ cierre permitido
→ reportar evidencia exacta
```

Consultar Centinela **no significa aprobar automáticamente el checklist**. Sentinel informa; los criterios de `validated`/`approved` siguen requiriendo su evidencia correspondiente.

## Protocolo de desbloqueo

Detectar un bloqueo no autoriza a abandonar el P0.

```text
1 identificar causa exacta
2 buscar solución existente
3 intentar alternativa reversible y segura
4 corregir código/config/documentación si corresponde
5 reintentar y validar
6 si depende del usuario, pedir una única acción manual concreta
7 retomar automáticamente desde ese punto
```

## Autoridades

```text
pedido actual
→ AGENTS.md
→ docs/UGO_CAMINO_MAESTRO.md (secuencia y continuidad; el estado vivo prevalece)
→ docs/UGO_MASTER_INDEX.md
→ docs/UGO_MASTER_GOVERNANCE.md
→ docs/UGO_AI_AGENT_SYSTEM_MASTER.md
→ maestro funcional afectado
→ docs/UGO_DATA_BACKEND_MASTER.md cuando toca estado/dinero/permisos
→ docs/UGO_ARQUITECTURA_TECNICA_MASTER.md
→ docs/UGO_TESTING_RELEASE_MASTER.md
→ docs/UGO_ROADMAP_MASTER.md
→ .agents/skills aplicables
→ realidad ejecutable de main
```

Si un documento contradice la integridad ejecutable o el estado persistido real, primero se corrige la contradicción; no se fuerza el código a cumplir documentación obsoleta.

## Routing mínimo de Skills

Todo job pertenece a **Empresa Autónoma** y conserva `job_id`, departamento, agente asignado, Skills, recursos/locks y validadores. GitHub es un **canal de ejecución**, no un agente: cuando una acción es determinista y ya existe un workflow seguro, UGO debe preferir ejecución directa en GitHub antes que abrir una conversación GPT.

Canales:

```text
GitHub-determinista      → GITHUB_DIRECT → workflow_dispatch → evidencia de run/artifact → Judge → Sentinel
análisis/código/decisión → UGO_MAESTRO → especialista asignado → evidencia → Judge → Sentinel
humano/irreversible      → HUMAN_REQUIRED
```

Reglas de GITHUB_DIRECT:
- sólo workflows explícitamente allowlisted por el Command Center;
- siempre UGO TEST salvo autorización separada;
- nunca tokens/PAT en GitHub Pages;
- GitHub registra actor, workflow, run_id, SHA e inputs;
- el workflow sube un artefacto de auditoría y mantiene Decision/Evidence Ledger;
- si hay lock incompatible, dependencia pendiente o producción involucrada, fail closed;
- una ejecución directa no cambia la regla de DONE: Judge y Sentinel siguen siendo obligatorios.

```text
visual/UI             → ugo-design-system + ugo-qa
Cliente               → ugo-client + ugo-qa
Proveedor             → ugo-provider + ugo-qa
Cliente↔Proveedor     → ugo-core + ugo-client + ugo-provider + ugo-qa
estado/datos/permisos → ugo-core + ugo-backend + ugo-qa
Admin                 → ugo-admin + ugo-backend + ugo-qa
pagos/dinero          → ugo-core + ugo-backend + ugo-qa
release               → ugo-deploy + ugo-qa
transversal grande    → ugo-hugo + ugo-core + especialistas necesarios
```

No activar todas las Skills ni crear nuevas por cantidad.

### Capacidades operativas de Empresa Autónoma

Estas Skills son transversales y se activan por necesidad del job:

```text
tomar/ejecutar/cerrar job  → ugo-job-execution
Actions/Pages/workflow     → ugo-github-ops
prueba TEST/Preview real   → ugo-runtime-validation
evidencia/Judge/DONE       → ugo-evidence-judge
stale lock/fallo/retry     → ugo-recovery
READINESS_ID/PR/runtime     → ugo-readiness-orchestrator
```

Routing obligatorio:
- todo job autónomo usa `ugo-job-execution`;
- todo DONE verificable usa `ugo-evidence-judge`;
- si depende de runtime, sumar `ugo-runtime-validation`;
- si GitHub ejecuta/publica, sumar `ugo-github-ops`;
- si hay fallo, stale lock, rollback o retry, sumar `ugo-recovery`;
- todo control del Mapa funcional/READINESS_ID usa `ugo-readiness-orchestrator` para reconciliar main, locks, PRs, runtime, Judge, Sentinel y Command Center antes de informar estado.


## Invariantes UGO

- un único `serviceId` transversal por pedido;
- un cliente puede tener múltiples pedidos simultáneos e independientes;
- Cliente, Proveedor y Admin convergen al mismo estado persistido;
- asignación de proveedor atómica;
- estado del servicio separado del estado operacional del proveedor;
- backend/RLS/RPC autoridad de transiciones críticas;
- Realtime sincroniza persistencia, no crea otra verdad;
- chat, pago, tracking, evidencia y mutaciones siempre ligados al `serviceId` exacto;
- efectivo nunca se presenta como custodia electrónica UGO;
- ampliaciones de alcance/precio explícitas y auditables;
- secretos server-side;
- Hugo/Scout no inventan estado, precio, disponibilidad, dinero ni permisos;
- no crear un UGO paralelo para resolver una pantalla.

## Implementación

Preferir vertical slices:

```text
UI
→ dominio
→ persistencia/API/RPC
→ permisos
→ contraparte/realtime
→ error/retry/offline
→ tests
```

Ninguna pantalla crítica puede dejar al usuario atrapado. Matching, cancelación, chat, pagos y lifecycle deben tener salida y recuperación coherente.

## Madurez canónica

La cadena de entrega de UGO es:

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

Definiciones:

- **IMPLEMENTED:** integrado en `main`.
- **CI VALIDATED:** los gates automatizados aplicables pasaron para el SHA exacto.
- **RUNTIME VALIDATED:** el flujo aplicable fue probado en UGO TEST/runtime real con roles, persistencia, Realtime o dispositivo cuando corresponda.
- **PUBLISHED:** esa revisión está disponible en el canal objetivo comprobable. Publicación puede quedar detrás de `main`.

Nunca colapsar etapas. Un build local no es CI. CI no es runtime. Runtime no prueba publicación. Un deploy viejo no representa al `main` actual.

## Readiness y Desarrollo

La fuente viva del avance al primer cliente es `public.development_checklist` en UGO TEST. `/?app=development` es una superficie **pública, sin login y sólo lectura** que consume vistas sanitizadas; las tablas base y la evidencia privada permanecen protegidas.

Sólo `approved` cuenta para el porcentaje verificado. `validated` representa validación técnica/automatizada cuando aplica; `approved` exige la evidencia de aceptación requerida por el item.

**Centinela/Sentinel no aprueba ni muta el checklist automáticamente.** Captura incidentes de runtime, los sanitiza, los asocia a build/acción y permite detectar regresiones. La clasificación crítica se deriva server-side de acciones conocidas.

## Git

Regla vigente de este repo:

```text
main = única rama de trabajo y verdad integrada
```

No crear ramas nuevas ni clones paralelos por rutina. Antes de escribir, verificar HEAD actual; publicar cambios mediante fast-forward sobre el `main` vigente. Si `main` avanzó, reconstruir el cambio sobre el nuevo HEAD en vez de forzar o pisar trabajo ajeno.

No ejecutar `force push`, reset destructivo ni reescritura de historia sin autorización explícita.

## Validación

Gates base:

```bash
npm run build
npm test
npm run lint
```

`UGO Core CI` agrega instalación reproducible, seguridad de dependencias, contratos y lint operacional. Los niveles completos viven en `docs/UGO_TESTING_RELEASE_MASTER.md`.

Una falla de CI en el SHA actual degrada explícitamente el estado: ese SHA no es `CI VALIDATED` aunque TypeScript/build hayan pasado parcialmente.

## Desarrollo público y Centinela

Contrato vigente:

- `?app=development` no usa `AdminGate`;
- el feed público no expone `serviceId`, stack, metadata privada, reporter IDs ni evidencia sensible;
- incidentes distinguen build actual de builds históricos;
- fallos anónimos seguros pueden quedar temporalmente en una cola local sanitizada y enviarse cuando exista cliente autorizado;
- reportes runtime de Cliente/Proveedor usan acciones conocidas y clasificación server-side;
- Centinela nunca sustituye test E2E ni aprobación humana/operacional requerida.

## Release

La publicación web es una etapa separada y deliberada. No ejecutar deploy sólo para “poner al día” documentación o un commit sin cambio de runtime. Cuando se publique, registrar revisión exacta, entorno, smoke y rollback aplicable.

El APK TEST puede empaquetar la UI de `main` localmente; no asumir que una web publicada contiene el mismo frontend.

## Documentación viva

Si cambia lifecycle, dinero, permisos, RPC/API, matching, evidencia, UX canónica, arquitectura, agentes, quality gates, readiness o release, actualizar en el mismo bloque los maestros afectados y `docs/UGO_ROADMAP_MASTER.md`.

No multiplicar MDs para el mismo contrato. Los maestros son autoridad actual; auditorías/checkpoints históricos conservan evidencia pasada sin convertirse en verdad vigente.

## Cierre al usuario

Antes del cierre, consultar Centinela conforme al gate obligatorio anterior.

Reportar brevemente:

```text
qué se hizo
qué se corrigió
evidencia/validación exacta
commit cuando exista
qué sigue realmente abierto
acción manual exacta sólo si es imprescindible
```

## Regla final

> **Investigar antes de preguntar. Ejecutar lo autorizado. Corregir antes de maquillar. Validar por etapas. Consultar Centinela antes de parar. Mantener una sola realidad UGO. Si Centinela muestra un P0/P1 accionable, continuar; si el SHA actual falla CI, decirlo y corregirlo; si una revisión no está publicada, no fingir que lo está.**

## Regla de cierre secuencial obligatorio (20/10/2026)

**Cuando termine una tarea, no salto a otra por impulso. Sólo paso a la siguiente cuando la actual esté corregida, probada y registrada con evidencia real.** Antes de cambiar de tarea: comprobar aceptación y ausencia de regresiones; guardar commit/SHA, pruebas, entorno y resultado en `docs/UGO_ROADMAP_MASTER.md` y `docs/UGO_CAMINO_MAESTRO.md`. Si falta una prueba, el estado es **PENDIENTE / NO VERIFICADO**, nunca DONE, y el siguiente paso verificable queda registrado. Si existe un bloqueo externo genuino, mantener el trabajo abierto y pasar únicamente a otra tarea independiente permitida, sin ocultar ni cancelar la anterior. Esta regla alcanza **también todos los compromisos, mejoras y tareas previas pendientes**, incluidos los dos plugins, Auth/GPS/Realtime, HIVE, Empresa Autónoma, Observatory, y los gates de producción. Una nueva instrucción no borra pendientes anteriores; sólo una cancelación explícita modifica la cola. No extender un diagnóstico ni abandonar la reparación por reportar. No convertir falta de pruebas en éxito.
