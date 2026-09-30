import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleTasks } from '../../scripts/ugo-scheduler-engine.mjs'

const basePolicy = {
  version: 'TEST',
  max_parallel_tasks: 5,
  max_attempts: 3,
  retry_backoff_minutes: [5, 15, 30],
  priorities: { CRITICAL: 100, HIGH: 80, NORMAL: 50, LOW: 20 },
  resource_capacities: {
    r1: 1,
    r2: 1,
    shared: 1,
    pooled: 2,
  },
  task_policies: {},
  defer_human_gates_until_autonomous_exhausted: true,
}

const task = (id, resources = [id], order = 1) => ({
  id,
  order,
  depends_on: [],
  resources,
})

const activeLock = (taskId, resources, lease = '2026-09-30T02:30:00Z') => ({
  task_id: taskId,
  status: 'IN_PROGRESS',
  started_at: '2026-09-30T01:00:00Z',
  heartbeat_at: '2026-09-30T01:20:00Z',
  lease_expires_at: lease,
  resources,
})

test('scheduler selects at most five independent jobs', () => {
  const tasks = Array.from({ length: 6 }, (_, i) => task(`job-${i + 1}`, [`res-${i + 1}`], i + 1))
  const policy = {
    ...basePolicy,
    resource_capacities: Object.fromEntries(tasks.map(t => [t.resources[0], 1])),
  }

  const plan = scheduleTasks({
    tasks,
    locks: [],
    policy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.equal(plan.activeLocks.length, 0)
  assert.equal(plan.runnable.length, 5)
  assert.equal(plan.summary.max_parallel_tasks, 5)
  assert.equal(tasks.filter(t => t.gate_state === 'AVAILABLE').length, 5)
  assert.equal(tasks.filter(t => t.gate_state === 'QUEUED_CAPACITY').length, 1)
  assert.equal(plan.summary.available_slots_after_plan, 0)
})

test('resource conflict permits only one selected job for capacity one', () => {
  const tasks = [
    task('first', ['shared'], 1),
    task('second', ['shared'], 2),
    task('third', ['r2'], 3),
  ]

  const plan = scheduleTasks({
    tasks,
    locks: [],
    policy: basePolicy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.deepEqual(plan.runnable.map(t => t.id), ['first', 'third'])
  assert.equal(tasks.find(t => t.id === 'second').gate_state, 'WAITING_RESOURCE_CAPACITY')
})

test('active lease consumes one global slot and blocks its saturated resource', () => {
  const tasks = [
    task('locked-job', ['shared'], 1),
    task('conflicting-job', ['shared'], 2),
    task('free-1', ['r1'], 3),
    task('free-2', ['r2'], 4),
  ]

  const plan = scheduleTasks({
    tasks,
    locks: [activeLock('locked-job', ['shared'])],
    policy: basePolicy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.equal(tasks.find(t => t.id === 'locked-job').gate_state, 'IN_PROGRESS')
  assert.equal(tasks.find(t => t.id === 'conflicting-job').gate_state, 'WAITING_RESOURCE_CAPACITY')
  assert.equal(plan.summary.active_leases, 1)
  assert.equal(plan.runnable.length, 2)
  assert.equal(plan.summary.available_slots_after_plan, 2)
})

test('resource capacity greater than one allows compatible parallel jobs up to capacity', () => {
  const tasks = [
    task('pool-1', ['pooled'], 1),
    task('pool-2', ['pooled'], 2),
    task('pool-3', ['pooled'], 3),
  ]

  const plan = scheduleTasks({
    tasks,
    locks: [],
    policy: basePolicy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.deepEqual(plan.runnable.map(t => t.id), ['pool-1', 'pool-2'])
  assert.equal(tasks.find(t => t.id === 'pool-3').gate_state, 'WAITING_RESOURCE_CAPACITY')
})

test('stale own lease fails closed and requires reconciliation before retry', () => {
  const tasks = [task('stale-job', ['shared'], 1)]
  const stale = activeLock('stale-job', ['shared'], '2026-09-30T01:29:59Z')

  const plan = scheduleTasks({
    tasks,
    locks: [stale],
    policy: basePolicy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.equal(plan.activeLocks.length, 0)
  assert.equal(plan.staleLocks.length, 1)
  assert.equal(tasks[0].gate_state, 'STALE_LOCK')
  assert.equal(plan.runnable.length, 0)
})

test('latest lock state wins so an older active lease cannot ghost-block a completed task', () => {
  const tasks = [task('same-job', ['shared'], 1)]
  const locks = [
    activeLock('same-job', ['shared']),
    {
      task_id: 'same-job',
      status: 'DONE',
      started_at: '2026-09-30T01:10:00Z',
      finished_at: '2026-09-30T01:15:00Z',
      resources: ['shared'],
    },
  ]

  const plan = scheduleTasks({
    tasks,
    locks,
    policy: basePolicy,
    now: new Date('2026-09-30T01:30:00Z'),
  })

  assert.equal(plan.activeLocks.length, 0)
  assert.equal(plan.staleLocks.length, 0)
  assert.equal(tasks[0].gate_state, 'AVAILABLE')
  assert.equal(plan.runnable.length, 1)
})
