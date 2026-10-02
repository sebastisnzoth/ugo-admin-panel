# Prompts para Auditoría Técnica de UGO

Estos prompts están alineados con el estado actual de UGO y con el objetivo de dejar operativo el flujo real Cliente ↔ Proveedor ↔ Admin.

> **Decisión vigente:** Hugo/orbe/voz está retirado de las superficies activas y queda fuera del camino crítico de lanzamiento por ahora. No debe bloquear readiness ni distraer auditorías prioritarias. Si todavía existe código dormido de Hugo, se trata como deuda técnica diferida salvo que introduzca riesgo de seguridad, build o runtime.

---

## 1. Auditoría del flujo crítico Cliente ↔ Proveedor

**Propósito:** comprobar el lifecycle real de punta a punta y localizar exactamente dónde se corta.

```
Audita el flujo crítico completo de UGO usando código, tests, Supabase, Realtime y evidencia disponible.

Repo: sebastisnzoth/ugo-admin-panel

Flujo obligatorio:
Cliente solicita
→ matching
→ oferta al proveedor elegible
→ alerta visible/sonido/vibración
→ proveedor acepta
→ en camino
→ GPS válido
→ YA LLEGUÉ / geofence
→ evidencia inicial
→ comenzar trabajo
→ evidencia final
→ cliente aprueba
→ forma de pago
→ pago / efectivo y deuda UGO
→ completado
→ ratings mutuos
→ Admin observa el estado real

Tareas:
1. Para cada transición identifica UI, estado, función, API/RPC, tabla y evento Realtime implicado.
2. Clasifica cada paso como CONFIGURED, WIRED, EXECUTED, VERIFIED, BROKEN o UNKNOWN.
3. Detecta transiciones sin persistencia, listeners que no reciben eventos, estados duplicados o rutas muertas.
4. No declares VERIFIED por código existente: exige evidencia runtime del mismo SHA.
5. Señala la causa raíz de cada fallo y el cambio mínimo reversible para corregirlo.
6. Prioriza únicamente los bloqueos que impiden completar un servicio real.

Salida:
- Tabla Paso | Implementación | Persistencia | Realtime | Evidencia | Estado
- Punto exacto de ruptura
- Fix propuesto
- Tests requeridos
- Riesgos de regresión
```

---

## 2. Auditoría de GPS, ubicación y geofence del proveedor

**Propósito:** asegurar que un proveedor Online tenga ubicación reciente y pueda recibir pedidos y confirmar llegada de forma fiable.

```
Audita todo el pipeline de ubicación del proveedor en UGO.

Repo: sebastisnzoth/ugo-admin-panel

Tareas:
1. Traza navigator.geolocation / permisos del navegador o dispositivo → estado frontend → persistencia → matching.
2. Verifica:
   - solicitud explícita de permiso
   - timeout
   - precisión
   - rechazo de 0,0
   - antigüedad máxima aceptada
   - refresh periódico
   - errores de permiso/GPS/timeout
3. Determina por qué puede aparecer "Online sin GPS válido" o "El GPS tardó demasiado en responder".
4. Verifica que el matching nunca use ubicación ficticia o vencida.
5. Verifica geofence de 200 m y que YA LLEGUÉ no avance si GPS falla o está fuera de rango.
6. Confirma que Cliente y Proveedor puedan estar físicamente en el mismo lugar sin que el flujo falle por stale location.
7. Propón instrumentación mínima para distinguir permiso, timeout, precisión y persistencia.

Salida:
- Diagrama del pipeline GPS
- Fallos encontrados por severidad
- Causa raíz
- Fix mínimo
- Casos de prueba navegador + móvil
- Criterio exacto para VERIFIED
```

---

## 3. Auditoría de matching, ofertas y alertas al proveedor

**Propósito:** garantizar que una solicitud válida llegue inmediatamente al proveedor elegible.

```
Audita el camino solicitud → matching → ofertas_servicio → Realtime → NotificationCenter → alerta visible/sonido/vibración.

Repo: sebastisnzoth/ugo-admin-panel

Tareas:
1. Traza el INSERT de la solicitud y de cada oferta.
2. Verifica filtros de distancia, categoría, disponibilidad, deuda/bloqueos y estado del proveedor.
3. Revisa la suscripción Realtime a ofertas_servicio y cualquier canal alternativo.
4. Comprueba filtros por proveedor_id, lifecycle de la suscripción y reconexión.
5. Revisa deduplicación por oferta_id para evitar dobles alertas sin perder la primera.
6. Comprueba notificación visible, cierre manual con X, autocierre razonable, sonido y vibración donde estén soportados.
7. Verifica comportamiento con pestaña visible, background/PWA y reconexión.
8. Si existe polling/fallback, confirma que no genere duplicados.
9. Usa evidencia exacta del mismo SHA para declarar VERIFIED.

Salida:
- Trazado evento por evento
- Punto exacto de pérdida o demora
- Fix reversible más seguro
- Tests contract/integration/E2E
- Evidencia requerida
```

---

## 4. Auditoría de pagos, efectivo, deuda y cierre

**Propósito:** comprobar que pagar realmente cierre el servicio y mantenga un ledger coherente.

```
Audita pagos y cierre de servicios en UGO.

Repo: sebastisnzoth/ugo-admin-panel

Reglas vigentes:
- efectivo debe quedar registrado
- efectivo genera deuda/comisión a UGO cuando corresponda
- un proveedor que deba 3 servicios no puede aceptar nuevos pedidos
- el bloqueo no debe corromper trabajos ya aceptados
- cliente y proveedor deben converger al mismo estado final

Tareas:
1. Traza "elegir forma de pago" desde UI hasta persistencia.
2. Revisa por qué un proveedor puede quedar en "esperando pago".
3. Audita YA PAGUÉ, confirmaciones, estados y ledger.
4. Verifica idempotencia para doble click, refresh y eventos repetidos.
5. Verifica deuda acumulada, umbral de 3 servicios y desbloqueo tras pago a UGO.
6. Confirma que completion habilite ratings en ambos lados.
7. Revisa consistencia Admin/Cliente/Proveedor.

Salida:
- Máquina de estados de pago
- Reglas de negocio comprobadas
- Inconsistencias
- Fixes propuestos
- Tests críticos
- Criterio VERIFIED
```

---

## 5. Auditoría de permisos, RLS y aislamiento por rol

**Propósito:** centralizar y verificar la autoridad real sin depender de Hugo.

```
Audita el modelo de permisos de UGO para client, provider, admin y superadmin.

Repo: sebastisnzoth/ugo-admin-panel

Tareas:
1. Mapea permisos frontend, API/RPC y Supabase RLS.
2. Define qué tablas, campos y acciones puede leer/escribir cada rol.
3. Busca permisos duplicados o contradictorios.
4. Detecta escalación de privilegios, acceso cross-user y RPCs demasiado permisivas.
5. Comprueba que ocultar un botón no sea el único control de seguridad.
6. Revisa Storage y Realtime además de CRUD.
7. Propón un authority model centralizado sólo si reduce riesgo sin reescribir el producto.
8. Hugo/orbe no forma parte del modelo activo; cualquier referencia residual debe ser considerada deuda técnica o riesgo, no requisito funcional.

Salida:
- Matriz rol × recurso × acción
- Vulnerabilidades por severidad
- RLS/RPC faltantes o débiles
- Cambios mínimos
- Tests de autorización
```

---

## 6. Auditoría de Command Center y readiness real

**Propósito:** impedir que el panel muestre tareas obsoletas, locks falsos o estados que no reflejan la realidad.

```
Audita el UGO Command Center/readiness contra el estado real del repo, CI, runtime y evidencia persistida.

Repo: sebastisnzoth/ugo-admin-panel

Tareas:
1. Lista todos los READINESS_ID vigentes.
2. Para cada uno compara:
   - estado mostrado
   - main actual
   - PR/commit relacionado
   - CI same-SHA
   - evidencia runtime
   - lock/lease
3. Detecta STALE_LOCK, tareas duplicadas, bloques ya resueltos y controles sin evidencia.
4. Retira del camino crítico cualquier control de Hugo/orbe/voz que siga figurando como requisito de lanzamiento; debe quedar DEFERRED/OUT_OF_SCOPE mientras esa decisión siga vigente.
5. Ordena pendientes por dependencias reales.
6. Separa:
   - delegable autónomamente
   - requiere TEST runtime
   - requiere dispositivo/persona
   - requiere autorización de producción
7. No permitas que un paso marcado DONE dependa de evidencia de otro SHA.

Salida:
- Lista autoritativa de pendientes
- Tareas obsoletas a retirar/diferir
- Orden ejecutable
- Bloqueos humanos reales
- Próximo camino crítico
```

---

## 7. Auditoría de tests, CI y evidencia same-SHA

**Propósito:** asegurar que los verdes sean útiles y que no oculten fallos de runtime.

```
Audita tests y GitHub Actions de UGO.

Repo: sebastisnzoth/ugo-admin-panel

Tareas:
1. Inventaría scripts test, test:p0, integration, contract, e2e, build y typecheck.
2. Mapea qué flujo real cubre cada suite.
3. Detecta tests que sólo verifican strings/archivos pero no comportamiento.
4. Detecta tests heredados de Hugo/orbe que ya no deberían bloquear el producto activo.
5. Revisa workflows de .github/workflows:
   - triggers
   - jobs
   - secretos
   - redundancias
   - concurrencia
   - cancelaciones
6. Verifica que toda evidencia usada para READY/VERIFIED corresponda al SHA exacto.
7. Propón una pirámide mínima:
   - contract rápido
   - integration
   - P0 lifecycle
   - runtime TEST
8. Señala qué fallos deben bloquear merge y cuáles sólo generar warning.

Salida:
- Matriz test → riesgo cubierto
- Workflows redundantes
- Huecos de cobertura
- Política same-SHA
- Consolidación propuesta
```

---

## 8. Roadmap de cierre hasta primer cliente real

**Propósito:** transformar la auditoría en una secuencia ejecutable y no en un refactor infinito.

```
Construye un roadmap de cierre de UGO hacia el primer cliente real.

Repo: sebastisnzoth/ugo-admin-panel
Piloto: Faxina + Marido de Aluguel
Restricción: no abrir frentes nuevos que no bloqueen el lifecycle real.

Prioridad funcional:
1. matching correcto
2. alerta inmediata al proveedor
3. GPS válido
4. aceptación y estados en tiempo real
5. llegada/geofence
6. evidencias
7. trabajo
8. pago y deuda UGO
9. ratings
10. Admin/Command Center coherente
11. regresión end-to-end
12. pruebas humanas finales

Tareas:
1. Reconstruye el estado desde main y evidencia actual.
2. Clasifica cada trabajo como P0, P1 o DEFERRED.
3. Hugo/orbe/voz debe quedar DEFERRED y fuera del launch gate mientras no se reactive explícitamente.
4. Para cada P0 define:
   - causa
   - cambio
   - dependencia
   - prueba
   - evidencia para DONE
5. No uses estimaciones de calendario como sustituto de evidencia.
6. Define el orden exacto de ejecución autónoma hasta que sólo resten pruebas humanas/físicas.
7. Incluye rollback y riesgo para cada cambio de alto impacto.

Salida:
- Roadmap ordenado
- Dependencias
- Definición de DONE por control
- Qué puede resolver ChatGPT autónomamente
- Qué necesita Sergio
- Gate final para primer cliente real
```

---

## Cómo usarlos

- **Incidente de proveedor sin alerta:** ejecutar #3 y luego #1.
- **GPS inválido / llegada bloqueada:** ejecutar #2 y luego #1.
- **Pago trabado:** ejecutar #4 y luego #1.
- **Command Center desordenado:** ejecutar #6.
- **Seguridad / permisos:** ejecutar #5.
- **CI dice verde pero runtime falla:** ejecutar #7.
- **Para cerrar UGO:** ejecutar #1 + #6 + #8.

## Regla de salida para cualquier auditoría

No usar "listo", "resuelto", "READY" o "VERIFIED" sin evidencia suficiente.

Usar siempre:
- **DONE**: implementación + wiring + prueba + evidencia persistida
- **UNVERIFIED**: existe implementación pero falta prueba válida
- **FAILED**: prueba válida demuestra fallo
- **BLOCKED_EXTERNAL**: dependencia externa inaccesible
- **BLOCKED_HUMAN**: requiere acción física, consentimiento o autorización humana

No mezclar evidencias de distintos SHAs.
