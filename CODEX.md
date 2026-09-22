# UGO — CODEX.md · Guía operativa para Codex

Rama de verdad: `main`
Autoridad superior: `AGENTS.md`

## Objetivo

Este archivo da instrucciones operativas a Codex para trabajar dentro del repositorio UGO sin depender de prompts largos ni de contexto improvisado. Debe avanzar con autonomía, auditar la realidad del código, priorizar correcciones de base y dejar el repositorio en un estado mejorado y verificable.

Codex no reemplaza a `AGENTS.md`. Debe obedecerlo. Este archivo define cómo tomar el relevo, qué revisar, qué corregir y cómo dejar evidencia útil para el siguiente agente.

## Principio rector

La pregunta permanente es:

> ¿Qué impide hoy que UGO consiga y atienda correctamente a su primer cliente real?

Toda acción debe priorizar esa respuesta. No hacer polish si hay un bloqueo P0/P1 real.

## Misión del repo en este momento

Este repositorio tiene una aplicación React + TypeScript + Vite funcional y con estructura real, pero la base de frontend está más cerca de un MVP operativo que de una arquitectura sostenible para escalar.

Se detectan estos patrones reales en el código:

- routing por rol (`client`, `provider`, `admin`, `development`, etc.) en `src/mvp/MvpApp.tsx`
- bootstrapping de runtime y observabilidad en `src/main.tsx`
- muchos módulos y archivos específicos por pantalla/rol bajo `src/mvp/`
- muchos archivos CSS específicos por tema/pantalla bajo `src/mvp/*.css`
- hooks por dominio bajo `src/hooks/`
- ausencia real de una base de componentes reutilizables (`shared/ui`)
- ausencia real de tokens de diseño y estilo centralizado
- documentación más madura que la implementación actual

Esto no significa que el repo esté roto; significa que está lejos de una base frontend mantenible.

## Reglas de trabajo

### 1) Investigar antes de tocar código

Antes de crear/modificar archivos, Codex debe revisar en este orden:

```text
AGENTS.md
→ CODEX.md
→ README.md
→ package.json
→ src/main.tsx
→ src/mvp/MvpApp.tsx
→ src/mvp/*
→ src/components/*
→ src/hooks/*
→ src/lib/*
→ realidad actual de main
```

No asumir que la docs reflectan la realidad del código. Primero validar con la estructura actual.

### 2) No hacer rewrite total

No reescribir todo el repo en una sola operación. La regla es:

- mejorar la base
- migrar la app en etapas
- mantener el sistema funcional
- validar cada cambio

### 3) Prioridad de corrección

Prioridad real:

1. base de UI reutilizable
2. tokens de diseño y estilo centralizado
3. arquitectura por features
4. servicios/data layer
5. limpieza de CSS legacy
6. pruebas críticas

No priorizar polish antes que la base.

### 4) Modo autónomo permitido

Una instrucción como:

```text
seguí según AGENTS.md y CODEX.md
```

autoriza a Codex a hacer esto sin pedir confirmación rutinaria:

```text
auditar
→ detectar el siguiente bloqueo real
→ corregir la capa responsable
→ validar
→ documentar o dejar handoff
→ commitear
→ publicar en origin/main
→ continuar con el siguiente bloque relacionado
```

### 5) Publicación en GitHub

Toda mejora implementada y validada debe quedar publicada en `origin/main`.

Regla:

```text
IMPLEMENTADO
→ VALIDADO
→ COMMIT
→ PUSH origin/main
→ VERIFICAR sincronización remota
```

No cerrar sin publicar cambios validados salvo un bloqueo real ejecutado por una causa externa.

## Auditar antes de corregir

Codex debe revisar estas señales del repo antes de decidir qué cambiar:

- `src/mvp/MvpApp.tsx`: routing actual, carga de pantallas y estilo global
- `src/main.tsx`: runtime, errores, observabilidad
- `src/hooks/*`: qué tan madura es la capa de datos
- `src/mvp/*.css`: cuánta duplicación/fragmentación visual hay
- `src/components/*`: si hay verdaderos componentes reutilizables o si hay pantallas monolíticas

## Objetivo de refactor del repo

El refactor objetivo no es cambiar la app de tecnología. Es convertir el repo en una base mejor organizada:

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
    layouts/

  features/
    client/
    provider/
    admin/
    finance/
    operations/

  shared/
    ui/
    services/
    hooks/
    lib/
    types/
    config/

  styles/
    tokens.css
    globals.css
    reset.css
```

## Base mínima de arquitectura a crear

### 1) shared/ui

Crear una capa mínima de componentes reutilizables:

- Button
- Input
- Select
- Textarea
- Card
- Modal
- Badge
- Tabs
- SectionHeader
- EmptyState
- LoadingState
- StatusPill

Cada componente debe respetar:

- tokens de diseño
- tamaño consistente
- estados de error/loading/disabled
- accesibilidad mínima

### 2) styles/tokens.css

Centralizar esto:

- colores primarios/secondary
- neutrales
- success/warning/error
- spacing scale
- border radius
- shadows
- typography
- breakpoints
- z-index

### 3) feature modules

La lógica debe pasar a features por dominio:

- `features/client/`
- `features/provider/`
- `features/admin/`
- `features/finance/`
- `features/operations/`

Cada feature debe tener:

- screens/
- hooks/
- services/
- types/

### 4) servicios y capa de datos

Los hooks y pantallas no deben estar haciendo acceso directo a Supabase ad hoc en demasiados lados.

Crear servicios centralizados:

- `shared/services/supabaseClient.ts`
- `shared/services/adminService.ts`
- `shared/services/clientService.ts`
- `shared/services/providerService.ts`

## Qué evitar

Codex no debe:

- crear una nueva app desde cero
- reescribir todo el repo en un solo cambio
- seguir agregando archivos CSS específicos sin una base común
- crear componentes UI duplicados una y otra vez
- mezclar lógica de dominio y estilo en pantallas gigantes
- crear feature modules vacíos sin una lógica concreta

## Fases recomendadas de refactor

### Fase 1: base visual y UI

Objetivo:

- crear `shared/ui`
- crear `styles/tokens.css`
- centralizar diseño base

### Fase 2: reorganización por feature

Objetivo:

- mover pantallas y lógica crítica a feature modules
- dejar una capa de routing clara

### Fase 3: servicios y datos

Objetivo:

- centralizar acceso a Supabase
- crear contratos de tipos y response objects
- sacar lógica de data fuera de pantallas

### Fase 4: limpieza de CSS legacy

Objetivo:

- reducir los archivos CSS globales específicos
- mantener solo estilos de feature cuando hagan falta

### Fase 5: pruebas críticas

Objetivo:

- validar flujos principales del cliente/proveedor/admin
- proteger cambios con tests mínimo de regresión

## Validación mínima recomendada

Cuando cambie la base o la lógica crítica, ejecutar al menos:

```bash
npm run build
npm test
npm run lint
```

Y, si aplica al flujo integrado, también:

```bash
UGO_REQUIRE_ISOLATED_INTEGRATION=1 npm run test:integration
```

## Criterios de éxito del refactor

El refactor está bien si:

- el repo tiene una base de UI reutilizable
- los roles están organizados por features
- la lógica de acceso a datos está centralizada
- la UI visual ya no depende de cientos de CSS ad hoc
- una nueva pantalla puede crearse sin recrear toda la base visual
- los cambios críticos se validan con smoke tests mínimos

## Reporte de salida esperado

Al terminar un bloque, Codex debe dejar un reporte breve con este formato:

```text
IMPLEMENTED
- ...

VALIDATED
- ...

RELEASED
- ...

BLOCKED
- none | detalle exacto

NEXT
- siguiente acción concreta

COMMITS
- <sha> <mensaje> · local/published
```

## Regla final

Este repo no necesita un rewrite heroico. Necesita una base sólida.

La corrección correcta aquí es:

- crear `shared/ui`
- crear `styles/tokens.css`
- organizar features por dominio
- centralizar servicios
- limpiar el CSS legacy
- reforzar validación crítica
- publicar cambios en `origin/main`

Si el repo se deja como está, seguirá siendo un MVP funcional con deuda creciente.
Si se corrige la base, se vuelve sostenible.

El trabajo de Codex debe apuntar a esa base, no a la fachada visual.

## Orden de ejecución recomendado para Codex

```text
1. revisar main, MvpApp, hooks y CSS fragmentado
2. crear shared/ui + tokens
3. crear app router/providers skeleton
4. crear feature folders base
5. migrar pantallas críticas
6. mover lógica de data a services
7. limpiar CSS legacy
8. ejecutar build/test/lint
9. commitear y publicar origin/main
10. continuar con el siguiente bloque
```

Esto es la operación correcta para este repositorio.
