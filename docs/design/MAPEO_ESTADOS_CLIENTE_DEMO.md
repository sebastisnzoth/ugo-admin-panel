# Mapeo · estados reales del cliente vs demo de flujo

**Estado:** diagnóstico. No cambia código de producción.
**Fuentes:** migraciones en `supabase/migrations/` (vocabulario real de la base) y `src/lib/database.types.ts` (tipos de TypeScript).

## Hallazgo importante: dos vocabularios distintos
| Estado | En migraciones (base real) | En `database.types.ts` |
|---|---|---|
| en camino | `en_camino` (102 apariciones) | `en_camino` |
| llegado | `llegado` (96) | **no existe** |
| en progreso | `en_progreso` (82) | **no existe** (el tipo usa `ejecutando`, que no aparece en ninguna migración) |
| esperando aprobación | `esperando_aprobacion` (67) | **no existe** |
| completado | `completado` (74) | `completado` |
| cancelado | `cancelado` (31) | `cancelado` |
| disputa | `disputa` (3) | `disputa` |

Consecuencia: `database.types.ts` está desalineado con la base. La app debe usar el vocabulario de la base; el tipo debe regenerarse antes de tomarlo como fuente.

## Mapeo demo → base real
| Fase de la demo | Estado real propuesto | Notas |
|---|---|---|
| need / confirm | (solicitud previa al servicio) | Antes de crear el servicio. |
| searching / offer | (servicio en matching) | Verificar el estado exacto previo a `confirmado` en la base. |
| assigned (elegir pago) | `confirmado` | Hay que confirmar el nombre en el enum. |
| enroute | `en_camino` | Confirmado en la base. |
| arrived | `llegado` | Lo confirma la RPC `avanzar_servicio` con la regla de 200 m. |
| working | `en_progreso` | Confirmado en la base. |
| completion / review | `esperando_aprobacion` | Pide foto final antes (regla en la misma RPC). |
| completed | `completado` | Confirmado. |
| disputed | `disputa` | Confirmado. |
| (no está en la demo) | `cancelado` | Falta en la demo. |

## Pendientes
- Confirmar el estado previo a `confirmado` (matching) en el enum real.
- Regenerar `database.types.ts` desde la base TEST antes de implementar.
- Agregar `cancelado` a la demo.
- Los métodos de pago de la demo (tarjeta, Mercado Pago, Pix, efectivo) no son estados; viven en otra capa de pagos.
