import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { applyMigrations, PROJECT_ID } from './hive-sql.mjs'

// Identidad del destino: la v2.1.0 ataba la huella a inet_server_addr(), que Neon cambia
// al reiniciar el compute. La v2.2.0 usa sólo atributos estables de la base.

const GATE = 'hive/neon/migrations/00_destination_and_meta.sql'

async function fresh() {
  const db = new PGlite()
  return db
}

test('the fingerprint is built only from stable database attributes', async () => {
  const db = await fresh()
  try {
    await applyMigrations(db)
    const row = (await db.query(`select
        (select value from hive.meta where key='destination_fingerprint') as stored,
        (select value from hive.meta where key='destination_fingerprint_algo') as algo,
        encode(sha256(convert_to(
          current_database() || '|' || (select oid::text from pg_database where datname=current_database()) || '|' ||
          (select pg_get_userbyid(datdba) from pg_database where datname=current_database()) || '|' ||
          (select pg_encoding_to_char(encoding) from pg_database where datname=current_database()) || '|' ||
          (select datcollate from pg_database where datname=current_database()) || '|' ||
          (select datctype from pg_database where datname=current_database()), 'UTF8')), 'hex') as recomputed`)).rows[0]
    assert.equal(row.algo, 'v2-stable')
    assert.equal(row.stored, row.recomputed, 'the stored hash must equal the stable formula')
    // La dirección observada se guarda, pero NO entra en la huella.
    assert.ok((await db.query(`select value from hive.meta where key='destination_server_addr'`)).rows[0])
  } finally {
    await db.close()
  }
})

test('the fingerprint does not change when only the server address would change', async () => {
  const db = await fresh()
  try {
    await applyMigrations(db)
    const before = (await db.query(`select value from hive.meta where key='destination_fingerprint'`)).rows[0].value
    // Simula lo que hace Neon al reiniciar: la IP interna cambia, la base no.
    await db.exec(`update hive.meta set value='10.9.9.9' where key='destination_server_addr'`)
    const after = (await db.query(`select value from hive.meta where key='destination_fingerprint'`)).rows[0].value
    assert.equal(after, before, 'changing the observed address must not change the fingerprint')
    // Y reaplicar el paquete sigue aceptando el destino.
    await applyMigrations(db)
  } finally {
    await db.close()
  }
})

test('an old fingerprint (v1, bound to the internal IP) must be re-anchored explicitly', async () => {
  const db = await fresh()
  try {
    await applyMigrations(db)
    // Se degrada a mano el registro a la forma v1.
    await db.exec(`update hive.meta set value='deadbeefv1' where key='destination_fingerprint'`)
    await db.exec(`delete from hive.meta where key='destination_fingerprint_algo'`)
    await assert.rejects(applyMigrations(db), /DESTINATION_FINGERPRINT_REANCHOR_REQUIRED/)
    // Con confirmación explícita se re-ancla y la anterior queda auditada.
    await db.exec(`select set_config('hive.confirm_fingerprint_reanchor','APLICAR', false)`)
    await applyMigrations(db)
    const meta = Object.fromEntries((await db.query(`select key, value from hive.meta`)).rows.map(r => [r.key, r.value]))
    assert.equal(meta.destination_fingerprint_algo, 'v2-stable')
    assert.equal(meta.destination_fingerprint_v1, 'deadbeefv1')
    assert.notEqual(meta.destination_fingerprint, 'deadbeefv1')
  } finally {
    await db.close()
  }
})

test('a first apply without confirmation writes nothing at all', async () => {
  const db = await fresh()
  try {
    await db.exec(`select set_config('hive.target_project','${PROJECT_ID}',false)`)
    await db.exec(`select set_config('hive.target_database','hive',false)`)
    await db.exec(`select set_config('hive.skip_database_name_check','1',false)`)
    const { readFileSync } = await import('node:fs')
    await assert.rejects(db.exec(readFileSync(GATE, 'utf8')), /DESTINATION_FIRST_APPLY_REQUIRED/)
    assert.equal((await db.query(`select to_regclass('hive.meta') is null as empty`)).rows[0].empty, true)
  } finally {
    await db.close()
  }
})
