// Shared helpers: apply the versioned UGO Hive migration package to an embedded engine.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const MIGRATION_DIR = 'hive/neon/migrations'
export const PROJECT_ID = 'dry-heart-24391962'

export const migrationFiles = () =>
  readdirSync(MIGRATION_DIR).filter(name => name.endsWith('.sql')).sort().map(name => join(MIGRATION_DIR, name))

export const migrationSql = () => migrationFiles().map(file => readFileSync(file, 'utf8')).join('\n')

/**
 * Applies the package in order. The destination gate needs its parameters; PGlite's
 * database is not named `hive`, so the embedded engine uses the documented test bypass,
 * which the migration records in hive.meta as `destination_check = test-bypass`.
 */
export async function applyMigrations(db, { skipDatabaseNameCheck = true } = {}) {
  await db.exec(`select set_config('hive.target_project', '${PROJECT_ID}', false)`)
  await db.exec(`select set_config('hive.target_database', 'hive', false)`)
  if (skipDatabaseNameCheck) await db.exec(`select set_config('hive.skip_database_name_check', '1', false)`)
  for (const file of migrationFiles()) await db.exec(readFileSync(file, 'utf8'))
}
