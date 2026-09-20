import { getRoleSupabase } from '../roleSupabase'
import { reportSentinelIncident } from '../sentinel'
import type { Coordinates, DispatchProvider, DispatchRequest, DispatchResult } from './types'

// Dispatch must use the same authenticated Supabase client as UGO Cliente.
// Using the legacy/global client here leaves matching RPCs without the client's JWT,
// so the service is created but no offer reaches the provider.
const supabase = getRoleSupabase('client')
const MATCHING_TIMEOUT_MS = 12000
const STATUS_TIMEOUT_MS = 5000
const PREFERRED_PROVIDER_MAX_AGE_MS = 20 * 60 * 1000

type RpcResponse = { data: any; error: any }
type StoredPreferredProvider = { id?: unknown; categoryId?: unknown; categorySlug?: unknown; at?: unknown }
type PersistedServiceRow = { id: string; estado: string; proveedor_id: string | null }

function timeoutAfter<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(label)), ms)
  })
}

async function bounded<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, timeoutAfter<T>(ms, label)])
}

function incidentMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function storedPickup(): Coordinates | null {
  try {
    const raw = sessionStorage.getItem('ugo:last-client-location')
    if (!raw) return null
    const value = JSON.parse(raw) as { latitude?: unknown; longitude?: unknown; at?: unknown }
    const latitude = Number(value.latitude)
    const longitude = Number(value.longitude)
    const at = Number(value.at)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (Number.isFinite(at) && Date.now() - at > 10 * 60 * 1000) return null
    return { latitude, longitude }
  } catch {
    return null
  }
}

function consumeStoredPreferredProvider(category: string): string | null {
  try {
    const raw = sessionStorage.getItem('ugo:preferred-provider')
    if (!raw) return null
    sessionStorage.removeItem('ugo:preferred-provider')
    const value = JSON.parse(raw) as StoredPreferredProvider
    const id = typeof value.id === 'string' ? value.id.trim() : ''
    const categoryId = typeof value.categoryId === 'string' ? value.categoryId.trim() : ''
    const categorySlug = typeof value.categorySlug === 'string' ? value.categorySlug.trim() : ''
    const at = Number(value.at)
    if (!id) return null
    if (Number.isFinite(at) && Date.now() - at > PREFERRED_PROVIDER_MAX_AGE_MS) return null
    if (category && category !== categoryId && category !== categorySlug) return null
    return id
  } catch {
    try { sessionStorage.removeItem('ugo:preferred-provider') } catch { /* noop */ }
    return null
  }
}

async function persistPickup(serviceId: string, pickup: Coordinates | null) {
  if (!pickup) return
  try {
    const { error } = await bounded<RpcResponse>(
      (supabase as any).rpc('guardar_ubicacion_servicio_cliente', {
        p_servicio_id: serviceId,
        p_lat: pickup.latitude,
        p_lng: pickup.longitude,
      }),
      STATUS_TIMEOUT_MS,
      'La ubicación tardó demasiado en guardarse.',
    )
    if (error) throw error
  } catch (error) {
    console.warn('No se pudo persistir ubicación del servicio', error)
    void reportSentinelIncident({
      eventType: 'client_request_location_error',
      message: incidentMessage(error, 'No se pudo persistir la ubicación del pedido.'),
      error,
      role: 'client',
      severity: 'P2',
      serviceId,
      action: 'client.request.location',
      checklistCode: 'MAP-GPS',
    })
  }
}

function mapPersistedStatus(row: PersistedServiceRow): DispatchResult {
  const stateMap: Record<string, DispatchResult['state']> = {
    buscando: 'pending',
    ofrecido: 'offering',
    confirmado: 'matched',
    asignado: 'matched',
    cancelado: 'cancelled',
  }
  return {
    serviceId: row.id,
    state: stateMap[String(row.estado)] ?? 'pending',
    providerId: row.proveedor_id ?? null,
    raw: row,
  }
}

async function readPersistedStatus(serviceId: string): Promise<DispatchResult | null> {
  try {
    const { data, error } = await bounded<any>(
      (supabase as any)
        .from('servicios')
        .select('id,estado,proveedor_id')
        .eq('id', serviceId)
        .single(),
      STATUS_TIMEOUT_MS,
      'La verificación del pedido tardó demasiado.',
    )
    if (error || !data?.id) return null
    return mapPersistedStatus(data as PersistedServiceRow)
  } catch {
    return null
  }
}

export class SupabaseDispatchProvider implements DispatchProvider {
  private async recoverAcceptedDispatch(serviceId: string, originalError: unknown): Promise<DispatchResult> {
    // A response can be lost after the DB committed an offer/assignment. Only a
    // persisted offered/matched state counts as success. A persisted pending state
    // confirms matching did not advance; an unreadable state is uncertainty, not P0.
    const persisted = await readPersistedStatus(serviceId)
    if (persisted?.state === 'offering' || persisted?.state === 'matched') return persisted

    if (persisted) {
      void reportSentinelIncident({
        eventType: 'client_matching_error',
        message: incidentMessage(originalError, 'No se pudo iniciar el matching.'),
        error: originalError,
        role: 'client',
        severity: 'P0',
        serviceId,
        action: 'client.request.matching',
        checklistCode: 'MATCH-ONLINE',
      })
    } else {
      void reportSentinelIncident({
        eventType: 'client_matching_recovery_unverified',
        message: 'Falló el matching y no pudimos verificar el estado persistido. El pedido sigue recuperable desde Inicio o Actividad.',
        error: originalError,
        role: 'client',
        severity: 'P1',
        serviceId,
        action: 'client.request.matching.recovery',
      })
    }
    throw originalError
  }

  async start(request: DispatchRequest): Promise<DispatchResult> {
    const pickup = request.pickup || (request.pickupFallback === 'none' ? null : storedPickup())
    await persistPickup(request.serviceId, pickup)
    const storedPreferredProviderId = consumeStoredPreferredProvider(request.category)
    const preferredProviderId = request.preferredProviderId || storedPreferredProviderId

    if (preferredProviderId) {
      try {
        const { data, error } = await bounded<RpcResponse>(
          (supabase as any).rpc('iniciar_matching_dirigido', {
            p_servicio_id: request.serviceId,
            p_proveedor_id: preferredProviderId,
          }),
          MATCHING_TIMEOUT_MS,
          'La búsqueda de profesionales tardó demasiado. Tu solicitud quedó guardada y podés seguir desde Inicio.',
        )
        if (error) throw error
        const first = Array.isArray(data) ? data[0] : data
        return {
          serviceId: request.serviceId,
          state: first?.proveedor_id ? 'offering' : 'pending',
          providerId: first?.proveedor_id ?? null,
          raw: data,
        }
      } catch (error) {
        return this.recoverAcceptedDispatch(request.serviceId, error)
      }
    }

    try {
      const { data, error } = await bounded<RpcResponse>(
        (supabase as any).rpc('iniciar_matching', {
          p_servicio_id: request.serviceId,
        }),
        MATCHING_TIMEOUT_MS,
        'La búsqueda de profesionales tardó demasiado. Tu solicitud quedó guardada y podés seguir desde Inicio.',
      )
      if (error) throw error
      const first = Array.isArray(data) ? data[0] : data
      return {
        serviceId: request.serviceId,
        state: first?.proveedor_id ? 'offering' : 'pending',
        providerId: first?.proveedor_id ?? null,
        raw: data,
      }
    } catch (error) {
      return this.recoverAcceptedDispatch(request.serviceId, error)
    }
  }

  async cancel(serviceId: string): Promise<void> {
    try {
      const { error } = await bounded<RpcResponse>(
        (supabase as any).rpc('cancelar_servicio', { p_servicio_id: serviceId }),
        STATUS_TIMEOUT_MS,
        'La cancelación tardó demasiado. Estamos verificando el estado real del pedido.',
      )
      if (error) throw error
    } catch (error) {
      // The RPC can commit successfully and the response still be lost. Re-read
      // the persisted state before showing the user a false cancellation error.
      const persisted = await readPersistedStatus(serviceId)
      if (persisted?.state === 'cancelled') return

      if (persisted) {
        void reportSentinelIncident({
          eventType: 'client_cancel_error',
          message: incidentMessage(error, 'No se pudo cancelar el pedido.'),
          error,
          role: 'client',
          severity: 'P0',
          serviceId,
          action: 'client.request.cancel',
          checklistCode: 'CLIENT-CANCEL',
        })
      } else {
        void reportSentinelIncident({
          eventType: 'client_cancel_recovery_unverified',
          message: 'Falló la cancelación y no pudimos verificar el estado persistido. Reintentá desde Actividad.',
          error,
          role: 'client',
          severity: 'P1',
          serviceId,
          action: 'client.request.cancel.recovery',
        })
      }
      throw error
    }
  }

  async getStatus(serviceId: string): Promise<DispatchResult> {
    const persisted = await readPersistedStatus(serviceId)
    if (persisted) return persisted

    const error = new Error('No pudimos verificar el estado real del pedido.')
    void reportSentinelIncident({
      eventType: 'client_order_status_error',
      message: error.message,
      error,
      role: 'client',
      severity: 'P1',
      serviceId,
      action: 'client.request.status',
    })
    throw error
  }
}
