import type { Coordinates, DispatchCandidate } from '../dispatch/types'
import type { RankedCandidate, RouteSummary, RoutingProvider } from './types'
import { HaversineRoutingProvider } from './haversineRouting'

export class OsrmRoutingProvider implements RoutingProvider {
  private readonly fallback = new HaversineRoutingProvider()

  constructor(private readonly endpoint = '/api/test?routing=1') {}

  async route(origin: Coordinates, destination: Coordinates): Promise<RouteSummary> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'route', origin, destination }),
      })
      if (!response.ok) throw new Error(`OSRM route ${response.status}`)
      return (await response.json()) as RouteSummary
    } catch {
      return this.fallback.route(origin, destination)
    }
  }

  async rankByEta(destination: Coordinates, candidates: DispatchCandidate[]): Promise<RankedCandidate[]> {
    if (!candidates.length) return []
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'table', destination, candidates }),
      })
      if (!response.ok) throw new Error(`OSRM table ${response.status}`)
      return (await response.json()) as RankedCandidate[]
    } catch {
      return this.fallback.rankByEta(destination, candidates)
    }
  }
}
