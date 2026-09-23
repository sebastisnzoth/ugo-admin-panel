import { useCallback, useEffect, useState } from 'react'

export type GuidedRequestWhen = 'ahora' | 'hoy' | 'programar'
export type GuidedRequestPickupSource = 'current' | 'saved' | 'manual' | null

export type GuidedRequestDraft = {
  description: string
  categoryId: string
  categoryName: string
  categorySlug: string
  address: string
  addressLabel: string
  when: GuidedRequestWhen
  whenConfirmed: boolean
  scheduleAt: string
  urgent: boolean
  amount: number | null
  preferences: string
  pickupLat: number | null
  pickupLng: number | null
  pickupSource: GuidedRequestPickupSource
}

export const EMPTY_GUIDED_REQUEST_DRAFT: GuidedRequestDraft = {
  description: '',
  categoryId: '',
  categoryName: '',
  categorySlug: '',
  address: '',
  addressLabel: '',
  when: 'hoy',
  whenConfirmed: false,
  scheduleAt: '',
  urgent: false,
  amount: null,
  preferences: '',
  pickupLat: null,
  pickupLng: null,
  pickupSource: null
}

function freshDraft(): GuidedRequestDraft {
  return { ...EMPTY_GUIDED_REQUEST_DRAFT }
}

function readDraft(userId?: string | null): GuidedRequestDraft {
  if (!userId) return freshDraft()
  try {
    const restored = JSON.parse(
      sessionStorage.getItem(`ugo:guided-request-draft:${userId}`) || '{}'
    ) as Partial<GuidedRequestDraft>
    return { ...EMPTY_GUIDED_REQUEST_DRAFT, ...restored }
  } catch (error) {
    console.warn('No pudimos restaurar el borrador local.', error)
    return freshDraft()
  }
}

function readDraftId(userId?: string | null): string {
  if (!userId) return ''
  try {
    const current = sessionStorage.getItem(`ugo:guided-request:${userId}`)
    if (current) return current
    const next = crypto.randomUUID()
    sessionStorage.setItem(`ugo:guided-request:${userId}`, next)
    return next
  } catch (error) {
    console.warn('No pudimos leer o guardar el id del borrador.', error)
    return crypto.randomUUID()
  }
}

export function useGuidedRequestDraft(userId?: string | null) {
  const [draft, setDraft] = useState<GuidedRequestDraft>(() => readDraft(userId))
  const [draftId, setDraftId] = useState(() => readDraftId(userId))

  useEffect(() => {
    setDraft(readDraft(userId))
    setDraftId(readDraftId(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    try {
      sessionStorage.setItem(`ugo:guided-request-draft:${userId}`, JSON.stringify(draft))
    } catch (error) {
      console.warn('No pudimos persistir el borrador local.', error)
    }
  }, [draft, userId])

  const resetDraft = useCallback(() => {
    const nextDraft = freshDraft()
    setDraft(nextDraft)
    if (!userId) {
      setDraftId('')
      return
    }

    const nextDraftId = crypto.randomUUID()
    setDraftId(nextDraftId)
    try {
      sessionStorage.removeItem(`ugo:guided-request-draft:${userId}`)
      sessionStorage.setItem(`ugo:guided-request:${userId}`, nextDraftId)
    } catch (error) {
      console.warn('No pudimos preparar el próximo borrador.', error)
    }
  }, [userId])

  const saveLastLocation = useCallback((latitude: number, longitude: number) => {
    if (!userId) return
    try {
      sessionStorage.setItem(
        'ugo:last-client-location',
        JSON.stringify({ latitude, longitude, at: Date.now() })
      )
    } catch (error) {
      console.warn('No pudimos persistir la última ubicación del cliente.', error)
    }
  }, [userId])

  const loadLastLocation = useCallback(() => {
    if (!userId) return null
    try {
      const value = sessionStorage.getItem('ugo:last-client-location')
      return value ? JSON.parse(value) as { latitude: number; longitude: number; at: number } : null
    } catch (error) {
      console.warn('No pudimos leer la última ubicación del cliente.', error)
      return null
    }
  }, [userId])

  return {
    draft,
    setDraft,
    draftId,
    setDraftId,
    resetDraft,
    saveLastLocation,
    loadLastLocation
  }
}
