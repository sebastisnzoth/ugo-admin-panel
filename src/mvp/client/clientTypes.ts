export type ClientScreen = 'auth' | 'onboarding' | 'home' | 'search' | 'provider' | 'request' | 'matching' | 'service' | 'payment' | 'review' | 'history' | 'profile' | 'dispute'

export type ClientHugoIntent = {
  id: number
  text: string
  categoryHint?: string | null
  urgent?: boolean
  description?: string | null
}

export type ClientActionHandlers = {
  openSearch: () => void
  openProvider: (providerId?: string) => void
  selectProvider: (providerId: string, providerName?: string | null) => void
  createService: () => Promise<boolean>
  startMatching: () => Promise<boolean>
  cancelService: () => Promise<boolean>
  openPayment: () => Promise<boolean>
  approveService: () => Promise<boolean>
  openReview: () => void
  openHistory: () => void
  openProfile: () => void
  openDispute: () => void
}
