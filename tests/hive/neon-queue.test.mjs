import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyMigrations, migrationSql } from './hive-sql.mjs'

const sql = migrationSql()

async function fresh() {
  const dir = mkdtempSync(join(tmpdir(), 'ugo-hive-neon-'))
  const db = new PGlite(dir)
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;`)
  await applyMigrations(db)
  return {
    dir,
    db,
    async close() {
      await db.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

const call = async (db, fn, params = []) => (await db.query(`select hive.${fn}(${params.map((_, i) => `$${i + 1}`).join(',')}) as r`, params)).rows[0].r

test('the schema is idempotent and its catalog is the canonical 13 departments', async () => {
  const { db, close } = await fresh()
  try {
    await applyMigrations(db) // second application must be a no-op, not an error
    const departments = await db.query('select id, name from hive.departments order by id')
    assert.deepEqual(departments.rows.map(row => row.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14])
    const settings = await db.query(`select count(*)::int as n from hive.settings`)
    assert.equal(settings.rows[0].n, 6)
    // The destination gate records which project this database belongs to.
    assert.equal((await db.query(`select value from hive.meta where key='neon_project_id'`)).rows[0].value, 'dry-heart-24391962')
    // A non-empty base is never assumed: applying twice must not multiply the census.
    assert.equal((await db.query(`select count(*)::int as n from hive.agents`)).rows[0].n, 118)
    // Defaults must be conservative: one job at a time, bounded retries.
    assert.equal((await db.query(`select hive.setting_int('max_concurrent_jobs', 99) as v`)).rows[0].v, 1)
    assert.equal((await db.query(`select hive.setting_int('default_max_attempts', 99) as v`)).rows[0].v, 3)
  } finally {
    await close()
  }
})

test('enqueue is idempotent: the same key never creates a second job', async () => {
  const { db, close } = await fresh()
  try {
    const first = await call(db, 'enqueue_job', ['mission-001-alpha', 9, null, 100, { task: 'review' }])
    const again = await call(db, 'enqueue_job', ['mission-001-alpha', 9, null, 100, { task: 'review' }])
    assert.equal(first.deduplicated, false)
    assert.equal(again.deduplicated, true)
    assert.equal(again.job_id, first.job_id)
    const count = await db.query('select count(*)::int as n from hive.jobs')
    assert.equal(count.rows[0].n, 1)
    // Rejections are explicit, never silent.
    await assert.rejects(call(db, 'enqueue_job', ['short', 9]), /INVALID_IDEMPOTENCY_KEY/)
    await assert.rejects(call(db, 'enqueue_job', ['mission-002-beta', 13]), /INVALID_DEPARTMENT/)
  } finally {
    await close()
  }
})

test('reservation holds one job at a time and releases the slot on completion', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-010-j1', 2])
    await call(db, 'enqueue_job', ['mission-010-j2', 2])
    const first = await call(db, 'reserve_job', ['worker-a', 120])
    assert.equal(first.leased, true)
    const second = await call(db, 'reserve_job', ['worker-b', 120])
    assert.equal(second.leased, false)
    assert.equal(second.code, 'CONCURRENCY_LIMIT')
    const done = await call(db, 'complete_job', [first.job.id, 'worker-a', first.lease_token, { ok: true }])
    assert.equal(done.code, 'SUCCEEDED')
    const third = await call(db, 'reserve_job', ['worker-b', 120])
    assert.equal(third.leased, true)
    assert.notEqual(third.job.id, first.job.id)
  } finally {
    await close()
  }
})

test('a lease can only be used by its owner and only while it is valid', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-020-j1', 8])
    const lease = await call(db, 'reserve_job', ['worker-a', 60])
    assert.equal((await call(db, 'complete_job', [lease.job.id, 'worker-b', lease.lease_token, {}])).code, 'LEASE_LOST')
    assert.equal((await call(db, 'heartbeat_job', [lease.job.id, 'worker-b', lease.lease_token, 60])).code, 'LEASE_LOST')
    await db.exec(`update hive.jobs set lease_expires_at = now() - interval '1 second' where id = '${lease.job.id}'`)
    assert.equal((await call(db, 'complete_job', [lease.job.id, 'worker-a', lease.lease_token, {}])).code, 'LEASE_LOST')
  } finally {
    await close()
  }
})

test('interrupted work is recovered exactly once and never duplicated', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-030-j1', 2])
    const lease = await call(db, 'reserve_job', ['worker-a', 60])
    await db.exec(`update hive.jobs set lease_expires_at = now() - interval '5 seconds' where id = '${lease.job.id}'`)
    const recovered = await call(db, 'recover_expired_leases', [50])
    assert.deepEqual({ requeued: recovered.requeued, failed: recovered.failed }, { requeued: 1, failed: 0 })
    const row = (await db.query(`select state, attempts, idempotency_key from hive.jobs where id = '${lease.job.id}'`)).rows[0]
    assert.equal(row.state, 'QUEUED')
    assert.equal(row.attempts, 1)
    assert.equal((await db.query('select count(*)::int as n from hive.jobs')).rows[0].n, 1)
    // A second recovery pass finds nothing stale: no loops.
    assert.equal((await call(db, 'recover_expired_leases', [50])).requeued, 0)
    const events = await db.query(`select event from hive.job_events where job_id = '${lease.job.id}' order by id`)
    assert.deepEqual(events.rows.map(row => row.event), ['ENQUEUED', 'LEASED', 'LEASE_RECOVERED'])
  } finally {
    await close()
  }
})

test('a healthy heartbeat protects a running job from recovery', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-040-j1', 8])
    const lease = await call(db, 'reserve_job', ['worker-a', 60])
    const beat = await call(db, 'heartbeat_job', [lease.job.id, 'worker-a', lease.lease_token, 60])
    assert.equal(beat.code, 'HEARTBEAT')
    assert.equal((await call(db, 'recover_expired_leases', [50])).requeued, 0)
    assert.equal((await db.query(`select state from hive.jobs where id = '${lease.job.id}'`)).rows[0].state, 'LEASED')
  } finally {
    await close()
  }
})

test('retries are bounded, back off and end in FAILED without an infinite loop', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-050-j1', 9, null, 100, {}, null, 2])
    const first = await call(db, 'reserve_job', ['worker-a', 60])
    const retry = await call(db, 'fail_job', [first.job.id, 'worker-a', first.lease_token, 'boom', 30])
    assert.equal(retry.code, 'RETRY_SCHEDULED')
    assert.ok(retry.delay_seconds >= 15, 'backoff must be positive')
    // Not runnable until the backoff elapses.
    assert.equal((await call(db, 'reserve_job', ['worker-a', 60])).code, 'QUEUE_EMPTY')
    await db.exec(`update hive.jobs set available_at = now() - interval '1 second' where id = '${first.job.id}'`)
    const second = await call(db, 'reserve_job', ['worker-a', 60])
    assert.equal(second.job.attempt, 2)
    const final = await call(db, 'fail_job', [second.job.id, 'worker-a', second.lease_token, 'boom again', 30])
    assert.equal(final.code, 'FAILED_FINAL')
    assert.equal((await call(db, 'reserve_job', ['worker-a', 60])).code, 'QUEUE_EMPTY')
    const attempts = (await db.query(`select attempts, max_attempts, state from hive.jobs where id = '${first.job.id}'`)).rows[0]
    assert.deepEqual({ attempts: attempts.attempts, max: attempts.max_attempts, state: attempts.state }, { attempts: 2, max: 2, state: 'FAILED' })
  } finally {
    await close()
  }
})

test('expired leases that exhausted their attempts fail instead of looping forever', async () => {
  const { db, close } = await fresh()
  try {
    await call(db, 'enqueue_job', ['mission-060-j1', 2, null, 100, {}, null, 1])
    const lease = await call(db, 'reserve_job', ['worker-a', 60])
    await db.exec(`update hive.jobs set lease_expires_at = now() - interval '5 seconds' where id = '${lease.job.id}'`)
    const recovered = await call(db, 'recover_expired_leases', [50])
    assert.deepEqual({ requeued: recovered.requeued, failed: recovered.failed }, { requeued: 0, failed: 1 })
    assert.equal((await db.query(`select state from hive.jobs where id = '${lease.job.id}'`)).rows[0].state, 'FAILED')
  } finally {
    await close()
  }
})

test('the quota ladder stops work at 50 / 70 / 85 / 95 percent and declares monthly quota unknown', async () => {
  const { db, close } = await fresh()
  try {
    const at = async calls => {
      await db.exec('delete from hive.provider_daily_usage')
      await db.query(`insert into hive.provider_daily_usage (provider, day, calls, tokens)
                      values ('openrouter', (now() at time zone 'UTC')::date, $1, 0)`, [calls])
      return call(db, 'quota_state', ['openrouter'])
    }
    // Daily call limit defaults to 20 → 9,10,14,17,19,20 calls = 45,50,70,85,95,100 %.
    assert.equal((await at(0)).level, 'NORMAL')
    assert.equal((await at(9)).level, 'NORMAL')
    assert.equal((await at(10)).level, 'ALERT')
    assert.equal((await at(14)).level, 'REDUCED')
    assert.equal((await at(17)).level, 'SUSPENDED')
    assert.equal((await at(17)).allow_new_secondary_tasks, false)
    const blocked = await at(19)
    assert.equal(blocked.level, 'BLOCKED')
    assert.equal(blocked.action, 'BLOQUEAR')
    assert.equal(blocked.allow_new_secondary_tasks, false)
    assert.equal(blocked.monthly_quota, 'UNKNOWN')
  } finally {
    await close()
  }
})

test('recording a provider call opens the circuit once the quota is exhausted', async () => {
  const { db, close } = await fresh()
  try {
    const state = await call(db, 'record_provider_call', ['freellmapi', 20, 100])
    assert.equal(state.level, 'BLOCKED')
    const circuit = (await db.query(`select failures, blocked_until from hive.provider_circuits where provider = 'freellmapi'`)).rows[0]
    assert.equal(circuit.failures, 1)
    assert.ok(circuit.blocked_until)
    const below = await call(db, 'record_provider_call', ['openrouter', 1, 10])
    assert.equal(below.allow_new_secondary_tasks, true)
  } finally {
    await close()
  }
})

test('queue metrics are real counts and separate registered / connected / operative agents', async () => {
  const { db, close } = await fresh()
  try {
    // Operator action over the seeded census: states change, rows are never duplicated.
    await db.exec(`
      update hive.agents set state='OPERATIVE' where agent_key='qa-director';
      update hive.agents set state='CONNECTED' where agent_key='deterministic-judge';
      update hive.agents set state='CONNECTED' where agent_key='meta-qa-agent';`)
    await call(db, 'enqueue_job', ['mission-070-j1', 9])
    const lease = await call(db, 'reserve_job', ['worker-a', 60])
    await call(db, 'complete_job', [lease.job.id, 'worker-a', lease.lease_token, { ok: true }])
    const metrics = await call(db, 'queue_metrics', [])
    assert.deepEqual(
      { succeeded: metrics.succeeded, queued: metrics.queued, leased: metrics.leased },
      { succeeded: 1, queued: 0, leased: 0 })
    assert.equal(metrics.agents_operative, 1)
    assert.equal(metrics.agents_connected, 2)
    assert.equal(metrics.agents_disabled, 1)
    assert.equal(metrics.agents_registered + metrics.agents_connected + metrics.agents_operative + metrics.agents_disabled, 118)
  } finally {
    await close()
  }
})

test('least privilege: workers cannot write tables directly and reader cannot execute queue operations', async () => {
  const { db, close } = await fresh()
  try {
    await db.exec('set role hive_reader')
    await assert.rejects(db.query(`select hive.reserve_job('intruder', 60)`), /permission denied/i)
    await assert.rejects(db.query(`insert into hive.jobs (idempotency_key, department_id) values ('mission-080-j1', 2)`), /permission denied/i)
    assert.equal((await db.query('select count(*)::int as n from hive.jobs')).rows[0].n, 0)
    await db.exec('reset role')

    await db.exec('set role hive_worker')
    await assert.rejects(db.query(`insert into hive.jobs (idempotency_key, department_id) values ('mission-081-j1', 2)`), /permission denied/i)
    await assert.rejects(db.query(`update hive.jobs set state = 'SUCCEEDED'`), /permission denied/i)
    await assert.rejects(db.query('drop table hive.jobs'), /permission denied|must be owner/i)
    const enqueued = (await db.query(`select hive.enqueue_job('mission-082-j1', 2) as r`)).rows[0].r
    assert.equal(enqueued.accepted, true)
    const leased = (await db.query(`select hive.reserve_job('worker-a', 60) as r`)).rows[0].r
    assert.equal(leased.leased, true)
    await db.exec('reset role')
  } finally {
    await close()
  }
})

test('the schema contains no statement about Arena tables or privileged roles', () => {
  const forbidden = [
    /\bpublic\.usuarios\b/, /\bpublic\.autonomous_jobs\b/, /\bservice_role\b/,
    /\bsupabase\b/i, /\bcreate\s+(?:or\s+replace\s+)?function\s+public\./i,
  ]
  for (const pattern of forbidden) {
    assert.doesNotMatch(sql, pattern, `hive schema must stay independent of Arena: ${pattern}`)
  }
  assert.doesNotMatch(sql, /drop\s+(?:table|schema)\s+(?:public|auth|storage)/i)
})
