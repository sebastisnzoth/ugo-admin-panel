/**
 * Pix after-service eligibility must be an explicit per-service TEST contract.
 * Browser flags alone never authorize financial behavior or lifecycle bypass.
 * Server-side RLS/RPC must enforce identical conditions independently.
 */
export type DeferredPixService = {
 ambiente?: string | null
 moneda?: string | null
 metadata?: Record<string, unknown> | null
}
export function deferredPixPilotEligible(service: DeferredPixService | null | undefined): boolean {
 if (!service || service.ambiente !== 'demo' || (service.moneda || 'BRL') !== 'BRL') return false
 const metadata = service.metadata || {}
 return metadata.pix_after_service_authorized === true &&
  metadata.payment_timing === 'after_service' &&
  String(metadata.requested_payment_method || metadata.payment_method || '').toLowerCase() === 'pix'
}
