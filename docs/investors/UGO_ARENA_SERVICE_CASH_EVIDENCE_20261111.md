> **ACLARACIÓN DEL FUNDADOR — 11/11/2026:** El fundador confirmó expresamente que los servicios y pagos en efectivo encontrados en UGO Arena corresponden a **pruebas realizadas por él mismo con dos celulares**. Esto incluye los registros etiquetados `real`: esa etiqueta **no representa clientes reales ni ventas comerciales**. **Clientes comerciales verificados: 0; ingresos comerciales verificados: R$0.** Los importes de servicios y comisiones son **simulados/nominales**, no facturación ni dinero cobrado por UGO. No presentar 66 servicios o 64 pagos como tracción comercial ante inversores. La evidencia sí respalda pruebas funcionales del flujo Cliente–Proveedor.

# UGO — Evidencia de servicios y efectivo de Arena (lectura 2026-11-11)

**Fuente:** consulta SQL de solo lectura a Supabase UGO Arena, proyecto `tmossnqfwfwjrtzwcbmm`, tablas `public.servicios` y `public.pagos`. No contiene datos personales ni identificadores de cuentas.

## Totales por ambiente (no confundir DEMO con comercial)
| Indicador | demo | real |
| --- | ---: | ---: |
| Servicios completados | 1.092 | 66 |
| Importe nominal de servicios completados | R$136.840,00 | R$7.840,00 |
| Comisión nominal asociada a servicios completados | R$20.526,00 | R$1.176,00 |
| Pagos efectivo en estado liberado | 1.132 | 64 |
| Importe de pagos efectivo liberados | R$139.210,00 | R$7.720,00 |
| Comisión nominal en pagos efectivo liberados | R$20.881,50 | R$1.158,00 |
| Pagos efectivo pendientes | 120 | 49 |

**Precaución:** los totales de pagos y servicios no son sumables; son registros de dos tablas relacionadas. En `real`, 64 de 66 servicios completados tienen un pago efectivo liberado asociado. La diferencia entre los totales requiere conciliación antes de publicar KPIs.

## Alcance de los 66 servicios con etiqueta real
- 6 cuentas de cliente distintas y 3 cuentas de proveedor distintas, contadas por identificadores internos sin revelar identidades.
- Primer completado: 2026-09-14 19:23:22 UTC.
- Último completado: 2026-11-11 01:05:10 UTC.
- 64 completados cuentan con un pago `efectivo` `liberado` asociado y etiquetado `real`.

## Lo que estas cifras NO prueban
- No demuestran que 66 servicios fueron prestados a clientes independientes reales, ni que hubo efectivo efectivamente entregado.
- La etiqueta `real` es una clasificación de la base, **no** certificación de actividad comercial, y puede incluir pruebas en celulares reales.
- `liberado` en pagos en efectivo no es comprobante bancario ni conciliación externa.
- R$1.158 de comisión nominal **no equivale** a ingresos cobrados por UGO.
- No extrapolar DEMO como facturación, GMV real o tracción comercial.

## Redacción aprobable para material preliminar
«En la aplicación UGO Arena constan 1.158 servicios completados, de los cuales 1.092 están etiquetados como demo y 66 como real. En este último grupo, 64 tienen pagos en efectivo marcados como liberados. La naturaleza comercial de esas operaciones y su cobro efectivo están pendientes de verificación independiente.»

## Siguiente validación mínima
Confirmar con el fundador si las cuentas y operaciones etiquetadas `real` corresponden a pruebas con sus propios celulares o a clientes y proveedores independientes; obtener evidencia verificable de prestación y cobro sin publicar datos personales. Tras esa clasificación, actualizar métricas para inversores.

**Seguridad:** consulta agregada de solo lectura; no se cambió PROD ni se extrajeron datos personales.
