/*
 * Feature flags del flujo tipo rideshare (cliente y proveedor).
 *
 * Reglas:
 * - Apagado por defecto: sin variable de entorno, ningún flag está activo.
 * - El modo production siempre bloquea estos flags.
 * - El build aislado --mode demo puede habilitarlos explícitamente aunque Vite
 *   use PROD=true para optimizar los assets; ese modo no es el build de producción.
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
  if (env.MODE === 'production' || (env.PROD === true && env.MODE !== 'demo')) return false
  return parseFlagValue(env[ENV_KEYS[flag]])
}
