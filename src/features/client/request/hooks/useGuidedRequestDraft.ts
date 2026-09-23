import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoleSession } from '../../shared'

export type GuidedRequestDraft = {
  description: string
  categoryId: string
  categoryName: string
  categorySlug: string
  address: string
  addressLabel: string
  when: 'ahora' | 'hoy' | 'programar'
  whenConfirmed: boolean
  scheduleAt: string
  urgent: boolean
  amount: number | null
  preferences: string
  pickupLat: number | null
  pickupLng: number | null
  pickupSource: 'current' | 'saved' | 'manual' | null
}

export function useGuidedRequestDraft() {
  const { session } = useRoleSession('client')
  const [draft, setDraft] = useState<GuidedRequestDraft>(() => {
    const emptyDraft: GuidedRequestDraft = {
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
    
    if (!session?.user.id) return emptyDraft
    
    try {
      const restored = JSON.parse(
        sessionStorage.getItem(`ugo:guided-request-draft:${session.user.id}`) || '{}'
      ) as Partial<GuidedRequestDraft>
      return { ...emptyDraft, ...restored }
    } catch (error) {
      console.warn('No pudimos restaurar el borrador local.', error)
      return emptyDraft
    }
  })
  
  const [draftId, setDraftId] = useState<string>(() => {
    if (!session?.user.id) return ''
    
    try {
      const id = sessionStorage.getItem(`ugo:guided-request:${session.user.id}`)
      if (id) return id
      
      const newId = crypto.randomUUID()
      sessionStorage.setItem(`ugo:guided-request:${session.user.id}`, newId)
      return newId
    } catch (error) {
      console.warn('No pudimos leer o guardar el id del borrador.', error)
      return crypto.randomUUID()
    }
  })
  
  const saveDraft = useCallback(() => {
    if (!session?.user.id) return
    
    try {
      sessionStorage.setItem(`ugo:guided-request-draft:${session.user.id}`, JSON.stringify(draft))
    } catch (error) {
      console.warn('No pudimos persistir el borrador local.', error)
    }
  }, [draft, session?.user.id])
  
  const saveLastLocation = useCallback((latitude: number, longitude: number) => {
    if (!session?.user.id) return
    
    try {
      sessionStorage.setItem(
        'ugo:last-client-location',
        JSON.stringify({ latitude, longitude, at: Date.now() })
      )
    } catch (error) {
      console.warn('No pudimos persistir la última ubicación del cliente.', error)
    }
  }, [session?.user.id])
  
  const loadLastLocation = useCallback(() => {
    if (!session?.user.id) return null
    
    try {
      const data = sessionStorage.getItem('ugo:last-client-location')
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn('No pudimos leer la última ubicación del cliente.', error)
      return null
    }
  }, [session?.user.id])
  
  // Save draft whenever it changes
  useEffect(() => {
    saveDraft()
  }, [draft, saveDraft])
  
  // Reset to empty draft when session changes
  useEffect(() => {
    if (!session?.user.id) {
      setDraft({
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
      })
      
      try {
        sessionStorage.removeItem(`ugo:guided-request-draft:${session.user.id}`)
        sessionStorage.removeItem(`ugo:guided-request:${session.user.id}`)
      } catch (error) {
        console.warn('No pudimos limpiar el borrador local.', error)
      }
    }
  }, [session?.user.id])
  
  return {
    draft,
    setDraft,
    draftId,
    setDraftId,
    saveLastLocation,
    loadLastLocation
  }
}