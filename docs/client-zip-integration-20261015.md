# UGO Cliente — integración del ZIP visual (15 oct 2026)

## Fuente entregada
`client-app-uxui-design (1)(1).zip`: prototipo Next 16, React 19, `src/components/ugo-client.tsx` (28 KB) y `src/app/globals.css` (37 KB). El prototipo incluye categorías, proveedores, avatar/nombre, precios, tiempos, mensajes, transacciones e historial **simulados**. El repositorio real UGO usa React 19, TypeScript, Vite y contratos Supabase. No se reemplazó el backend con Drizzle/PostgreSQL del prototipo.

## Integración efectiva en esta rama
1. `src/features/client/ui/ClientZipShell.tsx`: barra lateral, marca, navegación, topbar, tarjeta hero, tarjeta de usuario y navegación móvil adaptadas del ZIP; obtiene nombre y correo de `useRoleSession('client')`.
2. `src/features/client/ui/clientZipDesign.css`: tokens visuales del ZIP (verde `#0c7c61`, canvas `#f4f7f5`, coral `#fa6b52`); sidebar de 258px, topbar de 92px, hero de dos columnas y categorías tipo card. Sin reset global; estilos aislados a `.ugo-client-root`.
3. `src/features/client/ClientRoot.tsx`: incorpora shell visual pero mantiene `ClientFlowActionsBridge`, `ClientHomeScreen`, `ClientNeedScreen`, `ClientHistoryOverlay`, `ClientProfilePanel`, `ClientGlobalSurfaces`, `ClientOperationalSurfaces`, `ClientOrderDetailBoundary` y bridge de pagos demo únicamente cuando `demo` ya venía activado.
4. Solicitar: `flow.navigate('request')`; Explorar: desplaza categorías reales; GPS: ejecuta la adquisición real de Home; notificaciones: abre centro original; Actividad: historial real; Pagos: sección original de medios de pago en Perfil; Perfil: edición persistida. No se envían solicitudes de dinero ni se inventa una reserva.
5. Abre menú global UGO original (event `ugo:client-menu-open`) para conservar Hugo, soporte, direcciones y otras acciones sin inventar nuevas operaciones.
6. Incluye flujo de registro Cliente profile-first ya preparado en PR #455: no bloquea al cliente en una pantalla de formulario tras el registro, y los datos obligatorios se completan en Perfil a través del RPC existente, con consentimiento real.
7. Usa únicamente la fotografía de portada del ZIP como ilustración de diseño; **no** representa un profesional identificado, verificado o disponible.

## Contratos, verificaciones y evidencias
- `tests/contracts/client-zip-connected-design.test.mjs` inspecciona que el layout sea el Cliente real y no use nombres ni precios de prueba del ZIP.
- `tests/contracts/client-shell-ux-dedup.test.mjs` y `client-style-boundary.test.mjs` se actualizaron para verificar la nueva envoltura en lugar del header sustituido, manteniendo el viejo menú real.
- [UGO Core CI](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/38818242479): SUCCESS, TypeScript/build/contratos/lint.
- [UGO Cross-role UI Runtime TEST](https://github.com/sebastisnzoth/ugo-admin-panel/actions/runs/38818242442): SUCCESS, con capturas en el artefacto `role-ui-runtime-f12935e9c3dad73a1d44435815974188f6544e49`.
- Pruebas UGO Cross Security y Hugo Timeout SUCCESS para el mismo SHA.

## Limitaciones y próximas pruebas
- La estructura, Home y tratamiento visual de solicitud/actividad/perfil siguen el ZIP, pero **paridad visual pixel a pixel** de todas las subpantallas no está certificada todavía. Comparar capturas reales contra el prototipo en escritorio y móvil.
- Explore no inventa listado de 148 profesionales: reutiliza categorías y profesionales online reales. Servicio activo se abre desde la lista real de órdenes de Home o Actividad, no una pantalla mock con ETA ficticia.
- La sección de Pagos usa el flujo persistido de UGO en Perfil, no transacciones estáticas del ZIP.
- Verificar que el contenido de perfiles de cliente nuevos no sobreponga menús y que GPS, imágenes, permisos y autorizaciones reales funcionen en un dispositivo físico.
- Reconciliar PR #455 antes de fusionar para no duplicar commits de registro Cliente; Proveedor no fue modificado en este PR.
- No modificar `main` ni Supabase PROD; ninguna ruta administrativa, aprobación KYC ni saldo financiero cambió por esta rama.
