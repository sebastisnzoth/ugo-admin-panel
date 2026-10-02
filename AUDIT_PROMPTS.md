# Prompts para Auditoría Técnica del Repo

Use estos prompts con ChatGPT, Claude o similar para automatizar análisis de código y documentación.

---

## 1. Auditoría de God Module: api/hugo/chat.ts

**Propósito:** Identificar responsabilidades múltiples y proponer descomposición.

```
Analiza este archivo TypeScript y crea un plan de refactor para dividirlo en módulos especializados.

Archivo: api/hugo/chat.ts (586 líneas)
URL: https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/api/hugo/chat.ts

Tareas:
1. Identifica todas las responsabilidades funcionales (auth, autorización, sanitización, prompting, TTS, CORS, UI actions).
2. Para cada responsabilidad, enumera:
   - Funciones y constantes implicadas
   - Dependencias externas (Supabase, Gemini, etc.)
   - Riesgo de regresión si se modifica
3. Propón una estructura modular:
   - Nuevo árbol de carpetas bajo api/hugo/
   - Qué funciones/tipos van a cada módulo
   - Qué queda en handler.ts (orquestación HTTP)
4. Estima esfuerzo: categoriza como quick-win (<2h), medium (2-6h), large (6h+).
5. Escribe pseudo-código o un archivo ejemplo para el primer módulo (auth).

Formato de salida:
- Tabla de responsabilidades
- Diagrama ASCII o árbol de módulos propuesto
- Checklist de migraciones
- Código ejemplo para un módulo
```

---

## 2. Auditoría de Seguridad: Sanitización y Secretos

**Propósito:** Verificar que no haya fuga de credenciales o datos sensibles.

```
Revisa las prácticas de seguridad en este repositorio.

Repo: sebastisnzoth/ugo-admin-panel
Archivo crítico: api/hugo/chat.ts

Áreas a auditar:
1. Sanitización de inputs
   - ¿Qué patrones se redactan? (Bearer tokens, JWTs, API keys, etc.)
   - ¿Hay un regex pattern que se pierda?
   - ¿Se sanitizan todos los inputs antes de logs/LLM?
2. Gestión de secretos
   - ¿Hay hardcoded valores en el repo?
   - ¿Se usan env vars correctamente?
   - ¿Se loguean payloads completos en algún lugar?
3. CORS y same-origin
   - ¿La política de allowlist es exhaustiva?
   - ¿Se valida correctamente el origen en cada request?
4. Autorización por rol
   - ¿Hay riesgos de escalation de privilegios?
   - ¿Los roles superadmin/admin/provider/client están bien separados?
   - ¿Hay edge cases donde un rol más bajo pueda acceder a datos de otro rol?
5. Datos compartidos con LLM
   - ¿Qué datos van al contexto del modelo?
   - ¿Se define un allowlist o se envía todo?

Salida esperada:
- Lista de vulnerabilidades halladas (críticas, altas, medias, bajas)
- Recomendaciones inmediatas (qué arreglar primero)
- Código de ejemplo para mejorar sanitización
- Checklist de validación post-fix
```

---

## 3. Análisis de Complejidad: Decoupling de Responsabilidades

**Propósito:** Mapear dependencias entre módulos y encontrar acoplamiento innecesario.

```
Analiza la arquitectura de este repositorio e identifica acoplamiento.

Repo: sebastisnzoth/ugo-admin-panel
Stack: React + TypeScript + Supabase + Vercel

Instrucciones:
1. Examina la estructura de carpetas:
   - src/mvp
   - src/features
   - src/lib
   - api/
   - server/
2. Para cada carpeta, determina:
   - Propósito principal
   - Qué otras carpetas importa
   - Qué la importa
3. Dibuja un grafo de dependencias (ASCII o tabla):
   - Nodo = carpeta/módulo
   - Flecha = "importa de"
4. Identifica ciclos (A → B → A): son acoplamiento crítico.
5. Identifica "hubs" (módulos que muchos otros importan):
   - Si es intencional (lib/util): OK
   - Si es accidental (feature logic): riesgo
6. Propón qué se debería desacoplar y cómo.

Salida:
- Grafo de dependencias (ASCII o markdown table)
- Ciclos detectados + cómo romperlos
- Hubs innecesarios + estrategia de refactor
- Métricas: # de imports por módulo, profundidad máxima
```

---

## 4. Auditoría de Documentación vs Código

**Propósito:** Detectar inconsistencias entre docs y código actual.

```
Compara la documentación del repo con el código real.

Repo: sebastisnzoth/ugo-admin-panel

Tarea:
1. Revisa estos documentos (si existen):
   - README.md
   - CLAUDE.md
   - /docs (cualquier carpeta de documentación)
   - Comentarios en package.json
   - .github/copilot-instructions.md

2. Para cada documento, verifica:
   - ¿Los scripts de npm que menciona existen en package.json?
   - ¿Las rutas de carpetas que menciona coinciden con la estructura real?
   - ¿Los workflows mencionados existen en .github/workflows/?
   - ¿Las dependencias listadas están en package.json?
   - ¿El estado del proyecto (etapa, completitud) coincide con la realidad?

3. Lista todas las discrepancias encontradas:
   - Documento X dice "no hay tests", pero existen scripts test
   - Documento Y lista carpeta /components, pero es /components-v2
   - Etc.

4. Prioriza por impacto en onboarding:
   - Alta: afecta setup inicial
   - Media: afecta desarrollo diario
   - Baja: efectos menores

5. Propón versión corregida para el README principal.

Salida:
- Tabla de discrepancias (Documento | Afirmación | Realidad | Impacto)
- README.md actualizado
- Checklist para mantener docs sincronizadas
```

---

## 5. Análisis de CI/CD: Workflows y Redundancias

**Propósito:** Revisar GitHub Actions y detectar oportunidades de simplificación.

```
Analiza los workflows de GitHub Actions en este repo.

Repo: sebastisnzoth/ugo-admin-panel
Ruta: .github/workflows/

Tarea:
1. Lista todos los archivos .yml en .github/workflows/
2. Para cada workflow, documenta:
   - Nombre del job
   - Cuándo se dispara (trigger: push, PR, schedule, etc.)
   - Qué validaciones corre (lint, test, build, security, etc.)
   - Cuáles son las dependencias entre jobs
   - Cuántos secretos/env vars necesita
3. Identifica patrones de redundancia:
   - ¿Dos workflows hacen la misma validación?
   - ¿Hay jobs que podrían ir en paralelo pero están en serie?
   - ¿Hay secretos que se requieren en múltiples workflows sin motivo?
4. Propón consolidaciones:
   - Combinar jobs
   - Paralelizar donde sea seguro
   - Reducir número de workflows si es posible
5. Detecta riesgos operacionales:
   - ¿Qué pasa si se revoca un secret?
   - ¿Hay workflows que compiten por recursos?
6. Estima ahorros: tiempo de CI, costo, mantenimiento.

Salida:
- Tabla de workflows actuales
- Grafo de dependencias entre jobs
- Propuesta de consolidación
- Estimación de ahorro de tiempo
- Documentación de qué workflow hace qué
```

---

## 6. Diseño de Permissions Model (Authority System)

**Propósito:** Validar y mejorar el modelo de permisos centralizado.

```
Diseña un modelo de permisos claro y centralizado para este sistema.

Contexto:
- Repo: sebastisnzoth/ugo-admin-panel
- Roles actuales: client, provider, admin, superadmin
- Archivo clave: api/hugo/chat.ts (líneas 122-172)
- También gestiona UI actions en función del rol

Tarea:
1. Documenta el modelo de permisos actual:
   - Qué puede hacer cada rol
   - En qué módulos tienen permisos
   - Qué datos pueden ver
2. Identifica problemas:
   - ¿Hay permisos definidos en múltiples lugares?
   - ¿Hay edge cases o excepciones ad-hoc?
   - ¿Se puede escalar de privilegios?
3. Diseña un modelo centralizado:
   - Schema JSON o TypeScript interface
   - Qué módulo lo debe exportar (src/auth/permissions.ts?)
   - Cómo se consulta en tiempo de request
   - Cómo se revisa en frontend
4. Define para cada rol:
   - Módulos accesibles
   - Acciones permitidas (read, create, update, delete, execute_action)
   - Datos expuestos (campos, contexto)
   - UI actions permitidas
5. Escribe un check: cómo validar que todo request cumple con permisos.
6. Ejemplos:
   - Cliente pide navegar a admin → denied
   - Admin pide abrir servicio 123 → allowed si existe
   - Proveedor ejecuta map_filter → allowed solo si location tracking activo

Salida:
- Schema centralizado de permisos (TypeScript interface)
- Matriz de roles vs acciones
- Función de validación
- Migración de código actual a este modelo
- Tests de ejemplo
```

---

## 7. Plan de Tests: Coverage y Estrategia

**Propósito:** Diseñar suite de tests coherente para el repo.

```
Crea un plan de testing para este repositorio.

Repo: sebastisnzoth/ugo-admin-panel
Estado actual: hay scripts (test, test:p0, test:integration), pero cobertura desconocida

Tarea:
1. Examina qué tests existen:
   - ¿Dónde están? (tests/, __tests__/, .test.ts files?)
   - ¿Qué framework? (Jest, Vitest, Node --test?)
   - ¿Qué cubren actualmente?
2. Define niveles de testing:
   - Unit: funciones individuales
   - Integration: módulos + API
   - E2E: flujos completos
   - Contract: verificar schemas
3. Prioriza qué testear primero:
   - P0: auth, authorize, permisos (críticos, high risk)
   - P1: UI actions, sanitización, TTS (importante, medium risk)
   - P2: prompt builders, response formatting (nice-to-have)
4. Para cada área, escribe:
   - Qué se debe testear
   - Casos normales y edge cases
   - Fixtures/mocks necesarios
5. Estructura de directorios propuesta:
   - tests/unit/api/
   - tests/integration/
   - tests/contracts/
   - tests/e2e/
6. Escribe 3 tests de ejemplo:
   - One auth test (happy path + denied access)
   - One sanitization test
   - One permissions test

Salida:
- Tabla de cobertura objetivo (% por módulo)
- Ejemplos de tests (3 cases)
- Estrategia de CI (cuándo correr qué)
- Documentación de cómo escribir tests
```

---

## 8. Roadmap de Refactor: Esfuerzo y Prioridad

**Propósito:** Crear un plan ejecutable para mejorar el repo.

```
Crea un roadmap de refactor priorizado para este repositorio.

Repo: sebastisnzoth/ugo-admin-panel
Restricción: debe ser ejecutable en sprints de 2 semanas

Contexto de problemas identificados:
- api/hugo/chat.ts es un god module (600 líneas)
- Documentación desincronizada
- Posibles vulnerabilidades de seguridad
- Acoplamiento en dependencias
- Tests incompletos

Tarea:
1. Agrupa el trabajo en "épicas" lógicas:
   - Epic 1: Refactor de api/hugo/chat.ts
   - Epic 2: Centralizar permisos
   - Epic 3: Auditoría de seguridad
   - Epic 4: Sincronizar docs
   - Epic 5: Tests críticos
   - Etc.
2. Para cada épica:
   - Objetivo claro
   - Deliverables concretos
   - Esfuerzo estimado (en horas o sprints)
   - Dependencias de otras épicas
   - Riesgo (bajo, medio, alto)
   - Impacto (bajo, medio, alto)
3. Ordena por:
   - Riesgo (high risk first)
   - Impacto (high impact first)
   - Dependencias (must-do-first)
4. Propón un timeline realista:
   - Semana 1-2: qué hacer
   - Semana 3-4: qué hacer
   - Mes 2: qué hacer
   - Etc.
5. Define "done": cómo saber que terminó cada épica
6. Escribe una checklist por épica

Salida:
- Tabla de épicas (Nombre | Esfuerzo | Riesgo | Impacto | Duración)
- Diagrama de dependencias entre épicas
- Timeline recomendado (Gantt-style text)
- Checklist de "definición de listo" por épica
- Métrica de éxito para el refactor completo
```

---

## Cómo usarlos

1. **Copiar el prompt** que necesites (completo, con contexto)
2. **Pegar en ChatGPT/Claude** (versión sin restricciones)
3. **Dar acceso al repo si es necesario** (puede necesitar ver archivos específicos)
4. **Iterar**: usa la salida como base y refina

### Combinaciones útiles

**Para una auditoría rápida (1 hora):**
- #1 (God Module) + #2 (Seguridad) + #4 (Docs)

**Para un plan de refactor (2-3 horas):**
- #1 (God Module) + #3 (Complejidad) + #8 (Roadmap)

**Para un onboarding limpio:**
- #4 (Docs) + #5 (CI/CD) + #6 (Permisos)

**Para testing sólido:**
- #7 (Tests) + #2 (Seguridad) + #8 (Roadmap)

---

## Notas finales

- Estos prompts asumen que tienes acceso a los archivos del repo o puedes compartir URLs directas a GitHub.
- ChatGPT funciona bien para análisis estáticos (código, documentación).
- Para análisis dinámicos (cobertura de tests, comportamiento en runtime), necesitarás correr herramientas locales.
- Si el repo es privado, deberás copiar los archivos manualmente o usar Claude con acceso a tu máquina local.
