import { getRoleSupabase } from '../roleSupabase'
import type { Coordinates, DispatchProvider, DispatchRequest, DispatchResult } from './types'

// Dispatch must use the same authenticated Supabase client as UGO Cliente.
// Using the legacy/global client here leaves matching RPCs without the client's JWT,
// so the service is created but no offer reaches the provider.
const supabase = getRoleSupabase('client')

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
  const { error } = await (supabase as any).rpc('guardar_ubicacion_servicio_cliente', {
    p_servicio_id: serviceId,
    p_lat: pickup.latitude,
    p_lng: pickup.longitude,
  })
  if (error) console.warn('No se pudo persistir ubicación del servicio', error)
}

export class SupabaseDispatchProvider implements DispatchProvider {
  async start(request: DispatchRequest): Promise<DispatchResult> {
    await persistPickup(request.serviceId, request.pickup || storedPickup())

    if (request.preferredProviderId) {
      const { data, error } = await (supabase as any).rpc('iniciar_matching_dirigido', {
        p_servicio_id: request.serviceId,
        p_proveedor_id: request.preferredProviderId,
      })
      if (error) throw error
      const first = Array.isArray(data) ? data[0] : data
      return {
        serviceId: request.serviceId,
        state: first?.proveedor_id ? 'offering' : 'failed',
        providerId: first?.proveedor_id ?? null,
        raw: data,
      }
    }

    const { data, error } = await (supabase as any).rpc('iniciar_matching', {
      p_servicio_id: request.serviceId,
    })
    if (error) throw error

    const first = Array.isArray(data) ? data[0] : data
    return {
      serviceId: request.serviceId,
      state: first?.proveedor_id ? 'offering' : 'failed',
      providerId: first?.proveedor_id ?? null,
      raw: data,
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
    const { data, error } = await (supabase as any)
      .from('servicios')
      .select('id,estado,proveedor_id')
      .eq('id', serviceId)
      .single()
    if (error) throw error

    const stateMap: Record<string, DispatchResult['state']> = {
      buscando: 'pending',
      ofrecido: 'offering',
      confirmado: 'matched',
      asignado: 'matched',
      cancelado: 'cancelled',
      sin_proveedor: 'failed',
    }

    return {
      serviceId,
      state: stateMap[String(data.estado)] ?? 'pending',
      providerId: data.proveedor_id ?? null,
      raw: data,
    }
  }
}
