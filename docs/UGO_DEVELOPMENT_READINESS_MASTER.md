# UGO — Development Readiness Master

**Versión:** 1.0 · 15 de septiembre de 2026  
**Objetivo:** una sola verdad medible para llegar al primer cliente real.  
**Fuente viva:** `public.development_checklist` en UGO TEST.  
**Panel:** `/?app=development`.

## Regla principal

El checklist se actualiza en el mismo bloque de trabajo en el que cambia la realidad del producto.

```text
tarea implementada → status=implemented
tarea en prueba → status=in_progress
prueba falla → status=failed
bloqueo externo comprobado → status=blocked
prueba aplicable pasa + evidencia concreta → status=approved
```

**Sólo `approved` cuenta como avance verificado hacia el primer cliente real.**

No marcar `approved` porque existe una pantalla, un commit, un build o una intención. La evidencia debe identificar el resultado comprobable: test/run de CI, dispositivo, cuenta/rol, `serviceId`, smoke, consulta de datos o resultado E2E según corresponda.

## Obligación de sincronización

Cada agente o bloque de desarrollo que complete, rompa, desbloquee o vuelva a validar una tarea existente debe actualizar `public.development_checklist` inmediatamente. Si descubre un requisito necesario para el primer cliente que no existe todavía, debe incorporarlo con prioridad y criterio de aceptación claros.

Nunca dejar el panel diciendo `approved` si una regresión demuestra lo contrario. Ante una falla real, degradar el estado en ese mismo bloque y registrar evidencia.

## Porcentaje

El porcentaje principal del panel se calcula por peso y sólo con tareas `approved`:

```text
sum(weight de approved) / sum(weight total) × 100
```

Los estados `implemented` e `in_progress` sirven para mostrar trabajo realizado o en validación, pero no inflan el porcentaje verificado.

## Prioridad

`P0` significa que el punto puede impedir atender correctamente al primer cliente real o comprometer seguridad, identidad, datos, dinero o integridad del flujo principal.

El orden operativo del panel es:

```text
failed P0 → in_progress P0 → implemented P0 sin validar → blocked P0 → pending P0 → P1/P2/P3
```

Un P0 bloqueado no desaparece porque se avance en otra cosa.

## P0 de chat vigente

El chat no está terminado hasta demostrar con dos sesiones reales y el mismo `serviceId` que:

1. Cliente → Proveedor llega en tiempo real.
2. Proveedor → Cliente llega en tiempo real.
3. Reconnect/reload rehidrata el historial persistido.
4. Las respuestas rápidas operativas estilo Uber funcionan en ambas superficies.
5. Teléfonos, WhatsApp, emails, links y otros datos de contacto se bloquean/filtran antes de persistir o enviar.
6. Un chat nunca mezcla mensajes de dos servicios distintos.

## Gate final

`GO-LIVE` sólo puede pasar a `approved` cuando no queden P0 necesarios en `pending`, `in_progress`, `implemented`, `failed` o `blocked`, y el E2E Cliente ↔ Proveedor ↔ Admin del primer cliente haya sido ejecutado con evidencia.

## Regla de reporte

Toda respuesta sobre “¿cuánto avanzamos?” debe distinguir:

- **avance verificado:** porcentaje calculado por el checklist aprobado;
- **implementado sin validar:** trabajo que existe pero todavía no pasó la prueba exigida;
- **bloqueos P0:** lo que impide llegar al primer cliente real.

No sustituir estas métricas por una estimación subjetiva.
