# UGO — Cuatro prioridades de due diligence: ejecución documental

**Fecha:** 2026-11-11  
**Estado:** hallazgos verificables + bloqueos explícitos. Sin auditoría legal certificada, sin cotizaciones externas y sin valoración empresarial aprobada.

## Prioridad 1 — Titularidad del código y trazabilidad

**Evidencia inspeccionada**
- [`src/features/client/home/ClientHomeScreen.tsx`](../src/features/client/home/ClientHomeScreen.tsx): implementación actual de la pantalla Cliente, con radar y mapa.
- [`src/mvp/ProviderActiveMap.tsx`](../src/mvp/ProviderActiveMap.tsx): mapa Proveedor.
- [`src/features/client/order/ClientActiveMap.tsx`](../src/features/client/order/ClientActiveMap.tsx): mapa de servicio Cliente.
- [`supabase/migrations/20260927223000_ip_corporate_protection_gate.sql`](../supabase/migrations/20260927223000_ip_corporate_protection_gate.sql): esquema para registrar innovaciones y colaboradores. **El propio archivo declara que no ejecuta registro legal externo**.
- [`docs/UGO_INVESTMENT_READINESS.md`](UGO_INVESTMENT_READINESS.md): recoge declaraciones de fundador pendientes de corroboración.

**Resultado:** hay código y controles internos de registro IP, pero no una cadena documental verificada de autoría, cesión, titularidad o registro. Se requiere revisar commits por autor, posibles contribuciones, términos de herramientas de IA, contratos y documentación externa. No divulgar documentos personales en GitHub.

## Prioridad 2 — Recursos visuales, mapas y atribuciones

**Evidencia inspeccionada**
- Los tres archivos de mapas anteriores contienen referencias a `tile.openstreetmap.org` y atribución «© OpenStreetMap contributors».
- Se usa `maplibre-gl` y carga diferida de MapLibre.
- `@tomtom-org/maps-sdk` aparece en [`package.json`](../package.json); el lockfile indica «See in LICENSE.txt» en lugar de una licencia SPDX concreta.

**Resultado:** comprobar política de uso de tiles de OSM, límites y atribución visible en todas las pantallas, términos de TomTom, recursos gráficos y fuentes antes de cerrar la auditoría. La presencia de atribución en código no prueba que sea siempre visible en la UI. La búsqueda de rutas `assets/images`, `public/fonts` y `font-face` no encontró coincidencias, **lo que no prueba que no existan recursos de terceros**.

## Prioridad 3 — Validación de horas y tarifas

Las horas de 1.630 / 3.090 / 5.370 y la matriz de R$163.000 / R$525.300 / R$1.503.600 están documentadas en [escenarios de reconstrucción](UGO_IP_LICENSE_RATE_VALUATION_DUE_DILIGENCE.md). Son **supuestos internos**.

**Paquete listo para pedir validación independiente (sin enviar ni contratar):**
- Alcance: reconstruir flujo Cliente–Proveedor, matching/GPS, administración, Super Admin, backend RLS/realtime, pruebas, pagos y despliegue TEST.
- Excluir: adquisición de clientes, marketing, registros legales, infraestructura comercial, costos financieros, impuestos y operación del piloto.
- Exigir: estimación mínima/base/máxima por módulo, horas de QA, dependencias, supuestos, tarifas por rol, calendario, entregables, riesgos y validez de oferta.
- Pedir **dos estimaciones independientes** para evitar circularidad; distinguir reemplazo de funciones existentes de completar funcionalidades pendientes.
- No se ha obtenido ninguna cotización independiente ni revisión externa de horas.

## Prioridad 4 — Valoración de empresa y financiación

**Conclusión de evidencia:** valor de empresa **no determinado**. Un cálculo de costo de reconstrucción no mide valor de mercado, y no hay tracción comercial ni flujo de caja auditado que permita DCF fiable.

**Puertas para evaluación cuantitativa:**
1. **Valor de activos:** inventario y autoría completos; separar software operativo, pruebas, experimentos, deuda y funciones sin terminar.
2. **Economía unitaria:** GMV real, ingresos netos, comisión efectiva, costos de cobro, soporte, reembolsos, CAC, recurrencia y margen; datos TEST no cuentan como ventas.
3. **Presupuesto del piloto:** infraestructura, seguridad, pagos, operaciones, captación, legal y contingencia; cotizaciones o fuentes fechadas.
4. **Mercado/comparables:** transacciones relevantes en Brasil con misma etapa, riesgos y términos; no extrapolar múltiplos de empresas maduras.
5. **Estructura de inversión:** entidad legal, titularidad, monto solicitado, hitos, derechos de socios y dilución con revisión profesional.

**Estado:** sin cifra pre-money, sin porcentaje de equity recomendado y sin importe de inversión inventado.

## Cuadro de control

| Prioridad | Trabajo ejecutado | Estado de cierre |
| --- | --- | --- |
| 1. Titularidad | Archivos fuente y esquema IP inspeccionados; faltantes documentados | PARCIAL |
| 2. Assets y licencias | Mapas y atribución inspeccionados; riesgos identificados | PARCIAL |
| 3. Tarifas y horas | Preparado alcance verificable para dos revisores | PENDIENTE VALIDACIÓN EXTERNA |
| 4. Valoración | Definidos métodos, exclusiones y datos faltantes | NO DETERMINABLE TODAVÍA |

**Próximo trabajo ejecutable sin riesgo:** inventario recursivo de assets y cadena de contribuciones, luego descomposición de horas por tareas verificables. Ningún cambio de código, despliegue, pagos o PROD.
