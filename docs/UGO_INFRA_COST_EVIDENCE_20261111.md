# UGO — Verificación de infraestructura y costo real observable

**Fecha:** 2026-11-11  
**Alcance:** consulta de metadatos de Supabase PROD en modo lectura, sin SQL, logs, mutaciones ni cambios de configuración. No se consultaron claves.

## Evidencia directa de la cuenta

| Campo | Resultado verificado |
| --- | --- |
| Proyecto PROD | `trfsjuseqjxlhrxuvdsm` |
| Nombre | UGO |
| Región | `sa-east-1` |
| Estado reportado por API al consultar | `ACTIVE_HEALTHY` |
| Organización | `nyvlhtvvgkkbjlpsgjwr` |
| Plan de organización | `free` |
| Tier | `tier_free` |

**Interpretación restringida:** plan Free **no demuestra costo efectivo de R$0**, ausencia de obligaciones, uso comercial permitido, disponibilidad futura ni consumo dentro de cuotas. El estado ACTIVE_HEALTHY es una fotografía puntual y no prueba continuidad histórica, ausencia de errores 5xx o recuperación ante incidentes. No se obtuvo estado de facturación, consumo ni cargos del período.

## Clasificación de evidencia de costos

| Rubro | Evidencia | Valor de costo verificable |
| --- | --- | --- |
| Supabase PROD | Plan Free y estado API | **No cuantificable como gasto real** sin factura/consumo |
| Vercel hosting | Sin lectura de cargos del equipo en esta revisión | Pendiente |
| Mapas OSM/TomTom | Integración en código, no consumo facturado | Pendiente |
| Asaas Pix/split | Sandbox no E2E PASS, sin tarifa contractual verificada | Pendiente |
| Soporte, captación, legal | Sin registros de horas ni cotizaciones | Pendiente |

## Control financiero sin autorización de gasto

**Presupuesto autorizado para nuevas contrataciones: R$0.** No ejecutar upgrades, crear proyectos facturables, contratar servicios ni activar producción de pagos. Toda propuesta debe distinguir:
- **costo de caja observado:** factura, cargo o extracto fechado;
- **precio publicado:** tarifario oficial y límites, sujeto a condiciones;
- **costo estimado:** fórmula basada en uso proyectado;
- **desconocido:** sin dato suficiente.

## Próximas verificaciones seguras

1. Leer facturación y uso de Vercel, si se cuenta con acceso al equipo; no desplegar.
2. Revisar consumo/cuotas de Supabase desde métricas oficiales, sin consultas pesadas.
3. Registrar tarifas y límites oficiales de mapas, pagos y hosting con fecha.
4. Medir solicitudes de mapas, tráfico, usuarios, escrituras, egress y almacenamiento.
5. Actualizar presupuesto piloto con costo de caja observado y escenarios de uso, nunca confundir plan Free con costo garantizado cero.

**Este documento no certifica que UGO Arena esté blindada ni que la base no pueda caerse.**
