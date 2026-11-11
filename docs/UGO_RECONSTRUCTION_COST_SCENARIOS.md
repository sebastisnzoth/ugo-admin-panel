# UGO — Inventario Admin/Super Admin, licencias y costo de reconstrucción

**Fecha:** 2026-11-11  
**Estado:** ESTIMACIÓN PRELIMINAR ILUSTRATIVA — NO TASACIÓN, NO COTIZACIÓN  
**Alcance:** lectura de GitHub `main`; ninguna modificación a código, base de datos o producción.

## 1. Activos adicionales verificados en el código

| Módulo | Archivo verificado | Evidencia observable | Limitación |
| --- | --- | --- | --- |
| Admin | [`src/components/AdminPanel.tsx`](../src/components/AdminPanel.tsx) | Importa hooks de métricas, conversiones, alertas, servicios, disputas, documentos, usuarios, tarifas, finanzas, reportes y exportaciones; archivo de ~136 KB | No significa que todas las pantallas y acciones estén probadas |
| Super Admin | [`src/mvp/SuperAdminCommandCenter.tsx`](../src/mvp/SuperAdminCommandCenter.tsx) | Pestañas de mando, autonomía, flags, auditoría, integraciones, métricas, roles e IP; archivo de ~31,5 KB | Integraciones y automatización pueden estar incompletas |
| Router compartido | [`src/app/router.ts`](../src/app/router.ts) | `app=admin` y `app=superadmin` resuelven a la ruta `admin` | No prueba que compartan permisos; revisar guardas |
| Cliente | [`src/features/client/ClientRoot.tsx`](../src/features/client/ClientRoot.tsx) | Entrada de Cliente vigente | Componentes y pruebas individuales pendientes |
| Proveedor | [`src/mvp/provider/ProviderRoot.tsx`](../src/mvp/provider/ProviderRoot.tsx) | Entrada de Proveedor vigente | Componentes y pruebas individuales pendientes |
| GPS | [migración de llegada 200 m](../supabase/migrations/20260924162000_provider_arrival_gps_gate.sql) | Código de control de llegada | El estado TEST se documenta por separado |
| Pagos Sandbox | [`payments-sandbox/api/webhook.js`](../payments-sandbox/api/webhook.js) | Código de webhook | No acreditar split/escrow E2E |

**Regla de no duplicación:** router, autenticación, Supabase, design system, infraestructura, internacionalización y pruebas transversales se contabilizan una sola vez. Super Admin no equivale a reconstruir todo Admin desde cero.

## 2. Dependencias y licencias — revisión parcial

Archivo [`package.json`](../package.json) leído en `main`:
- Producción: `react`, `react-dom`, `@supabase/supabase-js`, `@tomtom-org/maps-sdk`, `maplibre-gl`.
- Desarrollo: `vite`, `typescript`, `eslint`, `typescript-eslint`, `@electric-sql/pglite`, paquetes de tipos y reglas ESLint.
- [Aviso de licencia MIT de Agent Skills](third-party/agent-skills-LICENSE): presente, atribuido a Addy Osmani; exige conservar aviso y copyright cuando corresponda.
- `LICENSE` general en la raíz: **no encontrado** por consulta directa. Esto no demuestra ausencia de derechos de autor ni define licencia global.
- **Sin verificar:** licencias exactas de cada versión instalada, dependencias transitivas del lockfile, activos visuales, fuentes, APIs de mapas, marcas, términos comerciales y autoría integral. No afirmar «auditoría de licencias aprobada».

## 3. Estimación de horas de reconstrucción — supuestos, no mediciones

**Método:** estimación exploratoria por subsistemas para reconstruir una plataforma funcional equivalente, incluyendo integración y QA básicos, sin adquirir clientes ni operar un negocio. Las horas **no** proceden de partes de trabajo ni de una revisión exhaustiva del árbol Git. Requieren revisión por ingenieros y un alcance funcional congelado.

| Subsistema (sin solapamientos) | Bajo h | Base h | Alto h |
| --- | ---: | ---: | ---: |
| Cliente: onboarding, solicitud, seguimiento | 220 | 380 | 650 |
| Proveedor: ofertas, ubicación, trabajos | 230 | 400 | 700 |
| Admin: operaciones, KYC, disputas, finanzas | 210 | 370 | 650 |
| Super Admin: control, auditoría, autonomía | 120 | 240 | 460 |
| Backend: datos, auth, RLS, realtime, storage | 260 | 460 | 800 |
| GPS, geofence, mapas y matching | 150 | 280 | 490 |
| Pagos efectivo y Pix Sandbox / integraciones | 140 | 280 | 550 |
| Diseño, i18n, accesibilidad y QA transversal | 180 | 340 | 620 |
| Infra, CI, monitoreo y documentación | 120 | 240 | 450 |
| **TOTAL** | **1.630** | **3.090** | **5.370** |

**Advertencia:** la columna incluye trabajo de pagos que aún no está comercialmente validado; no representa exclusivamente el valor del código ya terminado. Una tasación de activos actuales deberá aplicar descuentos por deuda técnica, riesgos y funcionalidad pendiente.

## 4. Costo de reconstrucción: matriz de sensibilidad en BRL

Para visualizar órdenes de magnitud, se usan **tarifas horarias hipotéticas**, no tarifas de mercado verificadas ni cotizaciones. R$80, R$150 y R$250/h se eligen únicamente para análisis de sensibilidad.

| Horas / tarifa | R$80/h | R$150/h | R$250/h |
| --- | ---: | ---: | ---: |
| Bajo 1.630 h | R$130.400 | R$244.500 | R$407.500 |
| Base 3.090 h | R$247.200 | R$463.500 | R$772.500 |
| Alto 5.370 h | R$429.600 | R$805.500 | R$1.342.500 |

**Fórmula:** horas estimadas × tarifa hipotética. **Excluye** costos de proveedores externos, impuestos, estructura empresarial, captación comercial, contingencias y costos legales.

**No interpretar** esta matriz como:
- valuación empresarial de UGO;
- precio comprobado de venta o reposición;
- cotización de agencia de desarrollo;
- valor patrimonial del software actualmente terminado;
- ingreso, facturación o financiación disponible.

## 5. Validación necesaria antes de usar números con inversores
- [x] Confirmar puntos de entrada actuales de Cliente, Proveedor, Admin y Super Admin.
- [x] Confirmar componentes compartidos y regla de no doble conteo.
- [x] Revisar manifiesto de dependencias y un aviso MIT de terceros.
- [x] Elaborar matriz exploratoria de horas y costo con supuestos declarados.
- [ ] Inventario completo de archivos, dependencias transitivas y licencias reales.
- [ ] Desglose por función con alcance, complejidad, pruebas y evidencia.
- [ ] Cotizaciones externas o tarifas de mercado con fuente y fecha.
- [ ] Auditoría de seguridad, propiedad intelectual y derechos de assets.
- [ ] Separar costo de funcionalidades ya construidas del costo de terminar pendientes.
- [ ] Validación independiente del esfuerzo por al menos un profesional.
- [ ] Presupuesto de piloto y economía unitaria; recién entonces valorar empresa y financiación.

## 6. Siguiente decisión
**Resultado actual:** podemos discutir escenarios de reconstrucción, pero **no afirmar cuánto vale UGO**. La próxima prioridad es validar el alcance de cada módulo y las tarifas, y producir un presupuesto de piloto con fuentes verificables. Ninguna cifra de esta matriz debe pasar al pitch externo sin advertencias y aprobación.
