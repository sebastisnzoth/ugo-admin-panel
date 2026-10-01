import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness = JSON.parse(fs.readFileSync(new URL('../../docs/UGO_FUNCTIONAL_READINESS.json', import.meta.url), 'utf8'))
const group = readiness.groups.find(group => group.id === 'client-provider-flow-recovery')
const byId = new Map((group?.items || []).map(item => [item.id, item]))

test('Command Center registers the full client-provider recovery epic', () => {
  assert.ok(group)
  assert.equal(group.items.length, 18)
  for (const id of [
    'provider-realtime-location','provider-profile-photo','provider-operating-zone','proximity-matching',
    'provider-proximity-alert','request-payment-before-dispatch','admin-assignment-payment-guard',
    'provider-active-jobs','client-provider-lifecycle','hugo-gemini-live-core',
    'hugo-client-order-by-voice','hugo-provider-actions','hugo-admin-actions',
    'hugo-conversation-continuity','hugo-real-runtime-proof','cross-realtime-consistency',
    'cross-errors-recovery','end-to-end-command-center-gate'
  ]) assert.ok(byId.has(id), id)
})

test('Recovery epic encodes the required dependency gates', () => {
  assert.deepEqual(byId.get('provider-operating-zone').depends_on, ['provider-realtime-location'])
  assert.deepEqual(byId.get('proximity-matching').depends_on, ['provider-operating-zone'])
  assert.deepEqual(byId.get('provider-proximity-alert').depends_on, ['proximity-matching'])
  assert.deepEqual(byId.get('admin-assignment-payment-guard').depends_on, ['request-payment-before-dispatch'])
  assert.deepEqual(byId.get('provider-active-jobs').depends_on, ['admin-assignment-payment-guard'])
  assert.deepEqual(byId.get('hugo-conversation-continuity').depends_on, ['hugo-gemini-live-core'])
  assert.ok(byId.get('hugo-client-order-by-voice').depends_on.includes('request-payment-before-dispatch'))
  assert.deepEqual(byId.get('hugo-real-runtime-proof').depends_on, ['hugo-admin-actions'])
  assert.ok(byId.get('client-provider-lifecycle').depends_on.includes('provider-proximity-alert'))
  assert.deepEqual(byId.get('end-to-end-command-center-gate').depends_on.sort(), ['cross-errors-recovery','cross-realtime-consistency'])
})

test('Recovery controls remain proof-gated and reconcile equivalent existing controls', () => {
  for (const item of group.items) {
    assert.ok(['NEEDS_RUNTIME_PROOF','HUMAN_FINAL','VERIFIED'].includes(item.status), `${item.id}: ${item.status}`)
    assert.match(item.improvement_focus, /runtime/)
    assert.equal(typeof item.done_evidence, 'string')
    assert.ok(item.done_evidence.trim().length > 12)
  }
  assert.deepEqual(byId.get('provider-realtime-location').reconciles_with, ['provider-gps'])
  assert.ok(byId.get('provider-proximity-alert').reconciles_with.includes('provider-notifications'))
  assert.deepEqual(byId.get('request-payment-before-dispatch').reconciles_with, ['client-payment'])
  assert.deepEqual(byId.get('hugo-conversation-continuity').reconciles_with, ['hugo-continuity'])
})
