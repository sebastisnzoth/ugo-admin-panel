# UGO — Master Index

**Versión:** 2.4 · 13 de septiembre de 2026  
**Estado:** puerta de entrada única al sistema maestro de UGO  
**Rama de verdad:** `main`

> UGO mantiene **una sola realidad de producto**. Los documentos maestros se dividen por autoridad, pero nunca pueden crear flujos, estados o reglas paralelas.

---

# 1. North Star de UGO

UGO existe para lograr esto:

```text
Necesidad real
→ proveedor adecuado
→ contratación clara
→ ejecución trazable
→ resultado aprobado
→ cobro correcto
→ reputación
→ repetición/recomendación
```

La métrica principal es **servicios confiables completados dentro de UGO**.

Regla estratégica: **primero cerrar el circuito real; después ampliar el ecosistema.**

Regla de confianza: **UGO es tu mejor amigo. Lo que UGO promete en pantalla debe ocurrir realmente. Lo que el equipo declara listo debe poder probarse.**

---

# 2. Sistema maestro unificado

## Nivel 0 — Gobierno
`UGO_MASTER_GOVERNANCE.md`

## Nivel 1 — Desarrollo
`UGO_DEVELOPMENT_MASTER.md`

## Nivel 1.5 — Arquitectura de agentes y aceleración
`UGO_AI_AGENT_SYSTEM_MASTER.md`

## Nivel 2 — Producto
`UGO_ECOSISTEMA_FLUJO.md`

## Nivel 3 — Experiencia
`UGO_UIUX_MAESTRO.md`  
`UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`  
`UGO_UIUX_STITCH_MASTER.md`  
`UGO_CLIENTE_CONVERSACIONAL_INTERACTIVO_MASTER.md`

## Nivel 4 — Ingeniería
`UGO_ARQUITECTURA_TECNICA_MASTER.md`

## Nivel 5 — Datos y seguridad
`UGO_DATA_BACKEND_MASTER.md`

## Nivel 6 — Calidad
`UGO_TESTING_RELEASE_MASTER.md`

## Nivel 7 — Ejecución
`UGO_ROADMAP_MASTER.md`

---

# 3. Contrato de confianza y avance real

La unidad real de avance es un **escenario completo verificable**, no una pantalla, componente, commit o porcentaje estimado.

```text
IMPLEMENTED ≠ VALIDATED ≠ RELEASED ≠ MEASURED
```

Ninguna pantalla crítica puede dejar a una persona atrapada. Todo estado debe contemplar las salidas aplicables: acción principal, cancelar/salir, volver, retry, alternativa, error, timeout y recuperación.

Caso obligatorio de matching:

```text
Buscando profesionales
→ proveedor encontrado
O → todavía no hay proveedor
O → timeout/error/offline
O → cliente cancela
```

Las ramas deben terminar en un estado coherente, persistido y recuperable. `Buscando profesionales` nunca puede ser un callejón sin salida.

Cancelar es parte del journey principal. Un botón `Cancelar` que sólo cambia UI, no persiste, no sincroniza la contraparte o deja estados huérfanos no está terminado.

La frase **“está listo, probalo”** queda reservada para una capacidad realmente disponible en el entorno indicado y con validación/smoke aplicable ejecutado.

---

# 4. Matriz mínima Cliente ↔ Proveedor

Antes de considerar cerrado el journey principal deben comprobarse como mínimo:

```text
1 Cliente crea solicitud válida
2 Cliente edita antes de enviar
3 Cliente cancela durante búsqueda
4 matching sin proveedores disponibles
5 matching timeout/error/offline y recuperación
6 Proveedor recibe oportunidad
7 Proveedor rechaza
8 oportunidad expira
9 Proveedor acepta
10 competencia/doble aceptación segura
11 Cliente ve proveedor asignado
12 cancelaciones permitidas posteriores
13 pago habilita/bloquea correctamente
14 en camino / llegada
15 evidencia / inicio
16 servicio en progreso
17 cierre / aprobación o disputa
18 pago / registro / reputación / historial
19 Admin converge al mismo serviceId y estado
20 recorrido mobile desplegado y smokeado
```

Reportar avance como escenarios validados, implementados pendientes y bloqueados. No usar un porcentaje global sin base medible.

---

# 5. Contrato transversal de servicio

Estado persistido canónico:

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones:

```text
cancelado · disputado
```

Entre `asignado` y `en_camino` existe una condición financiera obligatoria: pago electrónico realmente habilitado/protegido o efectivo explícitamente seleccionado.

Proveedor operacional:

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

Nunca mezclar la máquina de estado del proveedor con la máquina del servicio.

---

# 6. Contrato Cliente ↔ Proveedor

```text
Cliente crea solicitud + evidencia
→ matching genera oportunidad para el mismo serviceId
→ Proveedor autorizado analiza
→ acepta/rechaza
→ aceptación atómica y asignación única
→ tarifa real fijada
→ ambos observan el mismo servicio persistido
→ método de pago habilita ejecución
→ tracking durante traslado
→ llegada validada
→ evidencia Antes
→ inicio
→ evidencia Después
→ aprobación/disputa
→ cierre
```

`serviceId` es la identidad transversal del trabajo.

Cada transición debe probar también las ramas reales que correspondan: cancelación, ausencia de proveedor, rechazo, expiración, timeout, offline, retry y doble acción.

---

# 7. Madurez y Definition of Ready to Test

```text
IDEA → DEFINED → READY → IN PROGRESS
→ IMPLEMENTED → VALIDATED → RELEASED → MEASURED
```

Una capacidad sólo puede entregarse como `LISTA PARA PROBAR` cuando existe en `main`, sus acciones críticas están conectadas a comportamiento real, happy path y recuperaciones aplicables funcionan, persiste correctamente, la contraparte converge cuando corresponde, pasan los gates aplicables y existe un deploy objetivo comprobable.

Un commit, build o pantalla visible no significan `HECHO`.

---

# 8. Principios de éxito

1. Una sola fuente de verdad.
2. Confianza antes que crecimiento superficial.
3. UGO es tu mejor amigo: cumple lo que promete.
4. Mobile-first sin degradar desktop.
5. Estado → contexto → próxima acción → salida/recuperación.
6. Ninguna pantalla crítica queda muerta o atrapada.
7. Dinero, identidad y evidencia siempre auditables.
8. Cliente y Proveedor comparten el mismo servicio, no copias.
9. Cancelación y errores son parte del journey, no casos decorativos.
10. Todo botón crítico debe producir un resultado verificable.
11. Hugo ayuda; no salta permisos ni estados.
12. Los maestros se actualizan con el contrato real de `main`.
13. La arquitectura de agentes existe para reducir lead time, no para multiplicar actividad.
14. No declarar éxito sin evidencia exacta.
15. Proteger el tiempo del founder: no confundir trabajo realizado con producto validado.

---

# 9. Regla final

**UGO cuida la confianza cumpliendo. Si una persona puede quedar atrapada, si un botón crítico no hace lo prometido, si cancelar no cierra correctamente el estado o si una rama real no tiene recuperación, el flujo no está terminado. Primero cerrar y probar el circuito Cliente ↔ Proveedor ↔ Admin; después ampliar.**
