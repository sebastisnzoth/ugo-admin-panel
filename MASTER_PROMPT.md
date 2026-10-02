# Master Prompt: Auditoría Completa + Refactor Total

**Versión: 1.0 - Lista para producción**

Usa este prompt en ChatGPT, Claude o Copilot para hacer una auditoría completa + refactor del repositorio de una sola vez.

---

## PROMPT COMPLETO

```text
Eres un arquitecto senior de software, especialista en seguridad, refactor de código, testing y mantenimiento de repositorios React + TypeScript + API + Supabase + LLM.

Tu tarea es revisar el repositorio actual y arreglar lo que está mal de forma realista, segura y accionable.

Repo objetivo:
- sebastisnzoth/ugo-admin-panel
- URL: https://github.com/sebastisnzoth/ugo-admin-panel
- Stack: React + TypeScript + Supabase + Vercel + Gemini + GitHub Actions
- Lenguajes: HTML 51.9%, TypeScript 16.6%, JavaScript 16.2%, PLpgSQL 11.9%, CSS 3.1%

Contexto del problema:
Este repositorio está en una etapa de crecimiento productivo pero con señales claras de riesgo:

A) Acoplamiento extremo:
   - El archivo api/hugo/chat.ts (586 líneas) acumula:
     - autenticación y validación de sesión
     - autorización y decisión de permisos por rol
     - sanitización de inputs y secretos
     - validación CORS y same-origin
     - construcción de prompts por role/modo
     - parseo y validación de UI actions
     - integración con Gemini (text + TTS)
     - manejo de errores y respuestas JSON
   - Esto crea un "god module" con riesgo exponencial de regresiones.

B) Seguridad:
   - Hay lógica de sanitización (líneas 41-50) pero el modelo puede estar viendo datos sensibles indirectamente.
   - CORS y same-origin están parcialmente validados pero sin patrón centralizado.
   - La decisión de permisos está acoplada a la lógica de prompting.
   - No hay separación clara entre "datos que el modelo puede ver" y "datos privados".

C) Permisos:
   - Los roles (client, provider, admin, superadmin) están definidos en múltiples puntos.
   - Las UI actions permitidas por rol están hardcodeadas en el prompting.
   - No hay un "authority model" centralizado.
   - Hay riesgo de escalation de privilegios.

D) Tests:
   - La documentación sugiere "no hay suite de tests", pero package.json define test, test:p0, test:integration.
   - Cobertura desconocida.
   - Tests críticos de seguridad y permisos están ausentes.

E) Documentación:
   - README, CLAUDE.md y copilot-instructions.md están desalineados con la realidad.
   - Los scripts mencionados no coinciden con package.json.
   - El estado del proyecto no está claro.

Objetivo principal:
Arreglar el repositorio de manera segura y mantenible, sin romper la funcionalidad actual ni el contrato externo del sistema.

Entrega:
Un plan completo y ejecutable que incluya refactor seguro, permisos centralizados, tests protectores y documentación actualizada.

---

FASE 1: AUDITORÍA TÉCNICA COMPLETA

1.1) Riesgos de seguridad:
   - Identifica TODAS las formas en que datos sensibles podrían filtrarse:
     - Al modelo LLM
     - A través de CORS
     - En logs o errores
     - En responses HTTP
   - Para cada riesgo:
     - ¿Qué datos están expuestos?
     - ¿Quién puede acceder?
     - ¿Cuál es la severidad? (crítica, alta, media, baja)
     - ¿Cómo se corrige?

1.2) Análisis de acoplamiento:
   - Identifica todas las responsabilidades en api/hugo/chat.ts
   - Para cada responsabilidad:
     - ¿Qué funciones la implementan?
     - ¿Por qué debería estar en otro módulo?
     - ¿Cuál es la dependencia con otras responsabilidades?
   - Propón cómo dividir el archivo

1.3) Análisis de permisos:
   - ¿Dónde se define cada permiso?
   - ¿Hay duplicación?
   - ¿Hay edge cases de escalation?
   - ¿Cómo se valida realmente en cada request?

1.4) Análisis de documentación:
   - Compara README, CLAUDE.md, copilot-instructions.md con:
     - package.json (scripts actuales)
     - .github/workflows (workflows reales)
     - estructura de carpetas
     - dependencias
   - Lista todas las discrepancias

1.5) Análisis de testing:
   - ¿Existen tests? ¿Dónde?
   - ¿Qué cubren?
   - ¿Qué falta (crítico)?

---

FASE 2: REFACTOR CRÍTICO

2.1) Dividir api/hugo/chat.ts:
   Propón y/o implementa la siguiente estructura:

   api/hugo/
   ├── handler.ts           (orquestador HTTP)
   ├── auth/
   │   └── hugoAuth.ts      (sesión, token, validación)
   ├── security/
   │   └── hugoSanitize.ts  (redacción de secretos, sanitización)
   ├── policy/
   │   └── hugoAuthority.ts (decisión de permisos por rol)
   ├── prompts/
   │   └── hugoPromptBuilder.ts (construction de prompts por role)
   ├── ui/
   │   └── hugoUiAction.ts  (validación y parsing de UI actions)
   └── adapters/
       └── hugoModelAdapter.ts (llamadas a Gemini, TTS)

   Para cada módulo:
   - Define interfaces y tipos claros
   - Define funciones exportadas
   - Define tests unitarios mínimos

2.2) Refactor de handler.ts:
   - El handler debe ser SOLO un orquestador:
     - parsear request
     - validar origen/headers
     - llamar a auth
     - llamar a authority
     - construir contexto
     - llamar a prompts
     - llamar a model
     - validar respuesta
     - formatear response
   - NO debe contener lógica de negocio

2.3) Implementa la refactorización por etapas:
   - Etapa 1: extraer auth/hugoAuth.ts
   - Etapa 2: extraer security/hugoSanitize.ts
   - Etapa 3: extraer policy/hugoAuthority.ts
   - Etapa 4: extraer prompts/hugoPromptBuilder.ts
   - Etapa 5: extraer ui/hugoUiAction.ts
   - Etapa 6: extraer adapters/hugoModelAdapter.ts
   - Etapa 7: reescribir handler.ts

   Cada etapa debe:
   - Cambiar solo lo necesario
   - Mantener el contrato HTTP externo igual
   - Incluir tests

---

FASE 3: SEGURIDAD

3.1) Política de sanitización:
   - Define un allowlist de datos que el modelo PUEDE ver por rol
   - Define un blocklist de datos que NUNCA pueden ir al modelo:
     - tokens
     - passwords
     - API keys
     - bearer headers
     - JWTs
     - datos de otros usuarios
     - información de configuración crítica
   - Implementa una función `sanitizeForModel(data, allowedFields, role)` que:
     - solo expone los datos permitidos
     - redacta secretos
     - valida tipos

3.2) CORS y Same-Origin:
   - Centraliza la lógica de validación de origen
   - Define un allowlist de orígenes permitidos
   - Valida en CADA request
   - Rechaza con 403 si no coincide

3.3) Manejo de tokens y sesiones:
   - Asegúrate de que:
     - tokens no se loguean
     - tokens no se pasan a terceros
     - tokens se validan siempre
     - tokens expirados se rechazan con 401

3.4) Protección contra escalation:
   - Un client NO puede acceder a datos de admin
   - Un provider NO puede acceder a datos de otro provider
   - Un admin NO puede ver credenciales superadmin
   - Escribe validaciones explícitas para cada caso

3.5) Propón controles de seguridad adicionales:
   - Rate limiting
   - Validación de tipos (TypeScript strict mode)
   - Logging seguro (sin datos sensibles)
   - Validación de entrada

---

FASE 4: PERMISOS CENTRALIZADOS

4.1) Crea un modelo único de permisos:
   Archivo: src/auth/permissionPolicy.ts o server/auth/permissions.ts

   Estructura:
   ```typescript
   type Role = 'client' | 'provider' | 'admin' | 'superadmin'
   type Action = 'read' | 'create' | 'update' | 'delete' | 'execute'
   type Module = 'operations' | 'services' | 'payments' | 'documents' | etc

   interface Permission {
     role: Role
     module: Module
     actions: Action[]
     dataFields: string[] (allowlist)
     uiActions: string[] (navegación, filtros, etc)
   }

   interface AuthorizationPolicy {
     permissions: Permission[]
     canExecute(role, action, module, resource?): boolean
     canExecuteUIAction(role, uiActionType, target?): boolean
     allowedDataFields(role, module): string[]
   }
   ```

4.2) Define la matriz de permisos:
   Tabla: Rol | Módulo | Acciones | UI Actions | Datos expuestos
   Ejemplo:
   - client | operations | read | navigate(home,orders) | sus propios datos
   - provider | operations | read,update | navigate(home,jobs,map) | su propia ubicación, sus trabajos
   - admin | operations | read,update,delete | navigate(*), open_service | datos operacionales (no secrets)
   - superadmin | * | * | * | todos excepto API keys hardcodeadas

4.3) Implementa validación centralizada:
   - Una función `checkPermission(user, action, resource)` que:
     - valida roles
     - valida módulos
     - valida recursos específicos
     - devuelve true/false o throw error

4.4) Elimina lógica de permisos duplicada:
   - Busca en el código dónde aparecen decisiones de permisos
   - Reemplaza con llamadas a la función centralizada

---

FASE 5: TESTING PROTECTOR

5.1) Define suite de tests críticos:
   Crear bajo tests/ o __tests__/:

   5.1.1) Unit tests - auth:
   - testAuthWithValidToken()
   - testAuthWithMissingToken()
   - testAuthWithInvalidToken()
   - testAuthWithExpiredToken()

   5.1.2) Unit tests - permissions:
   - testClientCannotAccessAdminModule()
   - testProviderCannotSeeOtherProviderData()
   - testAdminCanOpenService()
   - testClientCannotExecuteMapFilter()
   - testRoleEscalationRejected()

   5.1.3) Unit tests - sanitization:
   - testSecretRedacted()
   - testBearerTokenRedacted()
   - testJWTRedacted()
   - testUnsafeDataBlockedForModel()

   5.1.4) Integration tests - full flow:
   - testValidRequest_ClientMode_ReturnsAllowedUIActions()
   - testInvalidRequest_MissingAuth_Returns401()
   - testCORSValidation_WrongOrigin_Returns403()
   - testResponseSchemaValid()

   5.1.5) Contract tests:
   - testResponseHasRequiredFields(reply, ui_action, etc)
   - testUIActionMatchesSchema()
   - testErrorResponseFormat()

5.2) Cómo escribir los tests:
   - Framework: usa Node --test o Jest (según lo que ya exista)
   - Mocks: Supabase, Gemini, Request/Response
   - Fixtures: usuarios con diferentes roles, requests válidas/inválidas
   - Cada test < 10 líneas

5.3) Integración en CI:
   - Estos tests deben correr en .github/workflows/core-ci.yml
   - Deben pasar antes de permitir merge

---

FASE 6: DOCUMENTACIÓN CORRECTA

6.1) Corregir README.md:
   - Setup real (npm install, variables de entorno reales)
   - Estructura del proyecto (qué va en dónde)
   - Cómo ejecutar tests (npm test vs npm run test:p0 vs npm run test:integration)
   - Cómo ejecutar el servidor local
   - Cómo ejecutar el build de producción
   - Arquitectura (qué hace cada carpeta)
   - Flujos principales (cliente, proveedor, admin, Hugo AI)

6.2) Corregir o eliminar CLAUDE.md:
   - Si está obsoleto, elimínalo o actualízalo
   - Si es el "architecture doc", actualiza con la nueva estructura

6.3) Crear / actualizar .github/copilot-instructions.md:
   - Qué es el repo
   - Cómo trabajar en él
   - Reglas de estilo y arquitectura
   - Cómo hacer un PR

6.4) Crear ARCHITECTURE.md:
   - Diagrama de capas
   - Responsabilidades por módulo
   - Flujo de datos (request → auth → permission → business logic → response)
   - Reglas de importación
   - Decisiones de diseño importantes

6.5) Crear SECURITY.md:
   - Política de permisos
   - Qué datos ve cada rol
   - Cómo se valida en cada endpoint
   - Qué está prohibido siempre
   - Cómo reportar vulnerabilidades

6.6) Crear CONTRIBUTING.md:
   - Cómo hacer un PR
   - Testing obligatorio
   - Checklist de seguridad
   - Qué pedir en review

---

FASE 7: ARQUITECTURA Y ROADMAP

7.1) Propón una arquitectura limpia por capas:

   Capa de presentación:
   - src/mvp/ (UI principal)
   - src/features/ (flujos funcionales)
   - src/shared/ui/ (componentes reutilizables)

   Capa de aplicación:
   - src/app/ (lógica de app, error boundary, environment)
   - src/lib/ (utilitarios)
   - src/hooks/ (react hooks)

   Capa de integración:
   - api/ (endpoints)
   - server/ (lógica de servidor)
   - adapters/ (integraciones externas)

   Capa de infraestructura:
   - src/auth/ (permisos, autorización)
   - src/config/ (variables de entorno, constantes)
   - server/db/ (base de datos, queries)

7.2) Define reglas de importación:
   - frontend NO importa de backend
   - backend NO importa de frontend
   - todo puede importar de shared/
   - cada feature importa solo lo que necesita

7.3) Propón roadmap de implementación:

   SEMANA 1 (Seguridad crítica):
   - Auditoría de seguridad completa
   - Implementar sanitización robusta
   - Centralizar validación CORS

   SEMANA 2-3 (Refactor del god module):
   - Extraer auth/hugoAuth.ts
   - Extraer security/hugoSanitize.ts
   - Extraer policy/hugoAuthority.ts
   - Tests para cada módulo

   SEMANA 4 (Permisos):
   - Crear permissionPolicy.ts
   - Migrar lógica de permisos
   - Validar en todos los endpoints

   SEMANA 5 (Testing):
   - Implementar suite de tests
   - Integrar en CI
   - Validar cobertura

   SEMANA 6 (Documentación):
   - Actualizar README, ARCHITECTURE.md, SECURITY.md
   - Revisar y corregir inconsistencias

   SEMANA 7 (Arquitectura):
   - Limpiar imports y dependencias
   - Verificar que las reglas de arquitectura se cumplen
   - Documentar decisiones finales

7.4) Para cada semana:
   - Entregables claros
   - Tests que validen
   - Documentación actualizada
   - Review y merge checklist

---

REQUISITOS FINALES

Salida esperada:

A) Resumen ejecutivo (1-2 páginas):
   - Problemas principales identificados
   - Riesgos por severidad
   - Soluciones propuestas
   - Roadmap de 7 semanas

B) Código refactorizado:
   - Propone o implementa al menos 2 módulos (auth, sanitize)
   - Reescribe handler.ts como orquestador
   - Mantiene compatibilidad con contrato externo

C) Modelo de permisos:
   - Interface TypeScript
   - Matriz de roles vs acciones
   - Funciones de validación
   - Ejemplos de uso

D) Suite de tests:
   - Al menos 10 tests críticos
   - Setup de fixtures y mocks
   - Instrucciones de cómo correr

E) Documentación:
   - README.md corregido
   - ARCHITECTURE.md nuevo
   - SECURITY.md nuevo
   - CONTRIBUTING.md nuevo
   - Tabla de discrepancias de lo que se corrigió

F) Roadmap:
   - Plan de implementación por semanas
   - Prioridades
   - Riesgos y mitigaciones
   - Criterios de "done"

Formato de entrega:
- Usa headings claros (##, ###, ####)
- Listas cortas y concretas
- Tablas para matrices
- Snippets de código cuando sea necesario
- Explicaciones breves y directas
- Links cuando sea posible

Criterios de éxito:
✅ No se quiebra funcionalidad actual
✅ Seguridad mejorada demostrablemente
✅ Código más mantenible y legible
✅ Tests protegen cambios críticos
✅ Documentación sincronizada con código
✅ Plan implementable en 7 semanas
✅ Todo es realista y pragmático

Importante:
- Sé concreto y accionable
- Evita análisis abstractos
- Propón código, no solo diagramas
- Indica qué es crítico y qué es nice-to-have
- Sé realista con tiempo y esfuerzo
- Hazlo como si lo fueras a implementar tú mismo
```

---

## CÓMO USAR ESTE PROMPT

### Opción 1: ChatGPT (Recomendado)
1. Abre https://chat.openai.com
2. Copia el prompt completo (desde `Eres un arquitecto...` hasta `...implementar tú mismo`)
3. Pégalo en la conversación
4. Presiona Enter
5. Espera a que complete (puede tomar 5-10 minutos)
6. La respuesta será estructurada en 7 fases

### Opción 2: Claude
1. Abre https://claude.ai
2. Copia el prompt completo
3. Pégalo
4. Si necesitas acceso a archivos específicos, agrega: "Aquí están los archivos principales del repo: [copiar contenido de api/hugo/chat.ts, package.json, etc.]"

### Opción 3: Copilot Workspace
1. Abre GitHub Copilot en VS Code o web
2. Copia el prompt
3. Usa `@github` para referenciar archivos si tienes acceso

---

## QUÉ ESPERAR DE LA RESPUESTA

El modelo debería entregar:

✅ **Resumen ejecutivo** con problemas + riesgos + soluciones
✅ **Código refactorizado** (al menos 2-3 módulos nuevos)
✅ **Permissionsmmodel** centralizado (interface + funciones)
✅ **Tests** listos para correr (10+ cases)
✅ **Documentación actualizada** (README, ARCHITECTURE, SECURITY)
✅ **Roadmap de 7 semanas** con prioridades
✅ **Checklist de validación** post-implementación

Si la respuesta es muy genérica o abstracta, presiona nuevamente:
> "Sé más concreto: quiero código refactorizado, no diagramas. Empieza por el módulo de auth"

---

## NOTAS IMPORTANTES

- Este prompt **está optimizado para ChatGPT 4 / Claude 3.5+**
- Si tienes acceso privado al repo, **copia los archivos reales** al prompt
- El modelo puede no implementar TODO en una sola pasada; es normal, sigue con el roadmap
- Si la respuesta es muy larga, pide que la comprima en "un plan de implementación de una página"
- Después de recibir el plan, puedes hacer preguntas específicas sobre cada fase

---

## VERSIÓN CORTA (Si ChatGPT se aburre)

Si la respuesta parece que se va a quedar a mitad, puedes interrumpir y pedir:

```
Foco solo en lo más crítico:
1. ¿Cuáles son los 3 riesgos de seguridad más graves?
2. ¿Cómo divido api/hugo/chat.ts en 3 módulos?
3. ¿Cuáles son los 5 tests que necesito hacer urgente?
4. ¿Cuál es el orden de implementación (1 semana)?
```

---

**Última actualización:** 2026-10-02
**Estado:** LISTO PARA PRODUCCIÓN
**Versión:** 1.0
