# UGO — Development Master

**Versión:** 2.1 · 11 de septiembre de 2026  
**Estado:** contrato maestro de desarrollo y ejecución  
**Rama de integración:** `main`

> El objetivo del proceso de desarrollo es convertir ideas en resultados reales sin acumular pantallas inconclusas, reglas duplicadas ni deuda de integración.

---

# 1. Principio de trabajo

```text
Problema real
→ impacto esperado
→ contrato de producto
→ impacto técnico/datos
→ vertical slice
→ validación
→ actualización de maestros
→ release
→ medición
```

No se desarrolla una función por existir una idea: primero debe explicar qué mejora.

---

# 2. North Star de ejecución

Priorizar trabajo que aumente:

```text
servicios completados
confianza
conversión
velocidad de matching
ejecución correcta
monetización
retención/repetición
```

No priorizar vanity features sobre P0/P1 abiertos.

---

# 3. Madurez

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

- **IDEA:** propuesta sin contrato.
- **DEFINED:** problema, actor y resultado definidos.
- **READY:** dependencias/estados/permisos/UX conocidos.
- **IN PROGRESS:** trabajo activo.
- **IMPLEMENTED:** código integrado.
- **VALIDATED:** pruebas aplicables superadas.
- **RELEASED:** disponible en entorno objetivo y smoke OK.
- **MEASURED:** existe señal de uso/impacto.

---

# 4. Definition of Ready

Una tarea crítica está READY cuando incluye:

```text
actor
problema
resultado esperado
serviceId/entidad afectada
estado anterior/nuevo
permisos
impacto de dinero si aplica
happy path
errores/recuperación
criterio de aceptación
métrica esperada
```

Si toca dinero, permisos, servicio o evidencia, revisar Data/Backend antes de implementar.

---

# 5. Vertical slices

Preferir un tramo usable extremo a extremo sobre capas aisladas.

Ejemplo correcto:

```text
Cliente crea solicitud con evidencia
→ backend persiste
→ matching crea oportunidad
→ Proveedor la ve
→ acepta de forma atómica
→ Cliente observa asignación
```

Ejemplo incorrecto:

```text
crear cinco pantallas bonitas
sin persistencia
sin permisos
sin transición real
```

---

# 6. Orden de decisión y conciencia documental

Para cada cambio:

```text
1 Master Index
2 Governance
3 maestro funcional afectado
4 Data/Backend si toca estado/dinero/permisos
5 UI/UX + Usabilidad
6 Arquitectura
7 Testing/Release
8 Roadmap
9 realidad actual de main
10 implementar
11 validar
12 actualizar maestros afectados
```

## Regla obligatoria de conciencia

Todo cambio significativo en `main` debe dejar los documentos maestros al mismo nivel de realidad que el código.

No esperar a una auditoría futura para documentar:

- estados nuevos o corregidos;
- contratos RPC/backend;
- cambios de pagos, dinero o comisiones;
- reglas de matching/asignación;
- cambios de permisos/RLS;
- guards de evidencia;
- cambios de UX canónica;
- validaciones CI/build/lint/test;
- deuda conocida y siguiente cierre.

Al terminar cada bloque de trabajo:

```text
Código real en main
→ validación disponible
→ maestros afectados actualizados
→ Roadmap actualizado
→ próximo riesgo visible
```

El objetivo es mantener **conciencia continua del proyecto**: cualquier persona o agente debe poder leer los maestros y entender qué está realmente cerrado, qué está parcial y qué sigue abierto sin reconstruir la historia desde los commits.

Nunca marcar `HECHO`, `VALIDATED` o `RELEASED` sólo porque existe código.

---

# 7. Prioridad

```text
P0 integridad · auth · permisos · dinero · core
P1 operación necesaria · conversión · UX crítica
P2 inteligencia · automatización · optimización
P3 expansión · polish · experimentos
```

Regla: máximo foco simultáneo en pocos P0/P1; evitar diez frentes abiertos.

---

# 8. Git

- `main` = integración y verdad actual.
- ramas cortas para cambios de riesgo/alcance claro;
- no revivir ramas históricas completas sin auditoría;
- commits pequeños y descriptivos;
- no mezclar refactor masivo con cambio financiero/seguridad;
- documentar migraciones y breaking changes.

Convención sugerida:

```text
feat(scope): ...
fix(scope): ...
refactor(scope): ...
docs(master): ...
test(scope): ...
chore(scope): ...
```

---

# 9. Desarrollo asistido por IA

Agentes pueden diseñar, implementar y revisar, pero deben:

- leer maestros antes de cambiar contratos;
- verificar código real en `main`;
- no inventar APIs/tablas/estados;
- no declarar tests/deploy OK sin evidencia;
- preservar datos y permisos;
- producir cambios auditables y reversibles;
- actualizar los maestros afectados en el mismo bloque de trabajo;
- dejar explícito el próximo riesgo o contrato todavía no cerrado.

---

# 10. UI y diseño

Penpot/Figma/Stitch sirven para explorar y especificar.

Regla:

```text
diseño → contrato UGO → implementación real
```

No copiar prototipos creando DOM/rutas/estados paralelos.

---

# 11. Cambios P0

Para auth, dinero, permisos, asignación, evidencia o cierres:

```text
contrato escrito
migración/RPC si aplica
prueba positiva
prueba negativa
idempotencia/concurrencia
rollback o mitigación
observabilidad
actualización del maestro correspondiente
```

---

# 12. Bug fixing

Clasificar causa:

```text
UI
estado local
dominio
persistencia
RLS/permisos
integración
concurrencia
datos históricos
```

Corregir la capa responsable. No ocultar fallas backend con copy o estado local falso.

---

# 13. Métricas de ingeniería

Observar:

```text
lead time
bugs reabiertos
fallos de build/lint/test
regresiones P0/P1
frecuencia de deploy
tiempo de recuperación
porcentaje IMPLEMENTED→VALIDATED
desfase código↔maestros
```

El objetivo es velocidad sostenible, no cantidad de commits.

---

# 14. Release discipline

Antes de marcar HECHO:

```text
build/lint
flujo afectado
roles/permisos
estado persistido
método de pago si aplica
error/retry
responsive/accesibilidad
tests del tramo
CI/deploy/smoke cuando corresponda
documentación maestra actualizada
```

---

# 15. Regla de producto

Toda nueva función debe responder:

1. ¿Qué problema real resuelve?
2. ¿Qué actor gana?
3. ¿Qué métrica debería mejorar?
4. ¿Qué riesgo introduce?
5. ¿Por qué va antes que los P0/P1 abiertos?

Si no hay respuesta sólida, vuelve a IDEA.

---

# 16. Regla final

**UGO gana si entrega un circuito confiable y medible con velocidad disciplinada y con maestros que reflejan la realidad actual; no si acumula funcionalidades ni documentación desactualizada.**