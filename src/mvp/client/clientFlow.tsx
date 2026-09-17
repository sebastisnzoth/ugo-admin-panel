import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientActionHandlers, ClientHugoIntent, ClientScreen } from './clientTypes'

const noop = () => {}
const unavailable = async () => false
const GUIDED_TEXT_EVENT = 'ugo:client:focus-hugo-text'

const emptyActions: ClientActionHandlers = {
  openSearch: noop, openProvider: noop, selectProvider: noop, createService: unavailable,
  startMatching: unavailable, cancelService: unavailable, openPayment: unavailable,
  approveService: unavailable, openReview: noop, openHistory: noop, openProfile: noop, openDispute: noop,
}

type ClientFlow = {
  screen: ClientScreen
  providerId: string | null
  hugoIntent: ClientHugoIntent | null
  actions: ClientActionHandlers
  navigate: (screen: ClientScreen, providerId?: string | null) => void
  publishHugoIntent: (intent: Omit<ClientHugoIntent, 'id'>) => void
  registerActions: (actions: Partial<ClientActionHandlers>) => () => void
}

const ClientFlowContext = createContext<ClientFlow | null>(null)

export function ClientFlowProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ClientScreen>('home')
  const [providerId, setProviderId] = useState<string | null>(null)
  const [hugoIntent, setHugoIntent] = useState<ClientHugoIntent | null>(null)
  const handlersRef = useRef<Partial<ClientActionHandlers>>({})
  const intentId = useRef(0)

  const navigate = useCallback((next: ClientScreen, nextProviderId: string | null = null) => {
    setScreen(next)
    setProviderId(nextProviderId)
  }, [])
  const publishHugoIntent = useCallback((intent: Omit<ClientHugoIntent, 'id'>) => {
    setHugoIntent({ ...intent, id: ++intentId.current })
    // The guided request is the canonical order composer. Mount it first, then
    // deliver the selected category/intent. This prevents Home from losing the
    // event while ClientGuidedRequest is still unmounted.
    setScreen('request')
    setProviderId(null)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(GUIDED_TEXT_EVENT, { detail: { text: intent.text, send: true } }))
    }, 0)
  }, [])
  const registerActions = useCallback((next: Partial<ClientActionHandlers>) => {
    handlersRef.current = { ...handlersRef.current, ...next }
    return () => {
      for (const key of Object.keys(next) as Array<keyof ClientActionHandlers>) {
        if (handlersRef.current[key] === next[key]) delete handlersRef.current[key]
      }
    }
  }, [])
  const actions = useMemo(() => Object.fromEntries(
    (Object.keys(emptyActions) as Array<keyof ClientActionHandlers>).map(key => [key, (...args: never[]) => {
      const handler = handlersRef.current[key] || emptyActions[key]
      return (handler as (...values: never[]) => unknown)(...args)
    }]),
  ) as ClientActionHandlers, [])

  useEffect(() => {
    // Service cards are themselves an entry point to the order journey on
    // mobile. Keep the Home implementation reusable while guaranteeing that a
    // category tap continues immediately into the canonical guided request.
    const onCategoryTap = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.ugo-studio-services button') : null
      if (!target || target.disabled) return
      const label = target.querySelector('strong')?.textContent?.trim()
      if (!label) return
      window.setTimeout(() => publishHugoIntent({ text: `Necesito ${label}`, categoryHint: label, urgent: false, description: null }), 0)
    }
    document.addEventListener('click', onCategoryTap)
    return () => document.removeEventListener('click', onCategoryTap)
  }, [publishHugoIntent])

  return <ClientFlowContext.Provider value={{ screen, providerId, hugoIntent, actions, navigate, publishHugoIntent, registerActions }}>{children}</ClientFlowContext.Provider>
}

export function useClientFlow() {
  const value = useContext(ClientFlowContext)
  if (!value) throw new Error('useClientFlow debe usarse dentro de ClientFlowProvider')
  return value
}
