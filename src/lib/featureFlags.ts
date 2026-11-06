/*
 * Feature flags del flujo tipo rideshare (cliente y proveedor).
 *
 * Reglas:
 * - Apagado por defecto: sin variable de entorno, ningún flag está activo.
 * - Nunca activo en producción (MODE === 'production'), aunque la variable esté en true.
 *   Así las pantallas de diseño/demo no pueden llegar a usuarios reales.
 */

export type RideshareFlag = 'clientRideshareFlow' | 'providerRideshareFlow'

const ENV_KEYS: Record<RideshareFlag, string> = {
  clientRideshareFlow: 'VITE_FLAG_CLIENT_RIDESHARE_FLOW',
  providerRideshareFlow: 'VITE_FLAG_PROVIDER_RIDESHARE_FLOW',
}

export function parseFlagValue(raw: unknown): boolean {
  return String(raw ?? '').trim().toLowerCase() === 'true'
}

export function isRideshareFlagEnabled(flag: RideshareFlag, env: Record<string, unknown> = import.meta.env): boolean {
  if (env.MODE === 'production' || env.PROD === true) return false
  return parseFlagValue(env[ENV_KEYS[flag]])
}

/*
 * Bolsa de pedidos pendientes del proveedor (PR #614, docs/UGO_PR614_SAFE_RELEASE_PLAN.md).
 *
 * - Apagada por defecto: sin VITE_FLAG_PROVIDER_PENDING_POOL=true el frontend no monta la
 *   sección ni invoca obtener_pedidos_pendientes_proveedor / tomar_pedido_pendiente.
 * - A diferencia de los flags rideshare, SÍ puede activarse en producción, pero solo después
 *   de aplicar y validar las migraciones 20261105120000 y 20261105130000 en ese ambiente,
 *   dentro de una ventana autorizada.
 * - Apagado: quitar la variable (o ponerla en false) y redeployar. Si el RPC falta, el guard
 *   de providerPendingPool.ts sigue ocultando la sección como segunda capa.
 */
export function isProviderPendingPoolEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return parseFlagValue(env.VITE_FLAG_PROVIDER_PENDING_POOL)
}
