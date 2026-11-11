# UGO — Dossier de presentación para potenciales inversores (borrador controlado)

**Fecha:** 2026-11-11  
**Estado:** BORRADOR INTERNO — NO DISTRIBUIR SIN REVISIÓN LEGAL, SEGURIDAD Y CIFRAS.  
**Fuente primaria de evidencia:** [registro de prueba física #2697](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md).  
**Alcance:** material comercial descriptivo, sin credenciales, datos personales ni información de clientes.

## 1. Resumen ejecutivo
UGO es una plataforma de intermediación de servicios locales que conecta clientes y profesionales mediante solicitud, asignación, seguimiento y cierre del trabajo. El mercado piloto previsto es Florianópolis, Brasil, comenzando con limpieza residencial (*faxina*) y mantenimiento doméstico (*marido de aluguel*).

El fundador declara haber concebido la idea aproximadamente diez años atrás y haber dirigido el desarrollo de la plataforma con herramientas de inteligencia artificial. La antigüedad de la idea y la titularidad exclusiva requieren documentación independiente.

**Estado correcto:** producto de software desarrollado, con pruebas funcionales y físicas reportadas, y registros de un servicio de prueba corroborados en Supabase TEST. No afirmar operación comercial estable, ingresos reales, tracción validada ni lanzamiento certificado.

## 2. Problema y propuesta de valor
**Hipótesis de mercado:** los clientes necesitan contratar servicios locales con seguimiento claro; los profesionales necesitan oportunidades y un proceso previsible de aceptación, llegada, ejecución y cobro. UGO busca integrar esas etapas en un mismo flujo. La magnitud del problema, demanda y disposición a pagar aún requieren investigación y pilotos comerciales.

## 3. Qué construimos
- Experiencias de Cliente, Proveedor y administración; tecnología React/TypeScript, Supabase y mapas.
- Flujo de solicitud, oferta, aceptación, desplazamiento, llegada, inicio, evidencia antes/después, finalización y pago.
- Control backend de llegada mediante GPS reciente, precisión válida y geofence de 200 metros **verificado activo en Supabase TEST al 2026-11-11**.
- Integración Pix/Asaas en desarrollo y Sandbox: **no presentar split, custodia/escrow ni payout como E2E comercialmente validados**.

## 4. Evidencia de funcionamiento: caso #2697
**Fuente:** consultas de solo lectura a Supabase TEST `tmossnqfwfwjrtzwcbmm`, documentadas en el registro técnico enlazado.

| Evidencia | Resultado verificable | Límite |
| --- | --- | --- |
| Servicio | #2697, estado `completado` | Entorno TEST, no venta real auditada |
| Secuencia | `asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado` | No prueba por sí sola quién operó cada dispositivo |
| Llegada | Evento persistido el 2026-10-28 a las 10:50:05 UTC | Distancia GPS histórica exacta no recuperada |
| Geofence | Función activa con umbral 200 m y trigger habilitado al 2026-11-11 | No se certificó la configuración exacta vigente el 28/10 |
| Fotos | Dos registros `antes`/`despues` y dos objetos Storage presentes | No se inspeccionó contenido de imágenes |
| Efectivo | R$120, estado `liberado`, evento de confirmación | No equivale a conciliación bancaria ni ingresos |
| Comisión | R$18, estado `pagado` en tabla de TEST | No equivale a cobro empresarial liquidado |
| Dispositivos | Prueba física con dos teléfonos reportada por fundador | Pendiente artefacto independiente del uso físico |

**Mensaje permitido:** «UGO completó un flujo de servicio en entorno de pruebas, con estados, evidencias fotográficas y pago en efectivo registrados; el sistema incluye una validación GPS/geofence de llegada activa». No decir «ya factura» o «tiene clientes reales» sin pruebas adicionales.

## 5. Modelo de negocio: hipótesis a validar
Comisión sobre el valor del servicio coordinado. En el caso TEST #2697 se registraron R$18 sobre R$120 (**15%**), dejando R$102 como importe aritmético restante. Es un ejemplo de configuración en pruebas, **no una tasa comercial definitiva, margen neto, rentabilidad ni split Pix verificado**.

Variables a medir en el piloto: número de solicitudes, conversión a servicios terminados, frecuencia de repetición, costo de adquisición, soporte/disputas, tiempo de asignación, tasa de cancelación y costo de procesamiento de pagos.

## 6. Estrategia inicial de lanzamiento
1. Mantener aislados TEST y producción; resolver bloqueos críticos de autenticación, disponibilidad y pagos.
2. Validar piloto acotado en Florianópolis con categorías iniciales, consentimiento y procedimientos operativos.
3. Medir demanda, costos y calidad de servicio con registros verificables.
4. Escalar geográficamente o por categorías solo después de comprobar economía unitaria y confiabilidad.

Estas etapas son objetivos, no hitos ya alcanzados.

## 7. Necesidad de financiación
**Monto solicitado: por determinar con presupuesto verificable.** No inventar valuación, ingresos proyectados ni participación accionaria.

Rubros a presupuestar: estabilidad de infraestructura, QA y seguridad, formalización legal y contable, cumplimiento de pagos, soporte al cliente, captación de oferta/demanda y marketing piloto. Cada rubro requerirá costo, plazo, fuente y responsable.

## 8. Propiedad intelectual y riesgos
El repositorio y su historial aportan trazabilidad del desarrollo, pero **no sustituyen** un dictamen de titularidad. Antes de divulgar: auditar licencias y activos de terceros, contribuciones, secretos en historial Git, derechos de marca y protección de datos. La empresa aún no está constituida según declaración del fundador.

**Riesgos clave:** fiabilidad de producción, costos de infraestructura, conciliación Pix/Asaas, adquisición de usuarios, aspectos legales de intermediación y tratamiento de datos personales.

## 9. Evidencias anexas y puerta de salida
- [Registro técnico de la prueba #2697](UGO_PHYSICAL_TEST_EVIDENCE_REGISTER.md)
- [Expediente de preparación y riesgos](UGO_INVESTMENT_READINESS.md)
- [Ficha comercial preliminar](UGO_INVESTOR_ONE_PAGER_DRAFT.md)
- [Auditoría de pagos Pix](UGO_PIX_POST_SERVICE_CLIENT_PROVIDER_AUDIT_20261110.md)

**No distribuir este dossier como versión final** hasta revisión de seguridad/privacidad, propiedad intelectual, consistencia del relato y presupuesto. No compartir acceso a TEST, PROD ni datos de clientes. Presupuesto de preparación: R$0; no se contrataron servicios.
