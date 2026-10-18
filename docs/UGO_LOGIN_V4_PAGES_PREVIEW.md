# PR #516 — vista previa aislada de Login V4 en GitHub Pages

## Propósito
Preparar una vista previa navegable del PR #516 en `/ugo-admin-panel/preview/pr-516/?app=client`, sin sustituir la aplicación actual `/app/` ni la demostración `/demo/`.

## Implementación preparada (NO PUBLICADA)
En `.github/workflows/github-pages.yml` se incorpora un build opcional del commit **0a8aceba9c28ec748788e47a667d4702c5d9dd97**, con un checkout independiente (git worktree) y Vite base `/ugo-admin-panel/preview/pr-516/`. La salida se copia únicamente a `_site/preview/pr-516/`. No se edita el PR #516 ni se fusiona.

El workflow de Pages de este proyecto se ejecuta desde `main`: los cambios de esta rama NO publican la preview por sí mismos. Después de la revisión del PR de infraestructura, si se autoriza su fusión, verificar la corrida exacta de Pages, el artefacto, la revisión desplegada y la ruta pública antes de declarar la preview accesible.

## URLs previstas (no afirmarlas accesibles hasta comprobar)
- Cliente: `https://sebastisnzoth.github.io/ugo-admin-panel/preview/pr-516/?app=client`
- Proveedor: `https://sebastisnzoth.github.io/ugo-admin-panel/preview/pr-516/?app=provider`
- Admin: `https://sebastisnzoth.github.io/ugo-admin-panel/preview/pr-516/?app=admin`
- Super Admin: `https://sebastisnzoth.github.io/ugo-admin-panel/preview/pr-516/?app=admin&section=superadmin` (verificar el routing real).

## Seguridad, pruebas y limitaciones
- No usar Netlify o Vercel para el preview. El endpoint `VITE_HUGO_EDGE_URL` sigue apuntando a la función existente de Supabase, igual que el Pages canónico.
- **El preview es una aplicación auténtica:** el frontend sigue hablando con Supabase; usar solamente cuentas de prueba, nunca credenciales sensibles de producción sin comprobar el entorno.
- La configuración de build utiliza el entorno de prueba declarado por el repositorio; verificar de modo independiente que apunta al proyecto TEST antes de permitir interacciones reales.
- Las fotografías del diseño V4 usan URLs de Pexels de terceros; registrar su disponibilidad/licencia y evitar depender de ellas si se requiere autonomía offline.
- El step opcional tiene `continue-on-error: true` para no degradar la publicación canónica; un éxito del workflow global NO basta para acreditar el step de preview.
- Comprobar UI 320/360/390/430/768/1024/1440px, teclado, foco, idioma, errores y roles. Sin capturas/browser ni prueba OAuth, registrar como UNVERIFIED.
- Para rollback, revertir exclusivamente el PR de infraestructura; no tocar la implementación de login ni forzar refs.

## Estado
- Workflow preparado en rama: **PENDING REVIEW**.
- PR #516: **SEPARADO**, no fusionado.
- Preview de Pages: **NOT PUBLISHED**.
