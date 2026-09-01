import type { Coordinates, DispatchProvider, DispatchRequest, DispatchResult } from './types'

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

export class SpatiadDispatchProvider implements DispatchProvider {
  constructor(private readonly endpoint = '/api/dispatch') {}

  async start(request: DispatchRequest): Promise<DispatchResult> {
    const pickup = request.pickup || storedPickup()
    if (!pickup) {
      throw new Error('Spatiad requiere una ubicación reciente del cliente. Activá la ubicación y volvé a intentar.')
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'start', request: { ...request, pickup } }),
    })
    if (!response.ok) throw new Error(`Dispatch no disponible (${response.status})`)
    return (await response.json()) as DispatchResult
  }

  async cancel(serviceId: string): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', serviceId }),
    })
    if (!response.ok) throw new Error(`No se pudo cancelar dispatch (${response.status})`)
  }

  async getStatus(serviceId: string): Promise<DispatchResult> {
    const url = new URL(this.endpoint, window.location.origin)
    url.searchParams.set('serviceId', serviceId)
    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`No se pudo consultar dispatch (${response.status})`)
    return (await response.json()) as DispatchResult
  }
}
