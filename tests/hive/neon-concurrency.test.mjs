import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { startPostgres, postgresAvailable, migrationFiles } from '../../scripts/hive/pg-harness.mjs'

// Genuine concurrency: a real PostgreSQL server and one `psql` process per session.
// Embedded PGlite serialises everything, so it cannot evidence locking, SKIP LOCKED,
// fencing tokens or concurrent recovery. When no server binaries are available the
// suite reports SKIPPED instead of pretending.
const required = process.env.HIVE_REQUIRE_REAL_POSTGRES === '1'
const unavailable = postgresAvailable() ? false : 'PostgreSQL real no disponible (pip install pgserver o POSTGRES_BIN)'
test('real PostgreSQL is available for concurrency evidence', () => {
  if (!postgresAvailable()) {
    // Locally the suite may skip; in CI it must fail rather than pretend.
    assert.equal(required, false, 'HIVE_REQUIRE_REAL_POSTGRES=1 pero no hay servidor PostgreSQL')
    return
  }
  assert.equal(postgresAvailable(), true)
})

let server = null
let counter = 0

async function database() {
  if (!server) {
    server = await startPostgres()
    for (const file of migrationFiles(process.cwd())) {
      const result = server.psqlFile(file, { vars: { 'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'hive' } })
      if (!result.ok) throw new Error(`MIGRATION_FAILED ${file}: ${result.stderr}`)
    }
  }
  // Every test gets its own jobs so counts are exact and tests stay independent.
  const tag = `t${++counter}-${Date.now()}`
  server.psql(`update hive.jobs set state='CANCELLED', lease_owner=null, lease_expires_at=null
                where state in ('LEASED','QUEUED')`)
  server.psql(`insert into hive.settings(key,value) values ('max_concurrent_jobs','1'::jsonb)
               on conflict (key) do update set value=excluded.value`)
  // The documented worker contract, expressed in SQL: on RESERVE_BUSY, retry with
  // bounded exponential backoff plus jitter. Never an unbounded loop.
  server.psql(`create or replace function public.wait_reserve(p_worker text, p_tries integer default 30, p_lease integer default 60)
               returns jsonb language plpgsql as $$
               declare r jsonb; i integer; delay double precision := 0.01;
               begin
                 for i in 1..p_tries loop
                   r := hive.reserve_job(p_worker, p_lease);
                   if r->>'code' is distinct from 'RESERVE_BUSY' then return r; end if;
                   perform pg_sleep(delay * (0.5 + random()));   -- jitter
                   delay := least(delay * 2, 0.2);                -- capped backoff
                 end loop;
                 return r;
               end $$`)
  return { db: server, tag }
}

after(async () => { if (server) await server.stop() })

const jobOf = text => {
  const line = text.split('\n').map(s => s.trim()).find(s => s.startsWith('{'))
  return line ? JSON.parse(line) : null
}

test('20 independent sessions compete for one slot: exactly one lease is granted', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  for (let i = 0; i < 20; i++) {
    db.psql(`select hive.enqueue_job('${tag}-job-${String(i).padStart(2, '0')}', 9)`)
  }
  const started = Date.now()
  // Every session holds its transaction open for 250 ms, so they genuinely overlap.
  const sessions = Array.from({ length: 20 }, (_, i) =>
    `begin; select hive.reserve_job('worker-${i}', 60)::text || E'\\n'; select pg_sleep(0.25); commit;`)
  const results = await db.parallel(sessions)
  const elapsed = Date.now() - started

  const parsed = results.map(jobOf)
  const leased = parsed.filter(result => result?.leased === true)
  const refused = parsed.filter(result => result?.leased === false)
  assert.equal(leased.length, 1, `exactly one lease, got ${leased.length}`)
  assert.equal(refused.length, 19)
  // Either the cap was reached or another reservation was in flight: both are refusals,
  // never a block and never a second lease.
  for (const refusedResult of refused) {
    assert.ok(['CONCURRENCY_LIMIT', 'RESERVE_BUSY'].includes(refusedResult.code), refusedResult.code)
  }
  // Serialised execution would take >= 5 s. Overlap proves separate concurrent sessions.
  assert.ok(elapsed < 3000, `sessions did not overlap: ${elapsed} ms for 20 x 250 ms`)
  assert.equal(Number(db.psql('select count(*) from hive.jobs where state = \'LEASED\'')), 1)
})

test('raising max_concurrent_jobs to 3 grants exactly 3 distinct leases under contention', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  db.psql(`update hive.settings set value='3'::jsonb where key='max_concurrent_jobs'`)
  db.psql(`update hive.jobs set state='CANCELLED', lease_owner=null, lease_expires_at=null, lease_token=0 where state='LEASED'`)
  for (let i = 0; i < 12; i++) {
    db.psql(`select hive.enqueue_job('${tag}-wide-${String(i).padStart(2, '0')}', 2)`)
  }
  const results = await db.parallel(Array.from({ length: 12 }, (_, i) => `select public.wait_reserve('w${i}', 40)::text`))
  const leased = results.map(jobOf).filter(result => result?.leased === true)
  assert.equal(leased.length, 3)
  assert.ok(results.map(jobOf).every(result => result.code !== 'RESERVE_BUSY'), 'bounded retries must resolve contention')
  const ids = new Set(leased.map(result => result.job.id))
  assert.equal(ids.size, 3, 'no job may be handed to two workers')
})

test('fencing token: a worker whose lease expired cannot complete the job', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  db.psql(`select hive.enqueue_job('${tag}-fence-01', 8)`)
  const first = jobOf(db.psql(`select public.wait_reserve('worker-a')::text`))
  assert.equal(first.leased, true)
  const tokenA = first.lease_token

  db.psql(`update hive.jobs set lease_expires_at = now() - interval '5 seconds' where id='${first.job.id}'`)
  assert.equal(jobOf(db.psql('select hive.recover_expired_leases(50)::text')).requeued, 1)
  // Recovery must not hot-loop: the requeued job waits out a backoff before retrying.
  assert.equal(db.psql(`select (available_at > now())::text from hive.jobs where id='${first.job.id}'`), 'true')
  db.psql(`update hive.jobs set available_at = now() where id='${first.job.id}'`) // tests must not sleep for the backoff

  const second = jobOf(db.psql(`select public.wait_reserve('worker-b')::text`))
  assert.equal(second.leased, true)
  assert.equal(second.job.id, first.job.id, 'the recovered job is the same one')
  assert.ok(second.lease_token > tokenA, 'a new grant must issue a newer fencing token')

  const stale = jobOf(db.psql(`select hive.complete_job('${first.job.id}','worker-a',${tokenA},'{}'::jsonb)::text`))
  assert.equal(stale.code, 'LEASE_LOST', 'stale token must not close the job')
  const fresh = jobOf(db.psql(`select hive.complete_job('${first.job.id}','worker-b',${second.lease_token},'{}'::jsonb)::text`))
  assert.equal(fresh.code, 'SUCCEEDED')
})

test('two sessions completing the same job with the same token: exactly one wins', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  db.psql(`update hive.jobs set state='CANCELLED', lease_owner=null, lease_expires_at=null where state='LEASED'`)
  db.psql(`select hive.enqueue_job('${tag}-race-01', 9)`)
  const lease = jobOf(db.psql(`select public.wait_reserve('worker-a')::text`))
  const sql = `select hive.complete_job('${lease.job.id}','worker-a',${lease.lease_token},'{}'::jsonb)::text`
  const [a, b] = (await db.parallel([sql, sql])).map(jobOf)
  const codes = [a.code, b.code].sort()
  assert.deepEqual(codes, ['LEASE_LOST', 'SUCCEEDED'], 'completion must not happen twice')
  assert.equal(Number(db.psql(`select count(*) from hive.job_events where job_id='${lease.job.id}' and event='SUCCEEDED'`)), 1)
})

test('external effects are idempotent by effect_key even when the job runs twice', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  const effectKey = `${tag}:send-receipt`
  db.psql(`select hive.enqueue_job('${tag}-effect-01', 7)`)
  const first = jobOf(db.psql(`select public.wait_reserve('worker-a')::text`))
  const doneOne = jobOf(db.psql(`select hive.complete_job('${first.job.id}','worker-a',${first.lease_token},'{}'::jsonb,'${effectKey}')::text`))
  assert.equal(doneOne.effect_applied, true)
  assert.equal(doneOne.execution, 'at_least_once', 'the contract is at-least-once, not exactly-once')

  db.psql(`select hive.enqueue_job('${tag}-effect-02', 7)`)
  const second = jobOf(db.psql(`select public.wait_reserve('worker-b')::text`))
  const doneTwo = jobOf(db.psql(`select hive.complete_job('${second.job.id}','worker-b',${second.lease_token},'{}'::jsonb,'${effectKey}')::text`))
  assert.equal(doneTwo.effect_applied, false, 'the external effect must not be applied twice')
  assert.equal(Number(db.psql(`select count(*) from hive.job_effects where effect_key='${effectKey}'`)), 1)
})

test('concurrent recovery by two sessions requeues each expired lease exactly once', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  db.psql(`update hive.jobs set state='CANCELLED', lease_owner=null, lease_expires_at=null where state='LEASED'`)
  for (let i = 0; i < 4; i++) db.psql(`select hive.enqueue_job('${tag}-recover-${i}', 2)`)
  // Four workers take the four jobs, then all four leases expire at once.
  db.psql(`update hive.settings set value='4'::jsonb where key='max_concurrent_jobs'`)
  const taken = (await db.parallel(Array.from({ length: 4 }, (_, i) => `select public.wait_reserve('w${i}', 40)::text`))).map(jobOf)
  assert.equal(taken.filter(t => t?.leased).length, 4)
  db.psql(`update hive.settings set value='1'::jsonb where key='max_concurrent_jobs'`)
  db.psql(`update hive.jobs set lease_expires_at = now() - interval '5 seconds' where state='LEASED'`)

  const [r1, r2] = (await db.parallel([
    `select hive.recover_expired_leases(50)::text`,
    `select hive.recover_expired_leases(50)::text`,
  ])).map(jobOf)
  assert.equal(r1.requeued + r2.requeued, 4, 'each expired lease is recovered once, never twice')
  assert.equal(Number(db.psql(`select count(*) from hive.jobs where state='QUEUED' and last_error='LEASE_EXPIRED'`)), 4)
})

test('ten sessions enqueueing the same idempotency key create a single job', { skip: unavailable }, async () => {
  const { db, tag } = await database()
  const key = `${tag}-dedupe-key`
  const results = await db.parallel(Array.from({ length: 10 }, () => `select hive.enqueue_job('${key}', 9)::text`))
  const parsed = results.map(jobOf)
  assert.equal(new Set(parsed.map(result => result.job_id)).size, 1)
  assert.equal(parsed.filter(result => result.deduplicated === false).length, 1, 'exactly one insert wins the race')
  assert.equal(Number(db.psql(`select count(*) from hive.jobs where idempotency_key='${key}'`)), 1)
})
