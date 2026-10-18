# Login V4 — reparación del scroll responsive (2026-10-18)

## Incidencia
Reporte de usuario: en modo celular, los cuatro accesos no permiten desplazarse verticalmente. Causa probable en CSS: múltiples capas con overflow restringido, viewport-height forzado y layout especial para landscape.

## Corrección
- `src/mvp/ugo-login-v3.css`: al ancho <=820px, desbloquear scroll natural del documento solo en rutas que contienen `.mvp-auth-page`, evitar contenedores anidados con `overflow:hidden`, restaurar alturas automáticas y usar `touch-action:pan-y`.
- Formulario Cliente, Proveedor, Admin y Super Admin con contenido expandible; espacio de safe-area al final.
- Pantallas horizontales de poca altura: evitar grilla rígida y preservar desplazamiento.
- `tests/contracts/ugo-login-v4-mobile-scroll.test.mjs`: contratos estáticos de prevención de regresiones.
- No cambia login/OAuth/Supabase/RLS. No modifica Home ni pantallas posautenticación.

## Validación
- CI/Core, Cross Security, Cross-role y Hugo Timeout: pendiente de resultado en SHA exacto del PR #519.
- Verificación visual manual móvil a 320, 360, 390, 430, 768px y landscape, con teclado abierto: PENDIENTE; una comprobación de patrones CSS no acredita funcionamiento real.
- Fusión / GitHub Pages: prohibida hasta que se comprueben los gates aplicables y no existan bloqueos.

## Rollback
Revertir solamente el commit CSS de PR #519 sin forzar ramas ni tocar el contrato de autenticación.
