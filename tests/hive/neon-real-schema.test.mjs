import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { applyMigrations } from './hive-sql.mjs'

// Pruebas contra la RÉPLICA EXACTA del esquema que existe hoy en Neon
// (`dry-heart-24391962`, base `hive`), tal como lo verificó ChatGPT:
//   agents(id, name UNIQUE, status, last_heartbeat)      → 9 filas
//   jobs(id, idempotency_key, agent_name, prompt NOT NULL, status, created_at) → 1 DONE
const REPLICA = readFileSync('tests/hive/fixtures/neon_existing_schema.sql', 'utf8')

async function onReplica(fn) {
  const db = new PGlite()
  try {
    await db.exec(REPLICA)
    await applyMigrations(db)
    await fn(db)
  } finally {
    await db.close()
  }
}

const one = async (db, sql) => (await db.query(sql)).rows[0]

test('the migration applies on the real schema and loses no agent and no task', async () => {
  await onReplica(async db => {
    const agents = await db.query(`select name, state, status, legacy_status, agent_key from hive.agents
                                     where name in ('Hugo Orchestrator','Agente de Precios','QA – Regressão',
                                                    'Suporte ao Cliente','Provider Ops','Finance Recon',
                                                    'Legal Review','Growth Experiments','Sentinel Watcher')
                                     order by name`)
    assert.equal(agents.rows.length, 9, 'the 9 pre-existing agents must survive')
    const byName = Object.fromEntries(agents.rows.map(row => [row.name, row]))

    // El estado real se conserva en legacy_status: nada se pierde.
    assert.equal(byName['Hugo Orchestrator'].legacy_status, 'active')
    assert.equal(byName['Growth Experiments'].legacy_status, 'disabled')
    // Nunca se promueve a OPERATIVE por sí sola: 9 agentes "active" no pueden saltarse el límite.
    assert.ok(agents.rows.every(row => row.state !== 'OPERATIVE'), 'no agent may become OPERATIVE automatically')
    assert.equal(byName['Growth Experiments'].state, 'DISABLED')
    // agent_key único y no vacío, derivado del nombre real (incluye espacios y guiones largos).
    assert.equal(byName['Hugo Orchestrator'].agent_key, 'hugo-orchestrator')
    assert.equal(byName['QA – Regressão'].agent_key, 'qa-regressao')
    assert.equal(new Set(agents.rows.map(row => row.agent_key)).size, 6 + 3, 'agent_key must be unique')
    assert.equal((await one(db, `select count(*)::int n from hive.agents where agent_key is null`)).n, 0)

    // El canon se añade sin duplicar los nombres existentes.
    const total = (await one(db, `select count(*)::int n from hive.agents`)).n
    assert.equal(total, 9 + 118)
    // Dos heredados quedan deshabilitados por su status real ('paused' y 'disabled')
    // y el tercero es el único DISABLED del canon.
    assert.equal((await one(db, `select count(*)::int n from hive.agents where state='DISABLED'`)).n, 3)
    assert.equal((await one(db, `select count(*)::int n from hive.agents
                                 where state='DISABLED' and legacy_status is not null`)).n, 2)

    // La tarea terminada sigue terminada.
    const job = (await one3(db, `select state, status, legacy_status, prompt, agent_name, finished_at from hive.jobs`))
    assert.equal(job.state, 'SUCCEEDED')
    assert.equal(job.status, 'succeeded')
    assert.equal(job.legacy_status, 'DONE')
    assert.equal(job.prompt, 'Verificar saúde do sistema')
    assert.equal(job.agent_name, 'Hugo Orchestrator')
    assert.ok(job.finished_at, 'a finished task keeps its completion instant')
    const metrics = (await one(db, `select hive.queue_metrics() as m`)).m
    assert.equal(metrics.queued, 0, '0 pending tasks must stay 0')
    assert.equal(metrics.succeeded, 1)
  })
})

const one3 = async (db, sql) => (await db.query(sql)).rows[0]

test('a finished task can never return to the queue', async () => {
  await onReplica(async db => {
    const id = (await one(db, `select id from hive.jobs`)).id
    // 1 · Re-encolar la misma clave no la revive: sigue SUCCEEDED.
    const again = (await db.query(`select hive.enqueue_job('legacy-task-0001', 1, p_prompt => 'reintento')
                                   as r`)).rows[0].r
    assert.equal(again.deduplicated, true)
    assert.equal(again.state, 'SUCCEEDED')
    // 2 · Tampoco por UPDATE directo: la transición está prohibida por el trigger.
    await assert.rejects(db.exec(`update hive.jobs set state='QUEUED' where id='${id}'`), /TERMINAL_STATE_CANNOT_REQUEUE/)
    // 3 · Reaplicar el paquete no la toca.
    await applyMigrations(db)
    assert.equal((await one(db, `select state from hive.jobs where id='${id}'`)).state, 'SUCCEEDED')
  })
})

test('prompt is mandatory and agent_name stays linked to the real agents table', async () => {
  await onReplica(async db => {
    await assert.rejects(db.query(`select hive.enqueue_job('task-no-prompt-01', 1)`), /PROMPT_REQUIRED/)
    const created = (await db.query(`select hive.enqueue_job('task-with-prompt-01', 1,
        p_agent_key => 'hugo-orchestrator', p_prompt => 'Revisar conciliación') as r`)).rows[0].r
    assert.equal(created.state, 'QUEUED')
    const row = await one(db, `select prompt, agent_name, agent_key from hive.jobs where id='${created.job_id}'`)
    assert.equal(row.prompt, 'Revisar conciliación')
    assert.equal(row.agent_name, 'Hugo Orchestrator', 'agent_name must mirror hive.agents.name')
    // Un agente deshabilitado no recibe trabajo ni al encolar.
    await assert.rejects(db.query(`select hive.enqueue_job('task-disabled-01', 1,
        p_agent_key => 'growth-experiments', p_prompt => 'Nada')`), /AGENT_DISABLED/)
  })
})

test('reserve never hands work to a disabled or non-operative agent', async () => {
  await onReplica(async db => {
    // Tarea dirigida a un agente DISABLED: se queda en cola, no se entrega.
    await db.exec(`insert into hive.jobs (idempotency_key, agent_key, agent_name, prompt)
                   values ('task-for-disabled', 'growth-experiments', 'Growth Experiments', 'x')`)
    const empty = (await db.query(`select hive.reserve_job('worker-a', 60) as r`)).rows[0].r
    assert.equal(empty.leased, false)
    assert.equal(empty.code, 'QUEUE_EMPTY')
    assert.equal(empty.skipped_unauthorized, 1)
    assert.equal((await one(db, `select count(*)::int n from hive.jobs where idempotency_key='task-for-disabled' and state='QUEUED'`)).n, 1)

    // Ejecutar en nombre de un agente no operativo se rechaza de plano.
    await assert.rejects(db.query(`select hive.reserve_job('worker-a', 60, 'hugo-orchestrator')`), /AGENT_NOT_AUTHORIZED/)

    // Con el agente OPERATIVE sí se entrega, y sólo a él.
    await db.exec(`select hive.activate_agent('hugo-orchestrator', true)`)
    await db.exec(`insert into hive.jobs (idempotency_key, agent_key, agent_name, prompt)
                   values ('task-for-hugo', 'hugo-orchestrator', 'Hugo Orchestrator', 'Revisar agenda')`)
    await db.exec(`update hive.jobs set available_at = now() where state='QUEUED'`)
    const leased = (await db.query(`select hive.reserve_job('worker-a', 60, 'hugo-orchestrator') as r`)).rows[0].r
    assert.equal(leased.leased, true)
    assert.equal(leased.job.agent_key, 'hugo-orchestrator')
    assert.equal(leased.job.agent_name, 'Hugo Orchestrator')
    assert.ok(leased.job.prompt, 'the leased job carries its prompt')
  })
})

test('status and state stay coherent in both directions, keeping the original value', async () => {
  await onReplica(async db => {
    // Escritura externa sobre `status` (como la haría la herramienta actual en Neon).
    await db.exec(`update hive.agents set status='connected' where name='Legal Review'`)
    const row = await one(db, `select state, status, legacy_status from hive.agents where name='Legal Review'`)
    assert.equal(row.state, 'CONNECTED', 'status → state')
    assert.equal(row.status, 'connected')
    assert.equal(row.legacy_status, 'active', 'the original status is never lost')

    await db.exec(`select hive.activate_agent('sentinel-watcher', false)`)
    const sentinel = await one(db, `select state, status from hive.agents where agent_key='sentinel-watcher'`)
    assert.equal(sentinel.state, 'CONNECTED', 'state → status')
    assert.equal(sentinel.status, 'connected')
  })
})

test('activation limit holds against repeated attempts on the real catalog', async () => {
  await onReplica(async db => {
    await db.exec(`select hive.activate_agent('hugo-orchestrator', true)`)
    await assert.rejects(db.exec(`select hive.activate_agent('sentinel-watcher', true)`), /OPERATIVE_LIMIT_REACHED/)
    assert.equal((await one(db, `select (hive.agent_census()->>'operative')::int n`)).n, 1)
    // El censo sigue diciendo la verdad sobre el catálogo heredado.
    const census = (await one(db, `select hive.agent_census() as c`)).c
    assert.equal(census.total, 127)
    assert.equal(census.legacy_status_preserved, 9)
  })
})
