# UGO — Development Master

**Versión:** 2.2 · 16 de septiembre de 2026  
**Estado:** contrato maestro de desarrollo  
**Rama única de trabajo:** `main`

## 1. Principio

```text
problema real
→ contrato de producto
→ impacto datos/permisos/dinero
→ vertical slice
→ IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED cuando corresponda
```

No acumular pantallas sin persistencia ni reglas paralelas.

## 2. North Star de ejecución

Priorizar trabajo que aumente servicios completados, confianza, time-to-match, ejecución correcta, monetización y repetición. No desplazar P0/P1 por vanity features.

## 3. Definition of Ready

Una tarea crítica identifica:

```text
actor
problema
resultado esperado
serviceId/entidad
estado anterior/nuevo
permisos
impacto financiero si aplica
happy path
error/offline/retry/cancel
criterio de aceptación
evidencia requerida
```

## 4. Vertical slices

Correcto:

```text
Cliente crea pedido
→ persiste serviceId
→ matching
→ Proveedor ve oportunidad
→ acepta atómicamente
→ Cliente ve asignación
→ ambos convergen
```

Incorrecto: pantallas aisladas con estados locales ficticios.

## 5. Ciclo obligatorio

```text
1 leer AGENTS + maestros afectados
2 verificar HEAD real de main
3 revisar código/migraciones/tests
4 atacar P0/P1 más cercano al primer cliente
5 implementar mínimo completo
6 ejecutar gates locales disponibles
7 corregir fallos
8 integrar en main
9 verificar CI del SHA exacto
10 ejecutar/runtime QA aplicable
11 actualizar checklist + maestros según evidencia
12 publicar sólo cuando corresponda
13 registrar próximo riesgo real
```

## 6. Madurez

- **IMPLEMENTED:** código integrado en `main`.
- **CI VALIDATED:** CI aplicable verde en ese SHA.
- **RUNTIME VALIDATED:** flujo probado en UGO TEST/runtime/dispositivo con evidencia.
- **PUBLISHED:** revisión disponible en canal objetivo comprobado.

No declarar una etapa por inferencia desde otra.

## 7. Readiness continuo

`public.development_checklist` es la fuente viva de preparación para primer cliente. `/?app=development` es el tablero público read-only basado en vistas sanitizadas.

Mapeo operativo:

```text
implemented → código existe
validated   → validación técnica/automatizada aplicable
approved    → criterio de aceptación requerido demostrado
```

Sólo `approved` suma al porcentaje. Publicación se gestiona aparte o mediante items de release explícitos.

## 8. Centinela

Toda vertical P0/P1 debe ser observable cuando sea razonable. Centinela captura fallos de runtime TEST y agrega contexto seguro de rol, acción y revisión.

Reglas:

- redacción de emails/teléfonos/links y metadata privada;
- incidentes actuales separados de históricos por `runtimeRevision`;
- clasificación crítica server-side desde acciones instrumentadas conocidas;
- cola anónima temporal sanitizada sólo como fallback;
- el feed público omite serviceId, stack, metadata y reporter IDs;
- Centinela **no cambia estados del checklist**.

## 9. Prioridad

```text
P0 seguridad · datos · auth · dinero · core · bloqueo primer cliente
P1 journey/operación/UX crítica
P2 inteligencia/optimización
P3 expansión/polish
```

Orden del readiness: `failed P0 → in_progress P0 → implemented P0 → blocked/pending P0 → resto`.

## 10. Git

Regla vigente:

```text
main = única rama autorizada
```

No crear ramas nuevas ni clones paralelos. Verificar HEAD inmediatamente antes de escribir. Integrar por fast-forward; si otro trabajo avanzó `main`, reconstruir sobre ese HEAD y no usar `force`.

Commits descriptivos:

```text
feat(scope): ...
fix(scope): ...
docs(master): ...
test(scope): ...
chore(scope): ...
```

Agrupar un bloque lógico para no disparar commits/CI/deploys artificiales.

## 11. Bug fixing

Clasificar la causa:

```text
UI
estado local
dominio
persistencia
RLS/permisos
integración
concurrencia
runtime/publicación
datos históricos
```

Corregir la capa responsable. No tapar backend roto con copy o loading infinito.

## 12. P0 de UX operacional

Ninguna pantalla principal queda atrapada. Matching debe contemplar proveedor, ausencia, timeout/error/offline, retry y cancelar. Cancelación debe persistir y sincronizar contraparte.

Chat debe ser bidireccional realtime por `serviceId`, rehidratar historial y bloquear contacto off-platform.

Multi-pedido debe permitir A+B+C independientes; mutar B nunca usa “latest service” ni altera A/C.

## 13. Quality discipline

Antes de declarar CI VALIDATED:

```text
build/types
contracts/tests
lint aplicable
RLS/RPC cuando toca
concurrencia/idempotencia cuando toca
```

Antes de RUNTIME VALIDATED:

```text
rol/cuenta real TEST
serviceId exacto
persistencia
contraparte/realtime
error/recovery
hardware cuando aplica
```

Antes de PUBLISHED:

```text
revisión/canal identificados
smoke objetivo
rollback o mitigación
```

## 14. Release discipline

No usar una web publicada como proxy de `main`. La UI de un APK TEST puede provenir del `dist` local del SHA mientras `/api` usa backend publicado; documentar ambas revisiones cuando diverjan.

No ejecutar publicación sólo para “hacer coincidir” documentación.

## 15. Conciencia documental

Todo cambio significativo debe terminar así:

```text
realidad de main
→ evidencia CI
→ evidencia runtime
→ checklist
→ maestros afectados
→ roadmap
→ publicación si aplica
```

Los snapshots viejos se conservan como historial, no como estado vigente.

## 16. Regla final

**UGO avanza cuando una capacidad pasa etapas demostrables y el sistema entero cuenta la misma historia. Un commit sin CI no está validado; CI sin runtime no está probado por usuarios; runtime sin publicación no está publicado.**
