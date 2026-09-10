# UGO — Plan de sincronización Stitch

Fecha: 10/09/2026

## Rama de trabajo

`feat/client-ui-stitch-sync`

Creada desde el `main` actual para integrar Stitch sin modificar directamente producción.

## Comparación realizada

- `feat/admin-stitch-ui`: 0 commits adelante de `main`; no aporta trabajo nuevo hoy.
- `feat/client-ui-stitch`: 40 commits adelante y 13 detrás de `main`; contiene el trabajo principal de UGO Cliente + Stitch.
- `feat/client-web-stitch`: 38 commits adelante y 13 detrás de `main`; variante web adicional.
- `feat/client-ui-stitch` y `feat/client-web-stitch` divergieron entre sí, por lo que no deben mezclarse automáticamente.

## Decisión

Usar `feat/client-ui-stitch` como fuente visual/UX de Cliente, pero NO fusionarla completa sobre `main`.

La integración se hará selectivamente sobre esta rama limpia, preservando la lógica más nueva de `main`.

## Conservar de `main`

- Autenticación y sesiones.
- Onboarding Cliente.
- Onboarding Proveedor.
- AdminGate y control de roles.
- Integración Supabase.
- Flujo de servicios y estados actuales.
- Dispatch/matching actual.
- Mercado Pago y endpoints actuales.
- Realtime y trazabilidad existente.

## Tomar de `feat/client-ui-stitch`

Prioridad de integración:

1. Design tokens y reglas visuales de `design/stitch/client/`.
2. Estilos `stitch-client.css` y `stitch-client-v2.css`, revisados antes de importarlos.
3. Estructura UX del flujo Cliente.
4. Mejoras de navegación y estados visuales Cliente.
5. Componentes de Cliente únicamente cuando no reemplacen lógica más nueva de `main`.

## No copiar automáticamente

- Cambios de Proveedor incluidos accidentalmente en la rama Cliente.
- Código que reemplace Supabase, pagos, dispatch o autenticación de `main`.
- `DemoSebastianPaymentBridge` activado permanentemente en producción.
- Cambios globales de CSS sin revisar regresiones.
- Cambios de `MvpApp.tsx` sin validar Cliente/Proveedor/Admin.

## Regla de integración

Una tarea → una prueba → un commit.

Orden inmediato:

1. Portar design tokens/documentación Stitch.
2. Integrar Home/Radar Cliente.
3. Integrar búsqueda y solicitud.
4. Integrar matching/profesional encontrado.
5. Integrar servicio activo y ampliación de trabajo.
6. Integrar cierre, pago, reseña, actividad y perfil.
7. QA completo antes de cualquier merge a `main`.
