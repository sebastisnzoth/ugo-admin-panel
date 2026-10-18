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
