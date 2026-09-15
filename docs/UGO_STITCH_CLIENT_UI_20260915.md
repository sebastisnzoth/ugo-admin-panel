# UGO · Stitch Client UI integration · 15/09/2026

## Objetivo

Integrar la línea visual aprobada del ZIP de Google Stitch sin reemplazar la arquitectura real de UGO.

Principio aplicado:

> **Stitch = piel visual. UGO actual = lógica, Supabase, Hugo, matching, Realtime y lifecycle.**

Línea visual elegida: **dark map + Hugo Orb cyan**, mobile-first, con Hugo como objeto principal y navegación secundaria.

## IMPLEMENTED

Sobre `main`:

- Home Cliente reconstruida con mapa real MapLibre/OSM oscuro de Florianópolis.
- Hugo usa el **orbe funcional canónico existente**; no se creó un asistente paralelo.
- Voz y texto siguen entrando al mismo estado real de Hugo.
- categorías rápidas siguen leyendo el catálogo live; se curan cuatro familias visuales sin borrar catálogo backend.
- navegación visible: Inicio / Servicios / Actividad / Perfil.
- Radar de profesionales conserva `proveedores_mapa`, Realtime, ranking/ETA, disponibilidad real y selección real, con nueva piel dark-map.
- ficha del profesional y drawer usan el mismo sistema visual.
- pedido guiado/matching conserva creación real del servicio, retry y cancelación, con nueva piel visual.
- tracking Cliente conserva `ClientLiveTracking` y `ClientActiveMap`, con nueva piel visual cyan/dark.
- el alcance visual se limita por `screen-*` para no contaminar otras etapas del journey.

Archivos principales incorporados/modificados:

```text
src/mvp/client/ClientPremiumHome.tsx
src/mvp/client/client-premium-home.css
src/mvp/client/ClientRoot.tsx
src/mvp/client/client-stitch-orb-home.css
src/mvp/client/client-stitch-radar.css
src/mvp/client/client-stitch-tracking.css
src/mvp/client/client-stitch-request.css
```

También se actualizaron contratos UI obsoletos para reflejar la navegación y jerarquía visual aprobadas sin relajar los contratos funcionales.

## VALIDATED

Commit funcional candidato:

```text
eaba0f41159c71536dae95cb480afee486738bd3
style(client-ui): load Stitch guided request overrides
```

GitHub Actions:

```text
UGO Core CI #759
run: 34923985450
status: completed
conclusion: success
```

Pasaron:

- dependency security gate;
- TypeScript + production build;
- core lifecycle / market / contratos / isolated RPC-RLS disponibles;
- lint de superficies operativas críticas;
- lint Cliente bajo deuda legacy registrada;
- reporte completo de deuda lint.

Esto valida código/contratos. **No reemplaza prueba visual/física en celular.**

## RELEASED

Todavía NO.

Vercel para el SHA funcional devolvió:

```text
Deployment rate limited — retry in 24 hours.
```

El bloqueo es externo de cuota/build y no un fallo de compilación de UGO.

Netlify existe y está `ready`, pero su deploy actual corresponde al commit histórico:

```text
34becf93fad9763a4097f795d3e860e4c0ee694f
```

Por lo tanto, Netlify tampoco contiene todavía este nuevo bloque visual.

## NEXT

1. publicar el SHA funcional cuando haya canal de deploy disponible;
2. revisar Home → Hugo → Radar → Profesional → Request/Matching → Tracking en teléfono real;
3. medir teclado, safe-area, permisos, voz y mapa en Android/iOS reales;
4. convertir el formulario fallback del pedido en progressive disclosure real sin duplicar el estado canónico de Hugo;
5. después trasladar el mismo Design System al journey Proveedor.

## Regla

No tocar Supabase PROD para validar este rediseño. No considerar `RELEASED` ni `MEASURED` hasta tener evidencia del deploy y prueba física correspondiente.
