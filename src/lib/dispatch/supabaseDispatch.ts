import { supabase } from '../supabase'
import type { DispatchProvider, DispatchRequest, DispatchResult } from './types'

export class SupabaseDispatchProvider implements DispatchProvider {
  async start(request: DispatchRequest): Promise<DispatchResult> {
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
