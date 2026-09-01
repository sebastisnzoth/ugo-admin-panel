import type { RoutingProvider } from './types'
import { HaversineRoutingProvider } from './haversineRouting'
import { OsrmRoutingProvider } from './osrmRouting'

export function getRoutingProvider(): RoutingProvider {
  const engine = String(import.meta.env.VITE_ROUTING_ENGINE || 'haversine').toLowerCase()
  if (engine === 'osrm') return new OsrmRoutingProvider()
  return new HaversineRoutingProvider()
}
