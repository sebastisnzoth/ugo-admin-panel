---
name: ugo-qa
description: Auditoría y calidad del ecosistema UGO. Usar para verificar implementación contra MD maestros, detectar regresiones, probar journeys, revisar build, TypeScript, consola, rutas, UX/UI y criterios de aceptación.
---
# UGO QA

## Objetivo
Encontrar diferencias entre lo definido, lo implementado y lo que realmente funciona, priorizando el circuito real Cliente ↔ Proveedor ↔ Backend y evitando declarar terminada una interfaz que sólo cubre el happy path.

## Gates vigentes
1. Dependencias/audit aplicable.
2. TypeScript + production build.
3. `npm test` — contratos core.
4. Lint de superficies críticas.
5. Journey UI/E2E cuando exista runner disponible.
6. Gate UX/UI cuando se modifica una interfaz.
7. Realtime, permisos/RLS, pagos, evidencia y recuperación según alcance.
8. Smoke/deploy sólo cuando realmente se ejecute.

## Contratos mínimos a vigilar
- lifecycle canónico y un único `serviceId`;
- aceptación atómica + tarifa real;
- pago listo antes de `en_camino`;
- llegada con autoridad backend/radio 200 m cuando aplica;
- evidencia temporal `Antes/Durante/Después`;
- efectivo recibido antes de aprobación;
- aprobación del cliente con ownership/evidencia válidos;
- ampliación con delta financiero reconciliado;
- método de pago no sustituido silenciosamente.

## Gate UX/UI obligatorio
Cuando el bloque toca interfaz, contrastar con `docs/UGO_DESIGN_SYSTEM_INVENTORY.md`, `docs/UGO_UIUX_MAESTRO.md` y el maestro funcional aplicable.

Verificar proporcionalmente:

```text
[ ] la pantalla responde ¿Dónde estoy? ¿Qué está pasando? ¿Qué hago ahora?
[ ] estado/contexto/próxima acción son coherentes con dominio real
[ ] CTA primaria es visible, específica y accionable
[ ] no hay dead-end ni navegación contradictoria
[ ] pantalla anterior → actual → siguiente conserva continuidad
[ ] loading está cubierto
[ ] empty está cubierto
[ ] error explica qué pasó + qué se conservó + qué hacer
[ ] retry/recuperación existe cuando aplica
[ ] offline/degraded está contemplado cuando aplica
[ ] submitting/disabled evita dobles acciones cuando aplica
[ ] success refleja persistencia real, no optimismo ficticio
[ ] mobile 390×844 funciona cuando corresponde
[ ] rango 360–430 no rompe CTA, navegación ni contenido crítico
[ ] teclado no tapa campo/CTA
[ ] scroll y safe areas son correctos
[ ] targets táctiles ≥48×48 px
[ ] contraste WCAG AA
[ ] foco/teclado web son utilizables
[ ] labels/semántica accesible existen cuando corresponde
[ ] no depende sólo de color/icono
[ ] reduced motion tiene tratamiento cuando aplica
[ ] voz tiene alternativa completa por texto
[ ] mapa/radar tiene fallback y estados de fallo cuando aplica
[ ] reutiliza componentes/tokens antes de crear duplicados
[ ] no introduce CSS/valores arbitrarios evitables
[ ] ES/PT soportan expansión razonable del copy
[ ] ningún asset/mockup promete disponibilidad, garantía o capacidad inexistente
```

## Validación visual

Si existen herramientas configuradas de screenshots, Playwright visual, Storybook o regresión visual, usarlas según alcance.

Si no existen, **no afirmar validación visual automática**. Realizar la inspección disponible y registrar explícitamente qué parte queda sin evidencia automatizada.

Una captura bonita no sustituye:
- interacción;
- responsive;
- accesibilidad;
- estado real;
- recuperación de errores;
- E2E.

## Diseño gráfico y assets

Cuando `ugo-design-system` produzca mockups, ilustraciones o assets:

- validar que respeten el inventario canónico;
- comprobar que no sustituyan controles accesibles;
- comprobar que texto traducible no quede innecesariamente embebido en raster;
- comprobar fallback/alt cuando aplique;
- separar `DESIGNED`, `IMPLEMENTED` y `VALIDATED`;
- no considerar un mockup como prueba de funcionalidad.

## Protocolo
1. Identificar alcance, Skills y MD maestros relevantes.
2. Mapear criterios de aceptación y journey crítico.
3. Ejecutar validaciones disponibles: tipos, `npm test`, lint, build.
4. Aplicar gate UX/UI si se modificó interfaz.
5. Probar UI/journey con Playwright cuando esté disponible.
6. Revisar consola, rutas, realtime, estados, responsive y recuperación.
7. Clasificar hallazgos: P0, P1, P2, P3 según impacto real.
8. Corregir dentro del alcance autorizado y volver a probar.
9. Comparar implementación final con maestros y actualizar documentación/Roadmap si el contrato cambió.

## Severidad UX/UI

### P0
Bloquea uso real, crea dead-end, oculta CTA crítica o presenta estado/dinero/seguridad falsos.

### P1
Rompe journey principal, responsive crítico, accesibilidad esencial, recuperación o conversión/operación fuerte.

### P2
Inconsistencia, duplicación, deuda de componentes/tokens o fricción importante sin bloqueo.

### P3
Polish o microinteracción sin impacto material en completar la operación.

## Regla de evidencia
No declarar `OK`, `CI verde`, `deploy exitoso`, migración aplicada, E2E validado ni `visual regression OK` sin evidencia de esa ejecución exacta. Un workflow en progreso no es verde. Si algo no puede probarse, marcar pendiente con causa exacta.

Distinguir siempre:

```text
DESIGNED ≠ IMPLEMENTED ≠ VALIDATED ≠ RELEASED
```

## Deuda de testing
Los contract tests actuales son un gate mínimo, no reemplazan E2E. El objetivo siguiente es automatizar Cliente ↔ Proveedor ↔ Backend sobre el lifecycle completo y escenarios de pago/evidencia/disputa.

La regresión visual automatizada puede incorporarse cuando exista suficiente superficie compartida y su costo de mantenimiento sea menor que las regresiones/retrabajo que evita. No agregar infraestructura por moda.

## Cierre
Reportar qué pasó, qué falló, qué se corrigió, validaciones finales, commit correspondiente y riesgos reales restantes. Para UI indicar expresamente qué fue revisado visualmente y qué no pudo validarse de forma automatizada.
