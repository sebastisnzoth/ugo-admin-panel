# UGO Readiness — Hugo Intent

## Estado

- **READINESS_ID:** `hugo-intent`
- **Área:** Hugo / IA / Voz
- **Control:** Reconocimiento de intención
- **Estado autoritativo:** **VERIFIED**
- **Responsable:** UGO
- **Task:** `readiness-hugo-intent`
- **Job:** `UGO-READINESS-HUGO-INTENT`
- **Correlation ID:** `readiness-hugo-intent-20260929T212200Z-6c13b3ea`
- **Entorno validado:** UGO TEST
- **Producción tocada:** No

## SHA y ejecución validada

El control fue verificado sobre el SHA exacto:

`a668c24207c51008fcda18ee3447ab1f3eba2e3d`

El repositorio continuó avanzando después de esa verificación por trabajos paralelos. La evidencia de este control permanece ligada al SHA probado y no debe reinterpretarse como prueba de cambios posteriores no relacionados.

## Qué se corrigió

Se reforzó el reconocimiento de intención para lenguaje natural y sinónimos en español y portugués, manteniendo compatibilidad con el flujo existente.

Cobertura relevante:

- Plomería / plumbing: plomero, plomería, fontanero, encanador, encanamento, hidráulico, sanitarista, fuga, vazamento, tubería y términos relacionados.
- Pintura / painting: pintor, pintura, pintar, repintar, pared, paredes, retoque, tinta.
- Electricidad / electricity: electricista, electricidad, eletricista, elétrica, sin luz, sem luz, enchufe, tomacorriente y cortocircuito.
- Limpieza y otras categorías conservaron compatibilidad de aliases.
- Las frases de navegación y control no se convierten erróneamente en categorías de servicio.

## Wiring verificado

Se comprobó que Hugo Cliente sigue conectado al resolver real de categorías activas y no a una tabla simulada.

Puntos comprobados:

- `ClientVoiceHugoDock.tsx` usa el resolver de categoría.
- `voiceCatalog.ts` consulta categorías activas.
- Las categorías provienen de UGO TEST.
- Los comandos globales y parser de acciones permanecen separados del reconocimiento de categorías.

## Pruebas ejecutadas

Workflow:

`UGO Hugo Intent Runtime TEST`

Run:

`36633538777`

Resultado:

**SUCCESS**

Resultados observados:

- 20 tests de regresión: PASS
- 10 casos runtime de intención/categoría: PASS
- 6 casos de acciones de flujo: PASS
- 7 categorías activas detectadas en UGO TEST
- Build del SHA exacto: PASS
- Verificación de entorno TEST: PASS

Acciones de flujo cubiertas:

- home
- activity
- cancel
- schedule
- confirm
- retry

Pruebas negativas incluidas:

- `ver actividad`
- `volver al inicio`
- `cancelar pedido`

Estas frases no fueron interpretadas como categorías de servicio.

## Validación independiente

### Judge

- Resultado: **PASS**
- Validó resolución contra catálogo activo de UGO TEST.
- Validó sinónimos ES/PT.
- Validó separación entre intención de servicio y navegación.
- Validó acciones determinísticas del flujo.

### Sentinel

- Resultado: **PASS**
- Validó wiring del cliente al resolver de producción.
- Validó origen en catálogo activo.
- Validó cobertura de plomería y pintura.
- Validó parser de acciones.
- Validó que toda la ejecución correspondiera a TEST.

## Evidencia persistida

Archivo autoritativo de evidencia:

`docs/ugo-readiness-evidence/readiness-hugo-intent-a668c242.json`

Artifact de GitHub Actions:

- Artifact ID: `11063771893`
- Nombre: `hugo-intent-runtime-a668c24207c51008fcda18ee3447ab1f3eba2e3d`
- Retención configurada: 90 días

Lock autoritativo:

`docs/ugo-work-locks/readiness-hugo-intent.json`

Estado del lock:

`DONE`

El lock registra:

- `verified_sha: a668c24207c51008fcda18ee3447ab1f3eba2e3d`
- Judge: PASS
- Sentinel: PASS
- Run exitoso
- Job de runtime
- Artifact
- Evidencia persistida

## Incidente previo y corrección

La primera ejecución del workflow falló por una incompatibilidad de orden en el contrato de regresión.

Run fallido registrado:

`36633258342`

La regresión fue corregida sin reset, force push ni reversión de trabajo ajeno. La ejecución posterior sobre el SHA corregido terminó en SUCCESS y es la evidencia válida para el cierre.

## Criterio de cierre

El control cumple el criterio requerido:

- implementación resuelta;
- wiring verificado;
- suite TEST ejecutada;
- regresión permanente;
- runtime comprobado;
- evidencia persistida;
- Judge PASS;
- Sentinel PASS;
- lock `DONE`;
- producción no modificada.

Por lo tanto, el estado exacto del control es:

# VERIFIED

## Impacto en el camino global

Al momento del cierre de este control:

- Pasos funcionales totales: 69
- VERIFIED previos informados: 6
- Este control agrega 1 VERIFIED
- Restantes tras este cierre: **62**
- Restantes delegables: **59**
- Pruebas humanas/físicas finales: **3**

Los conteos globales pueden cambiar por trabajos paralelos posteriores; el Centro de Comando debe derivarlos desde los locks autoritativos vigentes.

## Controles paralelos observados al cierre

Se observaron como frentes habilitados o en ejecución:

- `hugo-authority`
- `admin-navigation`
- `auto-department-job-visibility`
- `auto-agents`

No se modifica su estado desde este documento.
