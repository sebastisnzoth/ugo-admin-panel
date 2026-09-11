export type ProviderScreen = 'home' | 'demand' | 'opportunities' | 'opportunity-detail' | 'active-job' | 'earnings' | 'profile' | 'history' | 'dispute'

export type ProviderOperationalState = 'offline' | 'available' | 'opportunity_pending' | 'assigned' | 'payment_pending' | 'en_camino' | 'llegado' | 'en_progreso' | 'esperando_aprobacion' | 'completed'

export type ProviderOpportunity = {
  id: string
  category: string
  title: string
  description: string
  zone: string
  distanceKm: number
  estimatedValue: number
  requestedAt: string
  urgency: 'normal' | 'urgent'
  matchScore?: number
}

export type DemandSignal = {
  id: string
  category: string
  zone: string
  distanceKm: number
  estimatedValue?: number
  requestedAt: string
  urgency: 'low' | 'medium' | 'high'
  demandLevel: 'low' | 'medium' | 'high'
}

export type ProviderActionHandlers = {
  openHome: () => void
  openDemand: () => void
  openOpportunities: () => void
  openOpportunity: (id: string) => void
  acceptOpportunity: (id: string) => Promise<boolean>
  rejectOpportunity: (id: string) => Promise<boolean>
  openActiveJob: () => void
  openEarnings: () => void
  openProfile: () => void
  openHistory: () => void
  openDispute: () => void
}
