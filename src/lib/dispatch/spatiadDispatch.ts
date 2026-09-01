import type { DispatchProvider, DispatchRequest, DispatchResult } from './types'

export class SpatiadDispatchProvider implements DispatchProvider {
  constructor(private readonly endpoint = '/api/dispatch') {}

  async start(request: DispatchRequest): Promise<DispatchResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'start', request }),
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
