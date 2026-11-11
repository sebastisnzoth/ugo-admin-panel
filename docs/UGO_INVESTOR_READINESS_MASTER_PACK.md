# UGO — Investor readiness pack / expediente maestro

**Fecha:** 2026-11-11  
**Estado:** paquete para revisión del fundador y due diligence; **no distribuir como oferta de inversión aprobada**.  
**Propósito:** facilitar conversaciones iniciales de descubrimiento con inversores, aliados comerciales y programas de incubación sin exagerar evidencia.

## 1. Tesis de inversión (hipótesis, no promesa)

UGO desarrolla un marketplace para coordinar servicios domiciliarios en Florianópolis, Brasil, inicialmente faxina y mantenimiento doméstico. Busca reducir la fricción de encontrar profesionales, coordinar solicitudes, verificar llegada y ejecución, y gestionar el cierre del servicio. La oportunidad depende de validar demanda local, adquisición de proveedores, calidad, retención y márgenes.

**Diferenciación técnica que puede demostrarse en TEST:** flujo Cliente–Proveedor con estados persistidos, geofence, evidencias y registro de pago de prueba en efectivo. **No** afirmar ventas reales, crecimiento, cuota de mercado, split Pix validado ni tecnología patentada.

## 2. Evidencia y límites — tabla para el inversor

| Afirmación | Evidencia | Cómo se debe comunicar |
| --- | --- | --- |
| Existe producto desarrollado | Código React/TS, componentes Cliente, Proveedor, Admin, Super Admin | Software construido, con validación parcial |
| Flujo de servicio completado | [Registro TEST #2697](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md) | Prueba en entorno TEST; no cliente comercial |
| Geofence 200 m | Migración y verificación de backend TEST | Control observado en TEST, no certificación de cada operación histórica |
| Pago de R$120 y comisión R$18 | Registros TEST de efectivo | Ejemplo de configuración, no ingresos reales |
| Pix/Asaas | [Auditoría de bloqueos](UGO_PIX_POST_SERVICE_CLIENT_PROVIDER_AUDIT_20261110.md) | Sandbox en desarrollo; split y liquidación no validados |
| Costos de infraestructura | [Supabase Free y estado puntual](UGO_INFRA_COST_EVIDENCE_20261111.md) | Plan observado, consumo y gasto real aún no auditados |
| Costos de reconstrucción | [Escenarios](UGO_IP_LICENSE_RATE_VALUATION_DUE_DILIGENCE.md) | Hipótesis interna; no valor de empresa |
| Propiedad intelectual | [Auditoría npm](UGO_NPM_LICENSE_INVENTORY_20261111.md), [trazabilidad inicial](UGO_IP_COMMIT_TRACE_AND_EXTERNAL_ESTIMATE_BRIEF.md) | Auditoría en curso, no titularidad certificada |

## 3. Modelo comercial a validar

Hipótesis: comisión porcentual por servicio completado y cobrado. El 15% registrado en TEST es referencia de prueba, no tarifa comercial definitiva.

**Economía unitaria:** ingreso de plataforma = GMV real × comisión efectiva. Margen de contribución = ingreso menos comisiones de pagos, soporte, incidencias, reembolsos e impuestos variables. CAC y retención deben medirse, no suponerse.

## 4. Uso potencial de capital: hitos, no montos inventados

| Tramo | Qué financia si se aprueba | Evidencia de cierre |
| --- | --- | --- |
| A — Seguridad y continuidad | QA, cuotas, monitoreo, recuperación, sesiones | pruebas de restauración, disponibilidad y CI |
| B — Pagos y cumplimiento | integración postservicio, conciliación, asesoramiento regulatorio | Pix E2E en TEST, contratos y operación legal |
| C — Operación local | reclutamiento de profesionales, soporte y procedimientos | proveedores activos verificados y SLA |
| D — Adquisición piloto | campañas pequeñas autorizadas y medición | clientes pagadores, CAC y repetición observados |
| E — Escalado | solo después de demostrar margen y continuidad | cohortes, retención, margen, estabilidad |

**Monto a levantar, runway y dilución: TBD.** El monto se calculará con presupuesto de 6–12 meses basado en cotizaciones, impuestos, contingencia y gastos reales, no a partir del costo de reconstrucción.

## 5. Ruta de financiación — alternativas

1. **Socio estratégico local**: empresa de limpieza, mantenimiento o red de profesionales. Posible piloto conjunto sin ceder equity de entrada. Requiere contrato, privacidad y reparto comercial claros.
2. **Aceleradora/incubadora**: mentoría, preparación societaria y acceso a inversores. Verificar convocatoria, residencia, elegibilidad y condiciones vigentes.
3. **Ángel inversor pre-seed**: conversación exploratoria con one-pager; discutir monto/equity solo después de costos y documentación.
4. **Cliente ancla B2B**: administradora de propiedades, hospedajes o condominios; carta de intención no vinculante y prueba piloto, sin confundirla con venta.
5. **Subvenciones/convocatorias públicas**: explorar solo programas compatibles con residencia, entidad jurídica, etapa y contrapartida; nunca asumir aprobación.

**No se contactó a terceros ni se presentó solicitud alguna.**

## 6. Lista de preparación para reuniones

**Material que puede compartirse solo tras revisión de seguridad:** [one-pager preliminar](UGO_INVESTOR_ONE_PAGER_DRAFT.md), narrativa de producto y capturas TEST sanitizadas.  
**Material restringido:** claves, datos personales, registros de usuarios, diagramas sensibles, código no auditado, contratos, tablas de pagos, cuentas bancarias y acceso a PROD.

### Objeciones previsibles y respuesta basada en evidencia

- **¿Cuántos clientes pagan?** Aún no hay cifra comercial auditada; se prepara piloto medible.
- **¿Qué prueba que funciona?** Registro de servicio TEST #2697 y código; no equivale a operación comercial certificada.
- **¿UGO ya cobra por Pix?** Hay Sandbox y trabajo técnico; no existe evidencia E2E completa de split/escrow.
- **¿Cuánto vale la empresa?** No hay tasación defendible; hay escenarios internos de reconstrucción, separados de valor empresarial.
- **¿De quién es la IP?** Fundador declara desarrollo propio asistido por IA; la cadena legal de titularidad requiere revisión.
- **¿Por qué invertir ahora?** Para cerrar riesgos P0 y financiar un piloto acotado que produzca evidencia comercial, sujeto a costos y condiciones.

## 7. Estado de infraestructura verificado en esta etapa

La lectura de Vercel identificó el equipo `sebastisnzoths-projects` con plan **Hobby**, y proyectos vinculados al repositorio `ugo-admin-panel`, entre ellos `ugo-admin-panel` y `ugo-marketplace-demo`. **No prueba uso comercial permitido ni facturación cero.** La consulta de cargos del equipo para 2026-10-01 a 2026-11-11 devolvió **404 costs_not_found**: no hay un importe verificado y no debe interpretarse como R$0.

Supabase PROD: organización Free y estado `ACTIVE_HEALTHY` en una consulta puntual. Sin auditoría de consumo, cuotas o facturas.

## 8. Puertas de aprobación de difusión externa

- [ ] Verificación de secretos, licencias, assets, marca y cadena de autoría.
- [ ] Capturas actuales de TEST sanitizadas y aprobadas.
- [ ] Revisión jurídica básica en Brasil de intermediación, pagos, privacidad y estructura.
- [ ] Cifras de costo validadas con fuentes o cotizaciones y presupuesto del piloto.
- [ ] Aprobación del fundador del one-pager, pitch y material a divulgar.
- [ ] Confirmación de contacto y elegibilidad de destinatarios.

## 9. Documentos del expediente

- [Dossier de inversión](UGO_INVESTOR_DOSSIER_DRAFT.md)
- [One-pager](UGO_INVESTOR_ONE_PAGER_DRAFT.md)
- [Registro técnico TEST](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md)
- [Escenarios de costo y valuación](UGO_IP_LICENSE_RATE_VALUATION_DUE_DILIGENCE.md)
- [Inventario npm de 217 entradas](UGO_NPM_LICENSE_INVENTORY_20261111.md)
- [Presupuesto operativo piloto](UGO_FLORIANOPOLIS_PILOT_OPERATING_BUDGET.md)
- [Verificación infraestructura](UGO_INFRA_COST_EVIDENCE_20261111.md)
- [Auditoría Pix](UGO_PIX_POST_SERVICE_CLIENT_PROVIDER_AUDIT_20261110.md)

**Límite:** este paquete no constituye recomendación de inversión, prospecto regulatorio, oferta pública, dictamen jurídico, tasación ni declaración de que UGO está listo para recibir pagos reales.
