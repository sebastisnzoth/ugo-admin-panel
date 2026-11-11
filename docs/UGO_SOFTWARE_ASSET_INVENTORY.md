# UGO — Inventario de activos de software para estimación de reconstrucción

**Fecha:** 2026-11-11  
**Estado:** INVENTARIO PRELIMINAR Y PARCIAL — NO VALUACIÓN  
**Método:** lectura de archivos concretos en `main` y referencias documentales. No es un censo completo de archivos, autores, licencias o código reutilizable. No se ejecutaron pruebas nuevas.

## Inventario verificado por lectura de archivo
| Activo / componente | Evidencia técnica consultada | Qué permite sostener | Qué falta antes de estimar horas |
| --- | --- | --- | --- |
| Máquina de estados del marketplace | [`src/lib/marketplace/lifecycle.ts`](../src/lib/marketplace/lifecycle.ts) | Existe implementación de estados y transiciones del servicio | Medir alcance, casos límite y dependencias |
| Pruebas de contrato del ciclo de vida | [`tests/contracts/canonical-marketplace-lifecycle.test.mjs`](../tests/contracts/canonical-marketplace-lifecycle.test.mjs) | Existe código de prueba contractual | Ejecutar pruebas en SHA actual y medir cobertura |
| UI operativa de Proveedor | [`src/mvp/provider/provider-simple-flow.css`](../src/mvp/provider/provider-simple-flow.css) | Existe capa visual de Proveedor | Identificar componentes TSX y flujos completos |
| Sistema de diseño | [`src/mvp/ugo-design-system.css`](../src/mvp/ugo-design-system.css) | Existe capa de estilos y tokens compartidos | Auditar componentes, accesibilidad y reutilización |
| Webhook de pagos Sandbox | [`payments-sandbox/api/webhook.js`](../payments-sandbox/api/webhook.js) | Existe implementación de endpoint de webhook | Verificar seguridad, idempotencia, conciliación y E2E |
| Flujo de servicio y evidencia TEST | [`docs/UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md`](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md) | Servicio #2697 con estados, fotos y registros de efectivo | Verificar reproducibilidad actual, sin afirmar ingresos |
| Evidencia histórica de pantallas | [`docs/evidence/readiness-cross-visual-20260930.json`](evidence/readiness-cross-visual-20260930.json) | Registra seis capturas de TEST y artefacto CI | Capturas actuales, privacidad y aprobación |

**Corrección de alcance:** la ruta `src/features/client/ui/ClientHomeScreen.tsx` citada en documentación histórica **no está disponible en `main` al momento de esta lectura (404)**. No se cuenta como archivo actual verificado; la implementación de Cliente requiere localizar su ruta vigente.

## Módulos identificados, aún sin inventario completo
1. Cliente: UI, solicitudes, autenticación, ubicación y seguimiento.
2. Proveedor: ofertas, aceptación, GPS, llegada, evidencias y cierre.
3. Administración y Super Admin: permisos, operaciones y supervisión.
4. Backend: base de datos, RLS, triggers, Realtime, almacenamiento.
5. Pagos: efectivo TEST; Pix/Asaas Sandbox pendiente de E2E completo.
6. Calidad y operaciones: CI, contratos, observabilidad, respaldo y documentación.

No confundir la existencia de módulos o archivos con su grado de madurez, titularidad, seguridad o valor económico.

## Metodología para pasar de inventario a horas
- [x] Localizar y leer ejemplos concretos de código y pruebas en `main`.
- [x] Vincular el inventario con evidencia funcional de TEST.
- [x] Registrar una ruta histórica de Cliente que ya no se encuentra en `main`.
- [ ] Obtener árbol completo de archivos y dependencias actuales.
- [ ] Asociar a cada módulo sus archivos, pruebas, integraciones y estado de funcionamiento.
- [ ] Separar código propio, terceros, generado, reutilizado y deuda técnica.
- [ ] Descomponer cada módulo en tareas estimables, con horas mínimas/base/altas.
- [ ] Consultar tarifas de desarrollo comparables con fecha y fuente.
- [ ] Calcular costo de reposición y sensibilidad **sin confundirlo con valuación de empresa**.

## Reglas financieras
No asignar horas arbitrarias ni tarifas sin fuente. No presentar la cifra del servicio #2697 (R$120 y R$18 registrados en TEST) como facturación real. No asignar valor comercial a Pix split/escrow hasta E2E validado.

## Seguridad operativa
Documentación únicamente. Sin cambios en TEST, PROD, credenciales, pagos, ramas funcionales ni despliegues.
