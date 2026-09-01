import type { Coordinates, DispatchCandidate } from '../dispatch/types'

export type RouteSummary = {
  distanceMeters: number
  durationSeconds: number
  geometry?: unknown
}

export type RankedCandidate = DispatchCandidate & {
  etaSeconds: number
  distanceMeters: number
}

export interface RoutingProvider {
  route(origin: Coordinates, destination: Coordinates): Promise<RouteSummary>
  rankByEta(destination: Coordinates, candidates: DispatchCandidate[]): Promise<RankedCandidate[]>
}
