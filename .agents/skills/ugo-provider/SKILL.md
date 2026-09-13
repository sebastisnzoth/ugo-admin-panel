---
name: ugo-provider
description: Desarrollo y auditoría de UGO Proveedor. Usar para Home, Demanda, Oportunidades, aceptación y ejecución de servicios, Asistente de Trabajo, actividad, ingresos y ampliación de trabajos.
---
# UGO Proveedor

## Objetivo
Construir un journey rápido, accionable y confiable donde el proveedor se concentre en resolver el problema y UGO absorba la complejidad operativa por detrás.

## Regla de oro

> **El proveedor recibe un problema, decide si puede resolverlo, va, lo resuelve y marca listo.**

Modelo mental del happy path:

`ver problema → Aceptar → Estoy yendo → Empezar trabajo → Listo`

`Llegué` debe automatizarse por ubicación cuando sea confiable/autorizada y tener fallback manual discreto.

La UI no debe convertir estados internos, evidencia, auditoría, pagos o campos de backend en pasos universales visibles.

## Flujo canónico interno
El servicio conserva un único `serviceId` y las transiciones persistidas definidas por los maestros/backend. La experiencia visible del proveedor es una proyección simplificada del estado real, no una segunda máquina de estados.

## Contratos
- Aceptación debe conservar un único `serviceId`, ser atómica y dejar tarifa real válida; si no existe tarifa válida, rechazar.
- `asignado → en_camino` sólo con electrónico protegido/verificable o efectivo explícitamente seleccionado.
- `en_camino → llegado`: automatizar cuando exista ubicación autorizada y confiable; backend conserva autoridad y fallback manual seguro.
- Evidencia no se presenta como burocracia universal. Debe solicitarse sólo cuando la política/categoría/seguridad/pago/disputa lo requiera y siempre en el momento real correspondiente.
- En trabajo activo, mostrar una sola acción primaria válida para el estado actual.
- Efectivo y electrónico conservan sus reglas de cierre y conciliación sin exponer estados financieros técnicos al proveedor.
- `Agregar trabajo / Ampliar servicio`: sólo aparece cuando existe una excepción real; descripción, costo, tiempo, aprobación y trazabilidad continúan siendo obligatorios cuando hay cambio de alcance/precio.
- No empujar acuerdos fuera de plataforma.

## Oportunidad
Priorizar en pantalla:
1. qué problema hay que resolver;
2. foto/video/evidencia disponible;
3. zona/ubicación útil;
4. cuándo;
5. valor/visita cuando aplique.

CTA principal: `Aceptar`. Secundario: `No puedo tomarlo`. Si necesita diagnóstico presencial, ofrecer `Ver en persona` sin abrir un wizard burocrático.

## Misión activa
La jerarquía debe ser:

`problema → ubicación/ruta → acción ahora → información secundaria`

Acciones visibles del caso común:

`Estoy yendo → Empezar trabajo → Listo`

No mostrar acciones futuras. No encadenar modales o formularios de cierre.

## Hugo · Asistente de Trabajo
Hugo es secundario al trabajo físico: ayuda con diagnóstico, seguridad, excepciones, ampliaciones y cierre sólo cuando aporta valor. Puede transformar un resumen de voz/texto en reporte legible, pero ese reporte no bloquea un servicio común salvo requisito real de política o contrato.

Hugo refleja el estado persistido real y nunca inventa pago, disponibilidad, precio o transición.

## UX
Cada estado responde `Estado → contexto → próxima acción`, pero el proveedor debe sentir algo todavía más simple: `qué tengo que resolver + dónde + qué hago ahora`.

Reutilizar design system. Targets ≥48 px, contraste AA, responsive 360–430 y web/desktop, loading/offline/error/retry recuperables. El happy path no debe exigir capacitación.

## Brief obligatorio
Para rediseñar o implementar el flujo operativo del proveedor, leer también `docs/UGO_PROVIDER_SIMPLE_FLOW_PROMPT.md`.

## QA
Ejecutar validaciones aplicables: TypeScript/build, `npm test`, lint crítico y journey UI/Playwright cuando esté disponible. Verificar Cliente/realtime en transiciones compartidas. No declarar verde sin evidencia. Al cerrar un bloque contractual, actualizar maestros afectados y Roadmap.