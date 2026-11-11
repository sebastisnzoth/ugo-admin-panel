# UGO — Modelo financiero y valuación: checklist con puertas de evidencia

**Fecha:** 2026-11-11  
**Estado:** MODELO DE TRABAJO / SIN VALUACIÓN APROBADA  
**Alcance:** exclusivamente documentación; no implica solicitud de fondos, gasto, cambio de pagos ni operación en producción.

## Puerta 0 — Integridad de la presentación visual
- [x] Pitch de 10 diapositivas en versión preliminar.
- [x] Capturas históricas de TEST recuperadas de artefacto de GitHub Actions (2026-09-30, SHA `52036da557d30a298bb7a949ddba29701ee2d53b`).
- [x] Capturas históricas etiquetadas como TEST y no como prueba física #2697.
- [ ] Capturas actuales del flujo Cliente–Proveedor, obtenidas y revisadas con cuentas de TEST.
- [ ] Revisión de privacidad y autorización de imágenes.
- [ ] Aprobación expresa del pitch para divulgación.

**Regla:** el trabajo financiero puede continuar en paralelo, pero no se declara cerrada la fase visual.

## Puerta 1 — Inventario de activos a valorizar
- [ ] Inventario verificable de repositorios, componentes, funciones, documentación, pruebas, automatizaciones y despliegues.
- [ ] Clasificar cada activo: código propio / tercero / dependencia / licencia pendiente.
- [ ] Separar desarrollo terminado, funciones en TEST, funcionalidades en PROD y módulos experimentales.
- [ ] Identificar trabajo reutilizable y deuda técnica; evitar doble conteo de funcionalidades.
- [ ] Registrar referencias concretas a archivos, commits y pruebas para cada activo.

## Puerta 2 — Estimación de costo de reconstrucción (NO valuación)
Construir estimaciones de esfuerzo en horas por módulo y escenario (mínimo/base/alto), con fuente y supuestos explícitos.

| Módulo | Evidencia | Horas mín. | Horas base | Horas altas | Tarifa/hora fuente | Riesgos |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Cliente y autenticación | Pendiente de inventario | TBD | TBD | TBD | TBD | Sesión, accesibilidad |
| Proveedor y asignación | Pendiente | TBD | TBD | TBD | TBD | Matching, realtime |
| GPS y geofence | Registro #2697 + SQL TEST | TBD | TBD | TBD | TBD | Exactitud, permisos |
| Evidencias y ciclo del servicio | Registro #2697 | TBD | TBD | TBD | TBD | Storage, permisos |
| Administración y roles | Pendiente | TBD | TBD | TBD | TBD | RLS, autorización |
| Pagos en efectivo | Registro #2697 TEST | TBD | TBD | TBD | TBD | Conciliación |
| Pix / Asaas | Sandbox incompleto | TBD | TBD | TBD | TBD | Split y webhook |
| Infra, QA y observabilidad | Pendiente | TBD | TBD | TBD | TBD | Cuotas y disponibilidad |
| Diseño, documentación e i18n | Pendiente | TBD | TBD | TBD | TBD | Licencias |

**Fórmula orientativa:** costo de reposición estimado = Σ (horas verificadas o estimadas × tarifa documentada) + gastos externos documentados + contingencia justificada. **No equivale a valor de empresa, propiedad intelectual certificada ni precio de venta.**

## Puerta 3 — Presupuesto de piloto en Florianópolis
Para cada rubro: necesidad, costo mensual o puntual, cotización/fuente, escenario, fecha y responsable. Mantener R$0 de gasto autorizado hasta aprobación.

| Rubro | Costo validado | Prioridad | Condición para financiar |
| --- | --- | --- | --- |
| Infraestructura y continuidad | TBD | P0 | Capacidad y límites medidos |
| QA / seguridad / respaldo | TBD | P0 | Alcance y riesgos documentados |
| Pagos y cumplimiento | TBD | P0 | Flujo legal y técnico definido |
| Soporte y operaciones | TBD | P1 | Volumen piloto estimado |
| Captación de clientes/proveedores | TBD | P1 | Hipótesis y métricas |
| Contabilidad / formalización | TBD | P1 | Requisitos locales corroborados |

## Puerta 4 — Modelo de unidad económica
- [ ] Definir comisión real aprobada y condiciones de cobro.
- [ ] Obtener tarifas reales de procesadores de pago y costos de soporte.
- [ ] Medir conversión, cancelaciones, retención, costo de adquisición y tiempo por servicio.
- [ ] Separar ingresos brutos de plataforma, costos variables y margen de contribución.
- [ ] Preparar escenarios sin presentarlos como pronóstico comprobado.

**Único ejemplo observado:** servicio #2697 de TEST: R$120 efectivo, R$18 de comisión registrada (15%). **No es facturación real demostrada, ni margen neto, ni split Pix verificado.**

## Puerta 5 — Valuación y propuesta
- [ ] Seleccionar métodos aplicables y declarar sus límites: costo de reconstrucción, comparables pertinentes, escenarios de negocio.
- [ ] Distinguir claramente valor del software, valor de empresa y monto solicitado.
- [ ] Fundamentar cualquier cifra con fuentes, fecha y supuestos.
- [ ] Definir monto solicitado, uso de fondos, hitos y plazo **solo después** del presupuesto.
- [ ] Someter condiciones societarias, propiedad intelectual y participación a revisión legal.

## Condiciones de salida
No afirmar «UGO vale X», «generó ingresos» ni «está listo para escalar» sin soporte. Ninguna cifra será inventada para completar la presentación. La falta de evidencia debe permanecer visible como `TBD`.

## Referencias
- [Dossier preliminar](UGO_INVESTOR_DOSSIER_DRAFT.md)
- [Registro de evidencia #2697](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md)
- [Preparación de inversión](UGO_INVESTMENT_READINESS.md)
- [Auditoría Pix](UGO_PIX_POST_SERVICE_CLIENT_PROVIDER_AUDIT_20261110.md)
