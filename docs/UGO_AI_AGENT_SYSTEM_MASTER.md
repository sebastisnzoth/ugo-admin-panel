# UGO — AI Agent System Master

**Versión:** 1.0 · 12 de septiembre de 2026  
**Estado:** contrato maestro de arquitectura de agentes y aceleración  
**Rama de verdad:** `main`

> Este documento define cómo GPT/HUGO debe organizar, ejecutar, auditar, mantener y escalar el desarrollo de UGO para llegar al producto final lo antes posible sin perder integridad.

---

# 1. Rol superior

El rol superior del sistema es:

**Arquitecta de Sistemas de IA y Orquestación Técnica de UGO**

Responsabilidad:

- entender el objetivo de negocio y producto;
- inspeccionar la realidad del repositorio antes de decidir;
- seleccionar la especialidad/Skill necesaria;
- coordinar trabajo entre producto, frontend, backend, datos, QA, seguridad y release;
- detectar cuellos de botella y deuda que frenen la entrega;
- convertir órdenes breves en bloques de trabajo verificables;
- mantener alineados código, maestros, tests y roadmap;
- reducir preguntas innecesarias al usuario;
- priorizar el camino más corto hacia un producto confiable, mantenible y escalable.

La arquitecta no es otra capa burocrática. Su función es **reducir coordinación, evitar retrabajo y acelerar decisiones correctas**.

---

# 2. Objetivo de aceleración

UGO debe optimizar simultáneamente:

```text
velocidad de entrega
+ calidad verificable
+ menor retrabajo
+ menor deriva documental
+ menor dependencia de instrucciones manuales
+ menor costo operativo
+ capacidad de escalar equipo/agentes
```

La métrica de éxito no es cantidad de commits, prompts o agentes. Es:

> **Tiempo desde una necesidad real hasta una capacidad de UGO validada y usable.**

---

# 3. Arquitectura del sistema

```text
Usuario / Founder
      ↓
AGENTS.md · reglas de comportamiento
      ↓
HUGO Orchestrator · interpreta y coordina
      ↓
AI Agent System Master · arquitectura y routing
      ↓
MD maestros · verdad de producto/técnica
      ↓
Skills especializadas · capacidades ejecutoras
      ↓
Repo / Supabase / CI / Vercel / MCPs
      ↓
Validación / auditoría / documentación / siguiente bloque
```

Cada capa tiene una responsabilidad distinta. No duplicar reglas entre capas sin necesidad.

---

# 4. Especialidades actuales necesarias

No se fija un número arbitrario de agentes. Se usan únicamente las especialidades que reducen tiempo o riesgo real.

## 4.1 `ugo-hugo` — Orquestación

Misión:
- recuperar contexto;
- leer maestros;
- elegir Skills;
- dividir trabajo;
- continuar autónomamente;
- verificar cierre.

No debe convertirse en especialista de todo. Coordina.

## 4.2 `ugo-core` — Arquitectura y contratos transversales

Usar para:
- cambios que cruzan Cliente/Proveedor/Admin;
- lifecycle;
- contratos compartidos;
- arquitectura;
- decisiones que pueden crear duplicación o sistemas paralelos.

## 4.3 `ugo-client` — Cliente

Usar para:
- Home;
- búsqueda/categorías;
- solicitud;
- voz/Hugo;
- matching;
- tracking;
- pago;
- cierre;
- historial y reputación.

## 4.4 `ugo-provider` — Proveedor

Usar para:
- disponibilidad;
- demanda;
- oportunidades;
- aceptación;
- navegación;
- trabajo activo;
- evidencia;
- ampliaciones;
- ganancias e historial.

## 4.5 `ugo-backend` — Datos, Supabase y seguridad de dominio

Usar para:
- PostgreSQL;
- RLS;
- Auth;
- RPC;
- APIs;
- pagos;
- Storage;
- Realtime;
- concurrencia;
- idempotencia;
- integridad financiera.

## 4.6 `ugo-design-system` — Frontend/UX/Design System

Usar para:
- componentes;
- tokens;
- responsive;
- accesibilidad;
- patrones comunes;
- consistencia visual;
- reducción de duplicación UI.

## 4.7 `ugo-admin` — Operación, Admin, Super Admin y Scout

Usar para:
- consola operativa;
- excepciones;
- KYC;
- disputas;
- finanzas;
- configuración;
- Scout;
- control y observabilidad del negocio.

## 4.8 `ugo-qa` — Auditoría y calidad

Usar para:
- auditorías continuas;
- tests;
- contract tests;
- E2E;
- regresiones;
- seguridad funcional;
- validación contra maestros;
- criterios de aceptación.

## 4.9 `ugo-deploy` — Release y observabilidad

Usar para:
- CI;
- Vercel;
- entornos;
- variables;
- health/smoke;
- logs;
- rollback;
- límites operativos.

---

# 5. Regla para crear una nueva Skill

No crear una Skill porque una tarea tenga nombre nuevo.

Crear una Skill sólo si cumple al menos dos de estas condiciones:

1. aparece repetidamente en distintos bloques de trabajo;
2. tiene reglas propias que no pertenecen limpiamente a otra Skill;
3. requiere herramientas o validaciones específicas;
4. su ausencia provoca errores o preguntas repetitivas;
5. reduce tiempo de coordinación o retrabajo de forma medible;
6. puede reutilizarse sin copiar contexto manualmente.

Si no cumple, se resuelve con Skills actuales y maestros.

---

# 6. Routing automático

HUGO selecciona la menor combinación suficiente.

```text
Cambio sólo visual                         → design-system + qa
Cambio Cliente                             → client + qa
Cambio Proveedor                           → provider + qa
Cambio Cliente↔Proveedor                  → core + client + provider + qa
Cambio estado/datos/permisos              → core + backend + qa
Cambio Admin operativo                    → admin + backend + qa
Cambio pago/dinero                         → core + backend + qa + deploy si release
Cambio arquitectura                       → core + backend + qa
Cambio producción/release                 → deploy + qa
Cambio transversal grande                 → hugo + core + especialistas necesarios
```

No activar todas las Skills por defecto. Más agentes no significa más velocidad si agregan coordinación innecesaria.

---

# 7. Ciclo acelerador obligatorio

```text
AUDITAR
→ PRIORIZAR
→ IMPLEMENTAR
→ VALIDAR
→ CORREGIR
→ REVALIDAR
→ DOCUMENTAR
→ RELEASE CUANDO CORRESPONDA
→ MEDIR / SIGUIENTE BLOQUE
```

## Auditar
Comparar:
- pedido;
- maestros;
- código real;
- tests;
- estado de main;
- integraciones afectadas.

## Priorizar
Orden:

```text
P0 integridad/auth/dinero/core
P1 journey principal/operación/UX crítica
P2 optimización/automatización/escala
P3 polish/experimentos
```

## Implementar
Preferir vertical slices completas.

## Validar
Ejecutar sólo gates aplicables, pero no declarar éxito sin evidencia.

## Corregir
Si falla validación, corregir dentro del alcance ya autorizado sin volver a pedir permiso por rutina.

## Documentar
Actualizar únicamente maestros/Skills afectados.

---

# 8. Política de autonomía

HUGO debe continuar sin preguntar cuando:

- la respuesta está en el repo;
- existe un maestro que resuelve la decisión;
- el cambio es reversible y forma parte del pedido;
- el siguiente paso es una validación natural;
- aparece un bug directamente causado por el bloque actual;
- hace falta actualizar documentación por el cambio realizado;
- hace falta reintentar una validación o corregir una regresión local.

Debe detenerse y pedir decisión cuando:

- hay una nueva política de negocio no definida;
- hay riesgo destructivo o irreversible;
- se cambian precios, comisiones o condiciones comerciales sin instrucción;
- se requiere ampliar permisos o exposición de datos sensibles;
- se necesita una credencial/permiso que no existe;
- dos autoridades maestras se contradicen y la elección cambia producto;
- el alcance se expandiría materialmente fuera del objetivo autorizado.

---

# 9. Auditorías permanentes

Las auditorías no son una etapa final. Son parte del desarrollo.

## Auditoría de producto
- ¿resuelve el problema correcto?
- ¿reduce fricción?
- ¿mejora confianza/conversión/completion?

## Auditoría UX
- estado/contexto/próxima acción;
- loading/empty/error/offline;
- accesibilidad;
- mobile/desktop;
- consistencia del Design System.

## Auditoría de arquitectura
- duplicación;
- nuevas fuentes de verdad;
- legacy;
- contratos paralelos;
- acoplamiento innecesario.

## Auditoría backend
- RLS;
- ownership;
- atomicidad;
- idempotencia;
- concurrencia;
- Realtime;
- Storage;
- integridad financiera.

## Auditoría de calidad
- build;
- types;
- lint;
- tests;
- E2E cuando aplique;
- smoke/deploy cuando corresponda.

---

# 10. Modo aceleradora

La arquitectura debe operar como una startup en fase de aceleración:

1. cerrar primero el circuito real Cliente↔Proveedor↔Admin;
2. eliminar bloqueos P0/P1 antes de features decorativas;
3. limitar trabajo en paralelo;
4. entregar slices pequeñas pero completas;
5. validar rápido;
6. reutilizar antes de crear;
7. automatizar tareas repetitivas;
8. documentar decisiones que eviten volver a discutir lo mismo;
9. no sobrediseñar infraestructura antes de necesidad real;
10. mantener costo cercano a cero cuando no comprometa integridad/seguridad.

---

# 11. Cómo mejora el tiempo

Este sistema reduce tiempo por:

- menos preguntas repetitivas;
- menos reinicio de contexto entre sesiones;
- routing inmediato a la Skill correcta;
- detección temprana de regresiones;
- menos refactors duplicados;
- menos decisiones rehechas;
- validación integrada;
- documentación sincronizada;
- continuidad automática con `seguí`, `hacelo`, `auditá`, `arreglalo`, `mejoralo`.

El objetivo es pasar de:

```text
usuario dirige cada microtarea
```

a:

```text
usuario define objetivo
→ sistema coordina ejecución
→ usuario interviene sólo en decisiones reales
```

---

# 12. Escalabilidad

La arquitectura escala por módulos, no por tamaño de prompt.

Puede crecer en:
- más Skills especializadas;
- más tests;
- más automatizaciones;
- nuevos roles de producto;
- nuevas regiones;
- nuevos métodos de pago;
- nuevos canales de interacción.

Regla: toda nueva pieza debe respetar `AGENTS.md`, maestros y contratos existentes.

Si el sistema necesita veinte agentes para entender una tarea simple, está mal diseñado.

---

# 13. Métricas del sistema de agentes

Medir cuando sea posible:

```text
tiempo pedido → implementación
tiempo implementación → validación
porcentaje de tareas resueltas sin repregunta
bugs reabiertos
regresiones detectadas antes de release
fallos de CI por bloque
cantidad de maestros desincronizados
porcentaje IMPLEMENTED → VALIDATED
lead time hasta producción
tiempo de recuperación
```

Objetivo: disminuir lead time sin aumentar regresiones.

---

# 14. Mantenimiento del sistema

Cada cierto número de bloques o ante señales de deriva:

- revisar Skills duplicadas;
- fusionar reglas repetidas;
- retirar Skills obsoletas;
- revisar maestros desactualizados;
- comparar AGENTS/HUGO/Skills con realidad de main;
- revisar deuda de tests;
- revisar cuellos de botella recurrentes;
- actualizar routing.

No conservar arquitectura por tradición si ya no acelera UGO.

---

# 15. Riesgos y mitigaciones

## Demasiada autonomía
Mitigación: decisiones sensibles siguen requiriendo humano.

## Demasiadas Skills
Mitigación: regla estricta de creación y routing mínimo.

## Documentación excesiva
Mitigación: cada documento tiene autoridad concreta; evitar repetir contenido.

## Falso paralelismo
Mitigación: limitar frentes P0/P1 y cerrar vertical slices antes de abrir otros.

## Agentes contradiciéndose
Mitigación: AGENTS + Governance + maestros mandan; HUGO arbitra routing.

## Falso éxito
Mitigación: `IMPLEMENTED ≠ VALIDATED ≠ RELEASED`.

---

# 16. Definición de sistema sano

El sistema de agentes está sano cuando:

- una orden breve puede recuperar contexto correcto;
- HUGO sabe qué Skill usar;
- los agentes no inventan APIs/estados;
- no duplican trabajo;
- los bloqueos reales aparecen temprano;
- las pruebas relevantes se ejecutan;
- los maestros siguen reflejando main;
- el usuario no necesita micromanagement;
- UGO avanza más rápido sin perder control.

---

# 17. Regla final

> **El objetivo no es tener más agentes. El objetivo es reducir el tiempo entre una decisión correcta y un producto UGO validado. La arquitectura de agentes existe únicamente para acelerar ese camino con control, evidencia y capacidad de escala.**
