# UGO — AGENTS.md · Protocolo Maestro de Agentes

**Versión:** 1.0 · 12 de septiembre de 2026  
**Rama de verdad:** `main`

## Objetivo

Este archivo define cómo debe trabajar un agente de IA dentro de UGO. El agente debe avanzar con autonomía en tareas de desarrollo ya autorizadas, investigar antes de preguntar, validar antes de declarar éxito y mantener alineados código, producto, datos, UX y documentación.

## Ciclo obligatorio

```text
entender pedido
→ leer maestros/Skills relevantes
→ inspeccionar main y código real
→ auditar impacto
→ implementar el cambio mínimo completo
→ validar
→ corregir
→ revalidar
→ sincronizar maestros/Roadmap si cambió un contrato
→ reportar evidencia y pendientes reales
```

No detenerse entre análisis, implementación, test y corrección para pedir confirmaciones rutinarias cuando el pedido ya autoriza ese trabajo.

## Investigar antes de preguntar

Si la respuesta existe en el repo, documentos maestros, Skills, código, tests o herramientas disponibles, buscarla primero. Preguntar sólo cuando falte una decisión humana real que no pueda inferirse de forma segura.

## Cuándo requiere decisión humana

Pedir confirmación cuando exista una decisión nueva de producto no resuelta por los maestros, una operación irreversible o destructiva, un cambio no autorizado de política económica, una ampliación sensible de permisos/seguridad, una credencial o permiso externo faltante, o una contradicción entre autoridades que no pueda resolverse sin elegir una nueva política.

## Autoridades

Orden de referencia proporcional al alcance:

```text
pedido actual
→ AGENTS.md
→ docs/UGO_MASTER_INDEX.md
→ docs/UGO_MASTER_GOVERNANCE.md
→ maestro funcional afectado
→ docs/UGO_DATA_BACKEND_MASTER.md cuando toca estado/dinero/permisos
→ docs/UGO_ARQUITECTURA_TECNICA_MASTER.md
→ docs/UGO_TESTING_RELEASE_MASTER.md
→ UGO_ROADMAP_MASTER.md
→ .agents/skills aplicables
→ realidad actual de main
```

Para UX/flujos consultar también `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md`, `docs/UGO_ECOSISTEMA_FLUJO.md`, `docs/UGO_UIUX_MAESTRO.md` y `docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`.

## Regla de implementación

Preferir vertical slices completos sobre pantallas aisladas:

```text
UI → dominio → persistencia/API/RPC → permisos → contraparte/realtime → error/retry → tests
```

No crear estados visuales ficticios para ocultar una capacidad backend inexistente. Corregir la capa responsable del problema.

## Invariantes UGO

- un único `serviceId` transversal;
- Cliente, Proveedor y Admin convergen al mismo estado persistido;
- asignación de proveedor atómica;
- estado del servicio separado del estado operacional del proveedor;
- pagos como dominio propio y conscientes del método;
- efectivo nunca se presenta como custodia electrónica UGO;
- ampliaciones de alcance/precio explícitas, aprobables y auditables;
- evidencia con ownership y timing correctos;
- backend/RLS/RPC como autoridad de transiciones críticas;
- Realtime sincroniza persistencia, no crea otra verdad;
- secretos permanecen server-side;
- Hugo y Scout no inventan estado, precio, disponibilidad, dinero ni permisos;
- no crear rutas, contratos o sistemas paralelos para resolver una pantalla.

## Auditoría continua

Cada bloque de trabajo incluye revisión proporcional de producto/flujo, UX, arquitectura, duplicación/legacy, backend, permisos, pagos, concurrencia, Realtime, evidencia, errores/retry, seguridad, tests, performance, observabilidad, documentación y release.

Prioridad:

```text
P0 seguridad · datos · auth · dinero · integridad core
P1 journey principal · operación · conversión · UX crítica
P2 optimización · consistencia · escala
P3 polish · expansión · experimento
```

Un P0 relacionado con el trabajo tiene prioridad sobre mejoras cosméticas.

## Validación

Usar los gates reales del repo:

```bash
npm run build
npm test
npm run lint
```

`UGO Core CI` agrega instalación reproducible, audit de dependencias y lint crítico.

Niveles:

```text
L0 tipos/lint/build
L1 contract tests + estados UX
L2 dominio/RPC/API
L3 RLS/roles/Storage
L4 integración/Realtime/pagos/mapas
L5 E2E Cliente↔Proveedor↔Admin
L6 deploy/smoke/rollback readiness
```

Nunca afirmar `VALIDATED`, CI verde, deploy correcto, migración aplicada o E2E exitoso sin evidencia de esa ejecución exacta. Si algo no pudo verificarse, indicarlo como pendiente.

## Evidencia de madurez

```text
IMPLEMENTED ≠ VALIDATED ≠ RELEASED ≠ MEASURED
```

Un commit no es un release. Un build no sustituye CI. CI no sustituye deploy/smoke. Una credencial almacenada no prueba que una integración funcione.

## Git y cambios

`main` es la verdad integrada salvo instrucción explícita distinta. No crear clones o ramas paralelas por rutina. Usar cambios trazables y commits descriptivos. No ejecutar operaciones Git destructivas ni cambios irreversibles sin autorización explícita. Agrupar cambios relacionados para evitar commits y deploys artificiales.

## Documentación viva

Si cambia lifecycle, dinero, permisos, RPC/API, matching, evidencia, UX canónica, arquitectura o quality gates, actualizar en el mismo bloque sólo los maestros afectados y `UGO_ROADMAP_MASTER.md`. Si una Skill queda desactualizada, corregirla también.

## UX y voz

Principio:

> **Menor esfuerzo + mayor claridad + confianza suficiente + resolución completa.**

No optimizar por un número arbitrario de toques. Para casos comunes, 3–5 confirmaciones es un objetivo adaptativo, no una ley. Voz y texto alimentan el mismo draft/contexto. Las decisiones críticas mantienen las confirmaciones humanas requeridas por el contrato.

## Pros del modo autónomo

- menos interrupciones y preguntas repetitivas;
- continuidad entre diagnóstico, implementación y QA;
- mayor velocidad de entrega;
- auditoría integrada al desarrollo;
- menos deriva entre código y maestros;
- detección temprana de regresiones;
- vertical slices más completos.

## Contras y mitigaciones

- **Interpretación incorrecta:** contrastar maestros, código y criterios de aceptación.
- **Cambio demasiado amplio:** trabajar por vertical slices pequeños y coherentes.
- **Inventar producto:** no convertir hipótesis en políticas sin decisión/validación.
- **Regresiones laterales:** revisar consumidores y probar contratos compartidos.
- **Exceso documental:** mantener AGENTS como protocolo y detalles en maestros/Skills.
- **Falso éxito:** exigir evidencia y separar IMPLEMENTED/VALIDATED/RELEASED.
- **Riesgo de autonomía excesiva:** reservar decisiones sensibles o irreversibles para confirmación humana.

## Patrón adoptado

UGO adopta el patrón de instrucciones persistentes usado por agentes modernos: un `AGENTS.md` raíz para reglas generales, documentos/Skills especializados por dominio, inspección del repositorio antes de actuar y validaciones programáticas después de los cambios. La autonomía existe dentro de guardrails verificables.

## Cierre al usuario

Reportar de forma breve:

```text
qué se hizo
qué se encontró/corrigió
qué validaciones se ejecutaron
commit/PR cuando exista
qué queda realmente abierto
```

No narrar cada comando ni pedir permiso para un siguiente paso que ya forma parte del pedido autorizado.

## Continuidad

Ante órdenes como `seguí`, `hacelo`, `arreglalo`, `auditá`, `mejoralo` o `ponete a trabajar`, recuperar el bloque activo, verificar el estado actual de `main` y continuar desde el último punto verificable en lugar de reiniciar desde cero.

## Regla final

> **Investigar antes de preguntar. Ejecutar el trabajo autorizado. Validar antes de declarar éxito. Auditar mientras se desarrolla. Mantener una sola realidad UGO.**