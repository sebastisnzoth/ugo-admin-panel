import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFunctionalReadiness } from '../../scripts/ugo-readiness-engine.mjs'

const catalog = {
  groups: [{
    id: 'autonomous',
    title: 'UGO Empresa Autónoma',
    items: [{
      id: 'auto-killswitch',
      title: 'Kill switches y modo seguro',
      owner: 'UGO',
      status: 'NEEDS_RUNTIME_PROOF',
      depends_on: [],
      priority: 'NORMAL',
      resources: ['autonomy-state'],
      real_test_required: false,
    }],
  }],
}

const failedLock = {
  readiness_id: 'auto-killswitch',
  task_id: 'readiness-auto-killswitch',
  status: 'FAILED',
  attempt: 1,
  started_at: '2026-09-30T10:00:00Z',
  heartbeat_at: '2026-09-30T10:10:00Z',
  finished_at: '2026-09-30T10:10:00Z',
  resources: ['autonomy-state'],
}

test('failed readiness waits during backoff', () => {
  const { readiness, summary } = evaluateFunctionalReadiness({
    functionalReadiness: catalog,
    locks: [failedLock],
    maxParallel: 5,
    maxAttempts: 3,
    retryBackoffMinutes: [5, 15, 30],
    now: new Date('2026-09-30T10:12:00Z'),
  })
  const item = readiness.groups[0].items[0]
  assert.equal(item.gate_state, 'RETRY_BACKOFF')
  assert.equal(item.retry_at, '2026-09-30T10:15:00.000Z')
  assert.equal(summary.retry_backoff, 1)
  assert.equal(summary.available_now, 0)
})

test('failed readiness becomes available after backoff when attempts remain', () => {
  const { readiness, summary } = evaluateFunctionalReadiness({
    functionalReadiness: catalog,
    locks: [failedLock],
    maxParallel: 5,
    maxAttempts: 3,
    retryBackoffMinutes: [5, 15, 30],
    now: new Date('2026-09-30T10:16:00Z'),
  })
  const item = readiness.groups[0].items[0]
  assert.equal(item.status, 'NEEDS_RUNTIME_PROOF')
  assert.equal(item.gate_state, 'AVAILABLE')
  assert.equal(summary.available_now, 1)
  assert.deepEqual(summary.runnable_ids, ['auto-killswitch'])
})

test('failed readiness requires review only after max attempts', () => {
  const { readiness, summary } = evaluateFunctionalReadiness({
    functionalReadiness: catalog,
    locks: [{...failedLock, attempt: 3}],
    maxParallel: 5,
    maxAttempts: 3,
    retryBackoffMinutes: [5, 15, 30],
    now: new Date('2026-09-30T11:00:00Z'),
  })
  const item = readiness.groups[0].items[0]
  assert.equal(item.gate_state, 'FAILED_REQUIRES_REVIEW')
  assert.equal(summary.failed_review, 1)
  assert.equal(summary.available_now, 0)
})
