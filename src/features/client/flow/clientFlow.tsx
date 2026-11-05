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
  navigate: (screen: ClientScreen, providerId?: string | null, beforeNavigate?: () => void) => void
  registerLeaveGuard: (guard: () => Promise<boolean>) => () => void
  requestLeave: () => Promise<boolean>
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
  const screenRef = useRef(screen)
  screenRef.current = screen
  const leaveGuard = useRef<(() => Promise<boolean>) | null>(null)
  const pendingLeave = useRef<Promise<boolean> | null>(null)
  const registerLeaveGuard = useCallback((guard: () => Promise<boolean>) => {
    leaveGuard.current = guard
    return () => { if (leaveGuard.current === guard) leaveGuard.current = null }
  }, [])
  const requestLeave = useCallback((): Promise<boolean> => {
    if (!leaveGuard.current) return Promise.resolve(true)
    if (pendingLeave.current) return pendingLeave.current
    const guard = leaveGuard.current
    const pending = Promise.resolve().then(guard).catch(() => false).finally(() => { if (pendingLeave.current === pending) pendingLeave.current = null })
    pendingLeave.current = pending
    return pending
  }, [])

  const navigate = useCallback((next: ClientScreen, nextProviderId: string | null = null, beforeNavigate?: () => void) => {
    const resolved=LEGACY_SCREEN_REDIRECT[next]||next
    const apply=()=>{beforeNavigate?.();setScreen(resolved);setProviderId(resolved==='home'||resolved==='history'?null:nextProviderId)}
    if (leaveGuard.current && screenRef.current!==resolved) { void requestLeave().then(ok=>{if(ok)apply()});return }
    apply()
  }, [requestLeave])
  const publishHugoIntent = useCallback((intent: Omit<ClientHugoIntent, 'id'>) => {
    const apply=()=>{setHugoIntent({ ...intent, id: ++intentId.current });setScreen('request');setProviderId(null)}
    if (leaveGuard.current && screenRef.current!=='request') { void requestLeave().then(ok=>{if(ok)apply()});return }
    apply()
  }, [requestLeave])

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

  return <ClientFlowContext.Provider value={{ screen, providerId, hugoIntent, actions, navigate, publishHugoIntent, registerActions, registerLeaveGuard, requestLeave }}>{children}</ClientFlowContext.Provider>
}

export function useClientFlow() {
  const value = useContext(ClientFlowContext)
  if (!value) throw new Error('useClientFlow debe usarse dentro de ClientFlowProvider')
  return value
}
