# UGO — Auditoría técnica de `main`

**Fecha:** 10/09/2026

## Objetivo

Establecer una línea base comprobable antes de integrar el rediseño de Google Stitch.

## Estado general

- `main` es la rama por defecto y sigue siendo la fuente de verdad.
- El proyecto usa React 19 + TypeScript + Vite 8.
- Dependencias principales detectadas: Supabase, TomTom Maps SDK, MapLibre GL y XLSX.
- El script de build es `tsc -b && vite build`.
- El commit actual de `main` tiene estado Vercel `success`.
- La aplicación entra por `src/main.tsx` y monta `MvpApp` dentro de un `ErrorBoundary`.
- `MvpApp` enruta por query string: `?app=client`, `?app=provider`, `?app=admin`; sin parámetro muestra `Launcher`.

## Supabase

- Existe cliente Supabase tipado en `src/lib/supabase.ts`.
- El proyecto oficial configurado es `https://trfsjuseqjxlhrxuvdsm.supabase.co`.
- La clave publicada es de tipo publishable, no una service-role secret.
- Persistencia de sesión y auto refresh están activados.
- `.env.example` separa secretos server-side de variables públicas.
- OpenAI y Mercado Pago están previstos para ejecutarse solo del lado servidor.

## Cliente — comprobado en código

Existe flujo real, no solo maquetas:

- autenticación por rol;
- onboarding;
- captura de ubicación;
- categorías;
- creación de servicios;
- búsqueda/dispatch de proveedor;
- seguimiento por estados;
- realtime de Supabase;
- perfil del cliente;
- Mercado Pago vía `/api/pagos/crear`;
- aprobación/cancelación por RPC;
- reseñas;
- historial de servicios;
- disputas;
- revisión de finalización;
- Hugo Voice integrado en el flujo.

El cliente ya tiene una base funcional importante. La prioridad no debe ser reescribirlo desde cero sino conservar la lógica y aplicar el rediseño Stitch encima.

## Proveedor — comprobado en código

Existe onboarding real con:

- autenticación/sesión;
- perfil profesional;
- categorías y subcategorías;
- experiencia y radio de trabajo;
- CPF y PIX;
- carga de foto;
- carga de documentos KYC en Supabase Storage;
- estados de verificación (`registrado`, `pendiente`, `verificado`, `rechazado`, `suspendido`);
- bloqueo operativo hasta aprobación.

También existe `ProviderApp` y componentes asociados al flujo operativo. Debe auditarse en profundidad en la Fase 2.

## Admin — comprobado en código

Existe `AdminGate` con:

- login por Supabase Auth;
- validación de rol `admin` o `superadmin`;
- recuperación de contraseña;
- rechazo de cuentas sin privilegios;
- entrada al panel mediante `AdminPhase2`.

En `src/mvp` existen además módulos Admin para usuarios, finanzas, validación de proveedores, reportes, servicios, configuración y centro de decisiones.

## Arquitectura detectada

- Frontend: React + TypeScript + Vite.
- Backend principal: Supabase.
- Auth: Supabase Auth.
- Base de datos: Supabase/PostgreSQL, con tipos generados en `database.types.ts`.
- Realtime: Supabase channels.
- Mapas/geolocalización: TomTom + MapLibre + navegador.
- Pagos: integración Mercado Pago prevista por endpoints serverless.
- Hosting/deploy web: Vercel.

## Riesgos / deuda detectada

1. El archivo `MvpApp.tsx` concentra selección de aplicaciones mediante query strings en vez de un router formal.
2. Hay una carpeta `src/mvp` muy grande con Cliente, Proveedor y Admin mezclados; esto sirve hoy pero aumenta el costo de mantenimiento.
3. Hay estilos históricos y experimentales coexistiendo. Antes del merge Stitch hay que evitar cargar CSS duplicado o contradictorio.
4. Las ramas `feat/client-ui-stitch` y `feat/client-web-stitch` están divergidas; no deben mezclarse automáticamente.
5. `feat/admin-stitch-ui` no contiene cambios propios frente a `main` en este momento.
6. El estado Vercel exitoso comprueba build/deploy, pero no sustituye pruebas funcionales completas de cada flujo.
7. El cliente Supabase está configurado explícitamente en código. Es funcional, pero conviene revisar más adelante si esa configuración debe centralizarse sin perder la protección contra variables legacy.

## Ramas Stitch revisadas

### `feat/client-ui-stitch`

- 40 commits adelante de `main`.
- 13 commits atrás.
- Incluye documentación Stitch, contratos UX, CSS Stitch y cambios reales de Cliente.
- Es la mejor candidata para continuar el rediseño móvil de Cliente.

### `feat/client-web-stitch`

- 38 commits adelante de `main`.
- 13 commits atrás.
- Añade además una variante `stitch-web.css` y documentación específica web.
- No se recomienda como rama principal para el objetivo inmediato de Cliente móvil.

### `feat/admin-stitch-ui`

- 0 commits adelante de `main`.
- 1 commit atrás.
- No aporta cambios nuevos respecto de `main` en este momento.

## Decisión recomendada

Usar **`feat/client-ui-stitch`** como rama base para el siguiente trabajo visual, pero **antes actualizarla respecto de `main` y revisar conflictos**. No borrar ninguna rama todavía.

## Estado del checklist Fase 0

- [x] Auditar el estado real de `main`.
- [x] Identificar tecnologías, estructura, rutas y dependencias actuales.
- [x] Verificar build actual a nivel CI/deploy Vercel.
- [x] Verificar configuración actual de Supabase.
- [~] Detectar código roto, incompleto, duplicado o experimental — primera pasada completada; falta prueba funcional profunda.
- [x] Inventariar funcionalidades ya implementadas — primera línea base creada.
- [~] Inventariar funcionalidades parciales — requiere recorrido funcional de Cliente/Proveedor/Admin.
- [~] Inventariar funcionalidades todavía no implementadas — se completará comparando cada flujo con el checklist.
- [x] Definir rama candidata de integración del nuevo diseño: `feat/client-ui-stitch`.
- [x] Mantener `main` estable hasta validar la nueva versión.

## Próximo paso

Actualizar `feat/client-ui-stitch` con la línea base actual de `main`, resolver divergencias de forma controlada y auditar el flujo Cliente pantalla por pantalla antes de tocar su diseño.
