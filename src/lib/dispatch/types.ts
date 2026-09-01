export type Coordinates = {
  latitude: number
  longitude: number
}

export type DispatchCandidate = {
  providerId: string
  category?: string | null
  location: Coordinates
  available?: boolean
  score?: number | null
  etaSeconds?: number | null
  distanceMeters?: number | null
}

export type DispatchRequest = {
  serviceId: string
  category: string
  pickup: Coordinates
  initialRadiusKm?: number
  maxRadiusKm?: number
  timeoutSeconds?: number
  preferredProviderId?: string | null
}

export type DispatchOfferState =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled'

export type DispatchJobState =
  | 'pending'
  | 'offering'
  | 'matched'
  | 'failed'
  | 'cancelled'

export type DispatchResult = {
  serviceId: string
  state: DispatchJobState
  providerId?: string | null
  offerId?: string | null
  candidates?: DispatchCandidate[]
  raw?: unknown
}

export interface DispatchProvider {
  start(request: DispatchRequest): Promise<DispatchResult>
  cancel(serviceId: string): Promise<void>
  getStatus(serviceId: string): Promise<DispatchResult>
}
