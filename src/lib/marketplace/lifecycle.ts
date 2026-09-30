/**
 * UGO canonical marketplace lifecycle.
 *
 * This module is the frontend/read-model contract for the Cliente ↔ Proveedor flow.
 * Backend RPCs and database guards remain authoritative for mutations.
 *
 * The intent is Uber-like operational consistency:
 * one service, one state machine, one shared interpretation across surfaces.
 */
export const MARKETPLACE_SERVICE_STATES = [
  'borrador',
  'buscando',
  'ofrecido',
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'completado',
  'cancelado',
  'disputado',
] as const

export type MarketplaceServiceState = typeof MARKETPLACE_SERVICE_STATES[number]

export const MATCHING_SERVICE_STATES = ['buscando', 'ofrecido'] as const

export const CLIENT_ACTIVE_SERVICE_STATES = [
  'buscando',
  'ofrecido',
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'disputado',
] as const

export const PROVIDER_ACTIVE_SERVICE_STATES = [
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'disputado',
] as const

export const PROVIDER_LIFECYCLE_ORDER = [
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'completado',
] as const

export type ProviderLifecycleState = typeof PROVIDER_LIFECYCLE_ORDER[number]

export const PROVIDER_ALLOWED_TRANSITIONS: Readonly<Record<ProviderLifecycleState, readonly ProviderLifecycleState[]>> = {
  asignado: ['en_camino'],
  en_camino: ['llegado'],
  llegado: ['en_progreso'],
  en_progreso: ['esperando_aprobacion'],
  esperando_aprobacion: [],
  completado: [],
}

export function isMatchingServiceState(state: string | null | undefined): boolean {
  return (MATCHING_SERVICE_STATES as readonly string[]).includes(String(state || ''))
}

export function isClientActiveServiceState(state: string | null | undefined): boolean {
  return (CLIENT_ACTIVE_SERVICE_STATES as readonly string[]).includes(String(state || ''))
}

export function isProviderActiveServiceState(state: string | null | undefined): boolean {
  return (PROVIDER_ACTIVE_SERVICE_STATES as readonly string[]).includes(String(state || ''))
}

export function canProviderTransition(from: string | null | undefined, to: string | null | undefined): boolean {
  const source = String(from || '') as ProviderLifecycleState
  const target = String(to || '') as ProviderLifecycleState
  return Boolean(PROVIDER_ALLOWED_TRANSITIONS[source]?.includes(target))
}

/**
 * Recovery helper only. Never authorizes a mutation.
 * It answers whether the persisted provider state already reached/passed a target
 * after a timeout/network ambiguity.
 */
export function isAtOrBeyondProviderState(
  current: string | null | undefined,
  target: ProviderLifecycleState,
): boolean {
  const currentIndex = PROVIDER_LIFECYCLE_ORDER.indexOf(String(current || '') as ProviderLifecycleState)
  const targetIndex = PROVIDER_LIFECYCLE_ORDER.indexOf(target)
  return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex
}

export const MARKETPLACE_STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  buscando: 'Buscando profesionales',
  ofrecido: 'Ofertas enviadas',
  asignado: 'Profesional asignado',
  en_camino: 'En camino',
  llegado: 'Proveedor en el lugar',
  en_progreso: 'Trabajo en curso',
  esperando_aprobacion: 'Esperando aprobación',
  completado: 'Completado',
  cancelado: 'Cancelado',
  disputado: 'En disputa',
}
