import { getRoleSupabase } from '../roleSupabase'
import type { Coordinates, DispatchProvider, DispatchRequest, DispatchResult } from './types'

// Dispatch must use the same authenticated Supabase client as UGO Cliente.
// Using the legacy/global client here leaves matching RPCs without the client's JWT,
// so the service is created but no offer reaches the provider.
const supabase = getRoleSupabase('client')
const MATCHING_TIMEOUT_MS = 12000
const STATUS_TIMEOUT_MS = 5000

type RpcResponse = { data: any; error: any }

function timeoutAfter<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(label)), ms)
  })
}

async function bounded<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, timeoutAfter<T>(ms, label)])
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
    if (error) console.warn('No se pudo persistir ubicación del servicio', error)
  } catch (error) {
    console.warn('No se pudo persistir ubicación del servicio', error)
  }
}

export class SupabaseDispatchProvider implements DispatchProvider {
  private async recoverAcceptedDispatch(serviceId: string, originalError: unknown): Promise<DispatchResult> {
    // A response can be lost after the DB committed an offer/assignment. Only a
    // persisted offered/matched state counts as success; "buscando" remains a
    // retryable matching failure rather than a false positive.
    try {
      const persisted = await this.getStatus(serviceId)
      if (persisted.state === 'offering' || persisted.state === 'matched') return persisted
    } catch {
      // Preserve the original matching error; status recovery is best-effort only.
    }
    throw originalError
  }

  async start(request: DispatchRequest): Promise<DispatchResult> {
    await persistPickup(request.serviceId, request.pickup || storedPickup())

    if (request.preferredProviderId) {
      try {
        const { data, error } = await bounded<RpcResponse>(
          (supabase as any).rpc('iniciar_matching_dirigido', {
            p_servicio_id: request.serviceId,
            p_proveedor_id: request.preferredProviderId,
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
    const { error } = await (supabase as any)
      .from('servicios')
      .update({ estado: 'cancelado' })
      .eq('id', serviceId)
    if (error) throw error
  }

  async getStatus(serviceId: string): Promise<DispatchResult> {
    const { data, error } = await bounded<any>(
      (supabase as any)
        .from('servicios')
        .select('id,estado,proveedor_id')
        .eq('id', serviceId)
        .single(),
      STATUS_TIMEOUT_MS,
      'La verificación del pedido tardó demasiado.',
    )
    if (error) throw error

    const stateMap: Record<string, DispatchResult['state']> = {
      buscando: 'pending',
      ofrecido: 'offering',
      confirmado: 'matched',
      asignado: 'matched',
      cancelado: 'cancelled',
    }

    return {
      serviceId,
      state: stateMap[String(data.estado)] ?? 'pending',
      providerId: data.proveedor_id ?? null,
      raw: data,
    }
  }
}
