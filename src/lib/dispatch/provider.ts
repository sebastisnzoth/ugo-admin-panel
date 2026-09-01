import type { DispatchProvider } from './types'
import { SupabaseDispatchProvider } from './supabaseDispatch'
import { SpatiadDispatchProvider } from './spatiadDispatch'

export function getDispatchProvider(): DispatchProvider {
  const engine = String(import.meta.env.VITE_DISPATCH_ENGINE || 'supabase').toLowerCase()
  if (engine === 'spatiad') return new SpatiadDispatchProvider()
  return new SupabaseDispatchProvider()
}
