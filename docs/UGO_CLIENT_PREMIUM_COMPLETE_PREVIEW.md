# UGO Cliente — Experiencia Premium completa (previsualización)
Fecha: 2026-10-18

## Alcance / baseline
Implementación incremental sobre `src/features/client/home/ClientHomeScreen.tsx` y `clientStyles.ts`. Se conservaron los flujos Supabase existentes: geolocalización, radar de proveedores online, seguimiento de servicios, solicitud, historial, perfil, notificaciones y permisos. **No se usaron profesionales, precios, calificaciones ni tiempos ficticios.**

## Cambios
- Home: jerarquía visual más ligera, buscador de categorías vinculado al catálogo real, CTA hacia flujo de solicitud.
- Categorías: cuadrícula compacta en móvil, buscador accesible y listado ampliable sin inventar resultados.
- Mapa: botón de expandir/reducir con mapa real MapLibre, marcadores del radar y seguimiento del pedido en curso.
- Profesionales: se mantiene la sección conectada a `providerRadarStore` y el detalle real de pedidos; no simular ni forzar rutas de perfil no existentes.
- Solicitud y seguimiento: conservar `flow.navigate('request')`, `ClientActiveMap`, `AssignedProviderCard` y `onOpenService`.
- Navegación móvil: Inicio, Servicios, Mapa, Actividad y Perfil. Desplazamiento natural y espacio para barra inferior.
- Internacionalización de nuevas etiquetas del buscador y mapa para pt-BR/es/en.

## Pruebas
`tests/contracts/ugo-client-premium-experience.test.mjs` protege contratos de conexión, no representa una prueba visual de navegador.
Ejecutar build, lint, tests, cross-role, cross accessibility, mobile responsive 320/360/390/430/768/1024/1440 y pantallas horizontal/teclado; verificar que no haya scroll horizontal ni ocultamiento bajo la barra.

## Preview
El PR **NO se fusiona ni modifica Pages producción**. Para una URL GitHub Pages aislada, hace falta habilitar publicación de una compilación fijada por SHA dentro del workflow `main` (como se hizo con PR #516), previa revisión de seguridad; hasta entonces no declarar URL pública. El código fuente revisable está en la rama.

## Puntos de control
- TEST del SHA exacto y screenshots: pendiente hasta que GitHub Actions / navegador los completen.
- Autenticación real, mapa con GPS y rutas sobre móvil real: BLOCKED_HUMAN.
- Despliegue /app/ de GitHub Pages: sin modificar.

## Rollback
Revertir únicamente los commits de este PR (estilos importados, buscador, nav y mapa expandido); no tocar tablas Supabase ni otros PRs.


## Referencia visual obligatoria (nueva aprobación)
Imagen aportada por el usuario en la conversación, con siete pantallas: 1) Home con foto hero y grilla 4x2; 2) catálogo en tarjetas pastel; 3) mapa con bottom sheet de profesionales reales; 4) perfil del profesional con foto, verificación y servicios; 5) solicitud en tres pasos; 6) resultados en lista; 7) pedido en curso con timeline, mapa y contacto. **Esta imagen reemplaza la preview HTML previa como criterio visual de aceptación.**

Se aplicó un refinamiento de tokens, paleta, tarjetas alternadas, mapa, CTA y tipografía en `clientPremiumExperience2026.css`. Queda pendiente adaptar/comprobar cada una de las pantallas existentes a la composición de la referencia. No afirmar que la app ya es idéntica; no inventar fotografías, precios, evaluaciones, ubicación, disponibilidad ni etapas.

**Bloqueador independiente detectado:** Cross-role UI Runtime TEST del SHA `05b901d` falla al esperar `.ugo-provider-root` durante 30 s. Investigar el arranque o permisos del Proveedor separadamente; no marcar la experiencia Cliente como validada por ese resultado.

**Gates pendientes:** resultados completos del nuevo SHA, evidencia de navegador móvil en 320/360/390/430, búsqueda/navegación accesible, solicitud real con dos cuentas de prueba y snapshot comparativo con la imagen de referencia. No fusionar ni publicar /app/ hasta revisión visual del usuario.
