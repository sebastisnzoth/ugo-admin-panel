# Prompts para Arreglar lo que Está Mal

Use estos prompts con ChatGPT, Claude o similar para corregir y refactorizar el repositorio de forma accionable.

**Recomendación de orden:** Usa los prompts en el orden sugerido al final de este documento.

---

## 1. Refactor del God Module: api/hugo/chat.ts

**Propósito:** Eliminar acoplamiento y dividir en módulos especializados.

```
Revisa este archivo TypeScript y corrígelo con un refactor de arquitectura para eliminar la lógica acoplada.

Archivo objetivo: api/hugo/chat.ts
URL: https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/api/hugo/chat.ts

Problema actual:
- El archivo combina autenticación, autorización, sanitización, CORS, TTS, prompting, UI actions y manejo de respuesta.
- Tiene demasiadas responsabilidades y es difícil de mantener.
- Hay riesgos de regresión y seguridad.

Objetivo:
1. Divide la lógica en módulos especializados.
2. Mantén el handler HTTP solo como orquestador.
3. Extrae:
   - auth/hugoAuth.ts → validación de sesión y token
   - security/hugoSanitize.ts → redacción de secretos, sanitización de input
   - policy/hugoAuthority.ts → decisión de permisos por rol
   - prompts/hugoPromptBuilder.ts → construcción de prompts por role/mode
   - ui/hugoUiAction.ts → validación y parsing de UI actions
   - adapters/hugoModelAdapter.ts → llamadas a Gemini/TTS
4. Cada módulo debe tener interfaces y tipos claros.
5. No cambies el comportamiento externo del endpoint, pero mejora la estructura interna.

Requisitos de calidad:
- Mantén compatibilidad con el contrato actual de respuesta JSON
- Usa funciones pequeñas y reutilizables (<50 líneas idealmente)
- Genera un plan de migración gradual si no puedes hacer todo de una vez
- Haz énfasis en seguridad y mantenibilidad
- Cada función debe tener un propósito claro y singular

Entrega esperada:
- Árbol de archivos propuesto con descripción de cada módulo
- Código refactorizado para al menos los primeros 2 módulos (auth, sanitize)
- Cambios necesarios en handler.ts (cómo orquestar los módulos)
- Lista de riesgos de migración y cómo se mitigan
- Checklist de validación post-refactor
```

---

## 2. Auditoría y Corrección de Seguridad

**Propósito:** Identificar y arreglar vulnerabilidades.

```
Haz una auditoría de seguridad y luego corrige las vulnerabilidades en este repositorio.

Contexto:
Repo: sebastisnzoth/ugo-admin-panel
Archivo crítico: api/hugo/chat.ts
Stack: React + TypeScript + Supabase + Gemini + Vercel

Necesito:
1. Revisar el manejo de:
   - Tokens y sesiones (¿se validan correctamente?)
   - Secretos (¿hay hardcoded values?)
   - Datos enviados al modelo LLM (¿qué se expone?)
   - CORS y same-origin (¿la política es exhaustiva?)
   - Permisos por rol (¿hay escalation posible?)
   - Logs y output (¿se loguean datos sensibles?)

2. Identificar vulnerabilidades:
   - Critical (RCE, auth bypass, data leak)
   - High (privilege escalation, injection)
   - Medium (info disclosure, DoS)
   - Low (configuration issues)

3. Proponer correcciones concretas:
   - Código mejorado
   - Políticas de seguridad
   - Checklist de validación

4. Definir qué datos SÍ pueden viajar al modelo y cuáles NO:
   - Datos permitidos: contexto operativo general, estado de servicios
   - Datos bloqueados: tokens, passwords, personal info, API keys

5. Hacer validación estricta de permisos antes de UI actions

Entrega:
- Lista de vulnerabilidades con severidad y línea de código
- Código corregido para cada vulnerabilidad
- Política de seguridad recomendada (documento)
- Funciones de sanitización mejoradas
- Pruebas mínimas de seguridad (3-5 casos críticos)
- Recomendación: qué arreglar primero (P0), qué puede esperar (P1/P2)
```

---

## 3. Centralizar Permisos y Authority

**Propósito:** Crear un sistema de permisos único y consistente.

```
Refactoriza el sistema de permisos del repositorio para centralizar la autoridad por rol.

Contexto:
- Roles: client, provider, admin, superadmin
- Archivo actual: api/hugo/chat.ts (líneas 122-172 definen permisos en prompt)
- Problema: la autoridad está acoplada a la lógica del AI y UI actions

Necesito:
1. Crear un módulo único de permisos
   - Ruta sugerida: server/auth/permissions.ts o src/auth/permissionPolicy.ts
   - Debe ser compartido entre frontend y backend

2. Definir un schema fuerte:
   - TypeScript interface para cada rol
   - Qué módulos puede acceder
   - Qué acciones puede ejecutar (read, create, update, delete, execute_ui_action)
   - Qué datos puede ver (allowlist de campos)
   - Qué UI actions puede disparar

3. Crear matriz de decisión:
   - Tabla: Rol | Módulo | Acciones permitidas | UI Actions permitidas | Datos expuestos
   - Ejemplo: admin | operations | read,update | navigate,open_service,map_filter | todos excepto tokens

4. Implementar validador único:
   - Función que recibe (user, action, resource) y devuelve true/false
   - Usar en cada endpoint y cada UI action

5. Eliminar lógica de permisos duplicada:
   - En api/hugo/chat.ts
   - En frontend (si existe)

Requisitos:
- No permitir escalation de privilegios
- Validar permisos en cada request
- Usar allowlist (permitir explícitamente) no blacklist

Entrega:
- Interface TypeScript del permission model
- Matriz de permisos (tabla markdown)
- Funciones de validación (1 archivo)
- Plan de migración desde el sistema actual
- Tests para cada rol crítico (5-10 cases)
- Documentación de cómo agregar nuevos permisos
```

---

## 4. Corregir Documentación Desincronizada

**Propósito:** Sincronizar docs con la realidad del código.

```
Revisa todo el repositorio y corrige la desalineación entre documentación y código real.

Tarea:
1. Buscar y revisar estos archivos:
   - README.md
   - CLAUDE.md (si existe)
   - .github/copilot-instructions.md (si existe)
   - Cualquier archivo en /docs
   - Comentarios en package.json

2. Comparar con la realidad:
   - ¿Los scripts de npm que menciona existen en package.json?
   - ¿Las rutas de carpetas que menciona coinciden con la estructura?
   - ¿Los workflows mencionados existen en .github/workflows/?
   - ¿Las dependencias listadas están actualizadas?
   - ¿El estado del proyecto coincide con lo real?
   - ¿Los comandos funcionan sin error?

3. Crear un listado de inconsistencias:
   - Documento X dice: "no hay tests"
   - Realidad: package.json define "test", "test:p0", "test:integration"
   - Impacto: ALTO (afecta setup)
   - Acción: actualizar README

4. Priorizar por impacto en onboarding:
   - ALTO: afecta npm install, npm run build, npm test
   - MEDIO: afecta desarrollo diario
   - BAJO: efectos menores

5. Reescribir la documentación correcta:
   - README.md actualizado y verificado
   - Instrucciones de setup claras
   - Cómo ejecutar tests
   - Estructura del proyecto
   - Workflows principales

Entrega:
- Tabla de inconsistencias (Documento | Afirmación vieja | Realidad | Impacto)
- README.md completamente revisado y corregido
- Documento de "Getting Started" claro
- Checklist para mantener docs sincronizadas
- Recomendación: revisar docs en cada PR que cambie estructura/scripts
```

---

## 5. Suite de Tests Protector

**Propósito:** Crear tests que protejan los arreglos realizados.

```
Crea una estrategia de testing para proteger los arreglos de seguridad, permisos y refactor.

Objetivo:
- Cubrir casos críticos sin redundancia
- Crear suite mínima pero efectiva
- Proteger contra regresiones

Contexto:
- Repo: sebastisnzoth/ugo-admin-panel
- Archivos modificados: api/hugo/chat.ts (y sus nuevos módulos)
- Tests existentes: scripts definidos pero cobertura desconocida

Necesito:
1. Identificar puntos de mayor riesgo:
   - Autenticación y validación de sesión
   - Autorización por rol (no escalation)
   - Sanitización de inputs
   - Contract de respuesta JSON (reply + ui_action)
   - UI actions (solo permitidas por rol)
   - TTS y model adapter
   - CORS y same-origin

2. Proponer estructura de tests:
   - Unit tests: funciones individuales (auth, sanitize, permisos)
   - Integration tests: flujos end-to-end (request completo)
   - Contract tests: validación de schemas

3. Escribir tests de ejemplo:
   - Test 1: Auth con token válido → success
   - Test 2: Auth sin token → 401
   - Test 3: Admin ejecuta action permitida → UI action devuelto
   - Test 4: Client intenta navegar a admin → null
   - Test 5: Input con secret → redactado antes de LLM
   - Test 6: Response schema valid JSON
   - Test 7: Role escalation attempt → denied
   - Test 8: CORS wrong origin → 403

4. Definir mocks necesarios:
   - Supabase (auth, getUser)
   - Gemini (modelo, TTS)
   - Requests (con diferentes origins, headers, roles)

5. Estructura de directorios propuesta:
   - tests/unit/auth/
   - tests/unit/security/
   - tests/unit/permissions/
   - tests/integration/hugo/
   - tests/contracts/

Requisitos:
- Usa framework existente (Jest, Vitest, Node --test)
- Tests < 10 líneas si es posible
- Nombres descriptivos: testAuthWithValidToken(), testClientCannotNavigateToAdmin()
- CI debe correr en < 2min

Entrega:
- Estructura de tests recomendada
- Código de tests (al menos 8 cases)
- Fixtures y mocks necesarios
- Instrucciones de cómo correr tests
- Recomendación: qué tests correr en CI (rápidos) vs local
```

---

## 6. Limpieza de Arquitectura Completa

**Propósito:** Refactor arquitectónico integral para consistencia y mantenibilidad.

```
Haz un refactor arquitectónico completo de este repositorio.

Contexto:
- Repo: React + TypeScript, backend API, lógica de IA
- Problema: capas mezcladas, responsabilidades acopladas, duplicación
- Objetivo: arquitectura limpia, mantenible, consistente

Necesito:
1. Analizar arquitectura actual:
   - Qué capas existen hoy (MVP, features, lib, api, server, etc.)
   - Cómo se comunican
   - Dónde hay duplicación
   - Dónde hay acoplamiento

2. Diseñar arquitectura propuesta:
   - Capas claras: presentation, business logic, API, infrastructure
   - Módulos por dominio: auth, payments, operations, services, notifications, etc.
   - Contratos claros entre capas
   - Punto de entrada único para cada capa

3. Separar responsabilidades:
   - Frontend (React, UI, event handling)
   - Backend (API, business logic, integrations)
   - Shared (types, utils, constants)
   - Infrastructure (config, env, secrets)

4. Identificar y eliminar duplicación:
   - Qué funciones se repiten
   - Qué lógica de negocio está en múltiples lugares
   - Dónde consolidar

5. Establecer reglas de importación:
   - Frontend puede importar de shared pero no de backend
   - API puede importar de backend pero no de frontend
   - Etc.

6. Crear un roadmap de implementación incremental:
   - Fase 1: extraer módulos críticos
   - Fase 2: refactor de capas
   - Fase 3: consolidación y cleanup
   - Cada fase debe ser deliverable independientemente

Requisitos:
- No quebrar funcionalidad actual
- Cada cambio debe tener test
- Documentar nueva arquitectura claramente

Entrega:
- Diagrama de arquitectura propuesta (ASCII o descripción)
- Árbol de directorios nuevo
- Lista de módulos y responsabilidades
- Plan de migración por etapas (esfuerzo, riesgo, impacto)
- Reglas de importación (qué puede importar de dónde)
- Definición de "done" por etapa
- Riesgos y mitigaciones
```

---

## Orden Recomendado de Ejecución

Si tu objetivo es "arreglar lo que está mal" de forma ordenada y segura:

### Fase 1: Seguridad (1-2 días)
1. **Prompt 2:** Auditoría de seguridad
   - Identificar vulnerabilidades críticas
   - Aplicar fixes inmediatos

### Fase 2: Estructura (3-5 días)
2. **Prompt 1:** Refactor del god module (api/hugo/chat.ts)
   - Dividir en módulos especializados
   - Mantener comportamiento externo igual
3. **Prompt 3:** Centralizar permisos
   - Crear permission model único
   - Migrar lógica desde el endpoint

### Fase 3: Protección (2-3 días)
4. **Prompt 5:** Suite de tests
   - Escribir tests que protejan los cambios
   - Validar en CI

### Fase 4: Documentación (1 día)
5. **Prompt 4:** Sincronizar documentación
   - Actualizar README y docs
   - Verificar que matches con código

### Fase 5: Arquitectura (1-2 semanas)
6. **Prompt 6:** Limpieza arquitectónica completa
   - Solo después de que todo lo anterior esté estable
   - Refactor más profundo pero menos urgente

---

## Recomendaciones de Uso

**Para ChatGPT:**
1. Abre https://chat.openai.com
2. Copia un prompt completo (incluye el contexto)
3. Pega en la conversación
4. Si el repo es público, pega URLs; si es privado, copia archivos manualmente

**Para Claude:**
1. Abre https://claude.ai
2. Pega el prompt completo
3. Si necesitas acceso a archivos, copia el contenido o usa Claude en tu VS Code

**Para Copilot:**
1. Abre GitHub Copilot Chat en VS Code
2. Pega el prompt
3. Usa `@github` para referencias a archivos

---

## Criterio de "Done"

Cada prompt debe resultar en:
- ✅ Código ejecutable o propuesta clara
- ✅ No quiebra funcionalidad actual
- ✅ Mejor que lo anterior en: mantenibilidad, seguridad o claridad
- ✅ Documentado y explicado

---

## Notas Finales

- Estos prompts son **accionables**, no genéricos.
- Cada uno puede ejecutarse en 1-2 horas con ChatGPT/Claude.
- El orden sugerido maximiza estabilidad: seguridad → estructura → tests → docs → arquitectura.
- Después de cada prompt, recomiendo: **revisar, testear, comitear**.
