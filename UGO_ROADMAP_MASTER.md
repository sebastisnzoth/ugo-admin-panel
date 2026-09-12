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

### 2. Proveedor · Home / Demanda / Oportunidades — EN CURSO
Ya implementado:
- Home operativo con disponibilidad, trabajo activo, oportunidades, demanda e ingresos.
- Oportunidades reales desde backend, detalle, aceptar/rechazar y priorización por urgencia/compatibilidad/valor/cercanía.
- Demanda real consumida desde `obtener_demanda_proveedor`.
- Hugo · Asistente de Trabajo contextual integrado al servicio activo.
- Contrato de pago protegido/efectivo antes de `en_camino`.
- Evidencia Antes/Después y cierre de efectivo.

Siguiente bloque obligatorio:
1. Hacer **Demanda verdaderamente geográfica y accionable**, preservando coordenadas reales `zona_lat/zona_lng` del backend en lugar de posiciones visuales esquemáticas.
2. Reutilizar infraestructura de mapas existente; no crear un mapa paralelo si Cliente ya resuelve TomTom/MapLibre.
3. Mantener estados loading/vacío/error y modo Offline comprensibles.
4. Verificar realtime Demanda → Oportunidades y aceptación atómica.
5. QA responsive, targets ≥48 px y continuidad visual con Cliente.

### 3. Proveedor · ejecución del servicio — avanzado / por cerrar
- `asignado → en_camino → llegado → en_progreso → esperando_aprobacion` implementado.
- Evidencia y pago efectivo integrados.
- `Agregar trabajo / Ampliar servicio` presente en trabajo en progreso.
- Pendiente: QA contractual completo Cliente ↔ Proveedor ↔ backend y recuperación de errores.

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
**Proveedor · Demanda geográfica real y accionable.**

Criterio de cierre:
- coordenadas reales preservadas desde RPC;
- visualización no inventa ubicación;
- fallback sin coordenadas honesto;
- navegación a oportunidades coherente;
- TypeScript/build/tests/lint aplicables verdes;
- documentación sincronizada;
- un único release del bloque cuando sea razonable.
