import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export type SubscribeRealtimeChannelOptions = {
  /** Resync de datos: se ejecuta al suscribirse y ante cualquier error de canal. */
  onSync: () => void
  /** Re-suscripción: se ejecuta cuando el canal falla (el caller re-crea el canal, p.ej. con un epoch). */
  onReconnect?: () => void
  /** Estado bruto del canal, para quien necesite reflejarlo en UI (p.ej. indicador "en vivo"). */
  onStatus?: (status: string) => void
  /** Reintentos máximos de re-suscripción antes de rendirse (default 5). */
  maxAttempts?: number
}

/**
 * S-02 — patrón estándar de suscripción Realtime UGO:
 * - `SUBSCRIBED` → resync inmediato.
 * - `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` → resync + `onReconnect` con backoff exponencial (1 s → 15 s, máx. 5 intentos por defecto).
 * - El `dispose()` devuelto limpia el timer y garantiza `removeChannel`.
 */
export function subscribeRealtimeChannel(channel: RealtimeChannel, supabase: SupabaseClient, options: SubscribeRealtimeChannelOptions): () => void {
  let attempts = 0
  let timer: number | undefined
  let disposed = false
  const maxAttempts = options.maxAttempts ?? 5
  const scheduleReconnect = () => {
    if (disposed || !options.onReconnect || attempts >= maxAttempts) return
    attempts += 1
    const delay = Math.min(1000 * 2 ** (attempts - 1), 15000)
    timer = window.setTimeout(() => {
      if (!disposed) options.onReconnect?.()
    }, delay)
  }
  channel.subscribe((status: string) => {
    options.onStatus?.(status)
    if (status === 'SUBSCRIBED') {
      attempts = 0
      options.onSync()
      return
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      options.onSync()
      scheduleReconnect()
    }
  })
  return () => {
    disposed = true
    if (timer !== undefined) window.clearTimeout(timer)
    void supabase.removeChannel(channel).catch(() => undefined)
  }
}
