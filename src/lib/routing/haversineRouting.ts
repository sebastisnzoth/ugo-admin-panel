import type { Coordinates, DispatchCandidate } from '../dispatch/types'
import type { RankedCandidate, RouteSummary, RoutingProvider } from './types'

const EARTH_RADIUS_M = 6_371_000
const DEFAULT_SPEED_MPS = 8.33

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function distanceMeters(a: Coordinates, b: Coordinates) {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export class HaversineRoutingProvider implements RoutingProvider {
  async route(origin: Coordinates, destination: Coordinates): Promise<RouteSummary> {
    const distance = distanceMeters(origin, destination)
    return {
      distanceMeters: Math.round(distance),
      durationSeconds: Math.round(distance / DEFAULT_SPEED_MPS),
    }
  }

  async rankByEta(destination: Coordinates, candidates: DispatchCandidate[]): Promise<RankedCandidate[]> {
    const ranked = candidates.map((candidate) => {
      const distance = distanceMeters(candidate.location, destination)
      return {
        ...candidate,
        distanceMeters: Math.round(distance),
        etaSeconds: Math.round(distance / DEFAULT_SPEED_MPS),
      }
    })
    return ranked.sort((a, b) => a.etaSeconds - b.etaSeconds)
  }
}
