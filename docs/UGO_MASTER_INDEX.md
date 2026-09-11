# UGO — Master Index

**Versión:** 1.0 · 11 de septiembre de 2026  
**Estado:** puerta de entrada única al sistema maestro de UGO  
**Rama de verdad:** `main`

> Este archivo es el punto de inicio obligatorio para producto, ingeniería, diseño, QA y operaciones. UGO no mantiene nueve verdades distintas: mantiene **un único sistema documental**, dividido por autoridad para que sea mantenible.

---

# 1. Una sola plataforma

UGO es:

```text
un producto
+ un dominio operacional
+ una fuente de datos
+ múltiples experiencias por rol
+ un proceso de desarrollo
+ un sistema de validación
```

Circuito central:

```text
Necesidad → búsqueda → solicitud → matching → asignación
→ contratación/pago → ejecución → evidencia → aprobación
→ cobro → reputación → datos → inteligencia → mejora
```

Regla de experiencia:

```text
Estado → contexto → próxima acción
```

Regla de ejecución:

**Primero cerrar el circuito real; después ampliar el ecosistema.**

---

# 2. Sistema maestro unificado

## Nivel 0 — Gobierno

`UGO_MASTER_GOVERNANCE.md`

Define vocabulario canónico, autoridad, compatibilidad y resolución de conflictos.

## Nivel 1 — Desarrollo

`UGO_DEVELOPMENT_MASTER.md`

Define cómo trabajamos: roles, sprints, prioridades, Definition of Ready, vertical slices, Git, review, incidentes y paso IDEA→RELEASED.

## Nivel 2 — Producto

`UGO_ECOSISTEMA_FLUJO.md`

Define qué hace UGO: actores, journeys, estados, reglas funcionales y circuito Cliente↔Proveedor↔Admin.

## Nivel 3 — Experiencia

`UGO_UIUX_MAESTRO.md`  
`UGO_UIUX_STITCH_MASTER.md`

El primero gobierna experiencia, navegación, Design System y contratos UX. Stitch es referencia de generación/adaptación visual y nunca reemplaza contratos de producto o runtime.

## Nivel 4 — Ingeniería

`UGO_ARQUITECTURA_TECNICA_MASTER.md`

Define fronteras técnicas, módulos, routing, roles, adapters, APIs e integraciones.

## Nivel 5 — Datos y seguridad

`UGO_DATA_BACKEND_MASTER.md`

Define persistencia, Supabase, RLS, RPC, Realtime, Storage, concurrencia, pagos e integridad.

## Nivel 6 — Calidad

`UGO_TESTING_RELEASE_MASTER.md`

Define cómo demostramos que funciona y cuándo pasa de IMPLEMENTED a VALIDATED y RELEASED.

## Nivel 7 — Ejecución

`UGO_ROADMAP_MASTER.md`

Define qué hacemos ahora, prioridades P0–P3 y estado real del trabajo.

---

# 3. Orden de lectura

Para una persona nueva en UGO:

```text
1 UGO_MASTER_INDEX.md
2 UGO_MASTER_GOVERNANCE.md
3 UGO_DEVELOPMENT_MASTER.md
4 UGO_ECOSISTEMA_FLUJO.md
5 UGO_UIUX_MAESTRO.md
6 UGO_ARQUITECTURA_TECNICA_MASTER.md
7 UGO_DATA_BACKEND_MASTER.md
8 UGO_TESTING_RELEASE_MASTER.md
9 UGO_ROADMAP_MASTER.md
```

`UGO_UIUX_STITCH_MASTER.md` se consulta cuando el trabajo incluye diseño/prototipado/migración Stitch.

---

# 4. Autoridad por pregunta

| Pregunta | Documento autoridad |
|---|---|
| ¿Qué significa este concepto en UGO? | Governance |
| ¿Cómo organizamos el trabajo? | Development |
| ¿Qué debe hacer el producto? | Ecosistema/Flujo |
| ¿Cómo debe entenderse y verse? | UI/UX |
| ¿Qué rescatamos/generamos desde Stitch? | Stitch |
| ¿Dónde y cómo se implementa? | Arquitectura |
| ¿Cómo se persiste/protege? | Data/Backend |
| ¿Cómo demostramos que funciona? | Testing/Release |
| ¿Qué hacemos primero? | Roadmap |

---

# 5. Jerarquía de conflicto

```text
Seguridad e integridad ejecutable
→ estado persistido
→ Governance
→ Flujo de producto
→ Arquitectura
→ UI/UX
→ Stitch
→ planificación
```

Development define el proceso para modificar esas capas; Testing decide si el resultado está validado.

Ejemplos:

- una pantalla no puede habilitar algo prohibido por RLS;
- Stitch no inventa estados de dominio;
- efectivo nunca se presenta como pago electrónicamente protegido;
- un commit no convierte una función en RELEASED;
- Roadmap no marca HECHO un P0 sin validación requerida.

---

# 6. Vocabulario transversal

## Roles

```text
Cliente · Proveedor · Admin · Super Admin
Scout · Hugo · Academia UGO
```

Scout, Hugo y Academia son capacidades del ecosistema; no crean dominios operacionales paralelos.

## Prioridad

```text
P0 integridad/core/seguridad/dinero
P1 operación necesaria
P2 inteligencia/optimización/escala
P3 expansión/polish
```

## Madurez

```text
IDEA → DEFINED → READY → IN PROGRESS
→ IMPLEMENTED → VALIDATED → RELEASED → MEASURED
```

## Estado Roadmap

```text
✅ HECHO
🟡 PARCIAL
⬜ PENDIENTE
⛔ BLOQUEADO
```

`HECHO` requiere la validación aplicable; no significa simplemente que existe código.

---

# 7. Estado maestro de servicio

Baseline conceptual:

```text
solicitado → buscando → ofertado → asignado
→ pago_pendiente / pago_habilitado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones:

```text
cancelado · disputado · reembolsado
```

Los nombres ejecutables concretos pertenecen a Data/Backend y migraciones. Si difieren, no se corrige sólo la UI: se revisa el contrato completo.

---

# 8. Contrato Cliente ↔ Proveedor

```text
Cliente crea solicitud + evidencia previa
→ mismo servicio de dominio
→ matching genera oportunidad
→ Proveedor analiza descripción/evidencia
→ acepta/rechaza
→ asignación única
→ Cliente y Proveedor observan el mismo estado persistido
```

`serviceId` es un contrato transversal, no un detalle visual.

---

# 9. Contrato de pago

Electrónico:

```text
pendiente → autorizado → protegido/retenido
→ liberación pendiente → liberado/pagado
```

Efectivo:

```text
seleccionado → presencial pendiente
→ servicio habilitado
→ proveedor confirma recepción
→ registrado
```

**Efectivo no tiene custodia electrónica UGO.**

Toda UI, flujo, backend, test y copy debe respetarlo.

---

# 10. Contrato de evidencia

Dos dominios separados:

```text
Solicitud
→ evidencia para explicar el trabajo antes del matching

Operación
→ Antes / Durante / Después de la ejecución
```

Storage privado + RLS + signed URLs. Guards críticos terminan en backend/RPC.

---

# 11. Contrato de ampliación

```text
Cliente o Proveedor propone
→ costo/tiempo/descripcion
→ Cliente aprueba/rechaza
→ persistencia auditable
→ reconciliación pago
→ servicio continúa
```

Nunca modificar silenciosamente un importe electrónico protegido.

---

# 12. Contrato de IA e inteligencia

Hugo:

```text
contexto → ayuda → acción permitida
```

No salta permisos, pagos o decisiones críticas.

Scout:

```text
Dato → interpretación → recomendación → acción → resultado
```

Academia:

```text
gap/calidad → aprendizaje → evaluación
→ mejora perfil → mejores oportunidades → nueva medición
```

---

# 13. Regla de arquitectura

```text
React + TypeScript + Vite
→ flows por rol
→ servicios/adapters
→ Supabase RLS/RPC/Realtime/Storage
→ Vercel API para secretos/integraciones
```

`main` es integración oficial. No crear aplicaciones paralelas ni usar diseños históricos como segunda arquitectura.

---

# 14. Regla de calidad

```text
IMPLEMENTED ≠ VALIDATED ≠ RELEASED
```

Una funcionalidad transversal no está DONE hasta satisfacer los gates aplicables de producto, UX, arquitectura, datos/seguridad, error/offline, responsive, build, E2E y release.

---

# 15. Proceso único de cambio

Toda idea importante sigue:

```text
Idea del Founder/Product
→ análisis del problema
→ contrato funcional
→ UX
→ impacto técnico/datos/seguridad
→ READY
→ vertical slice
→ implementación
→ review
→ testing
→ VALIDATED
→ deploy/smoke
→ RELEASED
→ medición
→ Roadmap actualizado
```

No es necesario editar todos los maestros por cada cambio. Se actualizan sólo las autoridades afectadas.

---

# 16. P0 unificado actual

Hasta que Roadmap registre cierre validado:

```text
1 Build/TypeScript de main
2 RLS + guards backend recientes
3 Cliente: solicitud + evidencia integrada
4 Matching + oportunidad Provider + serviceId
5 Pagos electrónico/efectivo + timeline + cierre method-aware
6 Retirar Provider legacy como salida operacional
```

Después:

```text
Tracking/ETA
→ Notificaciones
→ consolidación UI Cliente/Proveedor
→ Admin operacional/financiero
→ Scout/Hugo avanzado
→ Academia/expansión
```

---

# 17. Definition of MVP

Un usuario nuevo debe poder:

```text
registrarse
→ solicitar con evidencia
→ recibir matching
→ contratar
→ pagar/seleccionar efectivo
→ seguir llegada
→ ejecutar
→ ampliar de forma trazable
→ documentar evidencia
→ aprobar/disputar
→ cerrar pago
→ calificar
```

Proveedor completa el circuito equivalente y Admin resuelve excepciones críticas.

---

# 18. Definition de producto fuerte de mercado

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

No requiere completar toda la visión futura de Scout o Academia.

---

# 19. Rutina al retomar UGO

```text
1 abrir este índice
2 leer P0 vigente en Roadmap
3 comprobar realidad de main
4 elegir siguiente bloqueo del circuito
5 consultar maestros autoridad
6 implementar vertical slice
7 validar
8 actualizar Roadmap/docs afectadas
```

Esto reemplaza la selección improvisada de tareas.

---

# 20. Regla final

**Una plataforma. Un dominio. Una realidad persistida. Un proceso de desarrollo. Múltiples experiencias por rol.**

Los maestros no compiten entre sí: cada uno describe una capa de la misma UGO.