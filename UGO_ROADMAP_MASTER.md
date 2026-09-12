# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Principio:** los MD maestros son la fuente de verdad; Skills definen cómo trabajar; MCPs proporcionan herramientas; HUGO ejecuta, verifica y documenta.

## Objetivo de producto
Cerrar un ecosistema operativo Cliente + Proveedor + Admin/Super Admin con lifecycle único, pagos trazables, evidencia temporal correcta, ampliaciones dentro de plataforma, realtime, UX consistente y release reproducible.

## Contrato transversal vigente
`borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado`

Excepciones: `cancelado`, `disputado`.

- Un único `serviceId` durante todo el journey.
- `asignado → en_camino`: pago electrónico protegido/verificable o efectivo explícitamente seleccionado.
- Llegada: backend autoridad cuando aplica ubicación exacta; radio operativo vigente 200 m.
- Evidencia `Antes` en `llegado`; `Durante/Después` en `en_progreso`.
- Ampliación: descripción + costo + tiempo + aprobación + trazabilidad; delta electrónico no financiado no habilita alcance extra.
- Efectivo permanece auditable dentro de UGO.

## Estado por bloques

### 1. Cliente · journey principal — avanzado
- Home / Radar / Mapa / Categorías / Búsqueda migrados al design system.
- Flujo de creación, dispatch, seguimiento, pagos, aprobación, reseñas, historial y disputas existente.
- Próximo cierre: QA cruzado con Proveedor y backend en transiciones compartidas.

### 2. Proveedor · Home / Demanda / Oportunidades — CERRADO
Implementado y verificado:
- Home operativo con disponibilidad, trabajo activo, oportunidades, demanda e ingresos.
- Oportunidades reales desde backend, detalle, aceptar/rechazar y priorización por urgencia/compatibilidad/valor/cercanía.
- Demanda real consumida desde `obtener_demanda_proveedor`, preservando `zona_lat/zona_lng` como zonas geográficas agregadas del mercado.
- Radar geográfico con MapLibre + OpenStreetMap, reutilizando la base cartográfica existente y sin posiciones visuales inventadas.
- Fallback honesto cuando una zona no publica coordenadas; estados vacío/error/Offline accionables y actualización manual disponible.
- Demanda con actualización automática mientras el proveedor está Online: fallback cada 45 s más refresh al recuperar foco/visibilidad.
- Oportunidades, servicios y pagos sincronizados por Supabase Realtime sobre tablas efectivamente publicadas.
- Aceptación de oportunidad verificada como server-authoritative y atómica mediante `aceptar_oferta`; una oferta ya tomada deja de ser aceptable sin asignaciones paralelas.
- Navegación a oportunidades coherente y targets principales del journey de mercado ≥48 px.
- Contratos de regresión agregados en `tests/contracts/provider-market.test.mjs`.
- GitHub CI del bloque verde: TypeScript/build, lifecycle + provider market tests y lint crítico.
- Hugo · Asistente de Trabajo contextual integrado al servicio activo.
- Contrato de pago protegido/efectivo antes de `en_camino`.
- Evidencia Antes/Después y cierre de efectivo.

### 3. Proveedor · ejecución del servicio — EN CURSO
- `asignado → en_camino → llegado → en_progreso → esperando_aprobacion` implementado.
- Evidencia y pago efectivo integrados.
- `Agregar trabajo / Ampliar servicio` presente en trabajo en progreso.
- Pendiente inmediato: QA contractual Cliente ↔ Proveedor ↔ backend sobre transiciones compartidas, gates de pago, evidencia temporal, ampliaciones, recuperación de errores/reintentos y estados de excepción.

### 4. Admin / Super Admin — avanzado
- Configuración de sistema y credenciales.
- Medios de pago: efectivo global + Brasil/BRL + Argentina/ARS.
- Operaciones/estados, usuarios, finanzas, validación, reportes y decisiones existentes.
- Pendiente: auditoría final de permisos, controles operativos y journeys de excepción.

### 5. Backend / Supabase — avanzado
- Auth, PostgreSQL, RPCs, realtime y pagos en operación.
- Pendiente: auditoría final RLS/security advisors, contratos RPC críticos y consistencia con masters.

### 6. QA / Release — EN CURSO
- GitHub CI: TypeScript, build, tests y lint crítico.
- Vercel producción con arquitectura ajustada al límite operativo actual de 12 Node functions.
- Política de cuota/deploy definida en `DEPLOY.md`.
- Pendiente: smoke tests por journey y automatización de regresiones UI donde sea viable.

## Política de ejecución del Roadmap
HUGO toma el primer bloque `EN CURSO` con dependencia satisfecha y ejecuta:
`auditar → implementar → validar → corregir → sincronizar maestros → release controlado → siguiente bloque`.

No avanzar una pantalla sólo por estética si su contrato de datos/estado no está resuelto. No declarar bloque cerrado con CI pendiente, datos mock no autorizados o producción sin verificar cuando el alcance exige release.

## Próximo checkpoint
**Proveedor · ejecución del servicio — QA contractual Cliente ↔ Proveedor ↔ backend.**

Criterio de cierre:
- transiciones compartidas alineadas con el lifecycle maestro;
- `asignado → en_camino` bloqueado sin pago protegido o efectivo explícito;
- llegada y evidencia respetan autoridad y timing definidos;
- ampliaciones mantienen descripción + costo + tiempo + aprobación + trazabilidad, sin alcance electrónico no financiado;
- errores, reintentos, realtime y estados de excepción recuperan sin corromper el `serviceId`;
- TypeScript/build/tests/lint aplicables verdes;
- documentación sincronizada antes de avanzar al siguiente bloque.
