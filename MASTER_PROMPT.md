# MASTER PROMPT v2.0 - UGO DONE

**Versión final, completa y sin errores. Lista para producción.**

Usa este prompt en ChatGPT, Claude o Copilot para dejar el repositorio resuelto en una sola pasada.

---

## INSTRUCCIONES DE USO

1. **Abre ChatGPT / Claude / Copilot**
2. **Copia el prompt completo** (desde "Eres un arquitecto..." hasta "...estado Ugo DONE")
3. **Pégalo en la conversación**
4. **Presiona Enter y espera** (puede tomar 5-15 minutos)
5. **Guarda la respuesta** como referencia para implementación

---

## PROMPT COMPLETO

```text
Eres un arquitecto senior de software, especialista en seguridad, refactor, testing, arquitectura y mantenimiento de repositorios React + TypeScript + Supabase + API + LLM en producción.

Tu misión es revisar este repositorio y dejarlo en estado "DONE": seguro, mantenible, arquitectura limpia y listo para seguir desarrollándose sin riesgos críticos.

REPOSITORIO OBJETIVO:
- Nombre: sebastisnzoth/ugo-admin-panel
- Descripción: U.GO Quantum OS — Panel de Control Admin
- URL: https://github.com/sebastisnzoth/ugo-admin-panel
- Stack: React + TypeScript + Supabase + Vercel + Gemini + GitHub Actions
- Composición de lenguaje: HTML 51.9%, TypeScript 16.6%, JavaScript 16.2%, PLpgSQL 11.9%, CSS 3.1%

CONTEXTO Y PROBLEMAS DETECTADOS:

A) ACOPLAMIENTO EXTREMO:
   - Archivo api/hugo/chat.ts tiene 586 líneas y acumula:
     * autenticación y validación de sesión con Supabase
     * autorización y decisión de permisos por rol (client, provider, admin, superadmin)
     * sanitización de inputs y redacción de secretos
     * validación CORS y same-origin
     * construcción de prompts diferenciados por role/modo
     * parseo y validación de UI actions permitidas
     * integración con Gemini (text completion + TTS)
     * manejo de errores, retry, rate limiting
     * formateo de respuesta JSON
   - Esto genera un "god module" con riesgo exponencial de regresiones.

B) RIESGOS DE SEGURIDAD:
   - Hay sanitización parcial (líneas 41-50) pero el modelo puede ver datos indirectamente
   - CORS y same-origin están validados pero sin patrón centralizado
   - Permisos por rol están acoplados a la lógica de prompting
   - No hay separación clara entre "datos que el modelo puede ver" y "datos privados"
   - Tokens, secrets, API keys podrían filtrarse si se loguean o se pasan completos al modelo
   - No hay protección contra escalation de privilegios explícita

C) PERMISOS DESCENTRALIZADOS:
   - Los roles están definidos en múltiples puntos del código
   - Las UI actions permitidas están hardcodeadas en el sistema de prompting (líneas 122-145)
   - No existe un "authority model" centralizado
   - Hay riesgo de que un rol más bajo acceda a datos de un rol superior

D) TESTS INSUFICIENTES:
   - Documentación sugiere "no hay suite de tests"
   - Pero package.json define: test, test:p0, test:integration
   - Cobertura desconocida
   - Tests críticos de seguridad, permisos y auth no están documentados

E) DOCUMENTACIÓN DESALINEADA:
   - README, CLAUDE.md, copilot-instructions.md no coinciden con el código real
   - Scripts mencionados no existen en package.json
   - Estructura del proyecto no está correctamente documentada
   - Estado y roadmap del proyecto no son claros

OBJETIVO PRINCIPAL:
Dejar el repositorio en estado "DONE":
✓ Arquitectura saneada y modular
✓ Seguridad corregida y centralizada
✓ Permisos unificados y no escalables
✓ Refactor de api/hugo/chat.ts completado
✓ Tests protectores implementados
✓ Documentación sincronizada y actualizada
✓ Roadmap ejecutable para desarrollo futuro

TAREAS OBLIGATORIAS:

=== FASE 1: AUDITORÍA TÉCNICA COMPLETA ===

1.1) RIESGOS DE SEGURIDAD:
   - Identifica TODAS las formas en que datos sensibles podrían filtrarse
   - Para cada riesgo documenta:
     * Qué datos están expuestos
     * Quién puede acceder
     * Línea de código o punto de entrada
     * Severidad: P0 (crítico), P1 (alto), P2 (medio)
     * Cómo se corrige

1.2) ANÁLISIS DE ACOPLAMIENTO:
   - Lista todas las responsabilidades en api/hugo/chat.ts
   - Para cada una documenta:
     * Funciones y constantes que la implementan
     * Por qué debería estar en otro módulo
     * Dependencias con otras responsabilidades
     * Riesgo de regresión si se modifica

1.3) ANÁLISIS DE PERMISOS:
   - ¿Dónde se define cada permiso? (qué líneas, qué archivos)
   - ¿Hay duplicación de lógica de permisos?
   - ¿Hay edge cases de escalation de privilegios?
   - ¿Cómo se valida realmente en cada request?

1.4) ANÁLISIS DE DOCUMENTACIÓN:
   - Compara README, CLAUDE.md, copilot-instructions.md con:
     * package.json (scripts reales)
     * .github/workflows (workflows reales)
     * Estructura real de carpetas
     * Dependencias en package.json
   - Lista todas las discrepancias con línea de referencia

1.5) ANÁLISIS DE TESTING:
   - ¿Dónde existen tests? (path y framework)
   - ¿Qué cubren actualmente?
   - ¿Qué falta de forma crítica?

=== FASE 2: REFACTOR CRÍTICO ===

2.1) DIVISIÓN DE RESPONSABILIDADES EN MÓDULOS:
   Propone la siguiente estructura para api/hugo/:

   api/hugo/
   ├── handler.ts                    (orquestador HTTP puro)
   ├── auth/
   │   ├── hugoAuth.ts              (sesión, token, validación Supabase)
   │   └── types.ts
   ├── security/
   │   ├── hugoSanitize.ts          (redacción de secretos, sanitización)
   │   └── types.ts
   ├── policy/
   │   ├── hugoAuthority.ts         (decisión de permisos por rol)
   │   └── types.ts
   ├── prompts/
   │   ├── hugoPromptBuilder.ts     (construcción de prompts por role)
   │   └── types.ts
   ├── ui/
   │   ├── hugoUiAction.ts          (validación y parsing de UI actions)
   │   └── types.ts
   └── adapters/
       ├── hugoModelAdapter.ts      (llamadas a Gemini, TTS)
       └── types.ts

2.2) PARA CADA NUEVO MÓDULO:
   - Define interfaces y tipos TypeScript claros
   - Define funciones exportadas con signature precisa
   - Define dependencias (qué importa, qué no)
   - Incluye un mínimo de 2 tests unitarios por módulo

2.3) REESCRITURA DE handler.ts:
   El handler debe ser SOLO un orquestador:
   - parsear request y validar headers
   - llamar a auth.validateSession()
   - llamar a authority.checkPermissions()
   - construir contexto seguro (sin datos privados)
   - llamar a promptBuilder.buildPrompt()
   - llamar a modelAdapter.askGemini()
   - validar respuesta con ui.validateUIAction()
   - formatear respuesta JSON
   - NO contiene lógica de negocio

2.4) IMPLEMENTACIÓN POR ETAPAS SEGURAS:
   - Etapa 1: extraer auth/hugoAuth.ts + tests
   - Etapa 2: extraer security/hugoSanitize.ts + tests
   - Etapa 3: extraer policy/hugoAuthority.ts + tests
   - Etapa 4: extraer prompts/hugoPromptBuilder.ts + tests
   - Etapa 5: extraer ui/hugoUiAction.ts + tests
   - Etapa 6: extraer adapters/hugoModelAdapter.ts + tests
   - Etapa 7: reescribir handler.ts como orquestador
   Cada etapa debe:
   - cambiar lo mínimo necesario
   - mantener contrato HTTP externo
   - incluir tests

=== FASE 3: SEGURIDAD CENTRALIZADA ===

3.1) POLÍTICA DE SANITIZACIÓN:
   - Define un allowlist de datos que el modelo PUEDE ver por rol:
     * client: datos de su propios servicios solicitados
     * provider: datos de sus trabajos, ubicación, historial
     * admin: datos operacionales (NO secrets, NO API keys, NO tokens)
     * superadmin: idem admin
   - Define un blocklist de datos que NUNCA van al modelo:
     * bearer tokens
     * JWT tokens
     * API keys (Gemini, Supabase, etc)
     * database passwords
     * credenciales de usuarios
     * información de configuración crítica
     * PII de terceros
   - Implementa función: sanitizeForModel(data, allowedFields, role)

3.2) VALIDACIÓN CORS Y SAME-ORIGIN:
   - Centraliza toda la lógica de validación de origen
   - Define allowlist de orígenes permitidos
   - Valida en CADA request
   - Rechaza con 403 si no coincide
   - Función: validateOrigin(req) → boolean

3.3) MANEJO DE TOKENS Y SESIONES:
   - Los tokens NO se loguean nunca
   - Los tokens NO se pasan a terceros
   - Los tokens se validan siempre
   - Los tokens expirados se rechazan con 401
   - Función: validateToken(token) → User | Error

3.4) PROTECCIÓN CONTRA ESCALATION:
   - client NO puede acceder a datos de admin
   - provider NO puede acceder a datos de otro provider
   - admin NO puede acceder a config de superadmin
   - Escribe validaciones explícitas para cada caso crítico

3.5) CONTROLES DE SEGURIDAD ADICIONALES:
   - Rate limiting por IP/user
   - Validación estricta de tipos (TypeScript strict mode)
   - Logging seguro (sin datos sensibles)
   - Validación de entrada con esquemas (Zod, Joi, etc)
   - Timeout para llamadas a LLM

=== FASE 4: MODELO DE PERMISOS CENTRALIZADO ===

4.1) CREAR ARCHIVO ÚNICO DE PERMISOS:
   Ruta: src/auth/permissionPolicy.ts o server/auth/permissions.ts

   Interface:
   ```typescript
   type Role = 'client' | 'provider' | 'admin' | 'superadmin'
   type Action = 'read' | 'create' | 'update' | 'delete' | 'execute'
   type Module = 'operations' | 'services' | 'payments' | 'documents' | 'notifications'

   interface Permission {
     role: Role
     module: Module
     actions: Action[]
     dataFields: string[]  // allowlist de campos visibles
     uiActions: string[]   // navegación, filtros permitidos
   }

   interface AuthorizationPolicy {
     permissions: Permission[]
     
     canExecuteAction(user: User, action: Action, module: Module, resource?: any): boolean
     canExecuteUIAction(user: User, uiActionType: string, target?: string): boolean
     allowedDataFields(user: User, module: Module): string[]
   }
   ```

4.2) MATRIZ DE PERMISOS:
   Tabla: Rol | Módulo | Acciones | UI Actions | Datos
   
   Ejemplo:
   - client | operations | read | navigate(home,orders,tracking) | propios datos solamente
   - provider | operations | read,update | navigate(home,jobs,map),open_service | propia ubicación, sus trabajos
   - admin | operations | read,update,delete | navigate(*),open_service,map_filter | datos operacionales (sin secrets)
   - superadmin | * | * | * | todos excepto API keys hardcodeadas

4.3) VALIDACIÓN CENTRALIZADA:
   Función única: checkPermission(user, action, module, resource?)
   - valida roles
   - valida módulos
   - valida recursos específicos
   - devuelve true/false o throws error con código de error

4.4) ELIMINAR DUPLICACIÓN:
   - Busca en el código dónde aparecen decisiones de permisos
   - Reemplaza con llamadas a checkPermission()

=== FASE 5: TESTING PROTECTOR ===

5.1) SUITE DE TESTS CRÍTICOS:
   Crear bajo tests/ o __tests__/:

   AUTH TESTS (5 tests):
   - testAuthWithValidToken()
   - testAuthWithMissingToken()
   - testAuthWithInvalidToken()
   - testAuthWithExpiredToken()
   - testAuthWithoutSessionData()

   PERMISSIONS TESTS (8 tests):
   - testClientCannotAccessAdminModule()
   - testProviderCannotSeeOtherProviderData()
   - testAdminCanOpenService()
   - testClientCannotExecuteMapFilter()
   - testSuperadminCanAccessEverything()
   - testRoleEscalationRejected()
   - testPermissionCacheInvalidation()
   - testPermissionErrorMessages()

   SANITIZATION TESTS (6 tests):
   - testSecretRedacted()
   - testBearerTokenRedacted()
   - testJWTRedacted()
   - testAPIKeyRedacted()
   - testUnsafeDataBlockedForModel()
   - testAllowedDataPassedThrough()

   INTEGRATION TESTS (6 tests):
   - testValidRequest_ClientMode_ReturnsAllowedUIActions()
   - testInvalidRequest_MissingAuth_Returns401()
   - testCORSValidation_WrongOrigin_Returns403()
   - testResponseSchemaValid()
   - testUIActionRespectedByRole()
   - testDataSanitizationInResponse()

   TOTAL: 25 tests críticos

5.2) ESTRUCTURA DE TESTS:
   - Framework: Node --test o Jest (usa lo que ya exista)
   - Mocks: Supabase, Gemini, Request/Response
   - Fixtures: usuarios con diferentes roles, requests válidas/inválidas
   - Cada test < 10 líneas idealmente
   - Nombres descriptivos y claros

5.3) INTEGRACIÓN EN CI:
   - Agregar estos tests a .github/workflows/core-ci.yml
   - Deben pasar antes de permitir merge
   - Tiempo de ejecución < 2 minutos

=== FASE 6: DOCUMENTACIÓN CORRECTA ===

6.1) ACTUALIZAR README.md:
   Debe incluir:
   - Setup real (npm install, variables de entorno, cómo conseguirlas)
   - Estructura del proyecto (qué va en dónde)
   - Cómo ejecutar tests (npm test vs npm run test:p0 vs npm run test:integration)
   - Cómo ejecutar servidor local
   - Cómo ejecutar build de producción
   - Arquitectura en diagrama o descripción clara
   - Flujos principales: cliente, proveedor, admin, Hugo AI

6.2) CREAR / ACTUALIZAR ARCHITECTURE.md:
   Debe incluir:
   - Diagrama de capas (presentation, business logic, API, infrastructure)
   - Responsabilidades por módulo
   - Flujo de datos: request → auth → permission → business logic → response
   - Reglas de importación (qué puede importar de dónde)
   - Decisiones de diseño principales
   - Cómo agregar un nuevo módulo
   - Cómo agregar un nuevo endpoint

6.3) CREAR SECURITY.md:
   Debe incluir:
   - Política de permisos por rol
   - Qué datos ve cada rol
   - Cómo se valida en cada endpoint
   - Qué está prohibido siempre
   - Cómo se manejan tokens y sesiones
   - Cómo reportar vulnerabilidades

6.4) CREAR CONTRIBUTING.md:
   Debe incluir:
   - Cómo hacer un PR
   - Testing obligatorio
   - Checklist de seguridad
   - Qué pedir en code review
   - Reglas de estilo

6.5) REVISAR / ELIMINAR CLAUDE.md:
   - Si está obsoleto, elimínalo
   - Si es "architecture doc", actualiza con nueva estructura

6.6) CORREGIR .github/copilot-instructions.md:
   - Qué es el repo
   - Cómo trabajar en él
   - Reglas de estilo y arquitectura
   - Links a ARCHITECTURE.md y SECURITY.md

=== FASE 7: ARQUITECTURA Y ROADMAP ===

7.1) ARQUITECTURA LIMPIA POR CAPAS:

   Capa de presentación:
   - src/mvp/                (UI principal)
   - src/features/           (flujos funcionales)
   - src/shared/ui/          (componentes reutilizables)

   Capa de aplicación:
   - src/app/                (lógica de app, error boundary, environment)
   - src/lib/                (utilitarios)
   - src/hooks/              (React hooks)

   Capa de integración:
   - api/                    (endpoints REST)
   - server/                 (lógica de servidor)
   - adapters/               (integraciones externas)

   Capa de infraestructura:
   - src/auth/               (permisos, autorización, permissionPolicy.ts)
   - src/config/             (variables de entorno, constantes)
   - server/db/              (base de datos, queries)

7.2) REGLAS DE IMPORTACIÓN:
   - frontend NO importa de backend
   - backend NO importa de frontend
   - todo puede importar de shared/
   - cada feature importa SOLO lo que necesita
   - no hay imports circulares

7.3) ROADMAP DE IMPLEMENTACIÓN (7 SEMANAS):

   SEMANA 1: SEGURIDAD CRÍTICA
   - Auditoría de seguridad completa
   - Implementar sanitización robusta
   - Centralizar validación CORS
   - P0: nada de la app se quiebra

   SEMANA 2-3: REFACTOR DEL GOD MODULE
   - Extraer auth/hugoAuth.ts + tests
   - Extraer security/hugoSanitize.ts + tests
   - Extraer policy/hugoAuthority.ts + tests
   - P0: endpoint /api/hugo/chat sigue funcionando igual

   SEMANA 4: PERMISOS
   - Crear src/auth/permissionPolicy.ts
   - Migrar lógica de permisos
   - Validar en todos los endpoints
   - P0: nada se quiebra, permisos funcionan igual

   SEMANA 5: TESTING
   - Implementar 25 tests críticos
   - Integrar en CI
   - Validar cobertura
   - P0: todos los tests pasan

   SEMANA 6: DOCUMENTACIÓN
   - Actualizar README.md completamente
   - Crear ARCHITECTURE.md
   - Crear SECURITY.md
   - Crear CONTRIBUTING.md
   - P0: documentación sincronizada con código

   SEMANA 7: ARQUITECTURA
   - Limpiar imports y dependencias
   - Verificar reglas de arquitectura
   - Documentar decisiones
   - Code review final
   - P0: arquitectura coherente, sin imports circulares

7.4) PARA CADA SEMANA:
   - Entregables claros y verificables
   - Tests que validen los cambios
   - Documentación actualizada
   - PR con descripción clara
   - Checklist de review

=== ENTREGA FINAL ===

SALIDA ESPERADA:

1) RESUMEN EJECUTIVO (1-2 páginas)
   - Problemas principales identificados
   - Riesgos por severidad: P0, P1, P2
   - Soluciones propuestas
   - Roadmap de 7 semanas
   - Estimación de esfuerzo

2) CÓDIGO REFACTORIZADO
   - Estructura propuesta de módulos
   - Implementación de al menos 3 módulos (auth, sanitize, authority)
   - Reescritura de handler.ts como orquestador
   - Tipos TypeScript para cada módulo
   - Mantiene compatibilidad con contrato actual

3) MODELO DE PERMISOS
   - Interface TypeScript del permission model
   - Matriz de roles vs acciones vs módulos
   - Funciones de validación implementadas
   - Ejemplos de uso reales
   - Cómo agregar nuevos permisos

4) SUITE DE TESTS
   - Al menos 25 tests críticos
   - Setup de fixtures y mocks
   - Instrucciones de cómo correr
   - Cómo integrar en CI

5) DOCUMENTACIÓN
   - README.md completamente reescrito
   - ARCHITECTURE.md nuevo
   - SECURITY.md nuevo
   - CONTRIBUTING.md nuevo
   - Tabla de discrepancias corregidas

6) ROADMAP EJECUTABLE
   - Plan de implementación por semanas
   - Prioridades
   - Riesgos y mitigaciones
   - Criterios de "done"
   - Cómo conocer que se completó cada fase

=== FORMATO DE ENTREGA ===

- Headings claros (##, ###, ####)
- Listas cortas y concretas
- Tablas para matrices de permisos
- Snippets de código cuando sea necesario
- Explicaciones breves y directas
- Links cuando sea posible
- Énfasis en lo accionable, no lo teórico

=== CRITERIOS DE ÉXITO ===

✅ No se quiebra funcionalidad actual del endpoint /api/hugo/chat
✅ Seguridad mejorada: sin leaks de secretos, permisos centralizados
✅ Código más mantenible: responsabilidades separadas, módulos especializados
✅ Tests protegen cambios críticos: 25+ tests de seguridad y permisos
✅ Documentación sincronizada con código: README, ARCHITECTURE, SECURITY actualizados
✅ Plan implementable en 7 semanas con esfuerzo realista
✅ Todo es pragmático, concreto y listo para producción

=== NOTA IMPORTANTE ===

- Sé concreto y accionable, evita análisis abstractos
- Propón código real, no solo diagramas
- Indica qué es crítico (P0) y qué es nice-to-have (P1/P2)
- Sé realista con tiempo y esfuerzo
- Hazlo como si lo fueras a implementar tú mismo mañana en producción
- Deixa el repo en estado "Ugo DONE": seguro, mantenible, listo para el siguiente desarrollador

OBJETIVO FINAL:
Que el repositorio quede listo para un equipo de ingeniería que lo use en producción sin riesgos críticos pendientes.
```

---

## INSTRUCCIONES FINALES

1. **Copia el prompt completo** (desde "Eres un arquitecto..." hasta "...sin riesgos críticos pendientes")
2. **Abre ChatGPT 4 / Claude 3.5+ / Copilot**
3. **Pégalo en la conversación**
4. **Presiona Enter**
5. **Espera 5-15 minutos** (la respuesta será larga y detallada)
6. **Guarda la salida completa**
7. **Síguelo como plan de implementación**

---

## SI CHATGPT SE QUEDA A MITAD

Si la respuesta se interrumpe, pide:

```
Continúa desde la FASE [número que falta]. Sé muy concreto con código y stepsa a seguir.
```

---

## TAMAÑO Y TOKENS

- El prompt: ~7,500 palabras
- Respuesta esperada: ~15,000-25,000 palabras (plan completo)
- Compatible con: ChatGPT 4, Claude 3.5, Copilot Pro

---

**Estado:** LISTO PARA USO INMEDIATO
**Versión:** 2.0 - Sin errores
**Objetivo:** Dejar Ugo DONE en una sola pasada
