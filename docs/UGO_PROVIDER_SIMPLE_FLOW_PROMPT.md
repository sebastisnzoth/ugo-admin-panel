# UGO Proveedor — Prompt de implementación · flujo simple

**Fecha:** 13 de septiembre de 2026  
**Rama objetivo:** `main`  
**Alcance:** flujo operativo del Proveedor + UI/UX responsive  
**Estado:** brief ejecutable de producto; no crea una máquina de estados paralela

## Prompt

Trabajá sobre UGO Proveedor siguiendo `AGENTS.md`, los maestros vigentes y la Skill `ugo-provider`. Antes de modificar código, inspeccioná el flujo real de Cliente ↔ Proveedor, componentes actuales, estados persistidos, RPC/API, permisos, Realtime y responsive. No inventes un proveedor demo paralelo.

### Decisión de producto validada

La experiencia del proveedor debe ser **mucho más simple que la complejidad interna de UGO**.

Regla de oro:

> **El proveedor recibe un problema, decide si puede resolverlo, va, lo resuelve y marca listo. UGO se ocupa del resto por detrás.**

Modelo mental del proveedor:

```text
VER EL PROBLEMA
→ ACEPTAR
→ ESTOY YENDO
→ EMPEZAR TRABAJO
→ LISTO
```

`Llegué` debe resolverse automáticamente por ubicación cuando sea confiable y esté autorizada. Debe existir un fallback manual discreto si GPS/permisos/red no permiten confirmarlo.

No agregar formularios, checklists, reportes ni pasos porque el backend tenga campos. La UI muestra únicamente la acción que el proveedor necesita ejecutar ahora.

## 1. Oportunidad

La oportunidad debe permitir decidir en segundos.

Mostrar con máxima prioridad:

- **qué problema hay que resolver**;
- foto/video/evidencia del cliente cuando exista;
- ubicación o zona necesaria para decidir y llegar, respetando privacidad;
- momento del servicio;
- valor acordado o valor de visita cuando aplique.

Acción primaria grande:

```text
ACEPTAR
```

Acción secundaria discreta:

```text
NO PUEDO TOMARLO
```

Si el proveedor no puede saber la solución sin revisar físicamente, ofrecer una única alternativa contextual:

```text
VER EN PERSONA
```

Eso representa una visita de diagnóstico según las reglas comerciales vigentes; no abrir un wizard adicional para el proveedor.

## 2. Trabajo aceptado

Después de aceptar, la pantalla debe responder sólo dos preguntas:

```text
¿Dónde tengo que ir?
¿Qué tengo que resolver?
```

Mostrar:

- ruta/mapa y dirección útil;
- resumen corto del problema;
- evidencia original accesible;
- contacto/soporte sólo cuando sea necesario.

CTA dominante:

```text
ESTOY YENDO
```

UGO registra por detrás hora, serviceId, proveedor, transición y notifica al cliente.

## 3. Llegada

Cuando el proveedor entra en la zona válida del servicio y la ubicación es confiable, UGO debe registrar `llegado` y avisar al cliente automáticamente.

No obligar al proveedor a tocar `Llegué` en el happy path.

Fallback si la detección automática falla:

```text
YA LLEGUÉ
```

Este fallback no compite visualmente con la acción principal cuando no hace falta.

## 4. Ejecución

Al llegar, la acción principal pasa a:

```text
EMPEZAR TRABAJO
```

Durante el trabajo, la UI no debe transformarse en un formulario administrativo. El proveedor está trabajando, no operando software.

Mostrar el problema, dirección/contexto esencial y soporte de Hugo de forma secundaria.

Si aparece una excepción real —cambio de alcance, precio, seguridad, material relevante o necesidad de aprobación— mostrarla **sólo en ese momento** mediante una acción secundaria contextual. Las ampliaciones con costo conservan aprobación y trazabilidad del contrato actual.

## 5. Finalización

Acción primaria:

```text
LISTO
```

Al tocarla, UGO registra finalización y prepara el cierre con el Cliente según método de pago y reglas vigentes.

El happy path **no debe exigir un formulario de cierre**.

Cuando la política del servicio, categoría, seguridad, disputa o contrato de pago requiera evidencia, pedir sólo la evidencia mínima necesaria y en el momento correcto. No convertir foto inicial/final en pasos universales visibles si pueden ser automáticos, opcionales o contextuales.

Un resumen por voz o texto puede estar disponible como acción rápida/no bloqueante. Hugo puede convertirlo en un reporte legible, pero el proveedor no debe escribir un informe para poder salir de un trabajo común salvo requisito real.

## 6. Transparencia para Hugo sin burocracia para el proveedor

Aunque el proveedor vea pocas acciones, UGO debe conservar por detrás una línea de tiempo auditable:

```text
pedido
→ oportunidad
→ aceptación/rechazo
→ en camino
→ llegada automática/manual
→ inicio
→ excepciones/aprobaciones si existieron
→ finalización
→ revisión/cierre del cliente
```

Registrar timestamps, actor, `serviceId`, estado persistido y evidencia requerida disponible. Realtime sincroniza la verdad persistida; no crea otra verdad.

Principio:

> **Simple adelante. Trazable atrás.**

## 7. UI/UX

Diseñar mobile-first y responsive para app/web sin duplicar dominio.

Reglas:

- una sola acción primaria por estado;
- CTA grande, inequívoco y usable con una mano;
- targets táctiles ≥48 px;
- problema y próxima acción siempre por encima de información secundaria;
- lenguaje cotidiano, sin nombres técnicos de estados;
- no mostrar acciones futuras;
- no usar modales encadenados;
- evitar menús durante la misión activa;
- mapa con fallback textual;
- loading, offline, error y retry conservan el servicio;
- 360–430 px debe funcionar sin scroll absurdo ni CTA oculto;
- desktop/web adapta layout, no agrega complejidad;
- PT-BR y ES preparados;
- accesibilidad AA en acciones críticas.

### Jerarquía visual de una misión activa

```text
1. QUÉ HAY QUE RESOLVER
2. DÓNDE
3. ACCIÓN AHORA
4. información secundaria / Hugo / soporte
```

## 8. Lo que NO hay que hacer

No construir el happy path así:

```text
Aceptar
→ completar checklist
→ confirmar agenda
→ confirmar salida
→ confirmar llegada
→ foto obligatoria
→ formulario de diagnóstico
→ iniciar
→ materiales
→ reporte
→ foto obligatoria
→ confirmar cierre
```

Eso contradice la decisión de producto.

No eliminar seguridad, dinero, aprobación de ampliaciones, integridad de estados ni trazabilidad. **Mover complejidad al sistema no significa borrar controles críticos; significa no convertirlos en burocracia universal para el proveedor.**

## 9. Criterios de aceptación

El bloque no se considera terminado hasta demostrar:

1. Una oportunidad real permite entender el problema y aceptar/rechazar sin navegar por pantallas innecesarias.
2. El happy path del proveedor tiene como máximo estas acciones operativas visibles: `Aceptar → Estoy yendo → Empezar trabajo → Listo`.
3. `Llegué` se automatiza cuando ubicación/permisos lo permiten y tiene fallback manual seguro.
4. Cliente y Proveedor usan el mismo `serviceId` y estado persistido.
5. Cada CTA ejecuta una transición real; no hay botones decorativos.
6. Si una transición falla, la UI explica qué pasó y permite retry sin perder contexto.
7. Las excepciones de precio/alcance sólo aparecen cuando existen y mantienen aprobación del cliente.
8. Evidencia/reporte no agregan pasos universales innecesarios al happy path.
9. Funciona en mobile 360–430 y web responsive.
10. Pasan los gates aplicables (`build`, tests, lint y E2E cuando esté disponible).

## 10. Orden de desarrollo

```text
1 auditar Provider actual y legacy
2 mapear estados reales y componentes a conservar
3 simplificar oportunidad
4 simplificar misión activa a un CTA por estado
5 automatizar/fallback de llegada
6 hacer evidencia/reporte contextuales según política
7 sincronizar Cliente + Realtime
8 responsive mobile/web
9 tests de happy path + errores/retry
10 actualizar maestros/Roadmap con evidencia real
```

## Resultado esperado

Un proveedor como Ariel debe poder usar UGO sin capacitación y describir la experiencia así:

> **“Me llegó el problema. Vi si lo podía hacer. Acepté. Fui. Lo solucioné. Listo.”**

La sofisticación pertenece a UGO y Hugo, no al proveedor.