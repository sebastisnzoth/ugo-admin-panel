# UGO — Checklist Maestro · Stitch → Producción

**Inicio:** 10/09/2026  
**Objetivo:** llevar UGO a una versión funcional, profesional y consistente, usando Google Stitch como referencia visual y GitHub como fuente de verdad, trabajando online y priorizando herramientas gratuitas.

## Reglas del proyecto

- [x] GitHub es la fuente de verdad del código.
- [x] Trabajar online; evitar depender de la Mac para desarrollo.
- [x] Priorizar costo **R$ 0**. Si una herramienta exige pago, frenar y evaluar alternativa gratuita.
- [x] No romper `main`: todo rediseño o cambio importante se trabaja primero en una rama.
- [x] Diseño objetivo: interfaz profesional, consistente y basada en Google Stitch.
- [x] Vercel se usa para preview/deploy web.
- [x] StackBlitz se usa como entorno online cuando haga falta editar/probar manualmente.
- [x] Avanzar por etapas: terminar y validar una antes de abrir la siguiente.

---

## FASE 0 — Orden y seguridad

- [ ] Auditar el estado real de `main`.
- [ ] Identificar tecnologías, estructura, rutas y dependencias actuales.
- [ ] Verificar build actual.
- [ ] Verificar conexión actual con Supabase.
- [ ] Detectar código roto, incompleto, duplicado o experimental.
- [ ] Inventariar funcionalidades ya implementadas.
- [ ] Inventariar funcionalidades parciales.
- [ ] Inventariar funcionalidades todavía no implementadas.
- [ ] Definir rama de integración del nuevo diseño (ej. `stitch-ui`).
- [ ] Mantener `main` estable hasta validar la nueva versión.

**Resultado esperado:** mapa técnico real del proyecto y backlog sin adivinanzas.

---

## FASE 1 — UGO Cliente

- [ ] Confirmar flujo completo del Cliente.
- [ ] Login / registro / recuperación de acceso.
- [ ] Home · Radar / mapa.
- [ ] Ubicación del cliente.
- [ ] Búsqueda de servicio.
- [ ] Categorías de servicios.
- [ ] Selección de proveedor.
- [ ] Perfil y reputación del proveedor.
- [ ] Solicitud / contratación del servicio.
- [ ] Seguimiento del servicio.
- [ ] Comunicación cliente ↔ proveedor.
- [ ] Pago.
- [ ] Finalización del servicio.
- [ ] Calificación / reseña.
- [ ] Historial / actividad.
- [ ] Perfil y configuración.
- [ ] Incorporar **Agregar trabajo / Ampliar servicio** dentro del servicio activo.
- [ ] Aplicar el diseño aprobado de Stitch a todas las pantallas.
- [ ] Responsive/mobile y estados loading, vacío, error y éxito.
- [ ] Validar navegación completa de punta a punta.

**Criterio de cierre:** el flujo principal del Cliente puede recorrerse completo con una interfaz consistente y profesional.

---

## FASE 2 — UGO Proveedor

- [ ] Login / registro / onboarding.
- [ ] Perfil profesional y documentación.
- [ ] Home · Demanda / Oportunidades.
- [ ] Radar/mapa de trabajos cercanos.
- [ ] Recepción y evaluación de solicitudes.
- [ ] Cotización / aceptación.
- [ ] Agenda y disponibilidad.
- [ ] Navegación al servicio.
- [ ] Inicio / ejecución / finalización del trabajo.
- [ ] Evidencias y trazabilidad.
- [ ] Cobros / ganancias.
- [ ] Calificaciones.
- [ ] Historial.
- [ ] **Agregar trabajo / Ampliar servicio** con aprobación del cliente, ajuste de tiempo y costo y trazabilidad.
- [ ] Incorporar **Asistente de Trabajo UGO (IA)** antes, durante y después del servicio: checklist, recomendaciones, apoyo técnico y cierre.
- [ ] Aplicar diseño Stitch consistente con Cliente.
- [ ] Validar flujo completo de punta a punta.

**Criterio de cierre:** un proveedor puede descubrir, aceptar, ejecutar, ampliar y cerrar un servicio completo.

---

## FASE 3 — Admin Panel

- [ ] Dashboard operativo.
- [ ] Gestión de clientes.
- [ ] Gestión de proveedores.
- [ ] Validación de proveedores/documentación.
- [ ] Servicios y categorías.
- [ ] Operaciones / servicios activos.
- [ ] Pagos, comisiones y conciliación.
- [ ] Reclamos, incidencias y soporte.
- [ ] Moderación / reputación.
- [ ] Notificaciones.
- [ ] Configuración operativa.
- [ ] Roles y permisos del equipo Admin.
- [ ] Aplicar lenguaje visual profesional alineado con Stitch.
- [ ] Incorporar **Scout** como guía de acción: oportunidades, tendencias, brechas de proveedores, campañas, conversiones y alertas accionables.

**Criterio de cierre:** el equipo operativo puede administrar UGO sin tocar directamente la base de datos.

---

## FASE 4 — Super Admin

- [ ] Acceso separado y protegido.
- [ ] Gestión global de administradores y permisos.
- [ ] Configuración global de la plataforma.
- [ ] Reglas de negocio y comisiones.
- [ ] Métricas globales.
- [ ] Seguridad y auditoría.
- [ ] Integraciones y configuración técnica sensible.
- [ ] Control de funciones/feature flags.
- [ ] Supervisión de Scout y datos estratégicos.

**Criterio de cierre:** existe una capa de control superior diferenciada del Admin operativo.

---

## FASE 5 — Backend, datos e integraciones

- [ ] Revisar modelo de datos Supabase.
- [ ] Autenticación y sesiones.
- [ ] Roles Cliente / Proveedor / Admin / Super Admin.
- [ ] Row Level Security y permisos.
- [ ] Servicios y estados del workflow.
- [ ] Geolocalización.
- [ ] Mensajería/notificaciones.
- [ ] Pagos (Mercado Pago según alcance definido).
- [ ] Ratings y reputación.
- [ ] Historial y trazabilidad.
- [ ] Ampliaciones de servicio.
- [ ] Logs y auditoría.
- [ ] IA/Scout/Asistente de Trabajo con límites y control de costos.

---

## FASE 6 — Calidad y salida

- [ ] Pruebas de navegación Cliente.
- [ ] Pruebas de navegación Proveedor.
- [ ] Pruebas Admin/Super Admin.
- [ ] Pruebas de permisos y seguridad.
- [ ] Pruebas responsive.
- [ ] Corregir errores de consola y build.
- [ ] Revisar accesibilidad y áreas táctiles.
- [ ] Revisar rendimiento.
- [ ] Preview final en Vercel.
- [ ] QA visual contra Stitch.
- [ ] Checklist de lanzamiento.
- [ ] Merge controlado a `main` únicamente después de aprobar QA.

---

## Orden de ejecución acordado

1. **Auditoría real de `main`.**
2. **Crear/confirmar rama de trabajo Stitch.**
3. **Cerrar UGO Cliente.**
4. **Cerrar UGO Proveedor.**
5. **Cerrar Admin.**
6. **Cerrar Super Admin.**
7. **Integraciones/backend pendientes.**
8. **QA, Vercel y merge final.**

## Seguimiento

Cada ítem se marca únicamente cuando esté **comprobado**, no porque esté diseñado o planificado.

Estados recomendados:

- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Terminado y comprobado
- `[!]` Bloqueado

> **Principio de ejecución:** una tarea, un resultado comprobable, un commit. No avanzar a la siguiente fase dejando errores críticos atrás.
