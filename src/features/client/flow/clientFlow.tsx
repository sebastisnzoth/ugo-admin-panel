/* eslint-disable react-refresh/only-export-components -- co-locación intencional de Context + Provider + hook */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ClientActionHandlers, ClientHugoIntent, ClientScreen } from '../types/clientTypes'
import { useClientCategoryShortcut } from '../hooks/useClientCategoryShortcut'

const noop = () => {}
const unavailable = async () => false
const LEGACY_SCREEN_REDIRECT:Partial<Record<ClientScreen,ClientScreen>>={search:'home',provider:'home',matching:'history',service:'history',payment:'history',review:'history'}
const emptyActions: ClientActionHandlers = {
  openSearch: noop, openProvider: noop, selectProvider: noop, createService: unavailable,
  startMatching: unavailable, cancelService: unavailable, openPayment: unavailable,
  approveService: unavailable, confirmCashPayment: unavailable, rateService: unavailable,
  openReview: noop, openHistory: noop, openProfile: noop, openDispute: noop,
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
    const resolved=LEGACY_SCREEN_REDIRECT[next]||next
    setScreen(resolved)
    setProviderId(resolved==='home'||resolved==='history'?null:nextProviderId)
  }, [])
  const publishHugoIntent = useCallback((intent: Omit<ClientHugoIntent, 'id'>) => {
    setHugoIntent({ ...intent, id: ++intentId.current })
    setScreen('request')
    setProviderId(null)
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

  useClientCategoryShortcut(publishHugoIntent)

  return <ClientFlowContext.Provider value={{ screen, providerId, hugoIntent, actions, navigate, publishHugoIntent, registerActions }}>{children}</ClientFlowContext.Provider>
}

export function useClientFlow() {
  const value = useContext(ClientFlowContext)
  if (!value) throw new Error('useClientFlow debe usarse dentro de ClientFlowProvider')
  return value
}
