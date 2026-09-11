# UGO — Development Master

**Versión:** 1.0 · 11 de septiembre de 2026  
**Estado:** contrato maestro de desarrollo y ejecución  
**Rama de integración:** `main`  
**Repositorio:** `sebastisnzoth/ugo-admin-panel`

> Este documento define cómo se desarrolla UGO profesionalmente: cómo una idea se convierte en producto, quién decide qué, cómo se prioriza, implementa, valida, integra y libera. Su objetivo es evitar improvisación, trabajo duplicado y funcionalidades inconclusas.

---

# 1. Modelo de trabajo

UGO se gestiona como una startup de producto digital con disciplina de ingeniería.

```text
Visión de negocio
→ requisito de producto
→ análisis de impacto
→ especificación
→ prioridad
→ implementación
→ revisión técnica
→ validación
→ integración
→ release
→ medición
→ mejora
```

La regla fundamental es:

**primero cerrar el circuito operacional; después ampliar el ecosistema.**

---

# 2. Roles

En una empresa estos roles pueden estar repartidos entre varias personas. En UGO pueden concentrarse, pero las responsabilidades siguen siendo distintas.

## Founder / Product Owner

Decide:

- visión;
- problema a resolver;
- mercado;
- prioridades de negocio;
- reglas comerciales;
- experiencia deseada;
- aceptación funcional.

El Product Owner no necesita decidir archivos, hooks, RPC, SQL o arquitectura interna.

## Product / UX

Convierte necesidades en:

- journeys;
- estados;
- acciones;
- copy;
- jerarquía;
- comportamiento responsive;
- casos de error.

## Tech Lead / Senior Engineer

Responsable de:

- arquitectura;
- impacto técnico;
- contratos Cliente↔Proveedor↔Admin;
- frontend/backend;
- seguridad;
- RLS/RPC;
- Realtime;
- pagos;
- deuda técnica;
- estrategia de implementación;
- revisión antes de integrar.

## QA / Release

Responsable de demostrar que algo funciona:

- build;
- TypeScript;
- pruebas;
- roles;
- responsive;
- E2E;
- CI/deploy;
- smoke production;
- regresiones.

## Operaciones

Durante beta/producción:

- proveedores;
- clientes;
- servicios;
- incidencias;
- disputas;
- calidad;
- fraude;
- soporte.

---

# 3. Autoridad documental

UGO se gobierna mediante documentos maestros compatibles.

```text
UGO_MASTER_GOVERNANCE.md
        ↓
UGO_ECOSISTEMA_FLUJO.md
        ↓
UGO_UIUX_MAESTRO.md
UGO_UIUX_STITCH_MASTER.md
        ↓
UGO_ARQUITECTURA_TECNICA_MASTER.md
        ↓
UGO_DATA_BACKEND_MASTER.md
        ↓
UGO_TESTING_RELEASE_MASTER.md
        ↓
UGO_ROADMAP_MASTER.md
        ↓
UGO_DEVELOPMENT_MASTER.md
```

Este documento gobierna **cómo se ejecuta el trabajo**, no reemplaza los contratos funcionales, técnicos, de datos o testing.

Ante conflicto:

```text
seguridad/datos ejecutables
→ flujo funcional
→ arquitectura
→ UI/UX
→ Stitch
→ roadmap/planificación
```

---

# 4. Fuente de verdad

`main` es la integración oficial.

Reglas:

- no crear un segundo UGO paralelo;
- no clonar soluciones completas dentro del mismo proyecto;
- no revivir componentes legacy para evitar integrar correctamente;
- ramas históricas son material de rescate selectivo;
- Stitch/Penpot son referencia visual, no runtime alternativo;
- documentación no reemplaza código ejecutable;
- código presente no significa funcionalidad validada.

---

# 5. Estados profesionales de una funcionalidad

Toda función pasa por:

```text
IDEA
→ DEFINED
→ READY
→ IN PROGRESS
→ IMPLEMENTED
→ VALIDATED
→ RELEASED
→ MEASURED
```

Definiciones:

**IDEA** — concepto todavía sin contrato.  
**DEFINED** — problema, usuario y resultado definidos.  
**READY** — alcance, dependencias, UX, datos y criterios de aceptación suficientes para programar.  
**IN PROGRESS** — implementación activa.  
**IMPLEMENTED** — código integrado pero todavía no necesariamente probado de extremo a extremo.  
**VALIDATED** — pasó los gates correspondientes de Testing Master.  
**RELEASED** — desplegado y smoke verificado.  
**MEASURED** — existe información real para evaluar resultado.

Nunca usar `HECHO` como sinónimo automático de `hay código`.

---

# 6. Prioridades

```text
P0 — integridad, seguridad, auth, dinero, core operacional
P1 — experiencia operacional necesaria
P2 — inteligencia, optimización y escala
P3 — expansión, experimentos y polish no bloqueante
```

Regla de foco:

**un P2 o P3 no desplaza un P0 abierto salvo decisión explícita de producto por una razón excepcional.**

---

# 7. Cómo entra una idea nueva

Ejemplo:

> “Quiero que el cliente mande fotos antes de que el proveedor acepte.”

No se programa inmediatamente. Se procesa así:

```text
1 problema
2 usuario/rol
3 momento del journey
4 estado de dominio
5 UX
6 datos
7 permisos/RLS
8 API/RPC/Storage
9 Realtime
10 contraparte del flujo
11 errores/offline
12 criterios de aceptación
13 implementación
14 testing
15 release
```

Resultado: una idea de negocio se transforma en una capacidad completa del ecosistema, no en un botón aislado.

---

# 8. Definition of Ready

Una tarea está READY cuando podemos responder:

```text
¿qué problema resuelve?
¿para qué rol?
¿en qué punto del journey?
¿qué estado lee/cambia?
¿cuál es la próxima acción?
¿qué datos necesita?
¿qué permisos necesita?
¿afecta dinero?
¿afecta Cliente/Proveedor/Admin?
¿necesita Realtime?
¿necesita Storage?
¿qué pasa si falla?
¿cómo sabremos que funciona?
```

Si una respuesta crítica falta, primero se diseña el contrato.

---

# 9. Diseño técnico antes de código

Para cambios medianos/grandes, el Tech Lead define:

```text
archivos afectados
componentes
contratos TypeScript
estado de dominio
schema/migración
RPC/API
RLS
Realtime
Storage
compatibilidad hacia atrás
riesgos
pruebas
```

Preferir cambios pequeños y verticales que cierren comportamiento real.

---

# 10. Vertical Slice

UGO evita construir todas las pantallas primero y el backend después.

Una slice profesional atraviesa las capas necesarias.

Ejemplo:

```text
Cliente crea solicitud
→ DB persiste
→ matching genera oportunidad
→ Proveedor recibe
→ Proveedor acepta
→ DB asigna
→ Cliente ve asignación
```

Una slice pequeña funcionando de extremo a extremo vale más que cinco pantallas desconectadas.

---

# 11. Sprint de UGO

Cadencia recomendada actual: **1 semana**.

Cada sprint debe tener un objetivo de negocio verificable, no una lista enorme de componentes.

Ejemplo:

```text
SPRINT GOAL
Un cliente crea una solicitud con evidencia y un proveedor puede analizarla y aceptarla correctamente.
```

Estructura:

```text
Inicio
- seleccionar P0/P1
- definir Sprint Goal
- confirmar Definition of Ready

Ejecución
- implementar vertical slices
- commits pequeños
- validar continuamente

Cierre
- build
- pruebas
- E2E afectado
- revisar deuda introducida
- actualizar Roadmap
- decidir release
```

---

# 12. Límite de trabajo simultáneo

Para evitar dispersión:

```text
1 objetivo principal de sprint
máximo 2 tareas de implementación core simultáneas
1 carril separado para bugs P0
```

Una idea nueva se registra; no interrumpe automáticamente el sprint.

---

# 13. Git y ramas

Política actual:

```text
main = integración oficial
feature/* = trabajo aislado cuando el riesgo lo justifique
fix/* = corrección
hotfix/* = producción crítica
```

Para cambios pequeños y controlados puede trabajarse directamente sobre `main` cuando ésa sea la decisión operativa vigente, pero el estándar objetivo para cambios de riesgo medio/alto es:

```text
branch
→ implementación
→ build/tests
→ review
→ merge main
→ deploy
```

No hacer merge masivo de ramas históricas.

Commits:

```text
feat(scope): ...
fix(scope): ...
refactor(scope): ...
test(scope): ...
docs(scope): ...
chore(scope): ...
```

Cada commit debe representar una intención entendible y reversible.

---

# 14. Revisión de código

Antes de integrar una función importante revisar:

```text
correctitud
simplicidad
tipos
seguridad
RLS
concurrencia
idempotencia
manejo de errores
loading/offline
Realtime
responsive
accesibilidad
observabilidad
compatibilidad con maestros
```

Preguntas senior:

- ¿puede ejecutarse dos veces?
- ¿otro usuario puede acceder?
- ¿qué pasa si Realtime falla?
- ¿qué pasa si el pago llega tarde?
- ¿qué pasa si dos proveedores aceptan?
- ¿qué pasa si el usuario cierra la app?
- ¿podemos recuperar el estado desde DB?

---

# 15. Seguridad por diseño

No agregar seguridad al final.

Toda función nueva identifica desde READY:

```text
actor
recurso
acción
estado permitido
autorización
RLS/RPC/API
registro/auditoría
```

La UI puede ocultar acciones, pero el backend debe impedirlas.

---

# 16. Dinero por diseño

Toda función que toque dinero requiere:

```text
importe fuente
método
estado
actor autorizado
idempotencia
referencia externa
reconciliación
auditoría
retry
fallo parcial
DEMO/REAL
```

Efectivo y pago electrónico nunca comparten una falsa promesa de protección.

---

# 17. Realtime por diseño

Realtime es sincronización, no fuente primaria.

Patrón:

```text
acción
→ persistencia confirmada
→ evento Realtime
→ cliente actualiza/refetch
```

La aplicación debe poder recuperar el estado correcto desde DB después de reconectar.

---

# 18. UX por diseño

Toda pantalla sigue:

**Estado → contexto → próxima acción.**

Toda superficie conectada:

```text
loading
loaded
empty
error
retry
offline/degraded
```

Toda mutación:

```text
idle → submitting → success
                  ↘ error → recovery
```

No agregar overlays cuando la acción pertenece naturalmente al journey.

---

# 19. Testing continuo

No esperar al final del proyecto.

Durante desarrollo:

```text
TypeScript
build
componente/flujo
roles
RLS
Realtime
error paths
```

Antes de VALIDATED se aplica `UGO_TESTING_RELEASE_MASTER.md`.

Antes de RELEASED se verifica deploy y smoke real.

---

# 20. Bug management

Clasificación:

```text
P0 seguridad/dinero/auth/pérdida de datos/core bloqueado
P1 flujo principal degradado
P2 función secundaria
P3 visual/polish
```

P0:

```text
reproducir
→ contener riesgo
→ identificar causa raíz
→ corregir
→ agregar regresión
→ validar
→ liberar
→ documentar si afecta contrato
```

No ocultar un bug crítico con un workaround visual.

---

# 21. Deuda técnica

Deuda aceptable debe ser:

- explícita;
- acotada;
- priorizada;
- con consecuencia conocida.

No decir “después vemos” sin registrar impacto.

Deuda P0 actual se mantiene en Roadmap Master.

---

# 22. Gestión de decisiones

Una decisión importante debe dejar rastro cuando afecta:

- arquitectura;
- estados;
- seguridad;
- pagos;
- roles;
- integraciones;
- privacidad;
- UX transversal.

Formato recomendado:

```text
Decisión
Contexto
Opciones
Elección
Motivo
Consecuencias
Fecha
```

Para decisiones grandes puede crearse `docs/adr/ADR-XXXX-*.md`.

---

# 23. Métricas de ingeniería

No medir productividad por líneas de código.

Medir:

```text
vertical slices cerradas
P0 abiertos
lead time IDEA→VALIDATED
bugs/regresiones
build health
release frequency
rollback/fallos
cobertura E2E crítica
```

---

# 24. Métricas de producto

Después de salir al mercado:

```text
solicitud → match
match → aceptación
tiempo a asignación
tiempo de llegada
servicio completado
cancelaciones
disputas
repetición
rating
proveedores activos
fill rate
GMV/comisión cuando aplique
```

Scout debe ayudar a convertir estas métricas en acciones.

---

# 25. Entornos

Objetivo profesional:

```text
LOCAL/DEV
→ PREVIEW/STAGING
→ PRODUCTION
```

Los datos y credenciales deben distinguir entornos. DEMO no debe contaminar producción.

Toda integración externa debe poder identificar entorno cuando el proveedor lo permita.

---

# 26. Release profesional

Una release sigue:

```text
scope congelado
→ build
→ tests
→ migraciones verificadas
→ RLS/security
→ E2E crítico
→ deploy
→ smoke
→ monitorización
→ rollback si falla
```

Nunca liberar sólo porque “se ve bien”.

---

# 27. Incidentes de producción

Cuando UGO tenga usuarios reales:

```text
detectar
→ clasificar severidad
→ proteger usuarios/dinero/datos
→ mitigar
→ corregir
→ validar
→ comunicar cuando corresponda
→ postmortem
```

Postmortem sin buscar culpables: causa, impacto, detección, solución y prevención.

---

# 28. Cómo trabaja el Founder con ingeniería

El Founder puede hablar en lenguaje natural.

Ejemplos válidos:

```text
“Quiero que el proveedor entienda mejor el trabajo antes de aceptar.”
“Quiero que el cliente sepa exactamente cuándo llega.”
“Quiero evitar acuerdos fuera de UGO.”
“Quiero que Admin detecte servicios con problemas.”
```

Ingeniería debe transformar eso en contratos y tareas técnicas.

El Founder no tiene que especificar:

```text
qué hook crear
qué tabla modificar
qué CSS tocar
qué RPC usar
qué subscription abrir
```

---

# 29. Cómo debe responder ingeniería a una petición

Para trabajo importante, el formato recomendado es:

```text
OBJETIVO
qué resultado buscamos

ESTADO ACTUAL
qué existe realmente

IMPACTO
Cliente / Proveedor / Admin / Data / Pago / Realtime

PLAN
orden de implementación

RIESGOS
qué puede romperse

VALIDACIÓN
cómo sabremos que funciona

RESULTADO
IMPLEMENTED / VALIDATED / RELEASED
```

Esto evita respuestas del tipo “listo” cuando sólo existe un commit.

---

# 30. Proceso específico actual de UGO

Mientras existan P0 del core, el orden operativo es:

```text
1 Build/TypeScript main
2 RLS + guards backend recientes
3 Solicitud Cliente + evidencia integrada
4 Matching + oportunidad Provider + serviceId
5 Pagos electrónico/efectivo + timeline + cierre
6 Tracking/ETA
7 Notificaciones
8 Consolidación visual Cliente/Proveedor
9 Admin operacional/financiero
10 Scout/Hugo avanzado
11 Academia/expansión
```

No abrir un nuevo gran módulo antes de estabilizar los puntos 1–5 salvo bloqueo real.

---

# 31. Criterio de MVP operacional

El MVP está listo cuando un usuario real puede, sin intervención técnica extraordinaria:

```text
registrarse
→ crear solicitud + evidencia
→ recibir matching
→ contratar proveedor
→ pagar/seleccionar efectivo
→ seguir llegada
→ ejecutar servicio
→ ampliar de forma trazable
→ documentar evidencia
→ aprobar/disputar
→ cerrar pago
→ calificar
```

Y el proveedor puede completar el circuito equivalente y Admin resolver excepciones críticas.

---

# 32. Criterio de producto fuerte de mercado

Además del MVP:

```text
seguridad validada
pagos/retiros confiables
tracking estable
notificaciones
KYC
Admin operacional
observabilidad
soporte/incidentes
analytics esenciales
UX consistente
regresión automatizada del core
operación real medible
```

No hace falta completar toda Academia o toda la visión futura de Scout para lanzar.

---

# 33. Regla para nuevas conversaciones/trabajos

Cuando se retome UGO:

```text
1 leer Roadmap/P0 vigente
2 comprobar estado real de main
3 elegir siguiente bloqueo del circuito
4 implementar vertical slice
5 validar
6 actualizar estado/documentación
```

No elegir la próxima tarea únicamente por ser visualmente atractiva o fácil.

---

# 34. Regla final

**Producto decide el problema. Ingeniería decide cómo resolverlo. Testing demuestra que funciona. Operaciones demuestra que funciona en el mundo real. Datos dicen qué mejorar después.**

UGO avanza cuando cierra circuitos reales, no cuando acumula pantallas, commits o funcionalidades aisladas.