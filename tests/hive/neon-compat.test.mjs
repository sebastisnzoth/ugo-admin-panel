import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { applyMigrations } from './hive-sql.mjs'

const GATE = readFileSync('hive/neon/migrations/00_destination_and_meta.sql', 'utf8')

// The Hive database is NOT assumed empty: `hive.agents`, `hive.jobs` and
// `hive.provider_circuits` already exist with a different design. These tests apply the
// package on top of that legacy schema and prove that nothing is dropped or rewritten.

const LEGACY = `
  create schema hive;
  create table hive.agents (
    agent_key text primary key,
    department_id integer,
    name text,
    status text,
    enabled boolean default true
  );
  create table hive.jobs (
    id uuid primary key default gen_random_uuid(),
    idempotency_key text,
    status text,
    created_at timestamptz default now()
  );
  create table hive.provider_circuits (
    provider text primary key,
    failures integer default 0,
    blocked_until timestamptz
  );
  insert into hive.agents (agent_key, department_id, name, status, enabled)
    values ('legacy-agent-a', 1, 'Legacy A', 'idle', true),
           ('legacy-agent-b', 9, 'Legacy B', 'paused', false);
  insert into hive.jobs (idempotency_key, status, created_at)
    values ('legacy-job-0001', 'done', now() - interval '2 days'),
           ('legacy-job-0002', 'failed', now() - interval '1 day'),
           (null, 'orphan', now() - interval '3 days');
  insert into hive.provider_circuits (provider, failures, blocked_until)
    values ('openrouter', 2, now() + interval '10 minutes');
`

async function withLegacy(fn) {
  const db = new PGlite()
  try {
    await db.exec(LEGACY)
    return await fn(db)
  } finally {
    await db.close()
  }
}

test('the package applies on top of a pre-existing hive schema without losing a single row', async () => {
  await withLegacy(async db => {
    const before = {
      agents: (await db.query('select count(*)::int n from hive.agents')).rows[0].n,
      jobs: (await db.query('select count(*)::int n from hive.jobs')).rows[0].n,
      circuits: (await db.query('select count(*)::int n from hive.provider_circuits')).rows[0].n,
    }
    assert.deepEqual(before, { agents: 2, jobs: 3, circuits: 1 })

    await applyMigrations(db) // includes 08_verify: it fails loudly if anything is wrong

    // Legacy rows survive, untouched, and the new columns are simply added.
    const legacyAgents = await db.query(`select agent_key, status, enabled, state from hive.agents where agent_key like 'legacy-agent-%' order by agent_key`)
    assert.deepEqual(legacyAgents.rows.map(r => [r.agent_key, r.status, r.enabled, r.state]), [
      ['legacy-agent-a', 'idle', true, 'REGISTERED'],
      ['legacy-agent-b', 'paused', false, 'REGISTERED'],
    ])
    const legacyJobs = await db.query(`select idempotency_key, status, state, lease_token from hive.jobs where status is not null order by idempotency_key nulls last`)
    assert.equal(legacyJobs.rows.length, 3, 'no legacy job may be deleted')
    assert.ok(legacyJobs.rows.every(row => row.state === 'QUEUED' && row.lease_token === 0))
    assert.equal((await db.query(`select failures from hive.provider_circuits where provider='openrouter'`)).rows[0].failures, 2)

    // The canonical 118 agents are added around the two legacy ones.
    assert.equal((await db.query('select count(*)::int n from hive.agents')).rows[0].n, 120)
    assert.equal((await db.query(`select count(*)::int n from hive.agents where state='DISABLED'`)).rows[0].n, 1)
  })
})

test('re-applying is a no-op and never duplicates the census or the catalog', async () => {
  await withLegacy(async db => {
    await applyMigrations(db)
    const first = (await db.query('select count(*)::int n from hive.agents')).rows[0].n
    await applyMigrations(db)
    assert.equal((await db.query('select count(*)::int n from hive.agents')).rows[0].n, first)
    assert.equal((await db.query('select count(*)::int n from hive.departments')).rows[0].n, 13)
  })
})

test('duplicated idempotency keys abort the migration instead of deleting data', async () => {
  const db = new PGlite()
  try {
    await db.exec(LEGACY)
    await db.exec(`insert into hive.jobs (idempotency_key, status) values ('legacy-job-0001', 'dup')`)
    await assert.rejects(applyMigrations(db), /IDEMPOTENCY_KEYS_DUPLICATED/)
    // Nothing was removed: the operator decides what to do with those rows.
    assert.equal((await db.query('select count(*)::int n from hive.jobs')).rows[0].n, 4)
  } finally {
    await db.close()
  }
})

test('the destination gate rejects any target that is not the authorised Hive TEST project', async () => {
  // Applied raw (not through the helper) so the missing/incorrect parameters are real.
  const cases = [
    { label: 'sin parámetros', config: {}, pattern: /DESTINATION_REJECTED/ },
    { label: 'otro proyecto', config: { 'hive.target_project': 'otro-proyecto-123' }, pattern: /DESTINATION_REJECTED/ },
    { label: 'otra base', config: { 'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'neondb' }, pattern: /DESTINATION_REJECTED/ },
  ]
  for (const testCase of cases) {
    const db = new PGlite()
    try {
      for (const [key, value] of Object.entries(testCase.config)) {
        await db.exec(`select set_config('${key}', '${value}', false)`)
      }
      await db.exec(`select set_config('hive.skip_database_name_check','1',false)`)
      await assert.rejects(db.exec(GATE), testCase.pattern, testCase.label)
      assert.equal((await db.query(`select to_regclass('hive.meta') is null as empty`)).rows[0].empty, true,
        `${testCase.label}: no schema may be created when the destination is rejected`)
    } finally {
      await db.close()
    }
  }
})

test('the destination gate rejects a database that looks like UGO Arena', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create table public.usuarios (id uuid primary key, tipo text)`)
    await assert.rejects(applyMigrations(db), /DESTINATION_REJECTED: el destino contiene/)
  } finally {
    await db.close()
  }
})

test('the destination gate rejects a database already marked with another project', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create schema hive; create table hive.meta (key text primary key, value text not null, updated_at timestamptz default now());
                   insert into hive.meta(key,value) values ('neon_project_id','old-project-999')`)
    await assert.rejects(applyMigrations(db), /DESTINATION_REJECTED: esta base pertenece al proyecto/)
  } finally {
    await db.close()
  }
})

test('agents activate one at a time: the census guard blocks a mass deployment of 118', async () => {
  const db = new PGlite()
  try {
    await applyMigrations(db)
    const first = (await db.query(`select hive.activate_agent('qa-director', true) as r`)).rows[0].r
    assert.equal(first.state, 'OPERATIVE')
    await assert.rejects(db.query(`select hive.activate_agent('deterministic-judge', true)`), /OPERATIVE_LIMIT_REACHED/)
    // Connecting (not operating) a second agent is allowed: registration ≠ operation.
    const connected = (await db.query(`select hive.activate_agent('deterministic-judge', false) as r`)).rows[0].r
    assert.equal(connected.state, 'CONNECTED')
    // The disabled agent from the canon can never be switched on.
    await assert.rejects(db.query(`select hive.activate_agent('corporate-audit-agent', true)`), /AGENT_DISABLED/)
    await assert.rejects(db.query(`select hive.activate_agent('no-existe', true)`), /AGENT_NOT_REGISTERED/)
    // Raising the limit is an explicit operator decision, not a default.
    await db.exec(`update hive.settings set value='2'::jsonb where key='max_operative_agents'`)
    assert.equal((await db.query(`select hive.activate_agent('deterministic-judge', true) as r`)).rows[0].r.state, 'OPERATIVE')
    assert.equal((await db.query(`select (hive.agent_census()->>'operative')::int as n`)).rows[0].n, 2)
    await db.exec(`select hive.deactivate_agent('deterministic-judge')`)
    assert.equal((await db.query(`select state from hive.agents where agent_key='deterministic-judge'`)).rows[0].state, 'REGISTERED')
  } finally {
    await db.close()
  }
})
