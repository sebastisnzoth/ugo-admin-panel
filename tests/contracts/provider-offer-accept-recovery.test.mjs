import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../src/mvp/provider/providerService.ts', import.meta.url), 'utf8')

test('provider offer acceptance recovery is tri-state before Sentinel severity is chosen', () => {
  assert.match(source, /persistedAcceptedOpportunity\([^)]*\):Promise<boolean\|null>/)
  assert.match(source, /if\(offerError\)return null/)
  assert.match(source, /if\(serviceError\)return null/)
  assert.match(source, /const persisted=await persistedAcceptedOpportunity\(supabase,id,serviceId\)/)
  assert.match(source, /if\(persisted===true\)return/)
  assert.match(source, /if\(persisted===false\)\{[\s\S]*severity:'P0'[\s\S]*action:'provider\.offer\.accept'/)
  assert.match(source, /eventType:'provider_accept_offer_recovery_unverified'[\s\S]*severity:'P1'[\s\S]*action:'provider\.offer\.accept\.recovery'/)
})

test('provider offer acceptance no longer treats unreadable persistence as confirmed failure', () => {
  assert.doesNotMatch(source, /if\(await hasPersistedAcceptedOpportunity/)
  assert.match(source, /persisted===null\?'P1':'P2'/)
})
