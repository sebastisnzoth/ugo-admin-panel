# UGO Login V3 — responsive premium (2026-10-18)

## Alcance
- Cliente: estilo esmeralda/cian, formulario claro, continuidad de autenticación Supabase y selector de idioma.
- Proveedor: mismo sistema visual, acento verde, conserva registro/login/Google/recovery.
- Admin: presentación azul, credenciales y recuperación existentes; sin nuevos permisos.
- Super Admin: presentación violeta, misma verificación de rol/estado activo existente.
- Cambio exclusivamente de **presentación**; no modifica claves, tablas, RLS, navegación protegida ni sesiones.

## Implementación
- `src/mvp/ugo-login-v3.css`: capa visual responsive, importada después del CSS histórico.
- `src/mvp/AdminGate.tsx`: shell visual para el acceso administrativo; autorización y submit sin cambios.
- Mobile-first: 320/360/390/430px; tablet 768px; desktop 1024/1440px; landscape compacto.
- Campos de al menos 16px, objetivos táctiles >=44px, safe areas, foco visible y reducción de animación.
- El mockup aprobado es dirección visual, no fuente de estadísticas reales. No se agregan KPIs ficticios ni dependencias externas.

## Verificación requerida antes de merge/publicación
1. `npm ci && npm run build && npm test && npm run lint` en el SHA del PR.
2. Pruebas visuales browser a 320, 360, 390, 430, 768, 1024 y 1440px; tablet y landscape.
3. Login incorrecto, correcto, cierre sesión, recuperación y selector de idioma en los 4 roles.
4. Google login y registro sólo donde están realmente habilitados.
5. Verificar roles Admin/Super Admin y denegación cruzada; recuperación no eleva privilegios.
6. Sin scroll horizontal; navegación teclado, autocompletado, contraste y viewport con teclado abierto.
7. Smoke posterior en GitHub Pages únicamente después de aprobar CI y flujo real.

## Estado y evidencias
- Código y documentación: propuestos en rama de revisión.
- Build/tests y runtime: **UNVERIFIED** hasta resultados del mismo SHA.
- Producción / GitHub Pages: **sin cambios**, pendiente de aprobación basada en evidencia.


## V4 — Diseño aprobado desde ZIP (18 octubre 2026)
Fuente visual: `create-html-web-pages.zip` (referencia adjunta por el usuario).
La referencia contiene un prototipo de login simulado, valores estadísticos de demostración e imágenes alojadas en Pexels. **No se importó el sistema de login simulado, los datos de prueba, ni una app React paralela.**

Implementación incremental:
- `src/mvp/ugo-login-v3.css`: adaptación fotográfica de los cuatro accesos, tratamiento con gradiente oscuro y panel de formulario blanco; mantiene los componentes y callbacks reales.
- Cliente: fotografía ref. Pexels 18162024, tonos esmeralda.
- Proveedor: fotografía ref. Pexels 40248590, tonos teal/verde.
- Admin: fotografía ref. Pexels 5831259, tonos azul.
- Super Admin: fotografía ref. Pexels 30547584, tonos violeta.
- Las fotografías se cargan desde un tercero, sin credenciales ni API privada; pueden no estar disponibles offline. Revisar licencias y política de contenidos/remotos antes de la publicación definitiva. El formulario permanece legible sobre fondo blanco y el overlay oscuro mantiene contraste.
- Layout de dos paneles desktop y apilado en móvil con hero reducido, safe-area, focus visible, soporte de landscape corto y reduced motion.
- Los textos de Admin/Super Admin siguen utilizando el i18n ya existente; los textos publicitarios de la referencia no se copiaron literalmente.

## Estado de verificación V4
- Implementación CSS en PR #516: **IMPLEMENTED_IN_BRANCH** (no es `main`).
- La validación CI anterior correspondía a `cf46e147`, no sirve como evidencia de la revisión V4.
- Nuevo SHA V4: registrar el último SHA del PR en cada resultado de GitHub Actions.
- Pruebas humanas de OAuth, permisos reales y screenshots sobre dispositivos: **UNVERIFIED/BLOCKED_HUMAN** hasta su ejecución.
- GitHub Pages: NO publicar sobre /app/ ni /demo/ sin validación y autorización; preview pública aislada todavía pendiente.
- Netlify y Vercel: fuera del alcance por decisión de producto.

## Reversión
Quitar exclusivamente la capa V4 añadida al final de `ugo-login-v3.css` para restaurar el aspecto V3; no revertir ni modificar las funciones de autenticación.
