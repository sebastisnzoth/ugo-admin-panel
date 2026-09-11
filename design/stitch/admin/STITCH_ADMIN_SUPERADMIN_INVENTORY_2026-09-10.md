# UGO Admin + Super Admin — Inventario Stitch

Fecha: 2026-09-10
Branch: `feat/admin-superadmin-stitch-sync`
Fuente visual primaria: `stitch_task_action_manager(1).zip`
Fuente anterior: `stitch_ugo_admin_platform_design.zip` (referencia secundaria)

## Regla de integración

Este export se conserva como referencia visual/UX. **No copiar `code.html` directamente a `src/`.** La implementación debe preservar la arquitectura real existente en `main`: React + TypeScript + Vite + Supabase/Auth/roles/realtime y el flujo de pagos existente.

No adoptar como decisiones de arquitectura claims o integraciones generadas por Stitch: escrow/custodia, BACEN directo, ISPB/mTLS bancario, AWS, Redis, WebSocket propio, biometría oficial, validaciones CREA/CFT automáticas, antecedentes automáticos, pólizas, infraestructura forense, telemetría satelital u otros servicios no confirmados.

## Auditoría física del ZIP

- HTML: 26
- PNG: 27
- Markdown: 8
- Total físico: 61 archivos
- Cobertura visual: aprovechable
- Diseño: aprovechable
- Handoff conceptual: aprovechable
- Saneamiento físico declarado por Stitch: **NO confirmado por auditoría UGO**
- Copia directa a producción: **NO**

La auditoría física UGO encontró todavía múltiples referencias no verificadas en HTML/documentación, incluyendo `escrow`, `BACEN`, `custodia`, `CFT`, `AWS`, `Redis`, `WebSocket`, `forensic/forense`, `biometría`, `antecedentes`, `póliza`, `telemetría` y `satelital`. Estas referencias deben neutralizarse durante la integración real.

## Clasificación funcional de las 26 vistas HTML

### ADMIN — referencia visual a integrar selectivamente

1. `command_center_misi_n_cr_tica` — Dashboard / Mission Control operativo.
2. `verificaci_n_de_proveedores_kyc` — Cola de validación de proveedores.
3. `detalle_de_pago_conciliaci_n_mercado_pago` — Detalle/conciliación de pagos; conservar Mercado Pago real y neutralizar claims adicionales.
4. `centro_de_disputas_mediaci_n` — Centro de disputas/mediación.
5. `hugo_admin_copiloto_de_inteligencia_operacional` — Hugo Admin; `REQUIRES AI INTEGRATION`, sin acciones sensibles automáticas.
6. `comunicaciones_notificaciones_masivas` — Comunicaciones/notificaciones operativas.
7. `acceso_administrativo_mfa` — Referencia de acceso administrativo; no imponer MFA si el Auth real no lo soporta todavía.
8. `operaciones_en_tiempo_real` — Operación/seguimiento; mapear a realtime real.
9. `scout_inteligencia_territorial_oportunidades` — Scout Operativo accionable.
10. `directorio_rendimiento_de_proveedores` — Directorio/rendimiento de proveedores.
11. `directorio_expediente_de_clientes` — Clientes y expediente.
12. `servicios_monitoreo_y_ciclo_de_vida_de_rdenes` — Servicios y ciclo de vida.
13. `finanzas_retiros_pix` — Finanzas/retiros; no adoptar BACEN/escrow propios.
14. `retiros_de_proveedores_liquidaci_n_pix` — Cola de liquidaciones/retiros.
15. `directorio_expediente_360_de_proveedores` — Detalle 360 de proveedor.
16. `zonas_categor_as_de_servicio` — Zonas/categorías.
17. `detalle_de_servicio_timeline` — Detalle/timeline/ampliaciones del servicio.

### SUPER ADMIN — referencia visual a integrar selectivamente

1. `roles_permisos_auditor_a_de_seguridad` — RBAC, administradores y auditoría.
2. `configuraci_n_general_par_metros_sensibles` — Configuración global; nunca exponer secretos en frontend.
3. `reportes_ejecutivos_m_tricas` — Métricas/Scout Estratégico; datos ficticios deben permanecer como demo hasta conexión real.
4. `dashboard_ejecutivo_centro_de_decisiones` — Command Center ejecutivo.
5. `logs_del_sistema_telemetr_a_de_infraestructura` — **ADOPTAR SOLO EL PATRÓN UI**; no adoptar AWS/Redis/WebSocket/telemetría inventada.
6. `ugo_admin_diagrama_maestro_de_arquitectura_operaciones` — **NO ADOPTAR COMO RUNTIME/ARQUITECTURA**; conservar únicamente como referencia conceptual si resulta útil.

### SHARED / ASSET

1. `ugo_admin_brand_logo` — Asset/branding.
2. Hugo Admin puede exponerse como drawer compartido Admin/Super Admin respetando permisos.
3. Shell/componentes comunes: navegación, tablas, filtros, badges, timelines, estados, confirmaciones.

> Nota: la clasificación funcional prima sobre cualquier etiqueta generada por Stitch. La vista de arquitectura no constituye arquitectura aprobada del producto.

## Gaps que deben comprobarse durante la implementación

### Admin

- Ayuda/soporte separado de mediación.
- Centro de notificaciones internas vs. comunicaciones masivas.
- Configuración operativa Admin.
- Reputación/moderación cuando no esté cubierta por proveedor/servicio.
- Estados loading/empty/error/permission/session-expired en módulos críticos.
- Navegación y acciones reales, no solo composición visual.

### Super Admin

- Lista/detalle explícito de administradores.
- Reglas de negocio y comisiones globales.
- Feature flags.
- Estado de integraciones.
- Seguridad/sesiones administrativas.
- Configuración global y auditoría conectadas a permisos reales.
- Scout Estratégico conectado a datos reales antes de presentar métricas como producción.

## Contrato Cliente ↔ Proveedor ↔ Admin

Admin no debe crear una máquina de estados paralela. Durante la integración, cada vista debe mapearse al flujo real compartido de servicio y a los eventos existentes. `Agregar trabajo / Ampliar servicio` permanece dentro del servicio original, con trazabilidad de descripción, costo/tiempo adicional, aprobación/rechazo y evidencias. El rechazo de la ampliación no cancela automáticamente el servicio base.

## Orden de integración recomendado

1. Tokens/design system + Admin shell.
2. Admin auth/gate visual sobre Auth/roles existentes.
3. Dashboard operativo.
4. Clientes.
5. Proveedores + validación.
6. Servicios + detalle + operaciones + ampliaciones.
7. Pagos/conciliación/retiros contra implementación real.
8. Disputas + soporte.
9. Categorías/reputación/notificaciones.
10. Scout Operativo + Hugo Admin.
11. Super Admin Command Center.
12. Administradores + RBAC.
13. Reglas de negocio/comisiones.
14. Feature flags/integraciones.
15. Auditoría/seguridad/configuración.
16. QA funcional, visual, responsive, permisos y Vercel preview.

## Gate

- `STITCH ADMIN VISUAL SOURCE ACCEPTED`: **YES**
- `STITCH SUPER ADMIN VISUAL SOURCE ACCEPTED`: **YES**
- `PHYSICAL EXPORT SANITIZED`: **NO**
- `DIRECT COPY TO src/`: **NO**
- `SELECTIVE UI/UX INTEGRATION`: **YES**
- `PRODUCTION IMPLEMENTATION COMPLETE`: **NO**

Siguiente hito del Checklist Maestro: continuar primero Cliente y Proveedor; este inventario deja Admin/Super Admin preparados y ordenados para las Fases 3 y 4 sin contaminar `main`.